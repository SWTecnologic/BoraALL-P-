// services/pushNotificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';

// Seu projectId
const PROJECT_ID = 'bb4a269c-dfc8-4865-a866-fd3f43f34c74';

// Configurar handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private static instance: PushNotificationService;
  private currentToken: string | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          '🔔 Notificações',
          'Ative as notificações para receber alertas de corridas.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurar', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  }

  async setupAndroidChannels() {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('corridas', {
          name: 'Corridas',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B00',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        await Notifications.setNotificationChannelAsync('mensagens', {
          name: 'Mensagens',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });

        console.log('✅ Canais Android configurados');
      } catch (error) {
        console.error('Erro ao configurar canais:', error);
      }
    }
  }

  async getPushToken(): Promise<string | null> {
    try {
      console.log('📱 Usando projectId:', PROJECT_ID);
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: PROJECT_ID,
      });
      
      console.log('📱 Push Token obtido:', token.data);
      this.currentToken = token.data;
      return token.data;
    } catch (error: any) {
      console.error('Erro ao obter token:', error.message);
      return null;
    }
  }

  async saveTokenToBackend(userId: string, token: string): Promise<boolean> {
    try {
      // CORRIGIDO: Usando os nomes corretos das colunas (updated_at em vez de atualizado_em)
      const { error } = await supabase
        .from('usuarios')
        .update({
          push_token: token,
          push_token_updated_at: new Date().toISOString(),
          push_token_status: 'active',
          push_token_platform: Platform.OS,
          push_token_environment: Platform.OS === 'ios' ? 'development' : 'production',
          updated_at: new Date().toISOString(), // ← CORRIGIDO: updated_at em vez de atualizado_em
        })
        .eq('id', userId);

      if (error) {
        console.error('Erro detalhado ao salvar token:', error);
        throw error;
      }
      
      console.log('✅ Token salvo no backend com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar token:', error);
      return false;
    }
  }

  async removeToken(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          push_token: null,
          push_token_status: 'inactive',
          push_token_updated_at: null,
          updated_at: new Date().toISOString(), // ← CORRIGIDO: updated_at
        })
        .eq('id', userId);

      if (error) throw error;
      console.log('✅ Token removido com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao remover token:', error);
      return false;
    }
  }

  async initialize(userId: string): Promise<boolean> {
    console.log('🚀 Inicializando push notifications para usuário:', userId);

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return false;

    const token = await this.getPushToken();
    if (!token) {
      console.log('❌ Não foi possível obter push token');
      return false;
    }

    const saved = await this.saveTokenToBackend(userId, token);
    
    if (saved) {
      console.log('🎉 Push notifications inicializadas com sucesso!');
    } else {
      console.log('⚠️ Push token obtido mas não foi possível salvar no backend');
    }
    
    return saved;
  }

  async refreshToken(userId: string): Promise<boolean> {
    console.log('🔄 Atualizando push token...');
    
    const token = await this.getPushToken();
    if (!token) return false;
    
    return await this.saveTokenToBackend(userId, token);
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

export default PushNotificationService.getInstance();