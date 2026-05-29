/*
  # Criar tabela de motoristas

  1. Nova Tabela
    - `motoristas`
      - `id` (uuid, chave primária)
      - `usuario_id` (uuid, chave estrangeira) - Referência para usuarios
      - `cnh` (text) - Número da CNH
      - `veiculo_modelo` (text) - Modelo do veículo
      - `veiculo_cor` (text) - Cor do veículo
      - `veiculo_placa` (text, único) - Placa do veículo
      - `avaliacao_media` (decimal) - Avaliação média do motorista
      - `total_corridas` (integer) - Total de corridas realizadas
      - `status_aprovacao` (enum) - Status: pendente, aprovado, rejeitado
      - `saldo_acumulado` (decimal) - Saldo da taxa do app (8%) acumulado
      - `data_ultimo_pagamento` (timestamp) - Data do último pagamento da taxa
      - `localizacao_atual` (point) - Localização atual do motorista
      - `disponivel` (boolean) - Se está disponível para corridas
      - `created_at` (timestamp) - Data de criação
      - `updated_at` (timestamp) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `motoristas`
    - Adicionar políticas para motoristas lerem seus próprios dados
    - Adicionar políticas para passageiros lerem dados básicos durante corridas
    - Adicionar políticas para admins gerenciarem todos os dados
*/

-- Criar enum para status de aprovação
CREATE TYPE status_aprovacao_enum AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- Criar tabela motoristas
CREATE TABLE IF NOT EXISTS motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cnh text NOT NULL,
  veiculo_modelo text NOT NULL,
  veiculo_cor text NOT NULL,
  veiculo_placa text UNIQUE NOT NULL,
  avaliacao_media decimal(3,2) DEFAULT 5.00 CHECK (avaliacao_media >= 1.00 AND avaliacao_media <= 5.00),
  total_corridas integer DEFAULT 0 CHECK (total_corridas >= 0),
  status_aprovacao status_aprovacao_enum DEFAULT 'pendente',
  saldo_acumulado decimal(10,2) DEFAULT 0.00 CHECK (saldo_acumulado >= 0),
  data_ultimo_pagamento timestamptz,
  localizacao_atual point,
  disponivel boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;

-- Política para motoristas lerem seus próprios dados
CREATE POLICY "Motoristas podem ler seus próprios dados"
  ON motoristas
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario IN ('passageiro', 'admin')
    )
  );

-- Política para motoristas atualizarem seus próprios dados
CREATE POLICY "Motoristas podem atualizar seus próprios dados"
  ON motoristas
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid());

-- Política para sistema inserir dados de motoristas
CREATE POLICY "Sistema pode inserir dados de motoristas"
  ON motoristas
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Política para admins gerenciarem todos os dados
CREATE POLICY "Admins podem gerenciar todos os motoristas"
  ON motoristas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_motoristas_updated_at
  BEFORE UPDATE ON motoristas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_motoristas_localizacao ON motoristas USING gist(localizacao_atual);
CREATE INDEX IF NOT EXISTS idx_motoristas_disponivel ON motoristas(disponivel);
CREATE INDEX IF NOT EXISTS idx_motoristas_status_aprovacao ON motoristas(status_aprovacao);