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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Mail,
  Lock,
  FileText,
  Calendar,
  Phone,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
};

const TERMOS_DE_USO = `...`; // mantenha o conteúdo original

// ---------- FUNÇÕES DE VALIDAÇÃO ----------
const validarCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) {
    Alert.alert('CPF inválido', 'O CPF deve ter 11 dígitos.');
    return false;
  }
  if (/^(\d)\1+$/.test(cleaned)) {
    Alert.alert('CPF inválido', 'CPF com todos os dígitos iguais não é válido.');
    return false;
  }

  let soma = 0;
  let resto;
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.substring(9, 10))) {
    Alert.alert('CPF inválido', 'Dígito verificador incorreto.');
    return false;
  }

  soma = 0;
  // Segundo dígito verificador
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.substring(10, 11))) {
    Alert.alert('CPF inválido', 'Dígito verificador incorreto.');
    return false;
  }

  return true;
};

const validarTelefone = (telefone: string): boolean => {
  const cleaned = telefone.replace(/\D/g, '');
  return cleaned.length === 11 && cleaned[2] === '9';
};

const calcularIdade = (dataNascimento: string): number => {
  const partes = dataNascimento.split('/');
  if (partes.length !== 3) return -1;
  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const ano = parseInt(partes[2], 10);
  if (isNaN(dia) || isNaN(mes + 1) || isNaN(ano)) return -1;
  const hoje = new Date();
  const nasc = new Date(ano, mes, dia);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

// ---------- COMPONENTE INPUT ----------
const InputField = ({ icon, rightIcon, onRightIconPress, ...props }: any) => (
  <View style={styles.inputContainer}>
    {icon && <View style={styles.inputIcon}>{icon}</View>}
    <TextInput style={styles.input} placeholderTextColor={COLORS.textMuted} {...props} />
    {rightIcon && (
      <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
        {rightIcon}
      </TouchableOpacity>
    )}
  </View>
);

export default function Register() {
  const { resetAuthState } = useAuth();

  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    senha: '',
    confirmarSenha: '',
  });
  const [loading, setLoading] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [modalTermosVisivel, setModalTermosVisivel] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ---------- VERIFICAR UNICIDADE ----------
  const verificarUnicidade = async (cpf: string, telefone: string): Promise<boolean> => {
    const cpfClean = cpf.replace(/\D/g, '');
    const telefoneClean = telefone.replace(/\D/g, '');

    const { data: cpfData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('cpf', cpfClean)
      .maybeSingle();
    if (cpfData) {
      Alert.alert('CPF já cadastrado', 'Este CPF já está sendo usado.');
      return false;
    }
    const { data: telData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('telefone', telefoneClean)
      .maybeSingle();
    if (telData) {
      Alert.alert('Telefone já cadastrado', 'Este telefone já está sendo usado.');
      return false;
    }
    return true;
  };

  // ---------- HANDLE REGISTER ----------
  const handleRegister = async () => {
    if (!validateForm()) return;
    if (!aceitouTermos) {
      Alert.alert('Aceite os Termos', 'Você precisa concordar com os Termos de Uso.');
      return;
    }

    const idade = calcularIdade(formData.data_nascimento);
    if (idade < 18) {
      Alert.alert('Idade mínima', 'Você precisa ter pelo menos 18 anos.');
      return;
    }

    if (!validarCPF(formData.cpf)) {
      // A função já exibe o alerta com o motivo específico
      return;
    }

    if (!validarTelefone(formData.telefone)) {
      Alert.alert('Telefone inválido', 'Digite um telefone com DDD e 9 dígitos (ex: (11) 99999-9999).');
      return;
    }

    const unico = await verificarUnicidade(formData.cpf, formData.telefone);
    if (!unico) return;

    setLoading(true);

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Erro ao criar usuário.');

      // 2. Verificar se o usuário já existe na tabela 'usuarios'
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingUser) {
        console.log('Usuário já existe na tabela, prosseguindo...');
      } else {
        // Converter DD/MM/AAAA para AAAA-MM-DD
        const partes = formData.data_nascimento.split('/');

        if (partes.length !== 3) {
          throw new Error('Data de nascimento inválida.');
        }

        const [dia, mes, ano] = partes;

        const dataNascimentoFormatada = `${ano}-${mes}-${dia}`;

        console.log('Data original:', formData.data_nascimento);
        console.log('Data formatada:', dataNascimentoFormatada);

        // 3. Inserir na tabela 'usuarios'
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: userId,
            email: formData.email.trim().toLowerCase(),
            nome_completo: formData.nome_completo.trim(),
            telefone: formData.telefone.replace(/\D/g, ''),
            cpf: formData.cpf.replace(/\D/g, ''),
            data_nascimento: dataNascimentoFormatada,
            tipo_usuario: 'passageiro',
            status: 'ativo',
          });

        if (insertError) {
          console.error('❌ Erro ao inserir usuário:', insertError);
          throw new Error(
            insertError.message || 'Não foi possível criar o perfil. Tente novamente.'
          );
        }

        console.log('✅ Usuário inserido na tabela.');
      }

      // 4. 🔄 Força o contexto a recarregar os dados do usuário
      await resetAuthState();

      Alert.alert(
        'Sucesso',
        'Cadastro realizado com sucesso!',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- VALIDAÇÃO BÁSICA ----------
  const validateForm = (): boolean => {
    const { nome_completo, email, telefone, cpf, data_nascimento, senha, confirmarSenha } = formData;
    if (!nome_completo || !email || !telefone || !cpf || !data_nascimento || !senha || !confirmarSenha) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return false;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return false;
    }
    if (senha.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    return true;
  };

  // ---------- MÁSCARAS ----------
  const updateFormData = (key: string, value: string) => {
    if (key === 'cpf') {
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
      let formatted = '';
      for (let i = 0; i < cleaned.length; i++) {
        if (i === 3 || i === 6) formatted += '.';
        if (i === 9) formatted += '-';
        formatted += cleaned[i];
      }
      setFormData(prev => ({ ...prev, [key]: formatted }));
      return;
    }
    if (key === 'telefone') {
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
      let formatted = '';
      for (let i = 0; i < cleaned.length; i++) {
        if (i === 0) formatted += '(';
        if (i === 2) formatted += ') ';
        if (i === 7) formatted += '-';
        formatted += cleaned[i];
      }
      setFormData(prev => ({ ...prev, [key]: formatted }));
      return;
    }
    if (key === 'data_nascimento') {
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
      let formatted = '';
      for (let i = 0; i < cleaned.length; i++) {
        if (i === 2 || i === 4) formatted += '/';
        formatted += cleaned[i];
      }
      setFormData(prev => ({ ...prev, [key]: formatted }));
      return;
    }
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // ---------- RENDER ----------
  return (
    <View style={styles.container}>
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

            <View style={styles.form}>
              <InputField
                icon={<User size={20} color={COLORS.gold} />}
                placeholder="Nome completo"
                placeholderTextColor={COLORS.textMuted}
                value={formData.nome_completo}
                onChangeText={v => updateFormData('nome_completo', v)}
              />
              <InputField
                icon={<Mail size={20} color={COLORS.gold} />}
                placeholder="E-mail"
                placeholderTextColor={COLORS.textMuted}
                value={formData.email}
                onChangeText={v => updateFormData('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InputField
                icon={<Phone size={20} color={COLORS.gold} />}
                placeholder="Telefone com DDD"
                placeholderTextColor={COLORS.textMuted}
                value={formData.telefone}
                onChangeText={v => updateFormData('telefone', v)}
                keyboardType="phone-pad"
              />
              <InputField
                icon={<FileText size={20} color={COLORS.gold} />}
                placeholder="CPF"
                placeholderTextColor={COLORS.textMuted}
                value={formData.cpf}
                onChangeText={v => updateFormData('cpf', v)}
                keyboardType="numeric"
              />
              <InputField
                icon={<Calendar size={20} color={COLORS.gold} />}
                placeholder="Data de nascimento (DD/MM/AAAA)"
                placeholderTextColor={COLORS.textMuted}
                value={formData.data_nascimento}
                onChangeText={v => updateFormData('data_nascimento', v)}
                keyboardType="numeric"
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Segurança</Text>
              </View>

              <InputField
                icon={<Lock size={20} color={COLORS.gold} />}
                placeholder="Senha (mínimo 6 caracteres)"
                placeholderTextColor={COLORS.textMuted}
                value={formData.senha}
                onChangeText={v => updateFormData('senha', v)}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? <EyeOff size={20} color={COLORS.textMuted} /> : <Eye size={20} color={COLORS.textMuted} />}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              <InputField
                icon={<Lock size={20} color={COLORS.gold} />}
                placeholder="Confirmar senha"
                placeholderTextColor={COLORS.textMuted}
                value={formData.confirmarSenha}
                onChangeText={v => updateFormData('confirmarSenha', v)}
                secureTextEntry={!showConfirmPassword}
                rightIcon={showConfirmPassword ? <EyeOff size={20} color={COLORS.textMuted} /> : <Eye size={20} color={COLORS.textMuted} />}
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setAceitouTermos(!aceitouTermos)}
                >
                  {aceitouTermos ? (
                    <CheckSquare size={24} color={COLORS.gold} />
                  ) : (
                    <Square size={24} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  Li e aceito os{' '}
                  <Text style={styles.termsLink} onPress={() => setModalTermosVisivel(true)}>
                    Termos de Uso
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.buttonText}>Criar conta</Text>
                )}
              </TouchableOpacity>
            </View>

            <Modal
              visible={modalTermosVisivel}
              animationType="slide"
              transparent
              onRequestClose={() => setModalTermosVisivel(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <ScrollView style={styles.modalScroll}>
                    <Text style={styles.modalTitle}>Termos de Uso</Text>
                    <Text style={styles.modalBody}>{TERMOS_DE_USO}</Text>
                  </ScrollView>
                  <TouchableOpacity style={styles.modalButton} onPress={() => setModalTermosVisivel(false)}>
                    <Text style={styles.modalButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Já tem conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.linkText}>Entre aqui</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- ESTILOS ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.gold, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
  form: { marginBottom: 24 },
  sectionHeader: { marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gold },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  rightIcon: { marginLeft: 8, padding: 4 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  checkbox: { marginRight: 10 },
  termsText: { color: COLORS.textSecondary, fontSize: 14, flexShrink: 1 },
  termsLink: { color: COLORS.gold, fontWeight: 'bold', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalScroll: { marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.gold, marginBottom: 12, textAlign: 'center' },
  modalBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  modalButton: { backgroundColor: COLORS.gold, paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
  modalButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  button: { backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.6 },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 16 },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  linkText: { fontSize: 14, color: COLORS.gold, fontWeight: 'bold' },
});