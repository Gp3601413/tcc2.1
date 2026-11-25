/**
 * Smart Fix (sFx) - Dashboard
 * Busca dados reais do usuário/veículo logado via API (agora em C#/.NET)
 */

document.addEventListener('DOMContentLoaded', function() {

    console.log('📊 Smart Fix (sFx) - Dashboard carregado');

    const API_BASE = window.SFX_API_BASE_URL || '';
    let grafico = null;
    let historicoAtual = [];

    function getSessao() {
        if (window.Sfx?.obterSessao) return window.Sfx.obterSessao();
        const dados = localStorage.getItem('sfx_usuario') || sessionStorage.getItem('sfx_usuario');
        if (!dados) return null;
        try {
            return JSON.parse(dados);
        } catch (e) {
            return null;
        }
    }

    function logout() {
        localStorage.removeItem('sfx_usuario');
        localStorage.removeItem('sfx_lembrar');
        sessionStorage.removeItem('sfx_usuario');
        console.log('🔓 Usuário desconectado');
        window.location.href = 'login.html';
    }
    window.sfxLogout = logout;

    async function chamarApi(caminho, token, opcoes = {}) {
        const resposta = await fetch(`${API_BASE}${caminho}`, {
            ...opcoes,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(opcoes.headers || {})
            }
        });
        if (resposta.status === 401) {
            logout();
            return null;
        }
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados?.erro || dados?.detail || 'Falha ao consultar o servidor (' + resposta.status + ').');
        return dados;
    }

    function atualizarInterfaceUsuario(usuario) {
        document.querySelectorAll('.user-greeting h2 span').forEach(el => {
            el.textContent = usuario.nome.split(' ')[0];
        });
        document.querySelectorAll('.user-info strong').forEach(el => {
            el.textContent = usuario.nome;
        });
        const iniciais = String(usuario.nome || 'Smart Fix').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
        document.querySelectorAll('.user-info .avatar').forEach(el => {
            el.textContent = usuario.avatar || iniciais || 'SF';
        });
        document.querySelectorAll('.user-info span').forEach(el => {
            el.textContent = usuario.email;
        });
    }

    function atualizarNavegacaoLateral() {
        const links = document.querySelectorAll('.sidebar-nav a');
        const alvo = window.location.hash || '#topo';
        links.forEach(link => {
            const ativo = link.hash === alvo && link.pathname === window.location.pathname;
            link.classList.toggle('active', ativo);
            if (ativo) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    /**
     * Classifica um valor em uma faixa de "estado" (bom/atenção/crítico)
     * para colorir os cards do relatório semanal dinamicamente.
     */
    function classificarBateria(bateria) {
        if (bateria >= 60) return { texto: 'Ótimo estado', cor: '#22c55e', icone: 'fa-check-circle' };
        if (bateria >= 30) return { texto: 'Estado razoável', cor: '#f59e0b', icone: 'fa-exclamation-circle' };
        return { texto: 'Nível crítico', cor: '#ef4444', icone: 'fa-battery-quarter' };
    }

    function classificarTemperatura(temp) {
        if (temp < 10) return { texto: 'Baixa, verifique o sistema', cor: '#06b6d4', icone: 'fa-temperature-low' };
        if (temp < 35) return { texto: 'Normal', cor: '#3b82f6', icone: 'fa-thermometer-half' };
        if (temp < 40) return { texto: 'Elevada, fique atento', cor: '#f59e0b', icone: 'fa-thermometer-three-quarters' };
        return { texto: 'Alta, verifique o sistema', cor: '#ef4444', icone: 'fa-thermometer-full' };
    }

    function atualizarRelatorioSemanal(leitura) {
        const bateriaTexto = document.getElementById('relatorioBateriaTexto');
        const bateriaIcon = document.getElementById('relatorioBateriaIcon');
        const tempTexto = document.getElementById('relatorioTempTexto');
        const tempIcon = document.getElementById('relatorioTempIcon');
        const velocidadeTexto = document.getElementById('relatorioVelocidadeTexto');

        const statusBateria = classificarBateria(leitura.bateria);
        if (bateriaTexto) bateriaTexto.textContent = `${leitura.bateria}% - ${statusBateria.texto}`;
        if (bateriaIcon) {
            bateriaIcon.style.background = `${statusBateria.cor}20`;
            bateriaIcon.style.color = statusBateria.cor;
            bateriaIcon.innerHTML = `<i class="fas ${statusBateria.icone}"></i>`;
        }

        const statusTemp = classificarTemperatura(leitura.temperatura);
        if (tempTexto) tempTexto.textContent = `${leitura.temperatura}°C - ${statusTemp.texto}`;
        if (tempIcon) {
            tempIcon.style.background = `${statusTemp.cor}20`;
            tempIcon.style.color = statusTemp.cor;
            tempIcon.innerHTML = `<i class="fas ${statusTemp.icone}"></i>`;
        }
        if (velocidadeTexto) velocidadeTexto.textContent = leitura.velocidade + ' km/h na última leitura';
    }

    function renderizarAlertas(alertas) {
        const container = document.getElementById('alertasContainer');
        if (!container) return;

        if (!alertas || alertas.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        const icones = {
            bateria_baixa: 'fa-battery-quarter',
            temperatura_alta: 'fa-temperature-high',
            temperatura_baixa: 'fa-temperature-low'
        };

        const itens = alertas.map(alerta => {
            const item = document.createElement('div');
            const tipo = Object.prototype.hasOwnProperty.call(icones, alerta.tipo) ? alerta.tipo : 'informativo';
            item.className = 'alerta-item ' + tipo;
            const icone = document.createElement('i');
            icone.className = 'fas ' + (icones[tipo] || 'fa-exclamation-triangle');
            icone.setAttribute('aria-hidden', 'true');
            const texto = document.createElement('span');
            texto.textContent = alerta.mensagem || 'Foi identificado um ponto que merece atenção.';
            item.append(icone, texto);
            return item;
        });
        container.replaceChildren(...itens);
        container.style.display = 'flex';
    }

    function renderizarProblemas(alertas, possuiLeitura) {
        const container = document.getElementById('problemasDinamicos');
        if (!container) return;
        container.replaceChildren();
        if (!possuiLeitura) {
            const vazio = document.createElement('div');
            vazio.className = 'diagnostico-vazio';
            vazio.innerHTML = '<i class="fas fa-hourglass-half" aria-hidden="true"></i>';
            const titulo = document.createElement('strong');
            titulo.textContent = 'Aguardando leituras do veículo';
            const texto = document.createElement('p');
            texto.textContent = 'Assim que uma leitura for registrada, o sistema avaliará as faixas configuradas.';
            vazio.append(titulo, texto);
            container.append(vazio);
            return;
        }
        if (!Array.isArray(alertas) || alertas.length === 0) {
            const vazio = document.createElement('div');
            vazio.className = 'diagnostico-vazio';
            vazio.innerHTML = '<i class="fas fa-circle-check" aria-hidden="true"></i>';
            const titulo = document.createElement('strong');
            titulo.textContent = 'Nenhum alerta nas leituras mais recentes';
            const texto = document.createElement('p');
            texto.textContent = 'Os dados recebidos estão dentro das faixas de demonstração configuradas no sistema.';
            vazio.append(titulo, texto);
            container.append(vazio);
            return;
        }
        const detalhes = {
            bateria_baixa: { titulo: 'Nível de bateria baixo', classe: 'critico', icone: 'fa-battery-quarter' },
            temperatura_alta: { titulo: 'Temperatura acima da faixa', classe: 'critico', icone: 'fa-temperature-high' },
            temperatura_baixa: { titulo: 'Temperatura abaixo da faixa', classe: 'alerta', icone: 'fa-temperature-low' }
        };
        alertas.forEach(alerta => {
            const tipo = Object.prototype.hasOwnProperty.call(detalhes, alerta.tipo) ? alerta.tipo : 'informativo';
            const detalhe = detalhes[tipo] || { titulo: 'Ponto de atenção', classe: 'info', icone: 'fa-circle-info' };
            const card = document.createElement('article');
            card.className = 'problema-card ' + detalhe.classe;
            const topo = document.createElement('div');
            topo.className = 'problema-header';
            const icone = document.createElement('i');
            icone.className = 'fas ' + detalhe.icone;
            icone.setAttribute('aria-hidden', 'true');
            const selo = document.createElement('span');
            selo.className = 'status-badge';
            selo.textContent = detalhe.classe === 'critico' ? 'Atenção prioritária' : 'Atenção';
            topo.append(icone, selo);
            const titulo = document.createElement('h3');
            titulo.textContent = detalhe.titulo;
            const mensagem = document.createElement('p');
            mensagem.textContent = alerta.mensagem || 'A leitura merece uma verificação.';
            const acao = document.createElement('button');
            acao.type = 'button';
            acao.className = 'btn-agendar-mecanico';
            acao.textContent = 'Solicitar avaliação em oficina';
            card.append(topo, titulo, mensagem, acao);
            container.append(card);
        });
    }

    function renderizarGrafico(historico) {
        const canvas = document.getElementById('graficoHistorico');
        const lista = document.getElementById('historicoLista');
        const vazio = document.getElementById('historicoVazio');
        if (!canvas) return;

        if (!Array.isArray(historico) || historico.length === 0) {
            if (grafico) {
                grafico.destroy();
                grafico = null;
            }
            canvas.hidden = true;
            if (lista) {
                lista.hidden = true;
                lista.replaceChildren();
            }
            if (vazio) vazio.hidden = false;
            return;
        }

        if (vazio) vazio.hidden = true;

        // Se o CDN do Chart.js estiver indisponível, ainda mostramos as leituras em lista.
        if (typeof Chart === 'undefined') {
            if (grafico) {
                grafico.destroy();
                grafico = null;
            }
            canvas.hidden = true;
            if (lista) {
                lista.hidden = false;
                lista.replaceChildren();
                historico.slice().reverse().forEach(ponto => {
                    const item = document.createElement('li');
                    const data = new Date(ponto.registrado_em);
                    const horario = Number.isNaN(data.getTime())
                        ? 'Horário indisponível'
                        : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const momento = document.createElement('strong');
                    momento.textContent = horario;
                    const valores = document.createElement('span');
                    valores.textContent = `Bateria ${ponto.bateria}% · ${ponto.temperatura}°C · ${ponto.velocidade} km/h`;
                    item.append(momento, valores);
                    lista.append(item);
                });
            }
            return;
        }

        canvas.hidden = false;
        if (lista) lista.hidden = true;

        const labels = historico.map(ponto => {
            const data = new Date(ponto.registrado_em);
            return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        });

        const dadosBateria = historico.map(p => p.bateria);
        const dadosTemperatura = historico.map(p => p.temperatura);

        if (grafico) {
            grafico.data.labels = labels;
            grafico.data.datasets[0].data = dadosBateria;
            grafico.data.datasets[1].data = dadosTemperatura;
            grafico.update();
            return;
        }

        grafico = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Bateria (%)',
                        data: dadosBateria,
                        borderColor: '#22c55e',
                        backgroundColor: '#22c55e20',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Temperatura (°C)',
                        data: dadosTemperatura,
                        borderColor: '#ef4444',
                        backgroundColor: '#ef444410',
                        tension: 0.3,
                        fill: false,
                        yAxisID: 'yTemperatura'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    y: { type: 'linear', position: 'left', min: 0, max: 100, title: { display: true, text: 'Bateria (%)' } },
                    yTemperatura: { type: 'linear', position: 'right', min: -20, max: 100, grid: { drawOnChartArea: false }, title: { display: true, text: 'Temperatura (°C)' } }
                }
            }
        });
    }

    function atualizarPainelVeiculo(dadosDashboard, ehAdmin) {
        const nomeEl = document.getElementById('veiculoNomeModelo');
        const placaAnoEl = document.getElementById('veiculoPlacaAno');
        const bateriaEl = document.getElementById('statBateria');
        const temperaturaEl = document.getElementById('statTemperatura');
        const velocidadeEl = document.getElementById('statVelocidade');
        const saudeIndicador = document.getElementById('saudeIndicador');
        const saudeTexto = document.getElementById('saudeTexto');
        const atualizadoEm = document.getElementById('historicoAtualizadoEm');
        const telemetriaSemLeitura = document.getElementById('telemetriaSemLeitura');

        if (!dadosDashboard || dadosDashboard.erro) {
            if (nomeEl) nomeEl.textContent = 'Nenhum veículo cadastrado';
            renderizarGrafico([]);
            const vazioTitulo = document.getElementById('historicoVazioTitulo');
            const vazioTexto = document.getElementById('historicoVazioTexto');
            const linkSimulador = document.getElementById('historicoSimuladorLink');
            if (vazioTitulo) vazioTitulo.textContent = 'Não há veículo para consultar nesta conta';
            if (vazioTexto) vazioTexto.textContent = 'Cadastre ou selecione um veículo de demonstração para começar a registrar o monitoramento.';
            if (linkSimulador) linkSimulador.hidden = !ehAdmin;
            historicoAtual = [];
            renderizarAlertas([]);
            renderizarProblemas([], false);
            return;
        }

        const { veiculo, leituraAtual, saude, alertas, historico } = dadosDashboard;
        historicoAtual = Array.isArray(historico) ? historico : [];
        renderizarGrafico(historicoAtual);
        renderizarProblemas(alertas || [], Boolean(leituraAtual));

        if (nomeEl) nomeEl.textContent = `${veiculo.marca} ${veiculo.modelo}`;
        if (placaAnoEl) placaAnoEl.textContent = `${veiculo.placa || 'Sem placa'} | ${veiculo.ano || '--'}`;

        if (!leituraAtual) {
            if (bateriaEl) bateriaEl.textContent = '--';
            if (temperaturaEl) temperaturaEl.textContent = '--';
            if (velocidadeEl) velocidadeEl.textContent = '--';
            if (saudeIndicador) saudeIndicador.style.width = '0%';
            if (saudeTexto) saudeTexto.textContent = 'Saúde: aguardando leitura';
            if (atualizadoEm) atualizadoEm.textContent = 'Aguardando leitura';
            if (telemetriaSemLeitura) telemetriaSemLeitura.hidden = false;
            const vazioTitulo = document.getElementById('historicoVazioTitulo');
            const vazioTexto = document.getElementById('historicoVazioTexto');
            const linkSimulador = document.getElementById('historicoSimuladorLink');
            if (vazioTitulo) vazioTitulo.textContent = 'Seu histórico aparecerá aqui';
            if (vazioTexto) vazioTexto.textContent = ehAdmin
                ? 'Aplique uma leitura no simulador para começar a montar o histórico deste veículo.'
                : 'Assim que houver uma leitura do veículo, bateria, temperatura e velocidade serão mostradas aqui.';
            if (linkSimulador) linkSimulador.hidden = !ehAdmin;
            const bateriaRelatorio = document.getElementById('relatorioBateriaTexto');
            const temperaturaRelatorio = document.getElementById('relatorioTempTexto');
            if (bateriaRelatorio) bateriaRelatorio.textContent = 'Sem leitura registrada';
            if (temperaturaRelatorio) temperaturaRelatorio.textContent = 'Sem leitura registrada';
            const velocidadeRelatorio = document.getElementById('relatorioVelocidadeTexto');
            if (velocidadeRelatorio) velocidadeRelatorio.textContent = 'Sem leitura registrada';
            renderizarAlertas([]);
            renderizarProblemas([], false);
            return;
        }

        if (telemetriaSemLeitura) telemetriaSemLeitura.hidden = true;
        if (bateriaEl) bateriaEl.textContent = `${leituraAtual.bateria}%`;
        if (temperaturaEl) temperaturaEl.textContent = `${leituraAtual.temperatura}°C`;
        if (velocidadeEl) velocidadeEl.textContent = `${leituraAtual.velocidade} km/h`;
        if (saudeIndicador) saudeIndicador.style.width = `${saude}%`;
        if (saudeTexto) saudeTexto.textContent = `Saúde: ${saude}%`;

        if (atualizadoEm) {
            const data = new Date(leituraAtual.registrado_em);
            atualizadoEm.textContent = Number.isNaN(data.getTime()) ? 'Horário indisponível' : 'Atualizado em ' + data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        }

        atualizarRelatorioSemanal(leituraAtual);
        renderizarAlertas(alertas);
        renderizarProblemas(alertas || [], true);
    }


    function configurarMenuMobile() {
        const sidebar = document.getElementById('sidebar');
        const abrir = document.getElementById('mobileMenuToggle');
        const fundo = document.getElementById('sidebarBackdrop');
        if (!sidebar || !abrir || !fundo) return;
        const fechar = () => {
            sidebar.classList.remove('open');
            fundo.classList.remove('visible');
            abrir.setAttribute('aria-expanded', 'false');
            abrir.setAttribute('aria-label', 'Abrir menu');
            const icon = abrir.querySelector('i');
            if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-times'); }
        };
        abrir.addEventListener('click', () => {
            const aberto = sidebar.classList.toggle('open');
            fundo.classList.toggle('visible', aberto);
            abrir.setAttribute('aria-expanded', String(aberto));
            abrir.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
            const icon = abrir.querySelector('i');
            if (icon) { icon.classList.toggle('fa-bars', !aberto); icon.classList.toggle('fa-times', aberto); }
        });
        fundo.addEventListener('click', fechar);
        sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', fechar));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
    }

    function exportarHistoricoCSV() {
        if (!historicoAtual.length) {
            alert('Ainda não existem leituras para exportar.');
            return;
        }
        const cabecalho = ['Data e hora', 'Bateria (%)', 'Temperatura (C)', 'Velocidade (km/h)'];
        const linhas = historicoAtual.map(p => [
            new Date(p.registrado_em).toLocaleString('pt-BR'),
            p.bateria, p.temperatura, p.velocidade
        ]);
        const csv = [cabecalho, ...linhas].map(linha => linha.map(valor => '"' + String(valor ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'smart-fix-leituras-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function mostrarStatusDashboard(texto, estado = '') {
        const el = document.getElementById('dashboardStatus');
        if (!el) return;
        el.textContent = texto || '';
        if (estado) el.dataset.state = estado;
        else delete el.dataset.state;
    }

    async function inicializar() {
        atualizarNavegacaoLateral();
        window.addEventListener('hashchange', atualizarNavegacaoLateral);
        configurarMenuMobile();
        const dataAtual = document.getElementById('dataAtual');
        if (dataAtual) dataAtual.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

        const sessao = getSessao();

        if (!sessao || !sessao.token) {
            console.warn('🔒 Usuário não autenticado. Redirecionando para login...');
            window.location.href = 'login.html';
            return;
        }

        const botaoSimuladorAdmin = document.getElementById('btnSimuladorAdmin');
        if (botaoSimuladorAdmin && sessao.papel === 'admin') {
            botaoSimuladorAdmin.hidden = false;
        }

        mostrarStatusDashboard('Conectando ao serviço de monitoramento...');
        try {
            const meResposta = await chamarApi('/api/auth/me', sessao.token);
            if (!meResposta || meResposta.erro) return;
            atualizarInterfaceUsuario(meResposta.usuario);
            const dashboardResposta = await chamarApi('/api/dashboard?historico=20', sessao.token);
            atualizarPainelVeiculo(dashboardResposta, sessao.papel === 'admin');
            mostrarStatusDashboard('Dados sincronizados com o servidor.', 'success');
        } catch (erro) {
            mostrarStatusDashboard(erro.message || 'Não foi possível carregar os dados do veículo.', 'error');
        }

        document.getElementById('btnExportarRelatorio')?.addEventListener('click', exportarHistoricoCSV);

        const btnSair = document.querySelector('.btn-sair');
        if (btnSair) {
            btnSair.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Tem certeza que deseja sair?')) logout();
            });
        }

        // Atualiza os dados periodicamente (a cada 30s) para simular monitoramento em tempo real
        setInterval(async () => {
            if (document.hidden) return;
            try {
                const dados = await chamarApi('/api/dashboard?historico=20', sessao.token);
                atualizarPainelVeiculo(dados, sessao.papel === 'admin');
                mostrarStatusDashboard('Dados sincronizados às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 'success');
            } catch (erro) {
                mostrarStatusDashboard(erro.message || 'Falha ao atualizar os dados.', 'error');
            }
        }, 15000);

        console.log('📊 Dashboard Smart Fix (sFx) pronto!');
    }

    inicializar();
});
