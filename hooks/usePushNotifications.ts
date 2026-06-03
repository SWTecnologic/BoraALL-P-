// hooks/usePushNotifications.ts
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import PushNotificationService from '@/services/pushNotificationService';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function usePushNotifications() {
  const router = useRouter();
  const { session, usuario, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    // Verifica se está rodando no Expo Go
    const isExpoGo = !__DEV__ && !Constants.executionEnvironment?.includes('standalone');
    
    if (isExpoGo) {
      console.log('⚠️ Expo Go detectado - push notifications limitadas no desenvolvimento');
      return;
    }
    
    // Inicializar push quando usuário logar
    if (session?.user?.id && usuario) {
      console.log('🚀 Inicializando push notifications...');
      PushNotificationService.initialize(session.user.id).catch(err => {
        console.error('Erro ao inicializar push:', err);
      });
    }

    // Listener para notificações recebidas
    let subscription1: any;
    let subscription2: any;

    try {
      subscription1 = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('📨 Notificação recebida:', notification.request.content);
        }
      );

      // Listener para clique na notificação
      subscription2 = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data;
          console.log('👆 Clicou na notificação:', data);
          
          if (data?.corridaId) {
            router.push(`/corrida/${data.corridaId}`);
          } else if (data?.screen) {
            router.push(data.screen);
          }
        }
      );
    } catch (error) {
      console.error('Erro ao configurar listeners de notificação:', error);
    }

    return () => {
      if (subscription1) subscription1.remove();
      if (subscription2) subscription2.remove();
    };
  }, [session?.user?.id, usuario, loading]);
}