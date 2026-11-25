if (sfxExigirPapel(['mecanica', 'admin'])) {
    const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

    let salvando = false;
    async function api(caminho, opcoes = {}) {
        const gravacao = opcoes.method && opcoes.method !== 'GET';
        if (gravacao && salvando) throw new Error('Aguarde a gravação atual terminar.');
        const botoes = gravacao ? [...document.querySelectorAll('button')] : [];
        if (gravacao) { salvando = true; botoes.forEach(b => { b.disabled = true; }); }
        try { return await Sfx.request(caminho, { ...opcoes, auth: true }); }
        finally { if (gravacao) { salvando = false; botoes.forEach(b => { b.disabled = false; }); } }
    }

    function mensagem(id, texto, erro = false) {
        const el = document.getElementById(id); el.textContent = texto; el.style.color = erro ? '#a61624' : '#087443';
    }

    function linhaServico(servico = {}) {
        const linha = document.createElement('div'); linha.className = 'service-row';
        linha.innerHTML = `<div><label>Nome</label><input class="servico-nome" maxlength="180" value="${esc(servico.nome || '')}" required></div><div><label>Descrição</label><input class="servico-descricao" maxlength="5000" value="${esc(servico.descricao || '')}"></div><div><label>Preço estimado</label><input class="servico-preco" type="number" min="0" max="99999999.99" step="0.01" value="${esc(servico.precoEstimado ?? '')}"></div><button class="danger-link remover-servico" type="button">Remover</button>`;
        linha.querySelector('.remover-servico').addEventListener('click', () => linha.remove());
        document.getElementById('listaServicos').appendChild(linha);
    }

    const esc = Sfx.escapeHtml;
    function hora(valor) { return valor ? esc(String(valor).slice(0, 5)) : ''; }

    function montarHorarios(horarios) {
        const porDia = new Map(horarios.map(h => [h.diaSemana, h]));
        const lista = document.getElementById('listaHorarios'); lista.innerHTML = '';
        dias.forEach((nome, dia) => {
            const h = porDia.get(dia) || { diaSemana: dia, abertura: '08:00', fechamento: '18:00', fechado: dia === 0 };
            const linha = document.createElement('div'); linha.className = 'schedule-row'; linha.dataset.dia = dia;
            linha.innerHTML = `<strong>${nome}</strong><input class="hora-abertura" type="time" value="${hora(h.abertura)}"><input class="hora-fechamento" type="time" value="${hora(h.fechamento)}"><label><input class="dia-fechado" type="checkbox" ${h.fechado ? 'checked' : ''}> Fechado</label>`;
            lista.appendChild(linha);
        });
    }

    async function carregarPerfil() {
        try {
            const p = await api('/api/mecanica/perfil');
            document.getElementById('mecNome').value = p.nome || '';
            document.getElementById('mecCnpj').value = p.cnpj || '';
            document.getElementById('mecEspecializacao').value = p.especializacao || '';
            document.getElementById('mecEndereco').value = p.endereco || '';
            document.getElementById('mecTelefone').value = p.telefone || '';
            document.getElementById('mecLatitude').value = p.latitude ?? '';
            document.getElementById('mecLongitude').value = p.longitude ?? '';
            const badge = document.getElementById('badgeStatus');
            badge.textContent = { pendente:'Aguardando aprovação', aprovada:'Aprovada', bloqueada:'Bloqueada' }[p.statusAprovacao] || p.statusAprovacao;
            badge.className = `badge badge-${['pendente','aprovada','bloqueada'].includes(p.statusAprovacao) ? p.statusAprovacao : 'pendente'}`;
            document.getElementById('listaServicos').innerHTML = '';
            (p.servicos || []).forEach(linhaServico); if (!(p.servicos || []).length) linhaServico();
            montarHorarios(p.horarios || []);
        } catch (e) { mensagem('perfilMensagem', e.message, true); }
    }

    document.getElementById('formPerfilMecanica').addEventListener('submit', async e => {
        e.preventDefault();
        const numeroOuNulo = id => document.getElementById(id).value === '' ? null : Number(document.getElementById(id).value);
        try {
            await api('/api/mecanica/perfil', { method:'PUT', body:JSON.stringify({
                nome:document.getElementById('mecNome').value, especializacao:document.getElementById('mecEspecializacao').value,
                endereco:document.getElementById('mecEndereco').value, telefone:document.getElementById('mecTelefone').value,
                latitude:numeroOuNulo('mecLatitude'), longitude:numeroOuNulo('mecLongitude')
            }) }); mensagem('perfilMensagem', 'Perfil salvo.');
        } catch (e2) { mensagem('perfilMensagem', e2.message, true); }
    });

    document.getElementById('btnAddServico').addEventListener('click', () => {
        if (document.querySelectorAll('.service-row').length >= 50) return mensagem('servicosMensagem', 'Limite de 50 serviços.', true);
        linhaServico();
    });
    document.getElementById('btnSalvarServicos').addEventListener('click', async () => {
        const servicos = [...document.querySelectorAll('.service-row')].map(l => ({
            nome:l.querySelector('.servico-nome').value, descricao:l.querySelector('.servico-descricao').value,
            precoEstimado:l.querySelector('.servico-preco').value === '' ? null : Number(l.querySelector('.servico-preco').value)
        }));
        if (servicos.some(s => !s.nome.trim() || (s.precoEstimado !== null && (!Number.isFinite(s.precoEstimado) || s.precoEstimado < 0)))) return mensagem('servicosMensagem', 'Informe nomes e preços válidos.', true);
        try { await api('/api/mecanica/servicos', { method:'PUT', body:JSON.stringify(servicos) }); mensagem('servicosMensagem', 'Serviços salvos.'); }
        catch (e) { mensagem('servicosMensagem', e.message, true); }
    });

    document.getElementById('btnSalvarHorarios').addEventListener('click', async () => {
        const horarios = [...document.querySelectorAll('.schedule-row')].map(l => { const fechado=l.querySelector('.dia-fechado').checked; return {
            diaSemana:Number(l.dataset.dia), abertura:fechado ? null : l.querySelector('.hora-abertura').value + ':00',
            fechamento:fechado ? null : l.querySelector('.hora-fechamento').value + ':00', fechado
        }; });
        if (horarios.some(h => !h.fechado && (h.abertura.length !== 8 || h.fechamento.length !== 8 || h.abertura >= h.fechamento))) return mensagem('horariosMensagem', 'Informe abertura anterior ao fechamento em cada dia aberto.', true);
        try { await api('/api/mecanica/horarios', { method:'PUT', body:JSON.stringify(horarios) }); mensagem('horariosMensagem', 'Horários salvos.'); }
        catch (e) { mensagem('horariosMensagem', e.message, true); }
    });

    carregarPerfil();
}
