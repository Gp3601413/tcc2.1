document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formAgendamento');
    if (!form || !window.Sfx) return;
    const mensagem = document.getElementById('agendamentoMensagem');
    const oficinas = document.getElementById('agendamentoMecanica');
    const lista = document.getElementById('meusAgendamentos');
    const dataHora = document.getElementById('agendamentoDataHora');
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    dataHora.min = agora.toISOString().slice(0, 16);

    function statusTexto(status) {
        return ({ Pendente: 'Aguardando confirmação', Confirmado: 'Confirmado pela oficina', Recusado: 'Solicitação recusada' })[status] || status;
    }

    async function carregarMeus() {
        try {
            const dados = await Sfx.request('/api/agendamentos/meus', { auth: true });
            lista.replaceChildren();
            const itens = dados.agendamentos || [];
            if (!itens.length) { lista.textContent = 'Você ainda não possui agendamentos.'; return; }
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
        } catch (e) { lista.textContent = e.message || 'Não foi possível carregar seus agendamentos.'; }
    }

    try {
        const dados = await Sfx.request('/api/mechanics');
        oficinas.replaceChildren(new Option('Selecione uma oficina', ''));
        (dados.mecanicas || []).forEach(m => {
            const nome = m.demonstracao ? m.nome + ' — FICTÍCIA / DEMONSTRAÇÃO' : m.nome;
            oficinas.add(new Option(nome, m.id));
        });
        if (!dados.mecanicas?.length) oficinas.replaceChildren(new Option('Nenhuma oficina aprovada disponível', ''));
    } catch (e) {
        oficinas.replaceChildren(new Option('Erro ao carregar oficinas', ''));
        mensagem.textContent = e.message;
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        mensagem.textContent = 'Enviando solicitação...';
        const local = dataHora.value;
        if (!local || !oficinas.value) { mensagem.textContent = 'Selecione a data, horário e oficina.'; return; }
        try {
            await Sfx.request('/api/agendamentos', {
                method: 'POST', auth: true,
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
        } catch (e2) { mensagem.textContent = e2.message || 'Não foi possível solicitar o agendamento.'; }
    });

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
