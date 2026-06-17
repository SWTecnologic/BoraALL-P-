// services/corridaService.ts
import { supabase } from '@/lib/supabase';
import { CorridaAtiva } from '@/types';
import NotificationService from './notificationService';

export class CorridaService {
  // ============= MÉTODOS EXISTENTES (MANTIDOS) =============
  
  static async buscarCorridaAtiva(userId: string): Promise<CorridaAtiva | null> {
    const { data, error } = await supabase
      .from('corridas')
      .select('*')
      .or(`passageiro_id.eq.${userId},motorista_id.eq.${userId}`)
      .in('status', ['solicitada', 'aceita', 'em_andamento', 'motorista_a_caminho', 'reservada'])
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
        cancelado_por: 'passageiro',
        updated_at: new Date().toISOString() 
      })
      .eq('id', corridaId)
      .select()
      .single();

    if (error) throw error;

    if (passageiroId) {
      await NotificationService.notificarCorridaCancelada(
        passageiroId,
        motivo,
        corridaId
      );
    }

    return data;
  }

  static async aceitarCorrida(corridaId: string, motoristaId: string, motoristaNome: string) {
    try {
      const { data: corrida, error: fetchError } = await supabase
        .from('corridas')
        .select('passageiro_id')
        .eq('id', corridaId)
        .single();

      if (fetchError) throw fetchError;

      // Usar a função do banco para aceitar corrida
      const { data, error } = await supabase.rpc('aceitar_corrida', {
        p_corrida_id: corridaId,
        p_motorista_id: motoristaId
      });

      if (error) throw error;

      const { data: passageiro } = await supabase
        .from('passageiros')
        .select('usuario_id')
        .eq('id', corrida.passageiro_id)
        .single();

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

  static async motoristaChegouEmbarque(corridaId: string, motoristaNome: string) {
    try {
      const { data: corrida, error: fetchError } = await supabase
        .from('corridas')
        .select('passageiro_id')
        .eq('id', corridaId)
        .single();

      if (fetchError) throw fetchError;

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

      const { data: passageiro } = await supabase
        .from('passageiros')
        .select('usuario_id')
        .eq('id', corrida.passageiro_id)
        .single();

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

  static async finalizarCorrida(corridaId: string, valorFinal: number, motoristaNome: string) {
    try {
      const { data: corrida, error: fetchError } = await supabase
        .from('corridas')
        .select('passageiro_id')
        .eq('id', corridaId)
        .single();

      if (fetchError) throw fetchError;

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

      const { data: passageiro } = await supabase
        .from('passageiros')
        .select('usuario_id')
        .eq('id', corrida.passageiro_id)
        .single();

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

  // ============= NOVOS MÉTODOS PARA STATUS RESERVADA =============

  /**
   * Solicita corrida com suporte a fila de espera
   * Se motorista estiver ocupado, cria como 'reservada'
   * Usa a trigger 'promover_reserva_motorista' automaticamente
   */
  static async solicitarCorridaComReserva(
    dados: {
      passageiro_id: string;
      origem_endereco: string;
      origem_latitude: number;
      origem_longitude: number;
      destino_endereco: string;
      destino_latitude: number;
      destino_longitude: number;
      distancia_km: number;
      duracao_estimada: number;
      valor_estimado: number;
      metodo_pagamento: string;
    },
    motoristaId?: string
  ): Promise<{
    success: boolean;
    corridaId?: string;
    status: string;
    posicaoFila?: number;
    tempoEstimadoEspera?: number | null;
    message?: string;
  }> {
    try {
      // Se não tem motorista específico, buscar motorista disponível ou ocupado
      let motoristaDestino = motoristaId;

      if (!motoristaDestino) {
        // Buscar motorista mais próximo
        const { data: motoristaProximo } = await supabase.rpc('buscar_motoristas_proximos', {
          p_lat: dados.origem_latitude,
          p_lng: dados.origem_longitude,
          p_raio_km: 5,
          p_limite: 1
        });

        if (motoristaProximo && motoristaProximo.length > 0) {
          motoristaDestino = motoristaProximo[0].motorista_id;
        }
      }

      if (!motoristaDestino) {
        return {
          success: false,
          status: 'sem_motoristas',
          message: 'Nenhum motorista disponível na região'
        };
      }

      // Verificar status do motorista
      const { data: motoristaStatus } = await supabase.rpc('verificar_status_motorista', {
        p_motorista_id: motoristaDestino
      });

      const motoristaOcupado = motoristaStatus?.status === 'em_corrida' || 
                                motoristaStatus?.status === 'reservado' ||
                                motoristaStatus?.status === 'em_andamento';

      // Determinar status da corrida
      const statusCorrida = motoristaOcupado ? 'reservada' : 'solicitada';

      // Criar a corrida
      const { data: corrida, error } = await supabase
        .from('corridas')
        .insert({
          passageiro_id: dados.passageiro_id,
          motorista_id: motoristaOcupado ? motoristaDestino : null,
          origem_endereco: dados.origem_endereco,
          origem_latitude: dados.origem_latitude,
          origem_longitude: dados.origem_longitude,
          destino_endereco: dados.destino_endereco,
          destino_latitude: dados.destino_latitude,
          destino_longitude: dados.destino_longitude,
          distancia_km: dados.distancia_km,
          duracao_estimada: dados.duracao_estimada,
          valor_estimado: dados.valor_estimado,
          metodo_pagamento: dados.metodo_pagamento,
          status: statusCorrida,
          data_solicitacao: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Se for reservada, atualizar status do motorista
      if (motoristaOcupado) {
        await supabase
          .from('motoristas')
          .update({ 
            status: 'reservado',
            disponivel: false
          })
          .eq('id', motoristaDestino);

        // Calcular posição na fila
        const { data: fila } = await supabase
          .from('corridas')
          .select('id')
          .eq('motorista_id', motoristaDestino)
          .eq('status', 'reservada')
          .order('data_solicitacao', { ascending: true });

        const posicao = fila?.findIndex(r => r.id === corrida.id) ?? 0;
        const posicaoFinal = posicao + 1;

        // Calcular tempo estimado (assumindo 2-3 min por posição)
        const tempoEstimado = posicaoFinal * 3;

        return {
          success: true,
          corridaId: corrida.id,
          status: 'reservada',
          posicaoFila: posicaoFinal,
          tempoEstimadoEspera: tempoEstimado,
          message: `Motorista está terminando uma corrida. Você é o ${posicaoFinal}º da fila. Tempo estimado: ${tempoEstimado} minutos.`
        };
      }

      return {
        success: true,
        corridaId: corrida.id,
        status: 'solicitada',
        message: 'Corrida solicitada com sucesso. Aguardando motorista aceitar.'
      };

    } catch (error) {
      console.error('Erro ao solicitar corrida com reserva:', error);
      return {
        success: false,
        status: 'erro',
        message: 'Erro ao processar solicitação'
      };
    }
  }

  /**
   * Busca status da fila para uma corrida reservada
   */
  static async getStatusFilaReservada(corridaId: string): Promise<{
    posicao: number;
    totalNaFila: number;
    tempoEstimado: number | null;
    statusMotorista: string;
    corridaAtualMotorista?: {
      distancia_km: number;
      duracao_estimada: number;
    } | null;
  }> {
    try {
      const { data: corrida } = await supabase
        .from('corridas')
        .select(`
          id,
          status,
          motorista_id,
          motoristas!corridas_motorista_id_fkey (
            id,
            status as motorista_status,
            corrida_atual_id
          )
        `)
        .eq('id', corridaId)
        .single();

      if (!corrida || corrida.status !== 'reservada') {
        return {
          posicao: 0,
          totalNaFila: 0,
          tempoEstimado: null,
          statusMotorista: 'disponivel'
        };
      }

      // Buscar posição na fila
      const { data: fila } = await supabase
        .from('corridas')
        .select('id')
        .eq('motorista_id', corrida.motorista_id)
        .eq('status', 'reservada')
        .order('data_solicitacao', { ascending: true });

      const posicao = fila?.findIndex(r => r.id === corridaId) ?? 0;
      const posicaoFinal = posicao + 1;
      const total = fila?.length ?? 0;

      // Buscar informações da corrida atual do motorista se existir
      let corridaAtualInfo = null;
      if (corrida.motoristas?.corrida_atual_id) {
        const { data: corridaAtual } = await supabase
          .from('corridas')
          .select('distancia_km, duracao_estimada')
          .eq('id', corrida.motoristas.corrida_atual_id)
          .single();
        
        if (corridaAtual) {
          corridaAtualInfo = corridaAtual;
        }
      }

      // Tempo estimado: corrida atual + (posicao - 1) * 3 min
      let tempoEstimado = null;
      if (corridaAtualInfo) {
        const tempoCorridaAtual = corridaAtualInfo.duracao_estimada || 
                                  (corridaAtualInfo.distancia_km / 25) * 60;
        tempoEstimado = Math.ceil(tempoCorridaAtual + (posicaoFinal - 1) * 3);
      } else {
        tempoEstimado = posicaoFinal * 3;
      }

      return {
        posicao: posicaoFinal,
        totalNaFila: total,
        tempoEstimado,
        statusMotorista: corrida.motoristas?.motorista_status || 'desconhecido',
        corridaAtualMotorista: corridaAtualInfo
      };

    } catch (error) {
      console.error('Erro ao buscar status da fila:', error);
      return {
        posicao: 0,
        totalNaFila: 0,
        tempoEstimado: null,
        statusMotorista: 'erro'
      };
    }
  }

  /**
   * Inscreve para receber atualizações em tempo real da fila
   * Usa a trigger 'promover_reserva_motorista' do banco
   */
  static async assinarAtualizacoesFila(
    corridaId: string,
    onStatusAtualizado: (data: {
      status: string;
      posicao?: number;
      totalNaFila?: number;
      mensagem?: string;
    }) => void
  ) {
    // Primeiro, buscar dados atuais
    const statusAtual = await this.getStatusFilaReservada(corridaId);
    if (statusAtual.posicao > 0) {
      onStatusAtualizado({
        status: 'reservada',
        posicao: statusAtual.posicao,
        totalNaFila: statusAtual.totalNaFila,
        mensagem: `Você é o ${statusAtual.posicao}º da fila. Aguarde aproximadamente ${statusAtual.tempoEstimado} minutos.`
      });
    }

    // Inscrever para mudanças na corrida
    const subscription = supabase
      .channel(`fila-corrida-${corridaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'corridas',
          filter: `id=eq.${corridaId}`,
        },
        async (payload) => {
          const novoStatus = payload.new.status;
          
          if (novoStatus === 'aceita' || novoStatus === 'motorista_a_caminho') {
            onStatusAtualizado({
              status: novoStatus,
              mensagem: 'Motorista está a caminho!'
            });
          } else if (novoStatus === 'reservada') {
            const novoStatusFila = await this.getStatusFilaReservada(corridaId);
            onStatusAtualizado({
              status: 'reservada',
              posicao: novoStatusFila.posicao,
              totalNaFila: novoStatusFila.totalNaFila,
              mensagem: `Você subiu para ${novoStatusFila.posicao}º lugar na fila!`
            });
          }
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Motorista aceita corrida reservada (quando termina a corrida atual)
   * Usa a função do banco 'aceitar_corrida_ocupado'
   */
  static async aceitarCorridaReservada(
    corridaId: string,
    motoristaId: string,
    tempoEstimadoChegada: number = 5
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.rpc('aceitar_corrida_ocupado', {
        p_corrida_id: corridaId,
        p_motorista_id: motoristaId,
        p_tempo_estimado_chegada: tempoEstimadoChegada
      });

      if (error) throw error;

      // Buscar passageiro para notificar
      const { data: corrida } = await supabase
        .from('corridas')
        .select('passageiro_id')
        .eq('id', corridaId)
        .single();

      if (corrida?.passageiro_id) {
        const { data: passageiro } = await supabase
          .from('passageiros')
          .select('usuario_id')
          .eq('id', corrida.passageiro_id)
          .single();

        if (passageiro?.usuario_id) {
          await NotificationService.notificarMotoristaACaminho(
            passageiro.usuario_id,
            motoristaId,
            corridaId
          );
        }
      }

      return { success: true, message: 'Motorista está a caminho!' };
    } catch (error) {
      console.error('Erro ao aceitar corrida reservada:', error);
      return { success: false, message: 'Erro ao processar' };
    }
  }

  /**
   * Verifica se o motorista tem fila de espera
   */
  static async getFilaMotorista(motoristaId: string): Promise<{
    totalReservas: number;
    proximaCorrida?: { id: string; distancia_km: number; origem_endereco: string };
  }> {
    try {
      const { data: reservas } = await supabase
        .from('corridas')
        .select('id, distancia_km, origem_endereco')
        .eq('motorista_id', motoristaId)
        .eq('status', 'reservada')
        .order('data_solicitacao', { ascending: true });

      return {
        totalReservas: reservas?.length ?? 0,
        proximaCorrida: reservas && reservas.length > 0 ? reservas[0] : undefined
      };
    } catch (error) {
      console.error('Erro ao buscar fila do motorista:', error);
      return { totalReservas: 0 };
    }
  }
}

export default CorridaService;