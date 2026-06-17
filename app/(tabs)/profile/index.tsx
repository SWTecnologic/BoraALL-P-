import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Linking, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { User, CreditCard, Shield, Bell, LogOut, Star, Clock, ChevronRight, Camera, X, Images, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

// Cores do tema
const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  gold: '#FFD700',
  goldDark: '#D4A800',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#6B6B6B',
  border: '#333333',
  danger: '#FF4444',
  starEmpty: '#444444',
};

export default function Profile() {
  const { usuario, signOut } = useAuth();
  const [totalCorridas, setTotalCorridas] = useState(0);
  const [avaliacaoMedia, setAvaliacaoMedia] = useState(5.0);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Novos estados para tempo de plataforma
  const [dataCadastro, setDataCadastro] = useState<string | null>(null);
  const [tempoPlataforma, setTempoPlataforma] = useState<string>('');

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
      // 1. Buscar dados do passageiro (total_corridas e avaliacao_media)
      const { data: passageiroData, error: passageiroError } = await supabase
        .from('passageiros')
        .select('total_corridas, avaliacao_media')
        .eq('usuario_id', usuario?.id)
        .single();

      if (passageiroError) throw passageiroError;

      // 2. Buscar total de corridas finalizadas (mais confiável)
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

      // 3. Buscar foto e data de criação do usuário
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('foto_perfil_url, created_at')
        .eq('id', usuario?.id)
        .single();

      if (userError) throw userError;

      if (userData?.foto_perfil_url) {
        setFotoPerfil(userData.foto_perfil_url);
      }

      // Calcular tempo de plataforma
      if (userData?.created_at) {
        const created = new Date(userData.created_at);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffMeses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
        const diffAnos = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

        let tempoStr = '';
        if (diffAnos > 0) {
          tempoStr = `${diffAnos} ano${diffAnos > 1 ? 's' : ''}`;
          const mesesRestantes = diffMeses % 12;
          if (mesesRestantes > 0) {
            tempoStr += ` e ${mesesRestantes} mês${mesesRestantes > 1 ? 'es' : ''}`;
          }
        } else if (diffMeses > 0) {
          tempoStr = `${diffMeses} mês${diffMeses > 1 ? 'es' : ''}`;
        } else {
          const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          tempoStr = `${diffDias} dia${diffDias > 1 ? 's' : ''}`;
        }

        setTempoPlataforma(tempoStr);
        setDataCadastro(created.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
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

  // Componente para exibir as estrelas com preenchimento
  const RatingStars = ({ rating, size = 24 }: { rating: number; size?: number }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.ratingStarsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={size} color={COLORS.gold} fill={COLORS.gold} />
        ))}
        {hasHalfStar && (
          <View style={{ position: 'relative' }}>
            <Star size={size} color={COLORS.gold} fill={COLORS.gold} />
            <View style={{ position: 'absolute', width: '50%', height: '100%', backgroundColor: COLORS.background, overflow: 'hidden' }}>
              <Star size={size} color={COLORS.gold} fill="transparent" />
            </View>
          </View>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={size} color={COLORS.starEmpty} fill="transparent" />
        ))}
      </View>
    );
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleChangePhoto}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color={COLORS.gold} />
              </View>
            ) : (
              <>
                {fotoPerfil ? (
                  <>
                    <Image source={{ uri: fotoPerfil }} style={styles.avatar} />
                    <View style={styles.cameraOverlay}>
                      <Camera size={24} color={COLORS.background} />
                    </View>
                  </>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={40} color={COLORS.gold} />
                    <View style={styles.cameraOverlay}>
                      <Camera size={24} color={COLORS.background} />
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
            
            {/* Tempo de plataforma */}
            {dataCadastro && (
              <View style={styles.memberSinceContainer}>
                <Calendar size={16} color={COLORS.gold} />
                <Text style={styles.memberSinceText}>
                  Membro desde {dataCadastro} {tempoPlataforma ? `(há ${tempoPlataforma})` : ''}
                </Text>
              </View>
            )}
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
            <Clock size={24} color={COLORS.gold} />
            <Text style={styles.statNumber}>{totalCorridas}</Text>
            <Text style={styles.statLabel}>Corridas</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Star size={24} color={COLORS.gold} fill={COLORS.gold} />
            <Text style={styles.statNumber}>{avaliacaoMedia.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>
        </View>

        {/* Load de avaliação com estrelas */}
        <View style={styles.ratingLoadSection}>
          <Text style={styles.ratingLoadTitle}>Sua avaliação média</Text>
          <RatingStars rating={avaliacaoMedia} size={28} />
          <Text style={styles.ratingLoadValue}>{avaliacaoMedia.toFixed(1)} / 5.0</Text>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <item.icon size={20} color={COLORS.gold} />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={COLORS.danger} />
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
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.optionButton} onPress={tirarFoto}>
              <Camera size={24} color={COLORS.gold} />
              <Text style={styles.optionText}>Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={escolherDaGaleria}>
              <Images size={24} color={COLORS.gold} />
              <Text style={styles.optionText}>Escolher da Galeria</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  profileSection: {
    backgroundColor: COLORS.surface,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.gold,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  memberSinceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  editButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginTop: 8,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ratingLoadSection: {
    backgroundColor: COLORS.surface,
    marginTop: 8,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ratingLoadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  ratingLoadValue: {
    fontSize: 14,
    color: COLORS.gold,
    marginTop: 4,
    fontWeight: '500',
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.danger,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.textPrimary,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
});