/** Sessão e acesso à API compartilhados por todas as páginas. */
(function (global) {
    'use strict';
    const sessionKey = 'sfx_usuario';

    function limparSessao() {
        for (const storage of [global.sessionStorage, global.localStorage]) {
            storage.removeItem(sessionKey);
            storage.removeItem('sfx_lembrar');
        }
    }

    function payloadToken(token) {
        try {
            if (typeof token !== 'string' || token.split('.').length !== 3) return null;
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), c => c.charCodeAt(0));
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch { return null; }
    }

    function obterSessao() {
        // Prioriza a sessão da aba em instalações antigas com ambos os armazenamentos.
        for (const storage of [global.sessionStorage, global.localStorage]) {
            try {
                const sessao = JSON.parse(storage.getItem(sessionKey) || 'null');
                const payload = payloadToken(sessao?.token);
                if (payload && Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now())
                    return { ...sessao, papel: payload.papel };
                storage.removeItem(sessionKey);
            } catch { storage.removeItem(sessionKey); }
        }
        return null;
    }

    function salvarSessao(token, usuario, lembrar = false) {
        const payload = payloadToken(token);
        if (!payload || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now())
            throw new Error('O servidor retornou uma sessão inválida.');
        limparSessao();
        const storage = lembrar ? global.localStorage : global.sessionStorage;
        storage.setItem(sessionKey, JSON.stringify({ ...usuario, token, loginTimestamp: new Date().toISOString() }));
        if (lembrar) global.localStorage.setItem('sfx_lembrar', 'true');
    }

    function sair() {
        limparSessao();
        global.location.replace('login.html');
    }

    function paginaPorPapel(papel) {
        return { admin: 'admin.html', mecanica: 'mecanica-dashboard.html', cliente: 'dashboard.html' }[papel] || 'login.html';
    }

    function exigirPapel(papeis) {
        const sessao = obterSessao();
        if (!sessao) { sair(); return false; }
        if (!papeis.includes(sessao.papel)) {
            global.location.replace(paginaPorPapel(sessao.papel));
            return false;
        }
        return true; // A API sempre verifica o token e as permissões novamente.
    }

    class ApiError extends Error {
        constructor(message, status = 0, dados = null) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.dados = dados;
        }
    }

    async function request(caminho, { auth = false, timeout = 15000, signal, ...opcoes } = {}) {
        const base = String(global.SFX_API_BASE_URL || '').replace(/\/+$/, '');
        if (!base) throw new ApiError('O serviço está sem conexão configurada. Entre em contato com o responsável pelo site.');
        const headers = new Headers(opcoes.headers);
        if (opcoes.body != null) headers.set('Content-Type', 'application/json');
        if (auth) {
            const sessao = obterSessao();
            if (!sessao) { sair(); throw new ApiError('Sessão expirada. Entre novamente.', 401); }
            headers.set('Authorization', 'Bearer ' + sessao.token);
        }
        const controller = new AbortController();
        const cancelar = () => controller.abort();
        if (signal?.aborted) controller.abort();
        else signal?.addEventListener('abort', cancelar, { once: true });
        let tempoEsgotado = false;
        const timer = setTimeout(() => { tempoEsgotado = true; controller.abort(); }, timeout);
        try {
            const resposta = await fetch(base + caminho, { ...opcoes, headers, signal: controller.signal });
            const texto = await resposta.text();
            let dados = null;
            try { dados = texto ? JSON.parse(texto) : null; } catch {
                if (resposta.ok) throw new ApiError('O servidor retornou uma resposta inesperada.', resposta.status);
            }
            if (!resposta.ok) {
                if (resposta.status === 401 && auth) sair();
                const campos = dados?.campos || dados?.errors;
                const detalhe = campos ? Object.values(campos).flat().find(v => typeof v === 'string' && v) : null;
                throw new ApiError(detalhe || dados?.erro || dados?.detail ||
                    (resposta.status === 403 ? 'Você não tem permissão para esta operação.' :
                        'Não foi possível concluir a solicitação (' + resposta.status + ').'), resposta.status, dados);
            }
            return dados;
        } catch (erro) {
            if (erro instanceof ApiError || signal?.aborted) throw erro;
            const gravacao = opcoes.method && !['GET', 'HEAD'].includes(opcoes.method.toUpperCase());
            if (gravacao) throw new ApiError('Não foi possível confirmar a operação. Confira se ela foi concluída antes de tentar novamente.');
            throw new ApiError(tempoEsgotado ? 'O servidor demorou para responder. Tente novamente.' :
                'Não foi possível conectar ao servidor. Tente novamente.');
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancelar);
        }
    }

    function escapeHtml(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    global.Sfx = Object.freeze({ obterSessao, salvarSessao, limparSessao, payloadToken, sair,
        paginaPorPapel, exigirPapel, request, escapeHtml, ApiError });
})(window);
