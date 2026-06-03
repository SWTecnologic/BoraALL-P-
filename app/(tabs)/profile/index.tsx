import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Linking, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { User, CreditCard, Shield, Bell, LogOut, Star, Clock, ChevronRight, Camera, X, Images } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function Profile() {
  const { usuario, signOut } = useAuth();
  const [totalCorridas, setTotalCorridas] = useState(0);
  const [avaliacaoMedia, setAvaliacaoMedia] = useState(5.0);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [loading, setLoading] = useState(true);

  // Recarregar dados sempre que a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      if (usuario?.id) {
        carregarDadosCompletos();
      }
    }, [usuario?.id])
  );

  useEffect(() => {
    if (usuario?.id) {
      carregarDadosCompletos();
      solicitarPermissaoCamera();
    }
  }, [usuario]);

  const solicitarPermissaoCamera = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted') {
      console.log('Permissão da câmera negada');
    }
    if (libraryStatus !== 'granted') {
      console.log('Permissão da galeria negada');
    }
  };

  const carregarDadosCompletos = async () => {
    setLoading(true);
    try {
      // Buscar dados do passageiro (total_corridas e avaliacao_media)
      const { data: passageiroData, error: passageiroError } = await supabase
        .from('passageiros')
        .select('total_corridas, avaliacao_media')
        .eq('usuario_id', usuario?.id)
        .single();

      if (passageiroError) throw passageiroError;

      // Buscar TODAS as corridas FINALIZADAS do passageiro (mais confiável)
      const { data: passageiroIdData, error: passIdError } = await supabase
        .from('passageiros')
        .select('id')
        .eq('usuario_id', usuario?.id)
        .single();

      if (!passIdError && passageiroIdData) {
        const { count, error: countError } = await supabase
          .from('corridas')
          .select('id', { count: 'exact', head: true })
          .eq('passageiro_id', passageiroIdData.id)
          .eq('status', 'finalizada');

        if (!countError && count !== null) {
          setTotalCorridas(count);
        } else if (passageiroData) {
          setTotalCorridas(passageiroData.total_corridas || 0);
        }
      } else if (passageiroData) {
        setTotalCorridas(passageiroData.total_corridas || 0);
      }

      if (passageiroData) {
        setAvaliacaoMedia(passageiroData.avaliacao_media || 5.0);
      }

      // Buscar foto do perfil
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('foto_perfil_url')
        .eq('id', usuario?.id)
        .single();

      if (userError) throw userError;

      if (userData?.foto_perfil_url) {
        setFotoPerfil(userData.foto_perfil_url);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = () => {
    setShowImageOptions(true);
  };

  const tirarFoto = async () => {
    setShowImageOptions(false);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadFoto(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera');
      console.error(error);
    }
  };

  const escolherDaGaleria = async () => {
    setShowImageOptions(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadFoto(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria');
      console.error(error);
    }
  };

  const uploadFoto = async (base64: string) => {
    setUploading(true);
    try {
      const fileName = `${usuario?.id}-${Date.now()}.jpg`;
      const filePath = `fotos-perfil/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ foto_perfil_url: urlData.publicUrl })
        .eq('id', usuario?.id);

      if (updateError) throw updateError;

      setFotoPerfil(urlData.publicUrl);
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/welcome');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  const handleNotifications = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else if (Platform.OS === 'android') {
      Linking.openSettings();
    }
  };

  const menuItems = [
    {
      id: 'payment',
      title: 'Métodos de Pagamento',
      icon: CreditCard,
      onPress: () => {
        Alert.alert('Em breve', 'Métodos de pagamento estarão disponíveis em breve!');
      },
    },
    {
      id: 'privacy',
      title: 'Privacidade e Segurança',
      icon: Shield,
      onPress: () => router.push('/priva'),
    },
    {
      id: 'notifications',
      title: 'Notificações',
      icon: Bell,
      onPress: handleNotifications,
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleChangePhoto}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : (
              <>
                {fotoPerfil ? (
                  <>
                    <Image source={{ uri: fotoPerfil }} style={styles.avatar} />
                    <View style={styles.cameraOverlay}>
                      <Camera size={24} color="#FFFFFF" />
                    </View>
                  </>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={40} color="#FFFFFF" />
                    <View style={styles.cameraOverlay}>
                      <Camera size={24} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{usuario?.nome_completo}</Text>
            <Text style={styles.userEmail}>{usuario?.email}</Text>
            <Text style={styles.userPhone}>{usuario?.telefone}</Text>
          </View>

          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <TouchableOpacity 
            style={styles.statItem} 
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <Clock size={24} color="#2563EB" />
            <Text style={styles.statNumber}>{totalCorridas}</Text>
            <Text style={styles.statLabel}>Corridas</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Star size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{avaliacaoMedia.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <item.icon size={20} color="#374151" />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.signOutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>BoraAli v2.06.26</Text>
        </View>
      </ScrollView>

      {showImageOptions && (
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowImageOptions(false)}
        >
          <View style={styles.optionsModal}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Alterar Foto de Perfil</Text>
              <TouchableOpacity onPress={() => setShowImageOptions(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.optionButton} onPress={tirarFoto}>
              <Camera size={24} color="#2563EB" />
              <Text style={styles.optionText}>Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={escolherDaGaleria}>
              <Images size={24} color="#2563EB" />
              <Text style={styles.optionText}>Escolher da Galeria</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  editButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  optionIcon: {
    width: 24,
    height: 24,
  },
});