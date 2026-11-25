/** Busca, filtros e paginação das oficinas aprovadas. */
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('mecanicasGrid');
    if (!grid) return;
    const busca = document.getElementById('buscaMecanica');
    const especializacao = document.getElementById('filtroEspecializacao');
    const avaliacao = document.getElementById('filtroAvaliacao');
    const anterior = document.getElementById('mecanicasAnterior');
    const proxima = document.getElementById('mecanicasProxima');
    const indicador = document.getElementById('mecanicasPagina');
    let pagina = 1;
    let requisicao;
    let debounce;

    function texto(tag, classe, valor) {
        const el = document.createElement(tag);
        el.className = classe;
        el.textContent = valor ?? '';
        return el;
    }

    function cardOficina(mec) {
        const card = document.createElement('div');
        card.className = 'mecanica-card';
        const header = document.createElement('div');
        header.className = 'card-header';
        const icon = document.createElement('div');
        icon.className = 'card-icon';
        icon.innerHTML = '<i class="fas fa-tools" aria-hidden="true"></i>';
        const detalhes = document.createElement('div');
        detalhes.append(texto('h3', '', mec.nome), texto('span', 'especializacao', mec.especializacao));
        header.append(icon, detalhes);
        const nota = Number.isFinite(Number(mec.avaliacao)) ? Math.max(0, Math.min(5, Number(mec.avaliacao))) : 0;
        const avaliacaoEl = document.createElement('div');
        avaliacaoEl.className = 'avaliacao';
        const cheias = Math.round(nota);
        avaliacaoEl.append(texto('span', 'stars', '★'.repeat(cheias) + '☆'.repeat(5 - cheias)),
            texto('span', '', nota.toFixed(1)));
        const telefone = String(mec.telefone || '').replace(/[^0-9+]/g, '');
        if (/^\+?\d{8,15}$/.test(telefone)) {
            const link = texto('a', 'btn-card', 'Ligar');
            link.href = 'tel:' + telefone;
            avaliacaoEl.append(link);
        }
        card.append(header, texto('div', 'info', mec.endereco), texto('div', 'info', mec.telefone), avaliacaoEl);
        return card;
    }

    async function carregar() {
        requisicao?.abort();
        const controller = new AbortController();
        requisicao = controller;
        if (anterior) anterior.disabled = true;
        if (proxima) proxima.disabled = true;
        grid.setAttribute('aria-busy', 'true');
        grid.replaceChildren(texto('p', 'status-message', 'Carregando oficinas...'));
        const params = new URLSearchParams({ pagina, tamanhoPagina: busca ? 12 : 3 });
        if (busca?.value.trim()) params.set('busca', busca.value.trim());
        if (especializacao?.value) params.set('especializacao', especializacao.value);
        if (avaliacao?.value) params.set('avaliacaoMinima', avaliacao.value);
        try {
            const dados = await Sfx.request('/api/mechanics?' + params, { signal: controller.signal });
            if (controller.signal.aborted) return;
            const cards = (dados.mecanicas || []).map(cardOficina);
            grid.replaceChildren(...(cards.length ? cards : [texto('p', 'status-message', 'Nenhuma oficina encontrada com esses filtros.')]));
            if (indicador) indicador.textContent = 'Página ' + pagina;
            if (anterior) anterior.disabled = pagina <= 1;
            if (proxima) proxima.disabled = !dados.temMais;
        } catch (erro) {
            if (controller.signal.aborted) return;
            grid.replaceChildren(texto('p', 'status-message', erro.message));
            const tentar = texto('button', 'btn-primary', 'Tentar novamente');
            tentar.type = 'button';
            tentar.addEventListener('click', carregar);
            grid.append(tentar);
        } finally {
            if (requisicao === controller) grid.setAttribute('aria-busy', 'false');
        }
    }

    busca?.addEventListener('input', () => {
        clearTimeout(debounce);
        requisicao?.abort();
        debounce = setTimeout(() => { pagina = 1; carregar(); }, 300);
    });
    for (const filtro of [especializacao, avaliacao]) filtro?.addEventListener('change', () => {
        clearTimeout(debounce); pagina = 1; carregar();
    });
    anterior?.addEventListener('click', () => { pagina = Math.max(1, pagina - 1); carregar(); });
    proxima?.addEventListener('click', () => { pagina++; carregar(); });
    window.addEventListener('pagehide', () => { clearTimeout(debounce); requisicao?.abort(); });
    carregar();
});
