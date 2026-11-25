if (sfxExigirPapel(['admin'])) {
    const api = (caminho, opcoes = {}) => Sfx.request(caminho, { ...opcoes, auth: true });
    const controles = {
        veiculo: document.getElementById('simVeiculo'),
        bateria: document.getElementById('simBateria'),
        temperatura: document.getElementById('simTemperatura'),
        velocidade: document.getElementById('simVelocidade')
    };
    const mensagem = document.getElementById('simMensagem');
    const enviar = document.getElementById('aplicarSimulacao');
    let veiculos = [];

    function atualizarPrevia() {
        const bateria = Number(controles.bateria.value);
        const temperatura = Number(controles.temperatura.value);
        const velocidade = Number(controles.velocidade.value);
        const saude = Math.max(0, Math.min(100, Math.round(bateria - Math.max(0, temperatura - 40))));
        document.getElementById('simBateriaValor').textContent = bateria + '%';
        document.getElementById('simTemperaturaValor').textContent = temperatura + ' °C';
        document.getElementById('simVelocidadeValor').textContent = velocidade + ' km/h';
        document.getElementById('previewBateria').textContent = bateria + '%';
        document.getElementById('previewTemperatura').textContent = temperatura + ' °C';
        document.getElementById('previewVelocidade').textContent = velocidade + ' km/h';
        document.getElementById('previewSaude').textContent = saude + '%';
        document.getElementById('estadoTemperatura').textContent = temperatura >= 40 ? 'Temperatura elevada' : 'Temperatura normal';
        document.getElementById('estadoBateria').textContent = bateria <= 20 ? 'Bateria baixa' : 'Sem alerta de bateria';
        const barra = document.getElementById('previewBateriaBar');
        barra.style.width = bateria + '%';
        barra.style.background = bateria <= 20 ? '#d64545' : bateria <= 40 ? '#e09a2d' : '#22a06b';
        const alertas = [];
        if (bateria <= 20) alertas.push('Bateria baixa: considere recarregar em breve.');
        if (temperatura >= 40) alertas.push('Temperatura alta: verifique o sistema de arrefecimento.');
        const area = document.getElementById('simAlertas');
        area.hidden = alertas.length === 0;
        area.replaceChildren();
        if (alertas.length) {
            const titulo = document.createElement('strong');
            titulo.textContent = 'Alertas da simulação';
            const lista = document.createElement('ul');
            for (const alerta of alertas) {
                const item = document.createElement('li');
                item.textContent = alerta;
                lista.append(item);
            }
            area.append(titulo, lista);
        }
    }

    async function carregarVeiculos() {
        try {
            const dados = await api('/api/admin/simulador/veiculos');
            veiculos = dados.veiculos || [];
            controles.veiculo.replaceChildren();
            for (const veiculo of veiculos) {
                const opcao = document.createElement('option');
                opcao.value = veiculo.id;
                opcao.textContent = [veiculo.marca, veiculo.modelo, veiculo.ano].filter(Boolean).join(' ');
                opcao.dataset.bateria = veiculo.bateriaInicial;
                controles.veiculo.append(opcao);
            }
            enviar.disabled = veiculos.length === 0;
            if (!veiculos.length) {
                const opcao = document.createElement('option');
                opcao.textContent = 'Nenhum veículo nesta conta. Use o login de demonstração.';
                controles.veiculo.append(opcao);
                mensagem.textContent = 'Esta conta ainda não tem veículo para simular.';
            } else {
                controles.bateria.value = Math.round(veiculos[0].bateriaInicial ?? 85);
                atualizarPrevia();
            }
        } catch (erro) {
            mensagem.textContent = erro.message;
            enviar.disabled = true;
        }
    }

    for (const controle of [controles.bateria, controles.temperatura, controles.velocidade])
        controle.addEventListener('input', atualizarPrevia);
    controles.veiculo.addEventListener('change', () => {
        const veiculo = veiculos.find(v => v.id === controles.veiculo.value);
        if (veiculo) controles.bateria.value = Math.round(veiculo.bateriaInicial ?? 85);
        atualizarPrevia();
    });

    enviar.addEventListener('click', async () => {
        enviar.disabled = true;
        mensagem.textContent = 'Salvando leitura simulada...';
        try {
            const resultado = await api('/api/admin/simulador/telemetria', {
                method: 'POST',
                body: JSON.stringify({
                    veiculoId: controles.veiculo.value,
                    bateria: Number(controles.bateria.value),
                    temperatura: Number(controles.temperatura.value),
                    velocidade: Number(controles.velocidade.value)
                })
            });
            mensagem.textContent = 'Leitura simulada salva no banco em ' +
                new Date(resultado.registradoEm).toLocaleTimeString('pt-BR') + '. Abra o painel para ver a atualização.';
        } catch (erro) {
            mensagem.textContent = erro.message;
        } finally {
            enviar.disabled = veiculos.length === 0;
        }
    });

    atualizarPrevia();
    carregarVeiculos();
}
