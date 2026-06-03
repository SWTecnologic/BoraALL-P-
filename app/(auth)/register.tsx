import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Lock, FileText, Calendar, Phone, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

// Componente para campo de input com ícone (estilizado com cores laranja/preto)
const InputField = ({ icon, ...props }: any) => (
  <View style={styles.inputContainer}>
    {icon && <View style={styles.inputIcon}>{icon}</View>}
    <TextInput style={styles.input} placeholderTextColor="#999" {...props} />
  </View>
);

export default function Register() {
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    senha: '',
    confirmarSenha: '',
  });
  const [fotoPerfilUri, setFotoPerfilUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Função para tirar foto com a câmera frontal
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar sua foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: 'front',
    });

    if (!result.canceled) {
      setFotoPerfilUri(result.assets[0].uri);
    }
  };

  // Upload da imagem para o Supabase Storage
  const uploadProfileImage = async (userId: string): Promise<string | null> => {
    if (!fotoPerfilUri) return null;

    const fileExt = fotoPerfilUri.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `fotos_perfil/${fileName}`;

    const response = await fetch(fotoPerfilUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Erro ao fazer upload:', error);
      Alert.alert('Erro', 'Não foi possível enviar a foto de perfil.');
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setUploading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Erro ao criar usuário');

      let fotoUrl = null;
      if (fotoPerfilUri) {
        fotoUrl = await uploadProfileImage(userId);
      }

      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          id: userId,
          email: formData.email,
          nome_completo: formData.nome_completo,
          telefone: formData.telefone,
          cpf: formData.cpf,
          data_nascimento: formData.data_nascimento,
          tipo_usuario: 'passageiro',
          status: 'ativo',
          foto_perfil_url: fotoUrl,
        });
      if (usuarioError) throw usuarioError;

      const { error: passageiroError } = await supabase
        .from('passageiros')
        .insert({ usuario_id: userId });
      if (passageiroError) throw passageiroError;

      Alert.alert(
        'Sucesso',
        'Cadastro realizado com sucesso!',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const validateForm = () => {
    const { nome_completo, email, telefone, cpf, data_nascimento, senha, confirmarSenha } = formData;
    if (!nome_completo || !email || !telefone || !cpf || !data_nascimento || !senha || !confirmarSenha) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return false;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return false;
    }

    return true;
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>BoraAli</Text>
              <Text style={styles.subtitle}>Crie sua conta e comece a viajar</Text>
            </View>

            {/* Foto de perfil - câmera frontal */}
            <TouchableOpacity style={styles.photoContainer} onPress={takePhoto}>
              {fotoPerfilUri ? (
                <Image source={{ uri: fotoPerfilUri }} style={styles.profileImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={32} color="#FF6600" />
                  <Text style={styles.photoText}>Tirar foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.form}>
              <InputField
                icon={<User size={20} color="#FF6600" />}
                placeholder="Nome completo"
                placeholderTextColor="#999"
                value={formData.nome_completo}
                onChangeText={v => updateFormData('nome_completo', v)}
              />
              <InputField
                icon={<Mail size={20} color="#FF6600" />}
                placeholder="E-mail"
                placeholderTextColor="#999"
                value={formData.email}
                onChangeText={v => updateFormData('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InputField
                icon={<Phone size={20} color="#FF6600" />}
                placeholder="Telefone"
                placeholderTextColor="#999"
                value={formData.telefone}
                onChangeText={v => updateFormData('telefone', v)}
                keyboardType="phone-pad"
              />
              <InputField
                icon={<FileText size={20} color="#FF6600" />}
                placeholder="CPF"
                placeholderTextColor="#999"
                value={formData.cpf}
                onChangeText={v => updateFormData('cpf', v)}
                keyboardType="numeric"
              />
              <InputField
                icon={<Calendar size={20} color="#FF6600" />}
                placeholder="Data de nascimento (DD/MM/AAAA)"
                placeholderTextColor="#999"
                value={formData.data_nascimento}
                onChangeText={v => updateFormData('data_nascimento', v)}
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Segurança</Text>
              </View>
              <InputField
                icon={<Lock size={20} color="#FF6600" />}
                placeholder="Senha"
                placeholderTextColor="#999"
                value={formData.senha}
                onChangeText={v => updateFormData('senha', v)}
                secureTextEntry
              />
              <InputField
                icon={<Lock size={20} color="#FF6600" />}
                placeholder="Confirmar senha"
                placeholderTextColor="#999"
                value={formData.confirmarSenha}
                onChangeText={v => updateFormData('confirmarSenha', v)}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, (loading || uploading) && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading || uploading}
              >
                {loading || uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Criar conta</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Já tem conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.linkText}>Entre aqui</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF6600',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6600',
    borderStyle: 'dashed',
  },
  photoText: {
    fontSize: 12,
    color: '#FF6600',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  button: {
    backgroundColor: '#FF6600',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#B87333',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#AAA',
  },
  linkText: {
    fontSize: 14,
    color: '#FF6600',
    fontWeight: 'bold',
  },
});