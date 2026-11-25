-- 2. Otimizações e validações para MySQL 8.0.16+.
-- Execute após migracao_papeis_mecanicas.sql no banco existente.
-- Backup obrigatório antes de aplicar no seu ambiente. Não há DELETE nem limpeza automática.
-- A coluna derivada não altera a apresentação do CPF já salvo.
-- Se houver CPF repetido com máscaras diferentes, o índice único falha com 1062.
-- Identifique os registros abaixo e resolva manualmente ANTES de executar o restante.
USE smartfix;
SELECT REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') AS cpf_normalizado, COUNT(*) AS quantidade
FROM usuarios GROUP BY cpf_normalizado HAVING COUNT(*) > 1;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='cpf_normalizado'), 'ALTER TABLE usuarios ADD COLUMN cpf_normalizado VARCHAR(20) GENERATED ALWAYS AS (REPLACE(REPLACE(REPLACE(cpf, ''.'', ''''), ''-'', ''''), '' '', '''')) STORED', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND INDEX_NAME='uq_usuarios_cpf_normalizado'), 'ALTER TABLE usuarios ADD UNIQUE KEY uq_usuarios_cpf_normalizado (cpf_normalizado)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contatos' AND COLUMN_NAME='telefone'), 'ALTER TABLE contatos ADD COLUMN telefone VARCHAR(30) NULL', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND INDEX_NAME='idx_usuarios_criado_id'), 'ALTER TABLE usuarios ADD INDEX idx_usuarios_criado_id (criado_em,id)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='veiculos' AND INDEX_NAME='idx_veiculos_usuario_criado_id'), 'ALTER TABLE veiculos ADD INDEX idx_veiculos_usuario_criado_id (usuario_id,criado_em,id)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='telemetria' AND INDEX_NAME='idx_telemetria_veiculo_data_id'), 'ALTER TABLE telemetria ADD INDEX idx_telemetria_veiculo_data_id (veiculo_id,registrado_em,id)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND INDEX_NAME='idx_mecanicas_status_nota_id'), 'ALTER TABLE mecanicas ADD INDEX idx_mecanicas_status_nota_id (status_aprovacao,avaliacao,id)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND INDEX_NAME='idx_mecanicas_criado_id'), 'ALTER TABLE mecanicas ADD INDEX idx_mecanicas_criado_id (criado_em,id)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='veiculos' AND CONSTRAINT_NAME='chk_veiculos_bateria'), 'ALTER TABLE veiculos ADD CONSTRAINT chk_veiculos_bateria CHECK (bateria_inicial BETWEEN 0 AND 100)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='telemetria' AND CONSTRAINT_NAME='chk_telemetria_valores'), 'ALTER TABLE telemetria ADD CONSTRAINT chk_telemetria_valores CHECK (bateria BETWEEN 0 AND 100 AND temperatura BETWEEN -100 AND 200 AND velocidade BETWEEN 0 AND 500)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND CONSTRAINT_NAME='chk_mecanicas_geo'), 'ALTER TABLE mecanicas ADD CONSTRAINT chk_mecanicas_geo CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='mecanica_servicos' AND CONSTRAINT_NAME='chk_servicos_preco'), 'ALTER TABLE mecanica_servicos ADD CONSTRAINT chk_servicos_preco CHECK (preco_estimado IS NULL OR preco_estimado >= 0)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='mecanica_horarios' AND CONSTRAINT_NAME='chk_horarios_periodo'), 'ALTER TABLE mecanica_horarios ADD CONSTRAINT chk_horarios_periodo CHECK ((fechado = TRUE AND abertura IS NULL AND fechamento IS NULL) OR (fechado = FALSE AND abertura IS NOT NULL AND fechamento IS NOT NULL AND abertura >= ''00:00:00'' AND fechamento < ''24:00:00'' AND abertura < fechamento))', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

