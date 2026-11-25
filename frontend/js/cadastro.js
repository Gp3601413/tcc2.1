/**
 * Smart Fix (sFx) - Cadastro
 * Envia os dados do formulário (usuário + veículo) para a API real
 */

document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('cadastroForm');
    if (!form) return;

    const btnSubmit = document.getElementById('btnCadastroSubmit');
    const errorContainer = document.getElementById('cadastroError');
    const errorMessage = document.getElementById('cadastroErrorMessage');

    function mostrarErro(mensagem) {
        errorMessage.textContent = mensagem;
        errorContainer.style.display = 'block';
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function esconderErro() {
        errorContainer.style.display = 'none';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        esconderErro();

        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        if (senha !== confirmarSenha) {
            mostrarErro('As senhas não coincidem.');
            return;
        }
        if (senha.length < 6) {
            mostrarErro('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        const payload = {
            nome: document.getElementById('nome').value.trim(),
            cpf: document.getElementById('cpf').value.trim(),
            email: document.getElementById('email').value.trim().toLowerCase(),
            telefone: document.getElementById('telefone').value.trim(),
            senha,
            cep: document.getElementById('cep').value.trim(),
            cidade: document.getElementById('cidade').value.trim(),
            estado: document.getElementById('estado').value,
            endereco: document.getElementById('endereco').value.trim(),
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value.trim(),
            ano: document.getElementById('ano').value,
            placa: document.getElementById('placa').value.trim(),
            bateria: document.getElementById('bateria').value || null,
            cor: document.getElementById('cor').value
        };

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';

        try {
            const resposta = await fetch(`${window.SFX_API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                mostrarErro(dados.erro || 'Não foi possível criar a conta.');
                return;
            }

            // Loga automaticamente o usuário recém-criado
            sessionStorage.setItem('sfx_usuario', JSON.stringify({
                token: dados.token,
                ...dados.usuario,
                loginTimestamp: new Date().toISOString()
            }));

            window.location.href = 'dashboard.html';

        } catch (erro) {
            console.error('Erro de conexão:', erro);
            mostrarErro('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-user-plus"></i> Criar Conta';
        }
    });
});
