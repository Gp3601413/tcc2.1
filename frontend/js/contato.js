/**
 * Smart Fix (sFx) - Formulário de Contato
 * Envia a mensagem para a API real (salva no banco de dados)
 */

document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('contatoForm');
    if (!form) return;

    const btnSubmit = document.getElementById('btnContatoSubmit');
    const feedback = document.getElementById('contatoFeedback');

    function mostrarFeedback(mensagem, tipo) {
        feedback.textContent = mensagem;
        feedback.style.display = 'block';
        feedback.style.color = tipo === 'sucesso' ? '#16a34a' : '#e11d48';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const payload = {
            nome: document.getElementById('contatoNome').value.trim(),
            email: document.getElementById('contatoEmail').value.trim(),
            assunto: document.getElementById('contatoAssunto').value,
            mensagem: document.getElementById('contatoMensagem').value.trim()
        };

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            const resposta = await fetch(`${window.SFX_API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                mostrarFeedback(dados.erro || 'Não foi possível enviar sua mensagem.', 'erro');
                return;
            }

            mostrarFeedback('✅ Mensagem enviada com sucesso! Retornaremos em breve.', 'sucesso');
            form.reset();

        } catch (erro) {
            console.error('Erro de conexão:', erro);
            mostrarFeedback('Não foi possível conectar ao servidor. Tente novamente.', 'erro');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensagem';
        }
    });
});
