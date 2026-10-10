const form = document.querySelector('#reset-form');
const status = document.querySelector('#status');
const token = new URLSearchParams(location.search).get('token');

if (!token) {
  form.hidden = true;
  status.textContent = 'A ligação de reposição é inválida ou está incompleta.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (password !== confirmPassword) {
    status.textContent = 'As palavras-passe não coincidem.';
    return;
  }

  status.textContent = 'A guardar a nova palavra-passe...';
  try {
    const response = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmPassword })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message || 'Não foi possível repor a palavra-passe.');
    }
    form.hidden = true;
    status.textContent = payload.data.message;
  } catch (error) {
    status.textContent = error.message || 'Não foi possível contactar o serviço.';
  }
});
