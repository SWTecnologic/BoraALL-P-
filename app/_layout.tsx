// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

function RedirectIfNeeded({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { usuario, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoggedIn = !!usuario;

    console.log('Redirect check:', { 
      inAuthGroup, 
      isLoggedIn, 
      segments: segments.join('/'),
      usuario: usuario?.id 
    });

    if (!isLoggedIn && !inAuthGroup) {
      // Não logado e não está em (auth) → vai para login
      console.log('Redirecionando para login');
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup) {
      // Logado e tentando acessar (auth) → vai para as abas
      console.log('Redirecionando para tabs');
      router.replace('/(tabs)');
    }
  }, [usuario, authLoading, segments]);

  return children;
}

function RootLayoutContent() {
  const { loading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
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