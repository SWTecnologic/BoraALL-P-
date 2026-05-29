/*
  # Criar tabela de configurações de tarifa

  1. Nova Tabela
    - `configuracoes_tarifa`
      - `id` (uuid, chave primária)
      - `tarifa_base_km` (decimal) - Tarifa base por quilômetro (R$ 3,15)
      - `valor_minimo` (decimal) - Valor mínimo da corrida (R$ 8,00)
      - `taxa_app_percentual` (decimal) - Taxa do app em percentual (8%)
      - `multiplicador_noturno` (decimal) - Multiplicador noturno (+30% = 1.30)
      - `multiplicador_fim_semana_dia` (decimal) - Multiplicador fim de semana dia (+10% = 1.10)
      - `multiplicador_fim_semana_noite` (decimal) - Multiplicador fim de semana noite (+50% = 1.50)
      - `multiplicador_alta_demanda` (decimal) - Multiplicador alta demanda
      - `threshold_alta_demanda` (integer) - Limite para considerar alta demanda (30 corridas/hora)
      - `created_at` (timestamp) - Data de criação
      - `updated_at` (timestamp) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `configuracoes_tarifa`
    - Adicionar políticas para todos lerem as configurações
    - Adicionar políticas para apenas admins modificarem
*/

-- Criar tabela configuracoes_tarifa
CREATE TABLE IF NOT EXISTS configuracoes_tarifa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarifa_base_km decimal(6,2) DEFAULT 3.15 CHECK (tarifa_base_km > 0),
  valor_minimo decimal(6,2) DEFAULT 8.00 CHECK (valor_minimo > 0),
  taxa_app_percentual decimal(5,2) DEFAULT 8.00 CHECK (taxa_app_percentual >= 0 AND taxa_app_percentual <= 100),
  multiplicador_noturno decimal(4,2) DEFAULT 1.30 CHECK (multiplicador_noturno > 0),
  multiplicador_fim_semana_dia decimal(4,2) DEFAULT 1.10 CHECK (multiplicador_fim_semana_dia > 0),
  multiplicador_fim_semana_noite decimal(4,2) DEFAULT 1.50 CHECK (multiplicador_fim_semana_noite > 0),
  multiplicador_alta_demanda decimal(4,2) DEFAULT 1.20 CHECK (multiplicador_alta_demanda > 0),
  threshold_alta_demanda integer DEFAULT 30 CHECK (threshold_alta_demanda > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO configuracoes_tarifa (
  tarifa_base_km,
  valor_minimo,
  taxa_app_percentual,
  multiplicador_noturno,
  multiplicador_fim_semana_dia,
  multiplicador_fim_semana_noite,
  multiplicador_alta_demanda,
  threshold_alta_demanda
) VALUES (
  3.15,
  8.00,
  8.00,
  1.30,
  1.10,
  1.50,
  1.20,
  30
);

-- Habilitar RLS
ALTER TABLE configuracoes_tarifa ENABLE ROW LEVEL SECURITY;

-- Política para todos lerem as configurações
CREATE POLICY "Todos podem ler configurações de tarifa"
  ON configuracoes_tarifa
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para apenas admins modificarem
CREATE POLICY "Apenas admins podem modificar configurações"
  ON configuracoes_tarifa
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_configuracoes_tarifa_updated_at
  BEFORE UPDATE ON configuracoes_tarifa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();