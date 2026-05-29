import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { User, Mail, Lock, FileText, Calendar, Phone, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

// Componente para campo de input com ícone
const InputField = ({ icon, ...props }: any) => (
  <View style={styles.inputContainer}>
    {icon && <View style={styles.inputIcon}>{icon}</View>}
    <TextInput style={styles.input} placeholderTextColor="#6B7280" {...props} />
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

  // Função para tirar foto com a câmera (frontal)
  const takePhoto = async () => {
    // Solicita permissão da câmera
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
      cameraType: 'front', // Força a câmera frontal (funciona na maioria dos dispositivos)
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
      // 1. Cria usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Erro ao criar usuário');

      // 2. Upload da foto (se houver)
      let fotoUrl = null;
      if (fotoPerfilUri) {
        fotoUrl = await uploadProfileImage(userId);
      }

      // 3. Insere na tabela usuarios
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

      // 4. Insere na tabela passageiros
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se ao QuebraCar como passageiro</Text>
          </View>

          {/* Foto de perfil - agora com câmera frontal */}
          <TouchableOpacity style={styles.photoContainer} onPress={takePhoto}>
            {fotoPerfilUri ? (
              <Image source={{ uri: fotoPerfilUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={32} color="#6B7280" />
                <Text style={styles.photoText}>Tirar foto</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.form}>
            <InputField
              icon={<User size={20} color="#6B7280" />}
              placeholder="Nome completo"
              value={formData.nome_completo}
              onChangeText={v => updateFormData('nome_completo', v)}
            />
            <InputField
              icon={<Mail size={20} color="#6B7280" />}
              placeholder="E-mail"
              value={formData.email}
              onChangeText={v => updateFormData('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              icon={<Phone size={20} color="#6B7280" />}
              placeholder="Telefone"
              value={formData.telefone}
              onChangeText={v => updateFormData('telefone', v)}
              keyboardType="phone-pad"
            />
            <InputField
              icon={<FileText size={20} color="#6B7280" />}
              placeholder="CPF"
              value={formData.cpf}
              onChangeText={v => updateFormData('cpf', v)}
              keyboardType="numeric"
            />
            <InputField
              icon={<Calendar size={20} color="#6B7280" />}
              placeholder="Data de nascimento (DD/MM/AAAA)"
              value={formData.data_nascimento}
              onChangeText={v => updateFormData('data_nascimento', v)}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Segurança</Text>
            </View>
            <InputField
              icon={<Lock size={20} color="#6B7280" />}
              placeholder="Senha"
              value={formData.senha}
              onChangeText={v => updateFormData('senha', v)}
              secureTextEntry
            />
            <InputField
              icon={<Lock size={20} color="#6B7280" />}
              placeholder="Confirmar senha"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2563EB', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  photoContainer: { alignItems: 'center', marginBottom: 24 },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#2563EB' },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  photoText: { fontSize: 12, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  form: { marginBottom: 32 },
  sectionHeader: { marginTop: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  button: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  footerText: { fontSize: 14, color: '#6B7280' },
  linkText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
});