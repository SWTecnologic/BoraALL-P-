/*
  # Criar tabela de notificações

  1. Nova Tabela
    - `notificacoes`
      - `id` (uuid, chave primária)
      - `usuario_id` (uuid, chave estrangeira) - Destinatário da notificação
      - `titulo` (text) - Título da notificação
      - `mensagem` (text) - Conteúdo da notificação
      - `tipo` (enum) - Tipo: corrida, pagamento, sistema, promocao
      - `dados_extras` (jsonb) - Dados adicionais (IDs relacionados, etc.)
      - `lida` (boolean) - Se foi lida pelo usuário
      - `enviada` (boolean) - Se foi enviada via push
      - `created_at` (timestamp) - Data de criação

  2. Segurança
    - Habilitar RLS na tabela `notificacoes`
    - Adicionar políticas para usuários lerem suas notificações
    - Adicionar políticas para sistema criar notificações
    - Adicionar políticas para admins gerenciarem todas as notificações
*/

-- Criar enum para tipo de notificação
CREATE TYPE tipo_notificacao_enum AS ENUM ('corrida', 'pagamento', 'sistema', 'promocao');

-- Criar tabela notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo tipo_notificacao_enum NOT NULL,
  dados_extras jsonb DEFAULT '{}',
  lida boolean DEFAULT false,
  enviada boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Política para usuários lerem suas notificações
CREATE POLICY "Usuários podem ler suas notificações"
  ON notificacoes
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Política para usuários atualizarem suas notificações (marcar como lida)
CREATE POLICY "Usuários podem atualizar suas notificações"
  ON notificacoes
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid());

-- Política para sistema criar notificações
CREATE POLICY "Sistema pode criar notificações"
  ON notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para admins gerenciarem todas as notificações
CREATE POLICY "Admins podem gerenciar todas as notificações"
  ON notificacoes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON notificacoes(created_at DESC);