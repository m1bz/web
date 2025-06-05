// public/login.js

(async () => {
  const me = await fetch('/api/me', { credentials: 'same-origin' });
  if (me.status === 200) location.href = 'home.html';
})();

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    email: form.email.value,
    password: form.password.value,
  };

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });

  const errorEl = document.getElementById('login-error');
  if (res.ok) {
    location.href = 'index.html';
  } else {
    const data = await res.json().catch(() => ({}));
    errorEl.textContent = data.message || 'Login failed';
    errorEl.hidden = false;
  }
});