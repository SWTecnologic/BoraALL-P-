// app/splash.tsx
import { View, Text, StyleSheet, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { session, loading: authLoading, resetAuthState } = useAuth();
  const hasRedirected = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // TIMEOUT DE SEGURANÇA - NUNCA FICA TRAVADO (8 segundos)
    timeoutRef.current = setTimeout(() => {
      if (!hasRedirected.current) {
        console.log('⚠️ TIMEOUT DA SPLASH - Redirecionando para login');
        hasRedirected.current = true;
        router.replace('/(auth)/login');
      }
    }, 8000);

    // Reset auth state quando entrar na splash
    resetAuthState();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    console.log('Splash - Auth loading:', authLoading, 'Session:', !!session);
    
    // Se já redirecionou, não faz nada
    if (hasRedirected.current) return;
    
    // Se ainda está carregando, aguarda
    if (authLoading) {
      console.log('⏳ Aguardando AuthContext carregar...');
      return;
    }
    
    // AuthContext terminou de carregar!
    console.log('✅ AuthContext finalizado, verificando session...');
    
    // Limpa o timeout já que vamos redirecionar
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Decisão final baseada no AuthContext
    if (session) {
      console.log('🚀 Usuário autenticado! Indo para tabs');
      hasRedirected.current = true;
      router.replace('/(tabs)');
    } else {
      console.log('🔐 Usuário não autenticado! Indo para login');
      hasRedirected.current = true;
      router.replace('/(auth)/login');
    }
  }, [authLoading, session]);

  return (
    <LinearGradient
      colors={['#FF6B00', '#E55A00', '#CC3300']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <Image 
          source={require('@/assets/images/LogoAli.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>QuebraCar</Text>
        <Text style={styles.subtitle}>Sua mobilidade em boas mãos</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
        </View>
        
        <ActivityIndicator size="small" color="#FFFFFF" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 30,
    borderRadius: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFE0B2',
    marginBottom: 40,
    textAlign: 'center',
  },
  progressContainer: {
    width: width * 0.6,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  loader: {
    marginTop: 10,
  },
});