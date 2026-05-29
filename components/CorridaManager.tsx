// components/CorridaManager.tsx
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCorridaAtiva } from '@/hooks/useCorridaAtiva';
import LoadingScreen from './LoadingScreen';

export function CorridaManager({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { corridaAtiva, loading, error } = useCorridaAtiva();

  useEffect(() => {
    if (loading) return;

    // Se tem corrida ativa e não está na página de corrida
    if (corridaAtiva) {
      // Redireciona para a página de corrida ativa
      if (!router.pathname.includes('/corrida/')) {
        router.push(`/corrida/${corridaAtiva.id}`);
      }
    }
  }, [corridaAtiva, loading, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}