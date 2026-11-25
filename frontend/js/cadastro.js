/**
 * Smart Fix (sFx) - Cadastro de cliente e veículo
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroForm');
    if (!form) return;
    const button = document.getElementById('btnCadastroSubmit');
    const errorContainer = document.getElementById('cadastroError');
    const errorMessage = document.getElementById('cadastroErrorMessage');

    function feedback(texto) {
        errorMessage.textContent = texto;
        errorContainer.style.display = 'block';
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        errorContainer.style.display = 'none';
        const senha = document.getElementById('senha').value;
        const confirmar = document.getElementById('confirmar-senha').value;
        if (senha !== confirmar) return feedback('As senhas não coincidem.');
        if (senha.length < 6) return feedback('A senha deve ter pelo menos 6 caracteres.');

        const valor = id => document.getElementById(id)?.value?.trim() ?? '';
        const payload = {
            nome: valor('nome'), cpf: valor('cpf'), email: valor('email').toLowerCase(),
            telefone: valor('telefone'), senha, cep: valor('cep'), cidade: valor('cidade'),
            estado: valor('estado'), endereco: valor('endereco'), marca: valor('marca'),
            modelo: valor('modelo'), ano: valor('ano'), placa: valor('placa'),
            bateria: valor('bateria') || null, cor: valor('cor')
        };

        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Criando conta...';
        try {
            const dados = await Sfx.request('/api/auth/register', {
                method: 'POST', body: JSON.stringify(payload)
            });
            Sfx.salvarSessao(dados.token, dados.usuario, false);
            window.location.replace('dashboard.html');
        } catch (erro) {
            feedback(erro.message || 'Não foi possível criar a conta.');
        } finally {
            button.disabled = false;
            button.innerHTML = original;
        }
    });
});
