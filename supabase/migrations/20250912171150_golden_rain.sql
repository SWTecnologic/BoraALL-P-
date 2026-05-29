/*
  # Criar tabela de pagamentos

  1. Nova Tabela
    - `pagamentos`
      - `id` (uuid, chave primária)
      - `corrida_id` (uuid, chave estrangeira) - Referência para corridas
      - `motorista_id` (uuid, chave estrangeira) - Referência para motoristas
      - `valor_corrida` (decimal) - Valor total da corrida
      - `taxa_app` (decimal) - Taxa do app (8%)
      - `valor_motorista` (decimal) - Valor que fica com o motorista
      - `metodo_pagamento` (enum) - Método: dinheiro, cartao, pix
      - `status_pagamento` (enum) - Status: pendente, processado, falhado
      - `data_pagamento` (timestamp) - Data do pagamento
      - `created_at` (timestamp) - Data de criação
      - `updated_at` (timestamp) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `pagamentos`
    - Adicionar políticas para motoristas lerem seus pagamentos
    - Adicionar políticas para admins gerenciarem todos os pagamentos
*/

-- Criar enum para método de pagamento
CREATE TYPE metodo_pagamento_enum AS ENUM ('dinheiro', 'cartao', 'pix');

-- Criar enum para status do pagamento
CREATE TYPE status_pagamento_enum AS ENUM ('pendente', 'processado', 'falhado');

-- Criar tabela pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id uuid UNIQUE NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
  valor_corrida decimal(8,2) NOT NULL CHECK (valor_corrida > 0),
  taxa_app decimal(8,2) NOT NULL CHECK (taxa_app >= 0),
  valor_motorista decimal(8,2) NOT NULL CHECK (valor_motorista >= 0),
  metodo_pagamento metodo_pagamento_enum DEFAULT 'cartao',
  status_pagamento status_pagamento_enum DEFAULT 'pendente',
  data_pagamento timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Política para motoristas lerem seus pagamentos
CREATE POLICY "Motoristas podem ler seus pagamentos"
  ON pagamentos
  FOR SELECT
  TO authenticated
  USING (
    motorista_id IN (
      SELECT id FROM motoristas WHERE usuario_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Política para sistema criar pagamentos
CREATE POLICY "Sistema pode criar pagamentos"
  ON pagamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para sistema atualizar pagamentos
CREATE POLICY "Sistema pode atualizar pagamentos"
  ON pagamentos
  FOR UPDATE
  TO authenticated
  USING (true);

-- Política para admins gerenciarem todos os pagamentos
CREATE POLICY "Admins podem gerenciar todos os pagamentos"
  ON pagamentos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pagamentos_updated_at
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_motorista ON pagamentos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON pagamentos(data_pagamento);