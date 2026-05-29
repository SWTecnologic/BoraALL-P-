export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          email: string;
          nome_completo: string;
          telefone: string;
          cpf: string;
          data_nascimento: string;
          tipo_usuario: 'passageiro' | 'motorista' | 'admin';
          status: 'ativo' | 'inativo' | 'suspenso' | 'banido';
          foto_perfil_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nome_completo: string;
          telefone: string;
          cpf: string;
          data_nascimento: string;
          tipo_usuario: 'passageiro' | 'motorista' | 'admin';
          status?: 'ativo' | 'inativo' | 'suspenso' | 'banido';
          foto_perfil_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome_completo?: string;
          telefone?: string;
          cpf?: string;
          data_nascimento?: string;
          tipo_usuario?: 'passageiro' | 'motorista' | 'admin';
          status?: 'ativo' | 'inativo' | 'suspenso' | 'banido';
          foto_perfil_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      passageiros: {
        Row: {
          id: string;
          usuario_id: string;
          avaliacao_media: number;
          total_corridas: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          usuario_id: string;
          avaliacao_media?: number;
          total_corridas?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          avaliacao_media?: number;
          total_corridas?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      motoristas: {
        Row: {
          id: string;
          usuario_id: string;
          cnh: string;
          veiculo_modelo: string;
          veiculo_cor: string;
          veiculo_placa: string;
          avaliacao_media: number;
          total_corridas: number;
          status_aprovacao: 'pendente' | 'aprovado' | 'rejeitado';
          saldo_acumulado: number;
          data_ultimo_pagamento: string | null;
          localizacao_atual: string | null;
          disponivel: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          usuario_id: string;
          cnh: string;
          veiculo_modelo: string;
          veiculo_cor: string;
          veiculo_placa: string;
          avaliacao_media?: number;
          total_corridas?: number;
          status_aprovacao?: 'pendente' | 'aprovado' | 'rejeitado';
          saldo_acumulado?: number;
          data_ultimo_pagamento?: string | null;
          localizacao_atual?: string | null;
          disponivel?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          cnh?: string;
          veiculo_modelo?: string;
          veiculo_cor?: string;
          veiculo_placa?: string;
          avaliacao_media?: number;
          total_corridas?: number;
          status_aprovacao?: 'pendente' | 'aprovado' | 'rejeitado';
          saldo_acumulado?: number;
          data_ultimo_pagamento?: string | null;
          localizacao_atual?: string | null;
          disponivel?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      corridas: {
        Row: {
          id: string;
          passageiro_id: string;
          motorista_id: string | null;
          origem_endereco: string;
          origem_latitude: number;
          origem_longitude: number;
          destino_endereco: string;
          destino_latitude: number;
          destino_longitude: number;
          distancia_km: number;
          duracao_estimada: number;
          valor_estimado: number;
          valor_final: number | null;
          multiplicador_tarifa: number;
          status: 'solicitada' | 'aceita' | 'iniciada' | 'finalizada' | 'cancelada';
          data_solicitacao: string;
          data_aceite: string | null;
          data_inicio: string | null;
          data_finalizacao: string | null;
          avaliacao_passageiro: number | null;
          avaliacao_motorista: number | null;
          comentario_passageiro: string | null;
          comentario_motorista: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          passageiro_id: string;
          motorista_id?: string | null;
          origem_endereco: string;
          origem_latitude: number;
          origem_longitude: number;
          destino_endereco: string;
          destino_latitude: number;
          destino_longitude: number;
          distancia_km: number;
          duracao_estimada: number;
          valor_estimado: number;
          valor_final?: number | null;
          multiplicador_tarifa: number;
          status?: 'solicitada' | 'aceita' | 'iniciada' | 'finalizada' | 'cancelada';
          data_solicitacao?: string;
          data_aceite?: string | null;
          data_inicio?: string | null;
          data_finalizacao?: string | null;
          avaliacao_passageiro?: number | null;
          avaliacao_motorista?: number | null;
          comentario_passageiro?: string | null;
          comentario_motorista?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          passageiro_id?: string;
          motorista_id?: string | null;
          origem_endereco?: string;
          origem_latitude?: number;
          origem_longitude?: number;
          destino_endereco?: string;
          destino_latitude?: number;
          destino_longitude?: number;
          distancia_km?: number;
          duracao_estimada?: number;
          valor_estimado?: number;
          valor_final?: number | null;
          multiplicador_tarifa?: number;
          status?: 'solicitada' | 'aceita' | 'iniciada' | 'finalizada' | 'cancelada';
          data_solicitacao?: string;
          data_aceite?: string | null;
          data_inicio?: string | null;
          data_finalizacao?: string | null;
          avaliacao_passageiro?: number | null;
          avaliacao_motorista?: number | null;
          comentario_passageiro?: string | null;
          comentario_motorista?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      configuracoes_tarifa: {
        Row: {
          id: string;
          tarifa_base_km: number;
          valor_minimo: number;
          taxa_app_percentual: number;
          multiplicador_noturno: number;
          multiplicador_fim_semana_dia: number;
          multiplicador_fim_semana_noite: number;
          multiplicador_alta_demanda: number;
          threshold_alta_demanda: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tarifa_base_km?: number;
          valor_minimo?: number;
          taxa_app_percentual?: number;
          multiplicador_noturno?: number;
          multiplicador_fim_semana_dia?: number;
          multiplicador_fim_semana_noite?: number;
          multiplicador_alta_demanda?: number;
          threshold_alta_demanda?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tarifa_base_km?: number;
          valor_minimo?: number;
          taxa_app_percentual?: number;
          multiplicador_noturno?: number;
          multiplicador_fim_semana_dia?: number;
          multiplicador_fim_semana_noite?: number;
          multiplicador_alta_demanda?: number;
          threshold_alta_demanda?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      avaliacoes: {
        Row: {
          id: string;
          corrida_id: string;
          avaliador_id: string;
          avaliado_id: string;
          tipo_avaliador: 'passageiro' | 'motorista';
          nota: number;
          comentario: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          corrida_id: string;
          avaliador_id: string;
          avaliado_id: string;
          tipo_avaliador: 'passageiro' | 'motorista';
          nota: number;
          comentario?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          corrida_id?: string;
          avaliador_id?: string;
          avaliado_id?: string;
          tipo_avaliador?: 'passageiro' | 'motorista';
          nota?: number;
          comentario?: string | null;
          created_at?: string;
        };
      };
      pagamentos: {
        Row: {
          id: string;
          corrida_id: string;
          motorista_id: string;
          valor_corrida: number;
          taxa_app: number;
          valor_motorista: number;
          metodo_pagamento: 'dinheiro' | 'cartao' | 'pix';
          status_pagamento: 'pendente' | 'processado' | 'falhado';
          data_pagamento: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          corrida_id: string;
          motorista_id: string;
          valor_corrida: number;
          taxa_app: number;
          valor_motorista: number;
          metodo_pagamento?: 'dinheiro' | 'cartao' | 'pix';
          status_pagamento?: 'pendente' | 'processado' | 'falhado';
          data_pagamento?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          corrida_id?: string;
          motorista_id?: string;
          valor_corrida?: number;
          taxa_app?: number;
          valor_motorista?: number;
          metodo_pagamento?: 'dinheiro' | 'cartao' | 'pix';
          status_pagamento?: 'pendente' | 'processado' | 'falhado';
          data_pagamento?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notificacoes: {
        Row: {
          id: string;
          usuario_id: string;
          titulo: string;
          mensagem: string;
          tipo: 'corrida' | 'pagamento' | 'sistema' | 'promocao';
          dados_extras: any;
          lida: boolean;
          enviada: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          titulo: string;
          mensagem: string;
          tipo: 'corrida' | 'pagamento' | 'sistema' | 'promocao';
          dados_extras?: any;
          lida?: boolean;
          enviada?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          titulo?: string;
          mensagem?: string;
          tipo?: 'corrida' | 'pagamento' | 'sistema' | 'promocao';
          dados_extras?: any;
          lida?: boolean;
          enviada?: boolean;
          created_at?: string;
        };
      };
      historico_localizacao: {
        Row: {
          id: string;
          corrida_id: string;
          motorista_id: string;
          latitude: number;
          longitude: number;
          velocidade: number;
          direcao: number | null;
          precisao: number | null;
          timestamp_localizacao: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          corrida_id: string;
          motorista_id: string;
          latitude: number;
          longitude: number;
          velocidade?: number;
          direcao?: number | null;
          precisao?: number | null;
          timestamp_localizacao: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          corrida_id?: string;
          motorista_id?: string;
          latitude?: number;
          longitude?: number;
          velocidade?: number;
          direcao?: number | null;
          precisao?: number | null;
          timestamp_localizacao?: string;
          created_at?: string;
        };
      };
    };
  };
}