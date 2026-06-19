// app/_layout.tsx
import { useEffect, useRef } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Hook para monitorar estado do app
function useAppStateMonitor() {
  const { session, resetAuthState, signOut, loading: authLoading } = useAuth();
  const appState = useRef(AppState.currentState);
  const lastBackgroundTime = useRef<number>(0);
  const isRefreshing = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // Ignora se está carregando
      if (authLoading) {
        console.log('⏳ App State change ignorado - auth ainda carregando');
        return;
      }

      console.log('📱 App State mudou:', appState.current, '->', nextAppState);
      
      // Quando o app vai para background, registra o timestamp
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastBackgroundTime.current = Date.now();
        console.log('⏰ App foi para background às:', new Date(lastBackgroundTime.current).toISOString());
      }
      
      // Quando voltar do background/inactive para ativo
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Evita múltiplos refreshs simultâneos
        if (isRefreshing.current) {
          console.log('⚠️ Refresh já em andamento, ignorando...');
          return;
        }

        console.log('🔄 App voltou para primeiro plano!');
        
        // Calcula quanto tempo ficou em background
        const timeInBackground = Date.now() - (lastBackgroundTime.current || Date.now());
        const secondsInBackground = Math.floor(timeInBackground / 1000);
        const minutesInBackground = Math.floor(secondsInBackground / 60);
        
        console.log(`⏱️ Tempo em background: ${secondsInBackground}s (${minutesInBackground}min ${secondsInBackground % 60}s)`);
        
        // Se ficou mais de 30 segundos em background, tenta renovar token
        // No iOS, pode ser necessário um tempo menor devido ao gerenciamento de memória
        const threshold = Platform.OS === 'ios' ? 15 : 30;
        
        if (secondsInBackground > threshold) {
          console.log(`🔄 Tentando renovar token após ${minutesInBackground}min em background...`);
          
          isRefreshing.current = true;
          
          try {
            // Tenta refresh do token
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('❌ Erro ao renovar token:', refreshError.message);
              
              // Se o refresh falhou, verifica se ainda tem sessão
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              
              if (currentSession) {
                console.log('✅ Sessão ainda válida mesmo com erro no refresh');
                await resetAuthState();
              } else {
                console.log('🔐 Sessão expirada, fazendo logout...');
                await signOut();
              }
            } else if (refreshData.session) {
              console.log('✅ Token renovado com sucesso!');
              console.log('📅 Novo token expira em:', new Date((refreshData.session.expires_at || 0) * 1000).toISOString());
              await resetAuthState();
            } else {
              console.log('⚠️ Nenhuma sessão após refresh, fazendo logout...');
              await signOut();
            }
          } catch (error: any) {
            console.error('❌ Erro crítico ao renovar sessão:', error?.message || error);
            
            // Tenta recuperar estado atual de qualquer forma
            try {
              const { data: { session: fallbackSession } } = await supabase.auth.getSession();
              if (fallbackSession) {
                console.log('✅ Sessão recuperada após erro crítico');
                await resetAuthState();
              } else {
                console.log('🔐 Nenhuma sessão recuperável, fazendo logout...');
                await signOut();
              }
            } catch (fallbackError) {
              console.error('❌ Erro no fallback:', fallbackError);
              await signOut();
            }
          } finally {
            isRefreshing.current = false;
          }
        } else {
          console.log('⏱️ Pouco tempo em background, verificando sessão atual...');
          
          // Mesmo com pouco tempo, verifica se a sessão ainda está ok
          try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            if (!currentSession && session) {
              console.log('⚠️ Sessão perdida mesmo com pouco tempo em background');
              await signOut();
            } else if (currentSession && !session) {
              console.log('✅ Sessão encontrada, restaurando estado...');
              await resetAuthState();
            }
          } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
          }
        }
      }
      
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [session, resetAuthState, signOut, authLoading]);
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
  
  console.log('🎨 Renderizando RootLayoutContent, auth loading:', authLoading);
  
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