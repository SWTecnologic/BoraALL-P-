import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

// 🔥 URL DA SUA EDGE FUNCTION NO SUPABASE
const API_URL = 'https://tvzcvyvfhsslxggqwtny.supabase.co/functions/v1';

// 🔥 PEGA A ANON KEY DO SUPABASE
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

export default function ForgotPassword() {
  const [step, setStep] = useState<'phone' | 'code' | 'newPassword'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 FUNÇÃO PARA FAZER REQUISIÇÕES COM O HEADER CORRETO
  const fetchWithAuth = async (endpoint: string, body: any) => {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    return response;
  };

  // 🔥 ENVIA CÓDIGO PARA O BACKEND (EDGE FUNCTION)
  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Erro', 'Digite um número de celular válido (com DDD).');
      return;
    }

    setLoading(true);

    try {
      console.log('📤 Enviando código para:', phone);

      const response = await fetchWithAuth('send-reset-code', {
        telefone: phone,
      });

      const data = await response.json();
      console.log('📥 Resposta do envio:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código');
      }

      Alert.alert(
        '✅ Código enviado!',
        `Seu código de verificação foi enviado para seu celular.`,
        [{ text: 'OK' }]
      );

      setStep('code');
    } catch (error: any) {
      console.error('❌ Erro ao enviar:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 VERIFICA CÓDIGO NO BACKEND
  const handleVerifyCode = async () => {
    if (!code) {
      Alert.alert('Erro', 'Digite o código recebido.');
      return;
    }

    console.log('🔍 Verificando código:', code);
    console.log('📱 Telefone:', phone);

    setLoading(true);

    try {
      const response = await fetchWithAuth('verify-reset-code', {
        telefone: phone,
        code: code,
      });

      const data = await response.json();
      console.log('📥 Resposta da verificação:', data);
      console.log('📊 Status da resposta:', response.status);

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
      }

      Alert.alert('Sucesso', 'Código verificado! Agora crie uma nova senha.');
      setStep('newPassword');
    } catch (error: any) {
      console.error('❌ Erro na verificação:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ALTERA SENHA NO BACKEND
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    console.log('🔑 Alterando senha para:', phone);

    setLoading(true);

    try {
      const response = await fetchWithAuth('reset-password', {
        telefone: phone,
        code: code,
        password: newPassword,
      });

      const data = await response.json();
      console.log('📥 Resposta da alteração:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar senha');
      }

      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('❌ Erro ao alterar:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 REENVIA CÓDIGO
  const handleResendCode = async () => {
    setLoading(true);

    try {
      console.log('🔄 Reenviando código para:', phone);

      const response = await fetchWithAuth('send-reset-code', {
        telefone: phone,
      });

      const data = await response.json();
      console.log('📥 Resposta do reenvio:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao reenviar código');
      }

      Alert.alert('Sucesso', 'Novo código enviado para seu celular.');
    } catch (error: any) {
      console.error('❌ Erro ao reenviar:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Esqueceu a senha?</Text>

          {step === 'phone' && (
            <View style={styles.form}>
              <Text style={styles.label}>Celular</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(11) 99999-9999"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'code' && (
            <View style={styles.form}>
              <Text style={styles.label}>Código de verificação</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="Digite o código de 6 dígitos"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Verificar código</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                <Text style={styles.resendText}>Reenviar código</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'newPassword' && (
            <View style={styles.form}>
              <Text style={styles.label}>Nova senha</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#999"
                secureTextEntry
              />
              <Text style={styles.label}>Confirmar nova senha</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Digite a senha novamente"
                placeholderTextColor="#999"
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Alterar senha</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFD700',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#B87333',
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  resendText: {
    textAlign: 'center',
    color: '#FFD700',
    marginTop: 16,
    textDecorationLine: 'underline',
  },
});