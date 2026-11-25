/** Cadastro de oficina parceira. */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroMecanicaForm');
    if (!form) return;
    const button = document.getElementById('btnCadastroMecanica');
    const feedback = document.getElementById('cadastroMecanicaFeedback');

    form.addEventListener('submit', async event => {
        event.preventDefault();
        feedback.textContent = '';
        const value = id => document.getElementById(id)?.value?.trim() ?? '';
        const payload = {
            nomeResponsavel: value('nomeResponsavel'), cpf: value('cpf'),
            email: value('email').toLowerCase(), telefone: value('telefone'),
            senha: document.getElementById('senha').value,
            nomeMecanica: value('nomeMecanica'), cnpj: value('cnpj'),
            especializacao: value('especializacao'), endereco: value('endereco')
        };
        const original = button.textContent;
        button.disabled = true;
        button.textContent = 'Criando cadastro...';
        try {
            const dados = await Sfx.request('/api/auth/register-mecanica', {
                method: 'POST', body: JSON.stringify(payload)
            });
            Sfx.salvarSessao(dados.token, dados.usuario, false);
            feedback.style.color = '#087443';
            feedback.textContent = 'Cadastro enviado! Sua oficina está aguardando aprovação administrativa.';
            window.location.replace('mecanica-dashboard.html');
        } catch (error) {
            feedback.style.color = '#b42318';
            feedback.textContent = error.message || 'Falha ao conectar com o servidor.';
        } finally {
            button.disabled = false;
            button.textContent = original;
        }
    });
});
