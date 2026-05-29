// services/corridaService.ts
import { supabase } from '@/lib/supabase';
import { CorridaAtiva } from '@/types';

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

  static async cancelarCorrida(corridaId: string, motivo: string) {
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
    return data;
  }
}