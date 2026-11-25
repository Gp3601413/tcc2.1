document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cadastroMecanicaForm');
  const button = document.getElementById('btnCadastroMecanica');
  const feedback = document.getElementById('cadastroMecanicaFeedback');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.textContent = '';
    const payload = {
      nomeResponsavel: document.getElementById('nomeResponsavel').value.trim(),
      cpf: document.getElementById('cpf').value,
      email: document.getElementById('email').value.trim().toLowerCase(),
      telefone: document.getElementById('telefone').value.trim(),
      senha: document.getElementById('senha').value,
      nomeMecanica: document.getElementById('nomeMecanica').value.trim(),
      cnpj: document.getElementById('cnpj').value,
      especializacao: document.getElementById('especializacao').value.trim(),
      endereco: document.getElementById('endereco').value.trim()
    };

    button.disabled = true;
    button.textContent = 'Criando cadastro...';
    try {
      const response = await fetch(window.SFX_API_BASE_URL + '/api/auth/register-mecanica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.erro || 'Não foi possível criar o cadastro.');

      sessionStorage.setItem('sfx_usuario', JSON.stringify({
        token: data.token,
        ...data.usuario,
        loginTimestamp: new Date().toISOString()
      }));
      feedback.style.color = '#087443';
      feedback.textContent = 'Cadastro enviado! Sua oficina está aguardando aprovação administrativa.';
      window.location.href = 'mecanica-dashboard.html';
    } catch (error) {
      feedback.style.color = '#b42318';
      feedback.textContent = error.message || 'Falha ao conectar com o servidor.';
    } finally {
      button.disabled = false;
      button.textContent = 'Criar conta da mecânica';
    }
  });
});