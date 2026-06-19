// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UsuarioCompleto = Database['public']['Tables']['usuarios']['Row'] & {
  passageiro?: Database['public']['Tables']['passageiros']['Row'];
  motorista?: Database['public']['Tables']['motoristas']['Row'];
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  usuario: UsuarioCompleto | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<UsuarioCompleto | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsuario = async (userId: string) => {
    try {
      console.log('🔍 Buscando dados do usuário:', userId);
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      // Trata PGRST116 (0 rows) como "usuário ainda não cadastrado"
      if (userError) {
        if (userError.code === 'PGRST116') {
          console.warn('⏳ Usuário autenticado, mas perfil ainda não criado. Aguardando...');
          setUsuario(null);
          setLoading(false);
          return;
        }
        throw userError;
      }

      let usuarioCompleto: UsuarioCompleto = userData;

      // Busca dados adicionais conforme tipo de usuário
      if (userData.tipo_usuario === 'passageiro') {
        const { data: passageiroData } = await supabase
          .from('passageiros')
          .select('*')
          .eq('usuario_id', userId)
          .single();

        if (passageiroData) {
          usuarioCompleto.passageiro = passageiroData;
        }
      } else if (userData.tipo_usuario === 'motorista') {
        const { data: motoristaData } = await supabase
          .from('motoristas')
          .select('*')
          .eq('usuario_id', userId)
          .single();

        if (motoristaData) {
          usuarioCompleto.motorista = motoristaData;
        }
      }

      setUsuario(usuarioCompleto);
      console.log('✅ Perfil carregado com sucesso:', usuarioCompleto.nome_completo);
    } catch (error) {
      console.error('❌ Erro ao buscar dados do usuário:', error);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  };

  const resetAuthState = async () => {
    console.log('🔄 Resetando estado de autenticação...');
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('📱 Sessão atual após reset:', !!currentSession);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchUsuario(currentSession.user.id);
      } else {
        setUsuario(null);
        setLoading(false);
        console.log('⚠️ Nenhuma sessão encontrada após reset');
      }
      console.log('✅ Reset concluído.');
    } catch (error) {
      console.error('❌ Erro ao resetar auth:', error);
      setSession(null);
      setUser(null);
      setUsuario(null);
      setLoading(false);
    }
  };

  // Efeito para inicializar e monitorar autenticação
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const initializeAuth = async () => {
      try {
        // Timeout de segurança para não ficar carregando indefinidamente
        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('⚠️ Auth timeout – forçando loading false');
            setLoading(false);
          }
        }, 8000); // Aumentado para 8 segundos

        console.log('🚀 Inicializando AuthContext...');

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (sessionError) {
          console.error('❌ Erro ao obter sessão inicial:', sessionError.message);
          
          // Tenta novamente em caso de erro de rede
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`🔄 Tentativa ${retryCount} de ${MAX_RETRIES}...`);
            setTimeout(initializeAuth, 1000 * retryCount); // Delay progressivo
            return;
          }
          
          setLoading(false);
          return;
        }

        console.log('📱 Sessão inicial:', !!initialSession);
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchUsuario(initialSession.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar auth:', error);
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`🔄 Tentativa ${retryCount} de ${MAX_RETRIES} após erro...`);
          setTimeout(initializeAuth, 1000 * retryCount);
          return;
        }
        
        if (isMounted) setLoading(false);
      } finally {
        if (timeoutId && retryCount >= MAX_RETRIES) {
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        console.log('🔄 Auth state change:', event, 'Session:', !!newSession);
        
        // Trata diferentes eventos de autenticação
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ Usuário logado');
            break;
          case 'SIGNED_OUT':
            console.log('👋 Usuário deslogado');
            setSession(null);
            setUser(null);
            setUsuario(null);
            setLoading(false);
            return;
          case 'TOKEN_REFRESHED':
            console.log('🔑 Token renovado automaticamente');
            break;
          case 'USER_UPDATED':
            console.log('👤 Dados do usuário atualizados');
            break;
          case 'PASSWORD_RECOVERY':
            console.log('🔐 Recuperação de senha');
            break;
          default:
            console.log('ℹ️ Evento:', event);
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchUsuario(newSession.user.id);
        } else {
          setUsuario(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Tentando login...');
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error('❌ Erro no login:', error.message);
      throw error;
    }
    
    console.log('✅ Login realizado com sucesso!');
    return data;
  };

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('📝 Tentando cadastro...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    if (error) {
      console.error('❌ Erro no cadastro:', error.message);
      throw error;
    }
    
    console.log('✅ Cadastro realizado com sucesso!');
    return data;
  };

  const signOut = async () => {
    console.log('👋 Realizando logout...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Erro no logout:', error.message);
        throw error;
      }
      console.log('✅ Logout realizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro crítico no logout:', error);
    } finally {
      // Sempre limpa o estado local, mesmo se o logout remoto falhar
      setSession(null);
      setUser(null);
      setUsuario(null);
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    usuario,
    loading,
    signIn,
    signUp,
    signOut,
    resetAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}