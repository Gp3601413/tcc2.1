if (sfxExigirPapel(['admin'])) {
    const api = (caminho, opcoes = {}) => Sfx.request(caminho, { ...opcoes, auth: true });
    const esc = Sfx.escapeHtml;
    let paginaMecanicas = 1;
    let paginaUsuarios = 1;
    let versaoMecanicas = 0;
    const mensagem = document.getElementById('adminMensagem');
    const exibirErro = erro => { mensagem.textContent = erro.message; };

    async function carregarMetricas() {
        const metricas = await api('/api/admin/metricas');
        for (const chave of ['totalUsuarios', 'totalMecanicas', 'mecanicasPendentes', 'mecanicasBloqueadas', 'cadastrosUltimos30Dias'])
            document.getElementById(chave).textContent = metricas[chave];
    }

    function controles(prefixo, pagina, temMais, carregando = false) {
        document.getElementById(prefixo + 'Anterior').disabled = carregando || pagina <= 1;
        document.getElementById(prefixo + 'Proxima').disabled = carregando || !temMais;
        document.getElementById(prefixo + 'Pagina').textContent = 'Página ' + pagina;
    }

    async function carregarMecanicas() {
        const versao = ++versaoMecanicas;
        controles('adminMec', paginaMecanicas, false, true);
        const params = new URLSearchParams({ pagina: paginaMecanicas });
        const status = document.getElementById('filtroStatus').value;
        if (status) params.set('status', status);
        const dados = await api('/api/admin/mecanicas?' + params);
        if (versao !== versaoMecanicas) return;
        const corpo = document.getElementById('tabelaMecanicas');
        corpo.replaceChildren();
        for (const m of dados.itens) {
            const tr = document.createElement('tr');
            const estado = ['pendente', 'aprovada', 'bloqueada'].includes(m.statusAprovacao) ? m.statusAprovacao : 'pendente';
            tr.innerHTML = `<td>${esc(m.nome)}</td><td>${esc(m.cnpj || '—')}</td><td>${esc(m.telefone || '—')}</td><td><span class="badge badge-${estado}">${esc(estado)}</span></td><td><select aria-label="Alterar status da oficina"><option value="pendente">Pendente</option><option value="aprovada">Aprovada</option><option value="bloqueada">Bloqueada</option></select></td>`;
            const select = tr.querySelector('select');
            select.value = estado;
            select.addEventListener('change', async () => {
                select.disabled = true;
                try {
                    await api('/api/admin/mecanicas/' + encodeURIComponent(m.id) + '/status',
                        { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
                    mensagem.textContent = 'Status atualizado.';
                    await Promise.all([carregarMetricas(), carregarMecanicas()]);
                } catch (erro) { select.value = estado; exibirErro(erro); }
                finally { select.disabled = false; }
            });
            corpo.append(tr);
        }
        if (!dados.itens.length) corpo.innerHTML = '<tr><td colspan="5">Nenhuma oficina encontrada.</td></tr>';
        controles('adminMec', paginaMecanicas, dados.temMais);
    }

    async function carregarUsuarios() {
        controles('adminUser', paginaUsuarios, false, true);
        const dados = await api('/api/admin/usuarios?pagina=' + paginaUsuarios);
        const corpo = document.getElementById('tabelaUsuarios');
        corpo.replaceChildren();
        for (const u of dados.itens) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.papel)}</td><td>${esc(new Date(u.criadoEm).toLocaleDateString('pt-BR'))}</td>`;
            corpo.append(tr);
        }
        if (!dados.itens.length) corpo.innerHTML = '<tr><td colspan="4">Nenhum usuário encontrado.</td></tr>';
        controles('adminUser', paginaUsuarios, dados.temMais);
    }

    document.getElementById('filtroStatus').addEventListener('change', () => {
        paginaMecanicas = 1; carregarMecanicas().catch(exibirErro);
    });
    document.getElementById('adminMecAnterior').addEventListener('click', () => { paginaMecanicas--; carregarMecanicas().catch(exibirErro); });
    document.getElementById('adminMecProxima').addEventListener('click', () => { paginaMecanicas++; carregarMecanicas().catch(exibirErro); });
    document.getElementById('adminUserAnterior').addEventListener('click', () => { paginaUsuarios--; carregarUsuarios().catch(exibirErro); });
    document.getElementById('adminUserProxima').addEventListener('click', () => { paginaUsuarios++; carregarUsuarios().catch(exibirErro); });
    document.getElementById('adminRecarregar').addEventListener('click', () =>
        Promise.all([carregarMetricas(), carregarMecanicas(), carregarUsuarios()]).catch(exibirErro));
    Promise.all([carregarMetricas(), carregarMecanicas(), carregarUsuarios()]).catch(exibirErro);
}
