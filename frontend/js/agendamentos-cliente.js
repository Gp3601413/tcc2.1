document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formAgendamento');
    if (!form || !window.Sfx) return;

    const mensagem = document.getElementById('agendamentoMensagem');
    const oficinas = document.getElementById('agendamentoMecanica');
    const lista = document.getElementById('meusAgendamentos');
    const dataHora = document.getElementById('agendamentoDataHora');
    const dialogRapido = document.getElementById('agendamentoRapidoDialog');
    const formRapido = document.getElementById('agendamentoRapidoForm');
    const oficinaRapida = document.getElementById('agendamentoRapidoOficina');
    const dataHoraRapida = document.getElementById('agendamentoRapidoDataHora');
    const servicoRapido = document.getElementById('agendamentoRapidoServico');
    const mensagemRapida = document.getElementById('agendamentoRapidoMensagem');
    const botaoRapido = formRapido?.querySelector('button[type="submit"]');

    function definirMinimoDataHora(input) {
        const agoraLocal = new Date();
        agoraLocal.setMinutes(agoraLocal.getMinutes() - agoraLocal.getTimezoneOffset());
        input.min = agoraLocal.toISOString().slice(0, 16);
    }

    definirMinimoDataHora(dataHora);

    function statusTexto(status) {
        return ({ Pendente: 'Aguardando confirmação', Confirmado: 'Confirmado pela oficina', Recusado: 'Solicitação recusada' })[status] || status;
    }

    async function carregarMeus() {
        try {
            const dados = await Sfx.request('/api/agendamentos/meus', { auth: true });
            lista.replaceChildren();
            const itens = dados.agendamentos || [];
            if (!itens.length) {
                lista.textContent = 'Você ainda não possui agendamentos.';
                return;
            }
            itens.forEach(a => {
                const card = document.createElement('article');
                card.className = 'agendamento-card';
                const titulo = document.createElement('strong');
                titulo.textContent = a.servico + ' — ' + a.mecanica;
                const data = document.createElement('p');
                data.textContent = new Date(a.dataHora).toLocaleString('pt-BR');
                const status = document.createElement('p');
                status.textContent = 'Status: ' + statusTexto(a.status);
                card.append(titulo, data, status);
                lista.append(card);
            });
        } catch (e) {
            lista.textContent = e.message || 'Não foi possível carregar seus agendamentos.';
        }
    }

    try {
        const dados = await Sfx.request('/api/mechanics');
        oficinas.replaceChildren(new Option('Selecione uma oficina', ''));
        (dados.mecanicas || []).forEach(m => {
            const nome = m.demonstracao ? m.nome + ' — FICTÍCIA / DEMONSTRAÇÃO' : m.nome;
            oficinas.add(new Option(nome, m.id));
        });
        if (!dados.mecanicas?.length) {
            oficinas.replaceChildren(new Option('Nenhuma oficina aprovada disponível', ''));
        }
    } catch (e) {
        oficinas.replaceChildren(new Option('Erro ao carregar oficinas', ''));
        mensagem.textContent = e.message;
    }

    // Formulário tradicional da seção "Agendar com IA".
    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensagem.textContent = 'Enviando solicitação...';
        const local = dataHora.value;
        if (!local || !oficinas.value) {
            mensagem.textContent = 'Selecione a data, horário e oficina.';
            return;
        }
        try {
            await Sfx.request('/api/agendamentos', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({
                    mecanicaId: oficinas.value,
                    servico: document.getElementById('agendamentoServico').value,
                    dataHora: local,
                    observacoes: document.getElementById('agendamentoObs').value
                })
            });
            mensagem.textContent = 'Solicitação enviada! A oficina precisa confirmar o agendamento.';
            form.reset();
            await carregarMeus();
        } catch (e2) {
            mensagem.textContent = e2.message || 'Não foi possível solicitar o agendamento.';
        }
    });

    // Agendamento rápido a partir dos botões dos cards de problemas.
    document.querySelectorAll('.btn-agendar-mecanico').forEach(botao => {
        botao.addEventListener('click', () => {
            if (!dialogRapido || !formRapido) return;

            const card = botao.closest('.problema-card');
            const tituloProblema = card?.querySelector('h3')?.textContent?.trim() || 'Revisão do veículo';
            document.getElementById('agendamentoRapidoProblema').textContent =
                'Solicitação relacionada a: ' + tituloProblema;

            const titulo = tituloProblema.toLowerCase();
            if (titulo.includes('bateria')) servicoRapido.value = 'Diagnóstico da bateria';
            else if (titulo.includes('temperatura') || titulo.includes('térmico')) servicoRapido.value = 'Verificação do sistema térmico';
            else if (titulo.includes('freio') || titulo.includes('pastilha')) servicoRapido.value = 'Inspeção do sistema de freios';
            else servicoRapido.value = 'Revisão de veículo elétrico';

            oficinaRapida.replaceChildren(...Array.from(oficinas.options).map(opcao =>
                new Option(opcao.textContent, opcao.value, false, false)
            ));
            definirMinimoDataHora(dataHoraRapida);
            dataHoraRapida.value = '';
            document.getElementById('agendamentoRapidoObs').value = '';
            mensagemRapida.textContent = '';

            if (botaoRapido) {
                botaoRapido.disabled = false;
                botaoRapido.textContent = 'Confirmar agendamento';
            }
            dialogRapido.showModal();
        });
    });

    document.getElementById('fecharAgendamentoRapido')?.addEventListener('click', () => dialogRapido?.close());
    dialogRapido?.addEventListener('click', evento => {
        if (evento.target === dialogRapido) dialogRapido.close();
    });

    formRapido?.addEventListener('submit', async evento => {
        evento.preventDefault();

        if (!oficinaRapida.value || !dataHoraRapida.value) {
            mensagemRapida.textContent = 'Selecione uma oficina, data e horário.';
            return;
        }
        if (new Date(dataHoraRapida.value) <= new Date()) {
            mensagemRapida.textContent = 'Escolha uma data e horário futuros.';
            return;
        }

        if (botaoRapido) {
            botaoRapido.disabled = true;
            botaoRapido.textContent = 'Enviando...';
        }
        mensagemRapida.textContent = 'Enviando solicitação para a oficina...';

        try {
            await Sfx.request('/api/agendamentos', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({
                    mecanicaId: oficinaRapida.value,
                    servico: servicoRapido.value,
                    dataHora: dataHoraRapida.value,
                    observacoes: document.getElementById('agendamentoRapidoObs').value
                })
            });

            mensagem.textContent = 'Agendamento solicitado! A oficina precisa confirmar o horário.';
            mensagemRapida.textContent = 'Solicitação enviada! A oficina precisa confirmar o horário.';
            await carregarMeus();
            formRapido.reset();
            dialogRapido.close();
        } catch (erro) {
            mensagemRapida.textContent = erro.message || 'Não foi possível enviar o agendamento.';
        } finally {
            if (botaoRapido) {
                botaoRapido.disabled = false;
                botaoRapido.textContent = 'Confirmar agendamento';
            }
        }
    });

    // Respostas rápidas da IA existente.
    document.querySelectorAll('.ia-opcoes .opcao').forEach(botao => {
        botao.addEventListener('click', () => {
            const formulario = document.querySelector('.agendar-form');
            if (botao.dataset.opcao === 'sim') formulario.style.display = 'block';
            else document.querySelector('.ia-texto > p').textContent = botao.dataset.opcao === 'depois'
                ? 'Tudo bem. Você pode solicitar um agendamento quando quiser.'
                : 'Tudo bem. Você pode continuar usando o monitoramento do Smart Fix.';
        });
    });

    await carregarMeus();
    setInterval(carregarMeus, 30000);
});
