/*
  # Criar tabela de corridas

  1. Nova Tabela
    - `corridas`
      - `id` (uuid, chave primária)
      - `passageiro_id` (uuid, chave estrangeira) - Referência para passageiros
      - `motorista_id` (uuid, chave estrangeira) - Referência para motoristas
      - `origem_endereco` (text) - Endereço de origem
      - `origem_latitude` (decimal) - Latitude da origem
      - `origem_longitude` (decimal) - Longitude da origem
      - `destino_endereco` (text) - Endereço de destino
      - `destino_latitude` (decimal) - Latitude do destino
      - `destino_longitude` (decimal) - Longitude do destino
      - `distancia_km` (decimal) - Distância em quilômetros
      - `duracao_estimada` (integer) - Duração estimada em minutos
      - `valor_estimado` (decimal) - Valor estimado da corrida
      - `valor_final` (decimal) - Valor final cobrado
      - `multiplicador_tarifa` (decimal) - Multiplicador aplicado na tarifa
      - `status` (enum) - Status: solicitada, aceita, iniciada, finalizada, cancelada
      - `data_solicitacao` (timestamp) - Data da solicitação
      - `data_aceite` (timestamp) - Data do aceite pelo motorista
      - `data_inicio` (timestamp) - Data de início da corrida
      - `data_finalizacao` (timestamp) - Data de finalização
      - `avaliacao_passageiro` (integer) - Avaliação do passageiro (1-5)
      - `avaliacao_motorista` (integer) - Avaliação do motorista (1-5)
      - `comentario_passageiro` (text) - Comentário do passageiro
      - `comentario_motorista` (text) - Comentário do motorista
      - `created_at` (timestamp) - Data de criação
      - `updated_at` (timestamp) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `corridas`
    - Adicionar políticas para passageiros e motoristas lerem suas corridas
    - Adicionar políticas para admins gerenciarem todas as corridas
*/

-- Criar enum para status da corrida
CREATE TYPE status_corrida_enum AS ENUM ('solicitada', 'aceita', 'iniciada', 'finalizada', 'cancelada');

-- Criar tabela corridas
CREATE TABLE IF NOT EXISTS corridas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passageiro_id uuid NOT NULL REFERENCES passageiros(id) ON DELETE CASCADE,
  motorista_id uuid REFERENCES motoristas(id) ON DELETE SET NULL,
  origem_endereco text NOT NULL,
  origem_latitude decimal(10,8) NOT NULL,
  origem_longitude decimal(11,8) NOT NULL,
  destino_endereco text NOT NULL,
  destino_latitude decimal(10,8) NOT NULL,
  destino_longitude decimal(11,8) NOT NULL,
  distancia_km decimal(6,2) NOT NULL CHECK (distancia_km > 0),
  duracao_estimada integer NOT NULL CHECK (duracao_estimada > 0),
  valor_estimado decimal(8,2) NOT NULL CHECK (valor_estimado > 0),
  valor_final decimal(8,2) CHECK (valor_final > 0),
  multiplicador_tarifa decimal(4,2) DEFAULT 1.00 CHECK (multiplicador_tarifa > 0),
  status status_corrida_enum DEFAULT 'solicitada',
  data_solicitacao timestamptz DEFAULT now(),
  data_aceite timestamptz,
  data_inicio timestamptz,
  data_finalizacao timestamptz,
  avaliacao_passageiro integer CHECK (avaliacao_passageiro >= 1 AND avaliacao_passageiro <= 5),
  avaliacao_motorista integer CHECK (avaliacao_motorista >= 1 AND avaliacao_motorista <= 5),
  comentario_passageiro text,
  comentario_motorista text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE corridas ENABLE ROW LEVEL SECURITY;

-- Política para passageiros lerem suas corridas
CREATE POLICY "Passageiros podem ler suas corridas"
  ON corridas
  FOR SELECT
  TO authenticated
  USING (
    passageiro_id IN (
      SELECT id FROM passageiros WHERE usuario_id = auth.uid()
    ) OR
    motorista_id IN (
      SELECT id FROM motoristas WHERE usuario_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Política para passageiros criarem corridas
CREATE POLICY "Passageiros podem criar corridas"
  ON corridas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    passageiro_id IN (
      SELECT id FROM passageiros WHERE usuario_id = auth.uid()
    )
  );

-- Política para motoristas e passageiros atualizarem corridas
CREATE POLICY "Motoristas e passageiros podem atualizar corridas"
  ON corridas
  FOR UPDATE
  TO authenticated
  USING (
    passageiro_id IN (
      SELECT id FROM passageiros WHERE usuario_id = auth.uid()
    ) OR
    motorista_id IN (
      SELECT id FROM motoristas WHERE usuario_id = auth.uid()
    )
  );

-- Política para admins gerenciarem todas as corridas
CREATE POLICY "Admins podem gerenciar todas as corridas"
  ON corridas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_corridas_updated_at
  BEFORE UPDATE ON corridas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_corridas_passageiro ON corridas(passageiro_id);
CREATE INDEX IF NOT EXISTS idx_corridas_motorista ON corridas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_corridas_status ON corridas(status);
CREATE INDEX IF NOT EXISTS idx_corridas_data_solicitacao ON corridas(data_solicitacao);
CREATE INDEX IF NOT EXISTS idx_corridas_origem_location ON corridas(origem_latitude, origem_longitude);
CREATE INDEX IF NOT EXISTS idx_corridas_destino_location ON corridas(destino_latitude, destino_longitude);