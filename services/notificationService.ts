// services/notificationService.ts
import PushNotificationService from './pushNotificationService';
import { supabase } from '@/lib/supabase';

class NotificationService {
  private static instance: NotificationService;
  private pushService = PushNotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Método genérico para enviar push notification
  private async enviarPush(
    usuarioId: string,
    titulo: string,
    corpo: string,
    dados?: any
  ): Promise<boolean> {
    try {
      // Buscar o push_token do usuário no banco
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('push_token')
        .eq('id', usuarioId)
        .single();

      if (error || !usuario?.push_token) {
        console.log(`❌ Usuário ${usuarioId} não tem push token`);
        return false;
      }

      // Montar a mensagem para enviar via Expo
      const message = {
        to: usuario.push_token,
        sound: 'default',
        title: titulo,
        body: corpo,
        data: dados || {},
        priority: 'high' as const,
      };

      // Enviar para API do Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data?.status === 'ok') {
        console.log(`✅ Notificação enviada para ${usuarioId}: ${titulo}`);
        return true;
      } else {
        console.error('Erro ao enviar:', result);
        return false;
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }

  // ============= MÉTODOS ESPECÍFICOS DE NOTIFICAÇÕES =============

  // 1. Corrida foi aceita pelo motorista
  async notificarCorridaAceita(
    passageiroId: string,
    motoristaNome: string,
    motoristaId: string,
    corridaId: string
  ) {
    return this.enviarPush(
      passageiroId,
      '🚗 Corrida Aceita!',
      `${motoristaNome} aceitou sua corrida. Ele está a caminho.`,
      {
        type: 'corrida_aceita',
        corridaId,
        motoristaId,
        screen: 'corrida/ativa',
        action: 'acompanhar'
      }
    );
  }

  // 2. Motorista chegou ao local de embarque
  async notificarMotoristaChegou(
    passageiroId: string,
    motoristaNome: string,
    corridaId: string
  ) {
    return this.enviarPush(
      passageiroId,
      '📍 Motorista Chegou!',
      `${motoristaNome} chegou ao local de embarque. Por favor, dirija-se ao veículo.`,
      {
        type: 'motorista_chegou',
        corridaId,
        screen: 'corrida/ativa',
        action: 'embarcar'
      }
    );
  }

  // 3. Motorista chegou ao destino
  async notificarMotoristaChegouDestino(
    passageiroId: string,
    motoristaNome: string,
    corridaId: string
  ) {
    return this.enviarPush(
      passageiroId,
      '🏁 Destino Alcançado!',
      `Você chegou ao seu destino. ${motoristaNome} finalizou a corrida.`,
      {
        type: 'motorista_chegou_destino',
        corridaId,
        screen: 'corrida/avaliacao',
        action: 'avaliar'
      }
    );
  }

  // 4. Corrida finalizada
  async notificarCorridaFinalizada(
    passageiroId: string,
    motoristaNome: string,
    valor: number,
    corridaId: string
  ) {
    return this.enviarPush(
      passageiroId,
      '✅ Corrida Finalizada!',
      `${motoristaNome} finalizou sua corrida. Valor total: R$ ${valor.toFixed(2)}`,
      {
        type: 'corrida_finalizada',
        corridaId,
        screen: 'corrida/avaliacao',
        action: 'avaliar'
      }
    );
  }

  // 5. Nova mensagem no chat
  async notificarNovaMensagem(
    destinatarioId: string,
    remetenteNome: string,
    mensagem: string,
    corridaId: string
  ) {
    const preview = mensagem.length > 50 ? mensagem.substring(0, 50) + '...' : mensagem;
    return this.enviarPush(
      destinatarioId,
      '💬 Nova Mensagem',
      `${remetenteNome}: ${preview}`,
      {
        type: 'nova_mensagem',
        corridaId,
        screen: 'corrida/chat',
        action: 'abrir_chat'
      }
    );
  }

  // 6. Corrida cancelada
  async notificarCorridaCancelada(
    passageiroId: string,
    motivo: string,
    corridaId: string
  ) {
    return this.enviarPush(
      passageiroId,
      '⚠️ Corrida Cancelada',
      `Sua corrida foi cancelada. Motivo: ${motivo}`,
      {
        type: 'corrida_cancelada',
        corridaId,
        screen: 'corrida/historico'
      }
    );
  }
}

export default NotificationService.getInstance();