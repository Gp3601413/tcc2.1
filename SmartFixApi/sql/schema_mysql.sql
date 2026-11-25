-- Smart Fix (sFx) - Schema para MySQL (compatível com AppDbContext.cs)
-- Só use se o seu banco ainda NÃO tiver essas tabelas.
CREATE DATABASE IF NOT EXISTS smartfix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartfix;

CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefone VARCHAR(30),
  senha_hash VARCHAR(255) NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS veiculos (
  id CHAR(36) PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  cep VARCHAR(15), cidade VARCHAR(100), estado VARCHAR(50), endereco VARCHAR(255),
  marca VARCHAR(100) NOT NULL, modelo VARCHAR(100) NOT NULL,
  ano VARCHAR(10), placa VARCHAR(15), cor VARCHAR(50),
  bateria_inicial DECIMAL(5,2) NOT NULL DEFAULT 100,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS telemetria (
  id CHAR(36) PRIMARY KEY,
  veiculo_id CHAR(36) NOT NULL,
  bateria DECIMAL(5,2) NOT NULL,
  temperatura DECIMAL(5,2) NOT NULL,
  velocidade DECIMAL(5,2) NOT NULL,
  registrado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mecanicas (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  especializacao VARCHAR(255), endereco VARCHAR(255), telefone VARCHAR(30),
  avaliacao DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS contatos (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL,
  assunto VARCHAR(255), mensagem TEXT NOT NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

INSERT INTO mecanicas (id, nome, especializacao, endereco, telefone, avaliacao) VALUES
(UUID(), 'EcoCar Elétricos', 'Veículos Elétricos', 'Av. Paulista, 1000 - SP', '(11) 99999-9999', 4.8),
(UUID(), 'Volt Tech Solutions', 'Sistemas Elétricos', 'Rua Augusta, 500 - SP', '(11) 88888-8888', 4.5),
(UUID(), 'Green Motion', 'Baterias e Motores', 'Av. Brasil, 200 - SP', '(11) 77777-7777', 4.9);
