# QuebraCar - Documentação Completa do Sistema

## 📱 Visão Geral

O QuebraCar é um aplicativo de transporte inteligente que conecta passageiros e motoristas, oferecendo corridas com tarifas dinâmicas, sistema de avaliações e controle administrativo completo.

---

## 🏗️ Arquitetura do Sistema

### Frontend (React Native + Expo)
- **Framework**: React Native com Expo SDK 52
- **Navegação**: Expo Router com navegação por tabs
- **Estado Global**: Context API para autenticação
- **Mapas**: Google Maps SDK
- **Notificações**: Expo Notifications
- **Localização**: Expo Location

### Backend (Supabase)
- **Banco de Dados**: PostgreSQL com Supabase
- **Autenticação**: Supabase Auth com JWT
- **Tempo Real**: Supabase Realtime
- **Storage**: Supabase Storage (fotos de perfil)
- **Edge Functions**: Para lógicas complexas

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 1. `usuarios`
```sql
- id (uuid, PK) - ID do Supabase Auth
- email (text, unique)
- nome_completo (text)
- telefone (text)
- cpf (text, unique)
- data_nascimento (date)
- tipo_usuario (enum: passageiro, motorista, admin)
- status (enum: ativo, inativo, suspenso, banido)
- foto_perfil_url (text, nullable)
- created_at, updated_at (timestamptz)
```

#### 2. `passageiros`
```sql
- id (uuid, PK)
- usuario_id (uuid, FK → usuarios.id)
- avaliacao_media (decimal 3,2)
- total_corridas (integer)
- created_at, updated_at (timestamptz)
```

#### 3. `motoristas`
```sql
- id (uuid, PK)
- usuario_id (uuid, FK → usuarios.id)
- cnh (text)
- veiculo_modelo, veiculo_cor, veiculo_placa (text)
- avaliacao_media (decimal 3,2)
- total_corridas (integer)
- status_aprovacao (enum: pendente, aprovado, rejeitado)
- saldo_acumulado (decimal 10,2) - Taxa do app 8%
- data_ultimo_pagamento (timestamptz)
- localizacao_atual (point)
- disponivel (boolean)
- created_at, updated_at (timestamptz)
```

#### 4. `corridas`
```sql
- id (uuid, PK)
- passageiro_id (uuid, FK → passageiros.id)
- motorista_id (uuid, FK → motoristas.id, nullable)
- origem_endereco, destino_endereco (text)
- origem_latitude, origem_longitude (decimal)
- destino_latitude, destino_longitude (decimal)
- distancia_km (decimal 6,2)
- duracao_estimada (integer) - em minutos
- valor_estimado, valor_final (decimal 8,2)
- multiplicador_tarifa (decimal 4,2)
- status (enum: solicitada, aceita, iniciada, finalizada, cancelada)
- data_solicitacao, data_aceite, data_inicio, data_finalizacao (timestamptz)
- avaliacao_passageiro, avaliacao_motorista (integer 1-5)
- comentario_passageiro, comentario_motorista (text)
- created_at, updated_at (timestamptz)
```

#### 5. `configuracoes_tarifa`
```sql
- id (uuid, PK)
- tarifa_base_km (decimal 6,2) - R$ 3,15
- valor_minimo (decimal 6,2) - R$ 8,00
- taxa_app_percentual (decimal 5,2) - 8%
- multiplicador_noturno (decimal 4,2) - 1.30 (+30%)
- multiplicador_fim_semana_dia (decimal 4,2) - 1.10 (+10%)
- multiplicador_fim_semana_noite (decimal 4,2) - 1.50 (+50%)
- multiplicador_alta_demanda (decimal 4,2) - 1.20 (+20%)
- threshold_alta_demanda (integer) - 30 corridas/hora
- created_at, updated_at (timestamptz)
```

#### 6. `avaliacoes`
```sql
- id (uuid, PK)
- corrida_id (uuid, FK → corridas.id)
- avaliador_id (uuid, FK → usuarios.id)
- avaliado_id (uuid, FK → usuarios.id)
- tipo_avaliador (enum: passageiro, motorista)
- nota (integer 1-5)
- comentario (text, nullable)
- created_at (timestamptz)
```

#### 7. `pagamentos`
```sql
- id (uuid, PK)
- corrida_id (uuid, FK → corridas.id)
- motorista_id (uuid, FK → motoristas.id)
- valor_corrida (decimal 8,2)
- taxa_app (decimal 8,2) - 8% do valor
- valor_motorista (decimal 8,2)
- metodo_pagamento (enum: dinheiro, cartao, pix)
- status_pagamento (enum: pendente, processado, falhado)
- data_pagamento (timestamptz)
- created_at, updated_at (timestamptz)
```

#### 8. `notificacoes`
```sql
- id (uuid, PK)
- usuario_id (uuid, FK → usuarios.id)
- titulo (text)
- mensagem (text)
- tipo (enum: corrida, pagamento, sistema, promocao)
- dados_extras (jsonb)
- lida (boolean)
- enviada (boolean)
- created_at (timestamptz)
```

#### 9. `historico_localizacao`
```sql
- id (uuid, PK)
- corrida_id (uuid, FK → corridas.id)
- motorista_id (uuid, FK → motoristas.id)
- latitude, longitude (decimal)
- velocidade (decimal 5,2) - km/h
- direcao (decimal 5,2) - graus 0-360
- precisao (decimal 6,2) - metros
- timestamp_localizacao (timestamptz)
- created_at (timestamptz)
```

---

## 🔄 Fluxos do Sistema

### 1. Fluxo de Cadastro e Autenticação

#### Frontend:
1. **Tela Welcome** (`app/(auth)/welcome.tsx`)
   - Apresentação do app
   - Botões "Entrar" e "Criar Conta"

2. **Tela de Registro** (`app/(auth)/register.tsx`)
   - Seleção do tipo de usuário (Passageiro/Motorista)
   - Formulário com validação
   - Campos específicos para motoristas (CNH, veículo)

3. **Tela de Login** (`app/(auth)/login.tsx`)
   - E-mail e senha
   - Validação e feedback de erro

#### Backend:
1. **Supabase Auth** cria usuário
2. **Trigger automático** (`criar_perfil_usuario()`) executa:
   - Insere dados na tabela `usuarios`
   - Cria registro em `passageiros` ou `motoristas`
3. **AuthContext** gerencia estado de autenticação
4. **Redirecionamento** baseado no tipo de usuário

### 2. Fluxo de Solicitação de Corrida (Passageiro)

#### Frontend:
1. **Tela Principal** (`app/(tabs)/index.tsx`)
   - Localização atual do usuário
   - Botão "Solicitar Corrida"
   - Estatísticas do passageiro

2. **Tela de Corrida** (`app/(tabs)/ride/index.tsx`)
   - Campos origem e destino
   - Cálculo automático de estimativa
   - Botão de confirmação

#### Backend:
1. **Validação** de localização e permissões
2. **Cálculo de rota** via Google Maps API
3. **Cálculo de tarifa**:
   ```javascript
   // Função calcular_multiplicador_tarifa()
   multiplicador = 1.00
   if (horario_noturno) multiplicador *= 1.30
   if (fim_de_semana_dia) multiplicador *= 1.10
   if (fim_de_semana_noite) multiplicador *= 1.50
   if (alta_demanda) multiplicador *= 1.20
   
   valor_final = Math.max(8.00, distancia_km * 3.15 * multiplicador)
   ```
4. **Inserção** na tabela `corridas` com status "solicitada"
5. **Notificação** para motoristas próximos

### 3. Fluxo de Aceitação de Corrida (Motorista)

#### Frontend:
1. **Tela do Motorista** (`app/(tabs)/driver-home/index.tsx`)
   - Status online/offline
   - Mapa com heatmap de demanda
   - Notificações de corridas

2. **Modal de Corrida**
   - Detalhes da corrida
   - Botões "Aceitar" / "Recusar"

#### Backend:
1. **Query** de motoristas disponíveis num raio de 5km
2. **Envio de notificação** via Supabase Realtime
3. **Primeiro a aceitar** fica com a corrida
4. **Update** do status para "aceita"
5. **Cancelamento** das outras notificações

### 4. Fluxo Durante a Corrida

#### Frontend:
1. **Tela de Acompanhamento**
   - Mapa em tempo real
   - Localização do motorista/passageiro
   - Chat/chamada
   - Botões de ação (iniciar, finalizar)

#### Backend:
1. **Tracking GPS** contínuo
2. **Inserção** no `historico_localizacao`
3. **Updates** de status:
   - "aceita" → "iniciada" → "finalizada"
4. **Cálculo** do valor final baseado na distância real

### 5. Fluxo de Pagamento e Avaliação

#### Frontend:
1. **Tela de Finalização**
   - Resumo da corrida
   - Valor final
   - Sistema de avaliação (1-5 estrelas)
   - Campo para comentários

#### Backend:
1. **Inserção** na tabela `pagamentos`
2. **Cálculo** da taxa do app (8%)
3. **Acúmulo** no saldo do motorista
4. **Inserção** na tabela `avaliacoes`
5. **Trigger** atualiza médias de avaliação
6. **Notificação** de pagamento processado

### 6. Fluxo de Controle de Saldo (Motorista)

#### Backend Automático:
1. **Função** `verificar_saldo_em_atraso()` executa diariamente
2. **Verifica** motoristas com saldo > 0 há mais de 30 dias
3. **Cria notificação** de cobrança
4. **Suspende conta** após 45 dias sem pagamento
5. **Atualiza** status do usuário para "suspenso"

### 7. Fluxo Administrativo

#### Frontend Admin:
1. **Dashboard** (`app/(tabs)/admin-dashboard/index.tsx`)
   - Estatísticas gerais
   - Corridas em tempo real
   - Receita e comissões

2. **Gestão de Usuários** (`app/(tabs)/admin-users/index.tsx`)
   - Lista de motoristas pendentes
   - Aprovação/rejeição
   - Suspensão/banimento

3. **Configurações** (`app/(tabs)/admin-settings/index.tsx`)
   - Ajuste de tarifas
   - Multiplicadores
   - Taxa do app

#### Backend:
1. **Políticas RLS** específicas para admin
2. **Funções** de aprovação/rejeição
3. **Updates** nas configurações de tarifa
4. **Relatórios** e estatísticas

---

## 🔐 Segurança (Row Level Security)

### Políticas Implementadas:

1. **usuarios**: Usuários só veem seus próprios dados
2. **passageiros/motoristas**: Dados próprios + admin
3. **corridas**: Participantes da corrida + admin
4. **avaliacoes**: Avaliador/avaliado + admin
5. **pagamentos**: Motorista proprietário + admin
6. **notificacoes**: Destinatário + admin

---

## 📱 Estrutura do Frontend

### Navegação por Tipo de Usuário:

#### Passageiro:
- **Início**: Solicitar corrida, localização
- **Corrida**: Formulário de solicitação
- **Histórico**: Corridas anteriores
- **Perfil**: Dados pessoais, configurações

#### Motorista:
- **Início**: Status, mapa de demanda
- **Corridas**: Corridas ativas/históricas
- **Ganhos**: Saldo, pagamentos
- **Perfil**: Dados, veículo

#### Admin:
- **Dashboard**: Visão geral do sistema
- **Usuários**: Gestão de contas
- **Configurações**: Tarifas, sistema

---

## 🚀 Funcionalidades Avançadas

### 1. Tarifa Dinâmica
- Multiplicadores automáticos por horário
- Alta demanda baseada em corridas/hora
- Configurável pelo admin

### 2. Mapa de Calor
- Visualização de demanda em tempo real
- Cores indicam intensidade de solicitações
- Ajuda motoristas a se posicionarem

### 3. Sistema de Notificações
- Push notifications para eventos importantes
- Notificações in-app
- Histórico completo

### 4. Controle Financeiro
- Taxa do app acumulativa (8%)
- Prazo de pagamento (30 dias)
- Suspensão automática por inadimplência

### 5. Avaliações Bilaterais
- Motorista avalia passageiro
- Passageiro avalia motorista
- Média calculada automaticamente

---

## 🔧 Configuração e Deploy

### Variáveis de Ambiente:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Passos para Deploy:
1. Configurar projeto Supabase
2. Executar migrações do banco
3. Configurar Google Maps API
4. Build do app React Native
5. Deploy nas stores (iOS/Android)

---

## 📊 Métricas e Analytics

### KPIs Principais:
- Total de corridas por dia/mês
- Receita total e comissões
- Tempo médio de espera
- Avaliação média dos serviços
- Taxa de cancelamento
- Motoristas ativos vs inativos

### Relatórios Admin:
- Corridas por região
- Horários de pico
- Performance de motoristas
- Inadimplência de taxas

---

## 🔄 Integrações Futuras

### APIs Planejadas:
- **Pagamento**: Stripe, MercadoPago
- **Mapas**: Mapbox (alternativa)
- **Push**: Firebase, OneSignal
- **SMS**: Twilio para verificação
- **Analytics**: Google Analytics, Mixpanel

### Funcionalidades Futuras:
- Chat em tempo real
- Chamadas VoIP
- Corridas agendadas
- Múltiplas paradas
- Corridas compartilhadas
- Programa de fidelidade

---

Este documento serve como guia completo para desenvolvimento, manutenção e evolução do QuebraCar. Todas as funcionalidades estão implementadas seguindo as melhores práticas de segurança, performance e experiência do usuário.