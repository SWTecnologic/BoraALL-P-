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
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      let usuarioCompleto: UsuarioCompleto = userData;

      // Fetch additional data based on user type
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
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetAuthState = async () => {
    console.log('🔄 Resetando estado de autenticação...');
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await fetchUsuario(currentSession.user.id);
      } else {
        setUsuario(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao resetar auth:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Timeout de segurança - nunca fica travado
        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.log('⚠️ Auth timeout - forçando loading false');
            setLoading(false);
          }
        }, 5000);

        console.log('🚀 Inicializando AuthContext...');
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        console.log('📱 Sessão inicial:', !!initialSession);
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchUsuario(initialSession.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) setLoading(false);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('🔄 Auth state changed:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUsuario(session.user.id);
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
    setUsuario(null);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}