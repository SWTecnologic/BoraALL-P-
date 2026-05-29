/*
  # Criar tabela de histórico de localização

  1. Nova Tabela
    - `historico_localizacao`
      - `id` (uuid, chave primária)
      - `corrida_id` (uuid, chave estrangeira) - Referência para corridas
      - `motorista_id` (uuid, chave estrangeira) - Referência para motoristas
      - `latitude` (decimal) - Latitude da localização
      - `longitude` (decimal) - Longitude da localização
      - `velocidade` (decimal) - Velocidade em km/h
      - `direcao` (decimal) - Direção em graus (0-360)
      - `precisao` (decimal) - Precisão do GPS em metros
      - `timestamp_localizacao` (timestamp) - Timestamp da localização
      - `created_at` (timestamp) - Data de criação

  2. Segurança
    - Habilitar RLS na tabela `historico_localizacao`
    - Adicionar políticas para motoristas e passageiros lerem dados de suas corridas
    - Adicionar políticas para admins gerenciarem todos os dados
*/

-- Criar tabela historico_localizacao
CREATE TABLE IF NOT EXISTS historico_localizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id uuid NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  velocidade decimal(5,2) DEFAULT 0 CHECK (velocidade >= 0),
  direcao decimal(5,2) CHECK (direcao >= 0 AND direcao <= 360),
  precisao decimal(6,2) CHECK (precisao >= 0),
  timestamp_localizacao timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE historico_localizacao ENABLE ROW LEVEL SECURITY;

-- Política para motoristas e passageiros lerem dados de suas corridas
CREATE POLICY "Usuários podem ler histórico de suas corridas"
  ON historico_localizacao
  FOR SELECT
  TO authenticated
  USING (
    motorista_id IN (
      SELECT id FROM motoristas WHERE usuario_id = auth.uid()
    ) OR
    corrida_id IN (
      SELECT c.id FROM corridas c
      JOIN passageiros p ON c.passageiro_id = p.id
      WHERE p.usuario_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Política para sistema inserir dados de localização
CREATE POLICY "Sistema pode inserir histórico de localização"
  ON historico_localizacao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    motorista_id IN (
      SELECT id FROM motoristas WHERE usuario_id = auth.uid()
    )
  );

-- Política para admins gerenciarem todos os dados
CREATE POLICY "Admins podem gerenciar todo o histórico"
  ON historico_localizacao
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_corrida ON historico_localizacao(corrida_id);
CREATE INDEX IF NOT EXISTS idx_historico_motorista ON historico_localizacao(motorista_id);
CREATE INDEX IF NOT EXISTS idx_historico_timestamp ON historico_localizacao(timestamp_localizacao);
CREATE INDEX IF NOT EXISTS idx_historico_location ON historico_localizacao(latitude, longitude);