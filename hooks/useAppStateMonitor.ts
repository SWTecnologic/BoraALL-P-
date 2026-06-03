// hooks/useAppStateMonitor.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export function useAppStateMonitor() {
  const { session, signOut } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // Quando voltar do background após muito tempo
      if (appState.current.match(/background/) && nextAppState === 'active') {
        console.log('App voltou do background, verificando token...');
        
        // Se não tem session, faz logout para limpar estado
        if (!session) {
          console.log('Session perdida, fazendo logout...');
          await signOut();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [session, signOut]);
}