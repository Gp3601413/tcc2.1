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
        if (classe) el.className = classe;
        el.textContent = valor ?? '';
        return el;
    }

    function linhaInfo(icone, valor) {
        const linha = document.createElement('p');
        linha.className = 'oficina-info';
        const simbolo = document.createElement('i');
        simbolo.className = 'fas ' + icone;
        simbolo.setAttribute('aria-hidden', 'true');
        const conteudo = texto('span', '', valor || 'Não informado');
        linha.append(simbolo, conteudo);
        return linha;
    }

    function cardOficina(mec) {
        const card = document.createElement('article');
        card.className = 'mecanica-card';

        const header = document.createElement('div');
        header.className = 'oficina-card-header';
        const icon = document.createElement('div');
        icon.className = 'card-icon';
        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-charging-station';
        iconElement.setAttribute('aria-hidden', 'true');
        icon.append(iconElement);

        const titulo = document.createElement('div');
        titulo.className = 'card-info';
        titulo.append(
            texto('h3', '', mec.nome),
            texto('span', 'especializacao', mec.especializacao || 'Oficina parceira')
        );
        header.append(icon, titulo);

        const conteudo = document.createElement('div');
        conteudo.className = 'oficina-card-content';
        if (mec.demonstracao) {
            const selo = texto('span', 'oficina-demo-badge', 'Oficina fictícia • Demonstração');
            conteudo.append(selo);
        }
        conteudo.append(linhaInfo('fa-location-dot', mec.endereco));
        if (mec.telefone) conteudo.append(linhaInfo('fa-phone', mec.telefone));

        const rodape = document.createElement('div');
        rodape.className = 'oficina-card-footer';
        const nota = Number.isFinite(Number(mec.avaliacao))
            ? Math.max(0, Math.min(5, Number(mec.avaliacao))) : 0;
        const avaliacaoEl = document.createElement('div');
        avaliacaoEl.className = 'oficina-avaliacao';
        avaliacaoEl.append(
            texto('span', 'stars', '★'.repeat(Math.round(nota)) + '☆'.repeat(5 - Math.round(nota))),
            texto('strong', '', nota.toFixed(1))
        );
        if (mec.demonstracao) avaliacaoEl.append(texto('small', '', 'nota ilustrativa'));
        rodape.append(avaliacaoEl);

        const acao = texto('span', 'oficina-disponivel', 'Parceira Smart Fix');
        rodape.append(acao);
        card.append(header, conteudo, rodape);
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
        const params = new URLSearchParams({ pagina, tamanhoPagina: 12 });
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
            grid.replaceChildren(texto('p', 'status-message', erro.message || 'Não foi possível carregar as oficinas.'));
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
