// app/_layout.tsx
import { useEffect, useRef } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, AppStateStatus } from 'react-native';

// Hook para monitorar estado do app
function useAppStateMonitor() {
  const { session, signOut } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // Quando voltar do background após muito tempo
      if (appState.current.match(/background/) && nextAppState === 'active') {
        console.log('📱 App voltou do background, verificando sessão...');
        
        // Se não tem session, faz logout para limpar estado
        if (!session) {
          console.log('⚠️ Session perdida, limpando estado...');
          await signOut();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [session, signOut]);
}

function RedirectIfNeeded({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      console.log('⏳ RedirectIfNeeded - Aguardando auth carregar...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inSplash = segments[0] === 'splash';
    const isLoggedIn = !!session;

    console.log('Redirect check:', { 
      inAuthGroup, 
      inSplash,
      isLoggedIn, 
      segments: segments.join('/'),
    });

    // Se estiver na splash, não redireciona (ela mesma cuida disso)
    if (inSplash) return;

    if (!isLoggedIn && !inAuthGroup) {
      // Não logado e não está em (auth) → vai para splash
      console.log('🔴 Redirecionando para splash');
      router.replace('/splash');
    } else if (isLoggedIn && inAuthGroup) {
      // Logado e tentando acessar (auth) → vai para tabs
      console.log('🟢 Redirecionando para tabs');
      router.replace('/(tabs)');
    }
  }, [session, authLoading, segments]);

  return children;
}

function RootLayoutContent() {
  const { loading: authLoading } = useAuth();
  
  // Monitora estado do app
  useAppStateMonitor();
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="corrida/[id]" 
        options={{ 
          headerShown: false,
          animation: 'slide_from_bottom',
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RedirectIfNeeded>
          <RootLayoutContent />
        </RedirectIfNeeded>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}