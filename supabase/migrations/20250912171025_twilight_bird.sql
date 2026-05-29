/*
  # Criar tabela de usuários

  1. Nova Tabela
    - `usuarios`
      - `id` (uuid, chave primária) - ID do usuário do Supabase Auth
      - `email` (text, único) - E-mail do usuário
      - `nome_completo` (text) - Nome completo do usuário
      - `telefone` (text) - Número de telefone
      - `cpf` (text, único) - CPF do usuário
      - `data_nascimento` (date) - Data de nascimento
      - `tipo_usuario` (enum) - Tipo: passageiro, motorista, admin
      - `status` (enum) - Status: ativo, inativo, suspenso, banido
      - `foto_perfil_url` (text, opcional) - URL da foto do perfil
      - `created_at` (timestamp) - Data de criação
      - `updated_at` (timestamp) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `usuarios`
    - Adicionar políticas para usuários autenticados lerem seus próprios dados
    - Adicionar políticas para admins gerenciarem todos os usuários
*/

-- Criar enum para tipo de usuário
CREATE TYPE tipo_usuario_enum AS ENUM ('passageiro', 'motorista', 'admin');

-- Criar enum para status do usuário
CREATE TYPE status_usuario_enum AS ENUM ('ativo', 'inativo', 'suspenso', 'banido');

-- Criar tabela usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nome_completo text NOT NULL,
  telefone text NOT NULL,
  cpf text UNIQUE NOT NULL,
  data_nascimento date NOT NULL,
  tipo_usuario tipo_usuario_enum NOT NULL DEFAULT 'passageiro',
  status status_usuario_enum NOT NULL DEFAULT 'ativo',
  foto_perfil_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para usuários lerem seus próprios dados
CREATE POLICY "Usuários podem ler seus próprios dados"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política para usuários atualizarem seus próprios dados
CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Política para admins gerenciarem todos os usuários
CREATE POLICY "Admins podem gerenciar todos os usuários"
  ON usuarios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();