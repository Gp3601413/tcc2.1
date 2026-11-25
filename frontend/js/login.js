/**
 * Smart Fix (sFx) - Autenticação do usuário
 * Usa o cliente HTTP e o armazenamento de sessão compartilhados.
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const senhaInput = document.getElementById('loginPassword');
    const toggleSenha = document.getElementById('toggleSenha');
    const btnSubmit = document.getElementById('btnLoginSubmit');
    const errorContainer = document.getElementById('loginError');
    const errorMessage = document.getElementById('errorMessage');
    const lembrarCheck = document.getElementById('lembrar');

    function mostrarErro(texto) {
        errorMessage.textContent = texto;
        errorContainer.style.display = 'flex';
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function esconderErro() { errorContainer.style.display = 'none'; }

    function marcarErro(campo, texto) {
        const grupo = campo.closest('.form-group');
        grupo?.classList.add('erro');
        const span = grupo?.querySelector('.campo-erro');
        if (span) span.textContent = texto;
    }
    function limparErro(campo) { campo.closest('.form-group')?.classList.remove('erro'); }
    function validarCampo(campo) {
        limparErro(campo);
        if (campo === emailInput) {
            const email = campo.value.trim();
            if (!email) { marcarErro(campo, 'Digite seu e-mail'); return false; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                marcarErro(campo, 'Digite um e-mail válido.'); return false;
            }
        }
        if (campo === senhaInput && (!campo.value || campo.value.length < 6)) {
            marcarErro(campo, 'A senha deve ter pelo menos 6 caracteres.'); return false;
        }
        return true;
    }

    if (toggleSenha && senhaInput) {
        toggleSenha.addEventListener('click', () => {
            const mostrar = senhaInput.type === 'password';
            senhaInput.type = mostrar ? 'text' : 'password';
            const icon = toggleSenha.querySelector('i');
            icon?.classList.toggle('fa-eye', !mostrar);
            icon?.classList.toggle('fa-eye-slash', mostrar);
            toggleSenha.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
            toggleSenha.setAttribute('aria-pressed', String(mostrar));
        });
    }

    [emailInput, senhaInput].filter(Boolean).forEach(campo => {
        campo.addEventListener('blur', () => validarCampo(campo));
        campo.addEventListener('input', () => {
            if (campo.closest('.form-group')?.classList.contains('erro')) validarCampo(campo);
        });
    });

    if (form) form.addEventListener('submit', async event => {
        event.preventDefault();
        esconderErro();
        document.querySelectorAll('.form-group.erro').forEach(el => el.classList.remove('erro'));
        if (!validarCampo(emailInput) || !validarCampo(senhaInput)) return;

        const original = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Verificando...';
        try {
            const dados = await Sfx.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: emailInput.value.trim().toLowerCase(),
                    senha: senhaInput.value
                })
            });
            Sfx.salvarSessao(dados.token, dados.usuario, Boolean(lembrarCheck?.checked));
            window.location.replace(Sfx.paginaPorPapel(dados.usuario?.papel));
        } catch (erro) {
            const detalhe = erro.dados;
            if (detalhe?.campo === 'email') marcarErro(emailInput, 'E-mail não encontrado.');
            if (detalhe?.campo === 'senha') marcarErro(senhaInput, 'Senha incorreta.');
            mostrarErro(erro.message || 'Não foi possível entrar. Tente novamente.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = original;
        }
    });

    async function verificarSessao() {
        if (!Sfx.obterSessao()) return;
        try {
            const dados = await Sfx.request('/api/auth/me', { auth: true });
            const papel = dados?.usuario?.papel || Sfx.obterSessao()?.papel;
            window.location.replace(Sfx.paginaPorPapel(papel));
        } catch (erro) {
            if (erro.status !== 401) console.warn('Não foi possível validar a sessão existente.');
        }
    }
    verificarSessao();
});
