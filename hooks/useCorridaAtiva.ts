// hooks/useCorridaAtiva.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useCorridaAtiva() {
  const { usuario } = useAuth();
  const [corridaAtiva, setCorridaAtiva] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posicaoFila, setPosicaoFila] = useState<number | null>(null);
  const [totalNaFila, setTotalNaFila] = useState<number | null>(null);
  const [tempoEstimado, setTempoEstimado] = useState<number | null>(null);

  const checkForActiveRide = useCallback(async () => {
    if (!usuario) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Buscando corrida ativa para usuário:', usuario.id);
      
      const { data: passenger, error: passengerError } = await supabase
        .from('passageiros')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      if (passengerError || !passenger) {
        console.log('❌ Passageiro não encontrado');
        setLoading(false);
        return;
      }

      console.log('✅ Passageiro encontrado:', passenger.id);

      // 🔥 CORRIGIDO: Removidos 'motorista_a_caminho' e 'aguardando_embarque'
      // Valores corretos do enum: solicitada, aceita, iniciada, finalizada, cancelada, reservada
      const { data: activeRide, error: rideError } = await supabase
        .from('corridas')
        .select(`
          *,
          motoristas:corridas_motorista_id_fkey (
            id,
            avaliacao_media,
            veiculo_modelo,
            veiculo_cor,
            veiculo_placa,
            usuarios:usuario_id (
              nome_completo,
              telefone,
              foto_perfil_url
            )
          )
        `)
        .eq('passageiro_id', passenger.id)
        .in('status', ['solicitada', 'aceita', 'iniciada', 'reservada'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (rideError) {
        console.error('❌ Erro ao buscar corrida:', rideError);
        setCorridaAtiva(null);
        setLoading(false);
        return;
      }

      const corrida = activeRide?.[0] || null;
      console.log('📦 Corrida encontrada:', corrida?.id, 'Status:', corrida?.status);
      
      setCorridaAtiva(corrida);

      if (corrida?.status === 'reservada' && corrida.motorista_id) {
        console.log('⏳ Corrida reservada - calculando fila...');
        
        const { data: fila } = await supabase
          .from('corridas')
          .select('id, created_at')
          .eq('motorista_id', corrida.motorista_id)
          .eq('status', 'reservada')
          .order('created_at', { ascending: true });

        const posicao = fila?.findIndex(r => r.id === corrida.id) ?? 0;
        const posFinal = posicao + 1;
        const total = fila?.length ?? 0;
        
        setPosicaoFila(posFinal);
        setTotalNaFila(total);
        
        const tempoMinutos = posFinal * 3;
        setTempoEstimado(tempoMinutos);
        
        console.log(`📍 Posição na fila: ${posFinal}/${total} - Tempo estimado: ${tempoMinutos}min`);
      } else {
        setPosicaoFila(null);
        setTotalNaFila(null);
        setTempoEstimado(null);
      }

    } catch (err) {
      console.error('❌ Erro ao verificar corrida ativa:', err);
      setCorridaAtiva(null);
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    checkForActiveRide();
  }, [checkForActiveRide]);

  return { 
    corridaAtiva, 
    loading, 
    posicaoFila,
    totalNaFila,
    tempoEstimado,
    refetch: checkForActiveRide 
  };
}