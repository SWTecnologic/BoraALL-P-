/*
  # Criar triggers e funções para automação

  1. Funções
    - Função para criar perfil de usuário automaticamente após registro
    - Função para calcular avaliação média
    - Função para atualizar saldo do motorista
    - Função para verificar prazo de pagamento

  2. Triggers
    - Trigger para criar perfil após inserção na tabela usuarios
    - Trigger para atualizar avaliações médias
    - Trigger para atualizar saldo acumulado
*/

-- Função para criar perfil de usuário automaticamente
CREATE OR REPLACE FUNCTION criar_perfil_usuario()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for passageiro, criar registro na tabela passageiros
  IF NEW.tipo_usuario = 'passageiro' THEN
    INSERT INTO passageiros (usuario_id)
    VALUES (NEW.id);
  END IF;
  
  -- Se for motorista, criar registro na tabela motoristas
  IF NEW.tipo_usuario = 'motorista' THEN
    INSERT INTO motoristas (usuario_id, cnh, veiculo_modelo, veiculo_cor, veiculo_placa)
    VALUES (NEW.id, '', '', '', '');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil após inserção de usuário
CREATE TRIGGER trigger_criar_perfil_usuario
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION criar_perfil_usuario();

-- Função para atualizar avaliação média do passageiro
CREATE OR REPLACE FUNCTION atualizar_avaliacao_passageiro()
RETURNS TRIGGER AS $$
DECLARE
  passageiro_uuid uuid;
  nova_media decimal(3,2);
  total_avaliacoes integer;
BEGIN
  -- Buscar o passageiro relacionado à corrida
  SELECT p.id INTO passageiro_uuid
  FROM passageiros p
  JOIN corridas c ON c.passageiro_id = p.id
  WHERE c.id = NEW.corrida_id AND NEW.tipo_avaliador = 'motorista';
  
  IF passageiro_uuid IS NOT NULL THEN
    -- Calcular nova média de avaliações do passageiro
    SELECT AVG(a.nota), COUNT(a.nota)
    INTO nova_media, total_avaliacoes
    FROM avaliacoes a
    JOIN corridas c ON a.corrida_id = c.id
    WHERE c.passageiro_id = passageiro_uuid AND a.tipo_avaliador = 'motorista';
    
    -- Atualizar tabela passageiros
    UPDATE passageiros 
    SET avaliacao_media = nova_media,
        total_corridas = total_avaliacoes,
        updated_at = now()
    WHERE id = passageiro_uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar avaliação média do motorista
CREATE OR REPLACE FUNCTION atualizar_avaliacao_motorista()
RETURNS TRIGGER AS $$
DECLARE
  motorista_uuid uuid;
  nova_media decimal(3,2);
  total_avaliacoes integer;
BEGIN
  -- Buscar o motorista relacionado à corrida
  SELECT c.motorista_id INTO motorista_uuid
  FROM corridas c
  WHERE c.id = NEW.corrida_id AND NEW.tipo_avaliador = 'passageiro';
  
  IF motorista_uuid IS NOT NULL THEN
    -- Calcular nova média de avaliações do motorista
    SELECT AVG(a.nota), COUNT(a.nota)
    INTO nova_media, total_avaliacoes
    FROM avaliacoes a
    JOIN corridas c ON a.corrida_id = c.id
    WHERE c.motorista_id = motorista_uuid AND a.tipo_avaliador = 'passageiro';
    
    -- Atualizar tabela motoristas
    UPDATE motoristas 
    SET avaliacao_media = nova_media,
        total_corridas = total_avaliacoes,
        updated_at = now()
    WHERE id = motorista_uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar avaliações após inserção
CREATE TRIGGER trigger_atualizar_avaliacao_passageiro
  AFTER INSERT ON avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_avaliacao_passageiro();

CREATE TRIGGER trigger_atualizar_avaliacao_motorista
  AFTER INSERT ON avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_avaliacao_motorista();

-- Função para atualizar saldo do motorista após pagamento
CREATE OR REPLACE FUNCTION atualizar_saldo_motorista()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar saldo acumulado do motorista
  UPDATE motoristas 
  SET saldo_acumulado = saldo_acumulado + NEW.taxa_app,
      updated_at = now()
  WHERE id = NEW.motorista_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar saldo após inserção de pagamento
CREATE TRIGGER trigger_atualizar_saldo_motorista
  AFTER INSERT ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_saldo_motorista();

-- Função para verificar motoristas com saldo em atraso
CREATE OR REPLACE FUNCTION verificar_saldo_em_atraso()
RETURNS void AS $$
DECLARE
  motorista_record RECORD;
BEGIN
  -- Buscar motoristas com saldo > 0 e último pagamento há mais de 30 dias
  FOR motorista_record IN
    SELECT m.id, m.usuario_id, m.saldo_acumulado, u.nome_completo
    FROM motoristas m
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.saldo_acumulado > 0
    AND (m.data_ultimo_pagamento IS NULL OR m.data_ultimo_pagamento < now() - INTERVAL '30 days')
    AND u.status = 'ativo'
  LOOP
    -- Criar notificação de cobrança
    INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, dados_extras)
    VALUES (
      motorista_record.usuario_id,
      'Pagamento em Atraso',
      'Você possui R$ ' || motorista_record.saldo_acumulado || ' em taxa do app pendente. Efetue o pagamento para continuar recebendo corridas.',
      'pagamento',
      jsonb_build_object('saldo_devido', motorista_record.saldo_acumulado)
    );
    
    -- Se saldo em atraso há mais de 45 dias, suspender conta
    IF EXISTS (
      SELECT 1 FROM motoristas 
      WHERE id = motorista_record.id 
      AND (data_ultimo_pagamento IS NULL OR data_ultimo_pagamento < now() - INTERVAL '45 days')
    ) THEN
      UPDATE usuarios 
      SET status = 'suspenso', updated_at = now()
      WHERE id = motorista_record.usuario_id;
      
      -- Notificar suspensão
      INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
      VALUES (
        motorista_record.usuario_id,
        'Conta Suspensa',
        'Sua conta foi suspensa devido ao não pagamento da taxa do app. Entre em contato conosco para regularizar.',
        'sistema'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular multiplicador de tarifa baseado em horário e demanda
CREATE OR REPLACE FUNCTION calcular_multiplicador_tarifa(
  data_corrida timestamptz,
  latitude_origem decimal,
  longitude_origem decimal
)
RETURNS decimal AS $$
DECLARE
  multiplicador decimal := 1.00;
  config_tarifa RECORD;
  hora_corrida integer;
  dia_semana integer;
  corridas_ultima_hora integer;
BEGIN
  -- Buscar configurações de tarifa
  SELECT * INTO config_tarifa FROM configuracoes_tarifa ORDER BY created_at DESC LIMIT 1;
  
  -- Extrair hora e dia da semana
  hora_corrida := EXTRACT(HOUR FROM data_corrida);
  dia_semana := EXTRACT(DOW FROM data_corrida); -- 0=domingo, 6=sábado
  
  -- Aplicar multiplicador noturno (20:00 às 07:00)
  IF hora_corrida >= 20 OR hora_corrida < 7 THEN
    multiplicador := config_tarifa.multiplicador_noturno;
  END IF;
  
  -- Aplicar multiplicador de fim de semana
  IF dia_semana = 0 OR dia_semana = 6 THEN -- Domingo ou Sábado
    IF hora_corrida >= 20 OR hora_corrida < 7 THEN
      multiplicador := config_tarifa.multiplicador_fim_semana_noite;
    ELSE
      multiplicador := config_tarifa.multiplicador_fim_semana_dia;
    END IF;
  END IF;
  
  -- Verificar alta demanda na região (corridas na última hora num raio de 5km)
  SELECT COUNT(*) INTO corridas_ultima_hora
  FROM corridas
  WHERE data_solicitacao >= data_corrida - INTERVAL '1 hour'
  AND data_solicitacao <= data_corrida
  AND ST_DWithin(
    ST_Point(longitude_origem, latitude_origem)::geography,
    ST_Point(origem_longitude, origem_latitude)::geography,
    5000 -- 5km em metros
  );
  
  -- Aplicar multiplicador de alta demanda se necessário
  IF corridas_ultima_hora >= config_tarifa.threshold_alta_demanda THEN
    multiplicador := multiplicador * config_tarifa.multiplicador_alta_demanda;
  END IF;
  
  RETURN multiplicador;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;