/**
 * Smart Fix (sFx) - Sistema de Login
 * Autenticação via API real (backend + PostgreSQL)
 */

document.addEventListener('DOMContentLoaded', function() {

    console.log('🔐 Smart Fix (sFx) - Sistema de Login carregado');

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const senhaInput = document.getElementById('loginPassword');
    const toggleSenha = document.getElementById('toggleSenha');
    const btnSubmit = document.getElementById('btnLoginSubmit');
    const errorContainer = document.getElementById('loginError');
    const errorMessage = document.getElementById('errorMessage');
    const lembrarCheck = document.getElementById('lembrar');

    function mostrarErro(mensagem) {
        errorMessage.textContent = mensagem;
        errorContainer.style.display = 'flex';
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function esconderErro() {
        errorContainer.style.display = 'none';
    }

    function marcarErro(campo, mensagem) {
        const grupo = campo.closest('.form-group');
        const erroSpan = grupo.querySelector('.campo-erro');
        grupo.classList.add('erro');
        if (erroSpan) erroSpan.textContent = mensagem;
    }

    function limparErro(campo) {
        campo.closest('.form-group').classList.remove('erro');
    }

    function limparTodosErros() {
        document.querySelectorAll('.form-group.erro').forEach(el => el.classList.remove('erro'));
        esconderErro();
    }

    function validarCampo(campo) {
        limparErro(campo);

        if (campo === emailInput) {
            const email = campo.value.trim();
            if (!email) { marcarErro(campo, 'Digite seu e-mail'); return false; }
            if (!email.includes('@') || !email.includes('.')) {
                marcarErro(campo, 'Digite um e-mail válido (ex: usuario@email.com)');
                return false;
            }
            return true;
        }

        if (campo === senhaInput) {
            const senha = campo.value;
            if (!senha || senha.length < 6) {
                marcarErro(campo, 'A senha deve ter pelo menos 6 caracteres');
                return false;
            }
            return true;
        }
        return true;
    }

    /**
     * Salva a sessão (token JWT + dados básicos do usuário)
     */
    function salvarSessao(token, usuario, lembrar = false) {
        const dados = { token, ...usuario, loginTimestamp: new Date().toISOString() };
        if (lembrar) {
            localStorage.setItem('sfx_usuario', JSON.stringify(dados));
            localStorage.setItem('sfx_lembrar', 'true');
        } else {
            sessionStorage.setItem('sfx_usuario', JSON.stringify(dados));
            localStorage.removeItem('sfx_lembrar');
            localStorage.removeItem('sfx_usuario');
        }
    }

    function redirecionarDashboard() {
        window.location.href = 'dashboard.html';
    }

    if (toggleSenha) {
        toggleSenha.addEventListener('click', function() {
            const icon = this.querySelector('i');
            const isPassword = senhaInput.type === 'password';
            senhaInput.type = isPassword ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
            this.classList.toggle('ativo');
        });
    }

    if (emailInput) {
        emailInput.addEventListener('blur', function() { validarCampo(this); });
        emailInput.addEventListener('input', function() {
            if (this.closest('.form-group').classList.contains('erro')) validarCampo(this);
        });
    }

    if (senhaInput) {
        senhaInput.addEventListener('blur', function() { validarCampo(this); });
        senhaInput.addEventListener('input', function() {
            if (this.closest('.form-group').classList.contains('erro')) validarCampo(this);
        });
    }

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            limparTodosErros();

            const emailValido = validarCampo(emailInput);
            const senhaValida = validarCampo(senhaInput);
            if (!emailValido || !senhaValida) return;

            const email = emailInput.value.trim().toLowerCase();
            const senha = senhaInput.value;
            const lembrar = lembrarCheck ? lembrarCheck.checked : false;

            btnSubmit.classList.add('carregando');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

            try {
                const resposta = await fetch(`${window.SFX_API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });

                const dados = await resposta.json();

                if (!resposta.ok) {
                    console.log('❌ Login falhou:', dados.erro);
                    if (dados.campo === 'email') {
                        marcarErro(emailInput, 'E-mail não encontrado');
                    } else if (dados.campo === 'senha') {
                        marcarErro(senhaInput, 'Senha incorreta');
                    }
                    mostrarErro(dados.erro || 'Não foi possível entrar. Tente novamente.');
                    return;
                }

                console.log('✅ Login bem-sucedido:', dados.usuario.nome);
                salvarSessao(dados.token, dados.usuario, lembrar);
                redirecionarDashboard();

            } catch (erro) {
                console.error('Erro de conexão:', erro);
                mostrarErro('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
            } finally {
                btnSubmit.classList.remove('carregando');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
            }
        });
    }

    /**
     * Verifica se já existe uma sessão válida (consultando a API)
     */
    async function verificarSessao() {
        let sessao = localStorage.getItem('sfx_usuario') || sessionStorage.getItem('sfx_usuario');
        if (!sessao) return;

        try {
            const { token } = JSON.parse(sessao);
            const resposta = await fetch(`${window.SFX_API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resposta.ok && window.location.pathname.includes('login.html')) {
                window.location.href = 'dashboard.html';
            } else if (!resposta.ok) {
                localStorage.removeItem('sfx_usuario');
                sessionStorage.removeItem('sfx_usuario');
                localStorage.removeItem('sfx_lembrar');
            }
        } catch (e) {
            console.warn('⚠️ Sessão corrompida, ignorando');
        }
    }

    verificarSessao();

    function preencherCredenciais() {
        const lembrar = localStorage.getItem('sfx_lembrar');
        if (lembrar === 'true') {
            const dados = localStorage.getItem('sfx_usuario');
            if (dados) {
                try {
                    const usuario = JSON.parse(dados);
                    if (usuario.email) {
                        emailInput.value = usuario.email;
                        if (lembrarCheck) lembrarCheck.checked = true;
                    }
                } catch (e) { /* ignora */ }
            }
        }
    }

    preencherCredenciais();
});
