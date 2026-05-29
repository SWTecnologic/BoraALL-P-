/*
  # Criar tabela de passageiros

  1. Nova Tabela
    - `passageiros`
      - `id` (uuid, chave primária)
      - `usuario_id` (uuid, chave estrangeira) - Referência para usuarios
      - `avaliacao_media` (decimal) - Avaliação média do passageiro
      - `total_corridas` (integer) - Total de corridas realizadas
      - `created_at` (timestamp) - Data de criação
      - `updated_at` (timestamp) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `passageiros`
    - Adicionar políticas para passageiros lerem seus próprios dados
    - Adicionar políticas para motoristas lerem dados de passageiros durante corridas
    - Adicionar políticas para admins gerenciarem todos os dados
*/

-- Criar tabela passageiros
CREATE TABLE IF NOT EXISTS passageiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  avaliacao_media decimal(3,2) DEFAULT 5.00 CHECK (avaliacao_media >= 1.00 AND avaliacao_media <= 5.00),
  total_corridas integer DEFAULT 0 CHECK (total_corridas >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE passageiros ENABLE ROW LEVEL SECURITY;

-- Política para passageiros lerem seus próprios dados
CREATE POLICY "Passageiros podem ler seus próprios dados"
  ON passageiros
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario IN ('motorista', 'admin')
    )
  );

-- Política para passageiros atualizarem seus próprios dados
CREATE POLICY "Passageiros podem atualizar seus próprios dados"
  ON passageiros
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid());

-- Política para sistema inserir dados de passageiros
CREATE POLICY "Sistema pode inserir dados de passageiros"
  ON passageiros
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Política para admins gerenciarem todos os dados
CREATE POLICY "Admins podem gerenciar todos os passageiros"
  ON passageiros
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_passageiros_updated_at
  BEFORE UPDATE ON passageiros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();