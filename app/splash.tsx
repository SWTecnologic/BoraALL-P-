// app/splash.tsx
import { View, Text, StyleSheet, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

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
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0A', '#1A1A1A', '#2D1F0A']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Círculo decorativo dourado ao fundo */}
        <View style={styles.glowCircle1} />
        <View style={styles.glowCircle2} />
        
        <View style={styles.content}>
          {/* Ícone/Logo com brilho dourado */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoGlow} />
            <Image 
              source={require('@/assets/images/LogoAli.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Nome do App com efeito dourado */}
          <Text style={styles.title}>
            Bora<Text style={styles.titleHighlight}>Ali</Text>
          </Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.subtitle}>
            Sua mobilidade em boas mãos
          </Text>
          
          {/* Barras de progresso animadas com cores douradas */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={styles.progressBarFill} />
            </View>
            <View style={[styles.progressBarBackground, styles.progressBarSecondary]}>
              <View style={[styles.progressBarFill, styles.progressBarFillSecondary]} />
            </View>
          </View>
          
          <ActivityIndicator size="small" color="#F4B62A" style={styles.loader} />
          
          {/* Versão do App */}
          <Text style={styles.versionText}>v3.6.26</Text>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(244, 182, 42, 0.05)',
  },
  glowCircle2: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(244, 182, 42, 0.03)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 30,
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 80,
    backgroundColor: 'rgba(244, 182, 42, 0.15)',
    shadowColor: '#F4B62A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(244, 182, 42, 0.3)',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 1,
    textShadowColor: 'rgba(244, 182, 42, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleHighlight: {
    color: '#F4B62A',
    fontWeight: '800',
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#F4B62A',
    borderRadius: 2,
    marginVertical: 12,
    shadowColor: '#F4B62A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  progressContainer: {
    width: width * 0.5,
    gap: 6,
    marginBottom: 24,
  },
  progressBarBackground: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarSecondary: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressBarFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#F4B62A',
    borderRadius: 3,
    shadowColor: '#F4B62A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  progressBarFillSecondary: {
    width: '45%',
    height: '100%',
    backgroundColor: '#D4A020',
    borderRadius: 3,
  },
  loader: {
    marginTop: 4,
  },
  versionText: {
    position: 'absolute',
    bottom: -60,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: 0.5,
    fontWeight: '300',
  },
});