// hooks/useCorridaAtiva.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useCorridaAtiva() {
  const { usuario } = useAuth();
  const [corridaAtiva, setCorridaAtiva] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) {
      setLoading(false);
      return;
    }

    checkForActiveRide();
  }, [usuario?.id]);

  const checkForActiveRide = async () => {
    try {
      // Buscar passageiro
      const { data: passenger } = await supabase
        .from('passageiros')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      if (!passenger) {
        setLoading(false);
        return;
      }

      // Buscar corrida ativa
      const { data: activeRide } = await supabase
        .from('corridas')
        .select('*')
        .eq('passageiro_id', passenger.id)
        .in('status', ['solicitada', 'aceita', 'em_andamento'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setCorridaAtiva(activeRide || null);
    } catch (err) {
      console.error('Erro ao verificar corrida ativa:', err);
      setCorridaAtiva(null);
    } finally {
      setLoading(false);
    }
  };

  return { corridaAtiva, loading, refetch: checkForActiveRide };
}