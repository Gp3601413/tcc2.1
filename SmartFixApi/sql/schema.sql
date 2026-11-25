-- =====================================================
-- Smart Fix (sFx) - Schema do Banco de Dados
-- Rode este script no SQL Editor do Supabase
-- =====================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- =============================================
-- TABELA: usuarios
-- =============================================
create table if not exists usuarios (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    cpf text unique not null,
    email text unique not null,
    telefone text,
    senha_hash text not null,
    is_admin boolean default false,
    criado_em timestamptz default now()
);

-- =============================================
-- TABELA: veiculos
-- =============================================
create table if not exists veiculos (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid references usuarios(id) on delete cascade,
    cep text,
    cidade text,
    estado text,
    endereco text,
    marca text not null,
    modelo text not null,
    ano text,
    placa text,
    cor text,
    bateria_inicial numeric default 100,
    criado_em timestamptz default now()
);

-- =============================================
-- TABELA: telemetria (dados de monitoramento do veículo)
-- =============================================
create table if not exists telemetria (
    id uuid primary key default gen_random_uuid(),
    veiculo_id uuid references veiculos(id) on delete cascade,
    bateria numeric not null,
    temperatura numeric not null,
    velocidade numeric not null,
    registrado_em timestamptz default now()
);

-- =============================================
-- TABELA: mecanicas
-- =============================================
create table if not exists mecanicas (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    especializacao text,
    endereco text,
    telefone text,
    avaliacao numeric default 5.0,
    criado_em timestamptz default now()
);

-- =============================================
-- TABELA: contatos (mensagens do formulário de contato)
-- =============================================
create table if not exists contatos (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    email text not null,
    assunto text,
    mensagem text not null,
    criado_em timestamptz default now()
);

-- =============================================
-- SEED: mecânicas de exemplo (as mesmas do front atual)
-- =============================================
insert into mecanicas (nome, especializacao, endereco, telefone, avaliacao) values
('EcoCar Elétricos', 'Veículos Elétricos', 'Av. Paulista, 1000 - SP', '(11) 99999-9999', 4.8),
('Volt Tech Solutions', 'Sistemas Elétricos', 'Rua Augusta, 500 - SP', '(11) 88888-8888', 4.5),
('Green Motion', 'Baterias e Motores', 'Av. Brasil, 200 - SP', '(11) 77777-7777', 4.9)
on conflict do nothing;

-- =============================================
-- ADMIN: como criar o usuário admin@smartfix.com
-- =============================================
-- 1) Cadastre-se normalmente pelo formulário do site (cadastro.html)
--    usando o email: admin@smartfix.com e a senha que quiser (ex: admin123)
--    Isso garante que o hash da senha seja gerado corretamente pelo backend (bcrypt).
-- 2) Depois, rode o comando abaixo no SQL Editor do Supabase para promover
--    esse usuário a administrador:
--
--    update usuarios set is_admin = true where email = 'admin@smartfix.com';
--
-- (Isso é mais seguro do que inserir um hash de senha "pronto" direto no SQL.)
