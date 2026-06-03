// services/corridaService.ts
import { supabase } from '@/lib/supabase';
import { CorridaAtiva } from '@/types';
import NotificationService from './notificationService';

export class CorridaService {
  static async buscarCorridaAtiva(userId: string): Promise<CorridaAtiva | null> {
    const { data, error } = await supabase
      .from('corridas')
      .select('*')
      .or(`passageiro_id.eq.${userId},motorista_id.eq.${userId}`)
      .in('status', ['solicitada', 'aceita', 'em_andamento', 'motorista_a_caminho'])
      .order('data_solicitacao', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  }

  static async criarCorrida(dados: Omit<CorridaAtiva, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('corridas')
      .insert([dados])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async atualizarStatus(corridaId: string, status: string) {
    const { data, error } = await supabase
      .from('corridas')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', corridaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async cancelarCorrida(corridaId: string, motivo: string, passageiroId?: string) {
    const { data, error } = await supabase
      .from('corridas')
      .update({ 
        status: 'cancelada', 
        comentario_passageiro: motivo,
        updated_at: new Date().toISOString() 
      })
      .eq('id', corridaId)
      .select()
      .single();

    if (error) throw error;

    // 🔔 NOTIFICAÇÃO: Corrida cancelada (se tiver passageiroId)
    if (passageiroId) {
      await NotificationService.notificarCorridaCancelada(
        passageiroId,
        motivo,
        corridaId
      );
    }

    return data;
  }

  // ============= NOVOS MÉTODOS COM NOTIFICAÇÕES =============

  // 1. Motorista aceita a corrida
  static async aceitarCorrida(corridaId: string, motoristaId: string, motoristaNome: string) {
    try {
      // Buscar dados da corrida antes de atualizar
      const { data: corrida, error: fetchError } = await supabase
        .from('corridas')
        .select('passageiro_id')
        .eq('id', corridaId)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar status da corrida
      const { data, error } = await supabase
        .from('corridas')
        .update({ 
          status: 'aceita', 
          motorista_id: motoristaId,
          data_aceite: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', corridaId)
        .select()
        .single();

      if (error) throw error;

      // Buscar o usuario_id do passageiro
      const { data: passageiro } = await supabase
        .from('passageiros')
        .select('usuario_id')
        .eq('id', corrida.passageiro_id)
        .single();

      // 🔔 NOTIFICAÇÃO: Corrida aceita
      if (passageiro?.usuario_id) {
        await NotificationService.notificarCorridaAceita(
          passageiro.usuario_id,
          motoristaNome,
          motoristaId,
          corridaId
        );
      }

      return { success: true, data };
    } catch (error) {
      console.error('Erro ao aceitar corrida:', error);
      return { success: false, error };
    }
  }

  // 2. Motorista chegou ao local de embarque
  static async motoristaChegouEmbarque(corridaId: string, motoristaNome: string) {
    try {
      // Buscar dados da corrida
      const { data: corrida, error: fetchError } = await supabase
        .from('corridas')
        .select('passageiro_id')
        .eq('id', corridaId)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar status
      const { data, error } = await supabase
        .from('corridas')
        .update({ 
          status: 'aguardando_embarque',
          updated_at: new Date().toISOString()
        })
        .eq('id', corridaId)
        .select()
        .single();

      if (error) throw error;

      // Buscar o usuario_id do passageiro
      const { data: passageiro } = await supabase
        .from('passageiros')
        .select('usuario_id')
        .eq('id', corrida.passageiro_id)
        .single();

      // 🔔 NOTIFICAÇÃO: Motorista chegou
      if (passageiro?.usuario_id) {
        await NotificationService.notificarMotoristaChegou(
          passageiro.usuario_id,
          motoristaNome,
          corridaId
        );
      }

      return { success: true, data };
    } catch (error) {
      console.error('Erro ao registrar chegada:', error);
      return { success: false, error };
    }
  }

  // 3. Motorista chegou ao destino (em andamento -> finalizando)
  static async motoristaChegouDestino(corridaId: string, motoristaNome: string) {
    try {
      // Buscar dados da corrida
      const { data: corrida, error: fetchError } = await supabase
        .from('corridas')
        .select('passageiro_id, valor_estimado')
        .eq('id', corridaId)
        .single();

      if (fetchError) throw fetchError;

      // Buscar o usuario_id do passageiro
      const { data: passageiro } = await supabase
        .from('passageiros')
        .select('usuario_id')
        .eq('id', corrida.passageiro_id)
        .single();

      // 🔔 NOTIFICAÇÃO: Chegou ao destino
      if (passageiro?.usuario_id) {
        await NotificationService.notificarMotoristaChegouDestino(
          passageiro.usuario_id,
          motoristaNome,
          corridaId
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Erro:', error);
      return { success: false, error };
    }
  }

  // 4. Finalizar corrida
  static async finalizarCorrida(corridaId: string, valorFinal: number, motoristaNome: string) {
    try {
      // Buscar dados da corrida
      const { data: corrida, error: fetchError } = await supabase
        .from('corridas')
        .select('passageiro_id')
        .eq('id', corridaId)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar status e valor final
      const { data, error } = await supabase
        .from('corridas')
        .update({ 
          status: 'finalizada',
          valor_final: valorFinal,
          data_finalizacao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', corridaId)
        .select()
        .single();

      if (error) throw error;

      // Buscar o usuario_id do passageiro
      const { data: passageiro } = await supabase
        .from('passageiros')
        .select('usuario_id')
        .eq('id', corrida.passageiro_id)
        .single();

      // 🔔 NOTIFICAÇÃO: Corrida finalizada
      if (passageiro?.usuario_id) {
        await NotificationService.notificarCorridaFinalizada(
          passageiro.usuario_id,
          motoristaNome,
          valorFinal,
          corridaId
        );
      }

      return { success: true, data };
    } catch (error) {
      console.error('Erro ao finalizar corrida:', error);
      return { success: false, error };
    }
  }

  // 5. Iniciar corrida (embarcou)
  static async iniciarCorrida(corridaId: string) {
    const { data, error } = await supabase
      .from('corridas')
      .update({ 
        status: 'em_andamento',
        data_inicio: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', corridaId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  }
}