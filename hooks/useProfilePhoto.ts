// hooks/useProfilePhoto.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseProfilePhotoResult {
  hasFotoProfile: boolean | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useProfilePhoto(usuarioId: string | undefined): UseProfilePhotoResult {
  const [hasFotoProfile, setHasFotoProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFoto = async () => {
    if (!usuarioId) {
      setHasFotoProfile(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('foto_perfil_url')
        .eq('id', usuarioId)
        .single();

      if (error) {
        console.error('Erro ao verificar foto de perfil:', error);
        setHasFotoProfile(false);
      } else {
        const url = data?.foto_perfil_url;
        setHasFotoProfile(!!url && url.trim() !== '');
      }
    } catch (err) {
      console.error('Erro inesperado ao verificar foto:', err);
      setHasFotoProfile(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoto();
  }, [usuarioId]);

  return { hasFotoProfile, loading, refetch: fetchFoto };
}