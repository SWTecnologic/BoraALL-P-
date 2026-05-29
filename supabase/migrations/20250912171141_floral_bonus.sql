/*
  # Criar tabela de avaliações

  1. Nova Tabela
    - `avaliacoes`
      - `id` (uuid, chave primária)
      - `corrida_id` (uuid, chave estrangeira) - Referência para corridas
      - `avaliador_id` (uuid, chave estrangeira) - Quem fez a avaliação
      - `avaliado_id` (uuid, chave estrangeira) - Quem foi avaliado
      - `tipo_avaliador` (enum) - Tipo: passageiro, motorista
      - `nota` (integer) - Nota de 1 a 5
      - `comentario` (text) - Comentário da avaliação
      - `created_at` (timestamp) - Data de criação

  2. Segurança
    - Habilitar RLS na tabela `avaliacoes`
    - Adicionar políticas para usuários lerem avaliações relacionadas a eles
    - Adicionar políticas para admins gerenciarem todas as avaliações
*/

-- Criar enum para tipo de avaliador
CREATE TYPE tipo_avaliador_enum AS ENUM ('passageiro', 'motorista');

-- Criar tabela avaliacoes
CREATE TABLE IF NOT EXISTS avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id uuid NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
  avaliador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  avaliado_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_avaliador tipo_avaliador_enum NOT NULL,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  created_at timestamptz DEFAULT now(),
  
  -- Garantir que cada usuário só pode avaliar uma vez por corrida
  UNIQUE(corrida_id, avaliador_id)
);

-- Habilitar RLS
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

-- Política para usuários lerem avaliações relacionadas a eles
CREATE POLICY "Usuários podem ler avaliações relacionadas"
  ON avaliacoes
  FOR SELECT
  TO authenticated
  USING (
    avaliador_id = auth.uid() OR
    avaliado_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Política para usuários criarem avaliações
CREATE POLICY "Usuários podem criar avaliações"
  ON avaliacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (avaliador_id = auth.uid());

-- Política para admins gerenciarem todas as avaliações
CREATE POLICY "Admins podem gerenciar todas as avaliações"
  ON avaliacoes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_corrida ON avaliacoes(corrida_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliador ON avaliacoes(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliado ON avaliacoes(avaliado_id);