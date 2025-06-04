// public/auth.js – injects login / user dropdown into header
(async () => {
  const $placeholder = document.getElementById('user-btn');
  if (!$placeholder) return;

  // Wrap button in a container to anchor dropdown
  const wrapper = document.createElement('div');
  wrapper.className = 'account-wrapper';
  $placeholder.parentNode.replaceChild(wrapper, $placeholder);
  wrapper.appendChild($placeholder);

  // Fetch session info
  let user = null;
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.status === 200) user = await res.json();
  } catch { /* ignore */ }

  if (!user) {
    // ------- Guest
    $placeholder.textContent = '👤';
    $placeholder.style.fontSize = '1.4rem';
    $placeholder.onclick = () => location.href = 'login.html';
    return;
  }

  // ------- Authenticated: create dropdown
  $placeholder.textContent = `${user.username} ▾`;

  const menu = document.createElement('ul');
  menu.className = 'user-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <li><button class="dropdown-item" id="logout-btn">Log out</button></li>
  `;
  wrapper.appendChild(menu);

  // Toggle menu visibility
  $placeholder.addEventListener('click', e => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });

  // Global click closes menu
  document.addEventListener('click', () => (menu.hidden = true));

  // Logout handler
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    location.reload();
  });
})();
