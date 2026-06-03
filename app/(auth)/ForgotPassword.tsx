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

export default function ForgotPassword() {
  const [step, setStep] = useState<'phone' | 'code' | 'newPassword'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Função para gerar código aleatório de 6 dígitos
  const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Simula envio de SMS para o celular
  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Erro', 'Digite um número de celular válido (com DDD).');
      return;
    }

    setLoading(true);
    try {
      // Aqui você chamaria sua API para enviar o SMS real
      const randomCode = generateRandomCode();
      setGeneratedCode(randomCode);
      
      // Simula envio de SMS (em produção, isso seria feito pelo backend)
      console.log(`Código enviado para ${phone}: ${randomCode}`);
      Alert.alert('Código enviado', `Enviamos um código para ${phone} (simulação: ${randomCode})`);
      
      setStep('code');
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Verifica se o código digitado está correto
  const handleVerifyCode = () => {
    if (!code) {
      Alert.alert('Erro', 'Digite o código recebido.');
      return;
    }

    if (code !== generatedCode) {
      Alert.alert('Erro', 'Código inválido. Tente novamente.');
      return;
    }

    Alert.alert('Código verificado', 'Agora você pode criar uma nova senha.');
    setStep('newPassword');
  };

  // Troca a senha
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

    setLoading(true);
    try {
      // Aqui você chamaria sua API para atualizar a senha do usuário
      console.log(`Nova senha para ${phone}: ${newPassword}`);
      Alert.alert('Sucesso', 'Senha alterada com sucesso! Faça login com sua nova senha.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código
  const handleResendCode = () => {
    const newCode = generateRandomCode();
    setGeneratedCode(newCode);
    console.log(`Novo código enviado: ${newCode}`);
    Alert.alert('Código reenviado', `Novo código: ${newCode} (simulação)`);
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
              <TouchableOpacity style={styles.button} onPress={handleVerifyCode}>
                <Text style={styles.buttonText}>Verificar código</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResendCode}>
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
    color: '#FF6600',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6600',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6600',
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
    backgroundColor: '#FF6600',
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
    color: '#FF6600',
    marginTop: 16,
    textDecorationLine: 'underline',
  },
});