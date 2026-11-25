-- 1. Migração de papéis/oficinas para MySQL 8.0.16+.
-- Reexecutável para os estados de schema deste projeto. Faça backup antes.
-- DDL em MySQL faz commits implícitos: em falha, corrija a causa e reexecute.
USE smartfix;

SET @sfx_novo_papel = NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='papel');
SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='papel'), 'ALTER TABLE usuarios ADD COLUMN papel VARCHAR(20) NOT NULL DEFAULT ''cliente''', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(@sfx_novo_papel AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='is_admin'), 'UPDATE usuarios SET papel=''admin'' WHERE is_admin=TRUE', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND CONSTRAINT_NAME='chk_usuarios_papel'), 'ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_papel CHECK (papel IN (''cliente'',''mecanica'',''admin''))', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_novo_status = NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND COLUMN_NAME='status_aprovacao');
SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND COLUMN_NAME='usuario_id'), 'ALTER TABLE mecanicas ADD COLUMN usuario_id CHAR(36) NULL', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND COLUMN_NAME='cnpj'), 'ALTER TABLE mecanicas ADD COLUMN cnpj VARCHAR(20) NULL', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND COLUMN_NAME='latitude'), 'ALTER TABLE mecanicas ADD COLUMN latitude DECIMAL(10,7) NULL', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND COLUMN_NAME='longitude'), 'ALTER TABLE mecanicas ADD COLUMN longitude DECIMAL(10,7) NULL', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND COLUMN_NAME='status_aprovacao'), 'ALTER TABLE mecanicas ADD COLUMN status_aprovacao VARCHAR(20) NOT NULL DEFAULT ''pendente''', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND INDEX_NAME='uq_mecanicas_usuario'), 'ALTER TABLE mecanicas ADD UNIQUE KEY uq_mecanicas_usuario (usuario_id)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND INDEX_NAME='uq_mecanicas_cnpj'), 'ALTER TABLE mecanicas ADD UNIQUE KEY uq_mecanicas_cnpj (cnpj)', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND CONSTRAINT_NAME='fk_mecanicas_usuario'), 'ALTER TABLE mecanicas ADD CONSTRAINT fk_mecanicas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

SET @sfx_sql = IF(NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='mecanicas' AND CONSTRAINT_NAME='chk_mecanicas_status'), 'ALTER TABLE mecanicas ADD CONSTRAINT chk_mecanicas_status CHECK (status_aprovacao IN (''pendente'',''aprovada'',''bloqueada''))', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

-- Somente na primeira introdução do status; não reaprova oficinas bloqueadas em execuções futuras.
SET @sfx_sql = IF(@sfx_novo_status, 'UPDATE mecanicas SET status_aprovacao=''aprovada'' WHERE usuario_id IS NULL', 'SELECT 1');
PREPARE sfx_stmt FROM @sfx_sql;
EXECUTE sfx_stmt;
DEALLOCATE PREPARE sfx_stmt;

CREATE TABLE IF NOT EXISTS mecanica_servicos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()), mecanica_id CHAR(36) NOT NULL,
    nome VARCHAR(180) NOT NULL, descricao TEXT, preco_estimado DECIMAL(10,2),
    CONSTRAINT chk_servicos_preco CHECK (preco_estimado IS NULL OR preco_estimado >= 0),
    CONSTRAINT fk_servicos_mecanica FOREIGN KEY (mecanica_id) REFERENCES mecanicas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mecanica_horarios (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()), mecanica_id CHAR(36) NOT NULL,
    dia_semana INT NOT NULL, abertura TIME NULL, fechamento TIME NULL,
    fechado BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_horario_mecanica_dia (mecanica_id, dia_semana),
    CONSTRAINT fk_horarios_mecanica FOREIGN KEY (mecanica_id) REFERENCES mecanicas(id) ON DELETE CASCADE,
    CONSTRAINT chk_horarios_periodo CHECK ((fechado = TRUE AND abertura IS NULL AND fechamento IS NULL) OR (fechado = FALSE AND abertura IS NOT NULL AND fechamento IS NOT NULL AND abertura >= '00:00:00' AND fechamento < '24:00:00' AND abertura < fechamento)),
    CONSTRAINT chk_horarios_dia CHECK (dia_semana BETWEEN 0 AND 6)
) ENGINE=InnoDB;

