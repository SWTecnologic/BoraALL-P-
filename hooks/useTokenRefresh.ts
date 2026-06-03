// hooks/useTokenRefresh.ts
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, refreshSession } from '@/lib/supabase';
import { AppState } from 'react-native';

export function useTokenRefresh() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading || !session) return;

    const checkAndRefreshToken = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          const expiresAt = currentSession.expires_at;
          const now = Math.floor(Date.now() / 1000);
          
          // Se faltar menos de 5 minutos (300 segundos), renovar
          if (expiresAt && (expiresAt - now) < 300) {
            console.log('🔄 Token próximo de expirar, renovando...');
            await refreshSession();
          } else if (expiresAt && expiresAt < now) {
            console.log('❌ Token expirado!');
            // Token expirado - o AuthContext vai lidar com isso
          }
        }
      } catch (error) {
        console.error('❌ Erro ao verificar token:', error);
      }
    };

    // Verificar a cada 2 minutos
    const interval = setInterval(checkAndRefreshToken, 120000);
    
    // Verificar quando app voltar do background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App voltou do background, verificando token...');
        checkAndRefreshToken();
      }
    });

    // Verificar imediatamente
    checkAndRefreshToken();

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [session?.user?.id, loading]);
}