-- Dados fictícios opcionais para apresentação local. Não são oficinas verificadas.
USE smartfix;

-- As oficinas de demonstracao ficam aprovadas para aparecer no site publico.
INSERT INTO mecanicas (id,nome,especializacao,endereco,telefone,avaliacao,status_aprovacao)
SELECT UUID(),'EcoCar Elétricos','Veículos Elétricos','Av. Paulista, 1000 - SP','(11) 99999-9999',4.8,'aprovada'
WHERE NOT EXISTS (SELECT 1 FROM mecanicas WHERE nome='EcoCar Elétricos');
INSERT INTO mecanicas (id,nome,especializacao,endereco,telefone,avaliacao,status_aprovacao)
SELECT UUID(),'Volt Tech Solutions','Sistemas Elétricos','Rua Augusta, 500 - SP','(11) 88888-8888',4.5,'aprovada'
WHERE NOT EXISTS (SELECT 1 FROM mecanicas WHERE nome='Volt Tech Solutions');
INSERT INTO mecanicas (id,nome,especializacao,endereco,telefone,avaliacao,status_aprovacao)
SELECT UUID(),'Green Motion','Baterias e Motores','Av. Brasil, 200 - SP','(11) 77777-7777',4.9,'aprovada'
WHERE NOT EXISTS (SELECT 1 FROM mecanicas WHERE nome='Green Motion');
INSERT INTO mecanicas (id,nome,especializacao,endereco,telefone,avaliacao,status_aprovacao)
SELECT UUID(),'EletroDrive Centro','Diagnóstico de baterias e sistemas elétricos de alta tensão','Endereço fictício de demonstração - São Paulo/SP','(00) 0000-0001',4.9,'aprovada'
WHERE NOT EXISTS (SELECT 1 FROM mecanicas WHERE nome='EletroDrive Centro');
INSERT INTO mecanicas (id,nome,especializacao,endereco,telefone,avaliacao,status_aprovacao)
SELECT UUID(),'Voltz Garage','Manutenção de motores elétricos e carregadores','Endereço fictício de demonstração - São Paulo/SP','(00) 0000-0002',4.8,'aprovada'
WHERE NOT EXISTS (SELECT 1 FROM mecanicas WHERE nome='Voltz Garage');
INSERT INTO mecanicas (id,nome,especializacao,endereco,telefone,avaliacao,status_aprovacao)
SELECT UUID(),'Raio Verde Oficina Elétrica','Revisão preventiva e sistemas de recarga','Endereço fictício de demonstração - São Paulo/SP','(00) 0000-0003',4.7,'aprovada'
WHERE NOT EXISTS (SELECT 1 FROM mecanicas WHERE nome='Raio Verde Oficina Elétrica');

-- UPDATE usuarios SET papel='admin' WHERE email='admin@smartfix.com';
