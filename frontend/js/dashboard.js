/**
 * Smart Fix (sFx) - Dashboard
 * Busca dados reais do usuário/veículo logado via API (agora em C#/.NET)
 */

document.addEventListener('DOMContentLoaded', function() {

    console.log('📊 Smart Fix (sFx) - Dashboard carregado');

    const API_BASE = window.SFX_API_BASE_URL || '';
    let grafico = null;

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
        return resposta.json();
    }

    function atualizarInterfaceUsuario(usuario) {
        document.querySelectorAll('.user-greeting h2 span').forEach(el => {
            el.textContent = usuario.nome.split(' ')[0];
        });
        document.querySelectorAll('.user-info strong').forEach(el => {
            el.textContent = usuario.nome;
        });
        document.querySelectorAll('.user-info .avatar').forEach(el => {
            el.textContent = usuario.avatar || 'US';
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

        container.innerHTML = alertas.map(alerta => `
            <div class="alerta-item ${alerta.tipo}">
                <i class="fas ${icones[alerta.tipo] || 'fa-exclamation-triangle'}"></i>
                <span>${alerta.mensagem}</span>
            </div>
        `).join('');
        container.style.display = 'flex';
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
        const dadosVelocidade = historico.map(p => p.velocidade);

        if (grafico) {
            grafico.data.labels = labels;
            grafico.data.datasets[0].data = dadosBateria;
            grafico.data.datasets[1].data = dadosTemperatura;
            grafico.data.datasets[2].data = dadosVelocidade;
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
                        backgroundColor: '#ef444420',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Velocidade (km/h)',
                        data: dadosVelocidade,
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f620',
                        tension: 0.3,
                        fill: true
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
                    y: { beginAtZero: true }
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
            renderizarAlertas([]);
            return;
        }

        const { veiculo, leituraAtual, saude, alertas, historico } = dadosDashboard;
        renderizarGrafico(historico || [], ehAdmin);

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
            renderizarAlertas([]);
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
            atualizadoEm.textContent = `Atualizado às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        atualizarRelatorioSemanal(leituraAtual);
        renderizarAlertas(alertas);
    }

    async function inicializar() {
        atualizarNavegacaoLateral();
        window.addEventListener('hashchange', atualizarNavegacaoLateral);

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

        const meResposta = await chamarApi('/api/auth/me', sessao.token);
        if (!meResposta || meResposta.erro) return;

        atualizarInterfaceUsuario(meResposta.usuario);

        const dashboardResposta = await chamarApi('/api/dashboard?historico=20', sessao.token);
        atualizarPainelVeiculo(dashboardResposta, sessao.papel === 'admin');

        const btnSair = document.querySelector('.btn-sair');
        if (btnSair) {
            btnSair.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Tem certeza que deseja sair?')) logout();
            });
        }

        // Atualiza os dados periodicamente (a cada 30s) para simular monitoramento em tempo real
        setInterval(async () => {
            const dados = await chamarApi('/api/dashboard?historico=20', sessao.token);
            atualizarPainelVeiculo(dados, sessao.papel === 'admin');
        }, 30000);

        console.log('📊 Dashboard Smart Fix (sFx) pronto!');
    }

    inicializar();
});
