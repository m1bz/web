// public/register.js

// Redirect away if already authenticated
(async () => {
  const me = await fetch('/api/me', { credentials: 'same-origin' });
  if (me.status === 200) location.href = 'index.html';
})();

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    username: form.username.value,
    email: form.email.value,
    password: form.password.value,
  };

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });

  const errorEl = document.getElementById('register-error');
  if (res.ok) {
    location.href = 'index.html';
  } else {
    const data = await res.json().catch(() => ({}));
    errorEl.textContent = data.message || 'Registration failed';
    errorEl.hidden = false;
  }
});