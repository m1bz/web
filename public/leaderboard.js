// public/leaderboard.js
(async () => {
  // Auth‐guard
  const me = await fetch('/api/me', { credentials: 'same-origin' });
  if (me.status !== 200) return location.href = 'login.html';

  const tbody = document.querySelector('#board tbody');
  try {
    const res = await fetch('/api/leaderboard', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to load leaderboard');
    const rows = await res.json();

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="3">No activity yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((r,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${r.username}</td>
        <td>${r.logs}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">Error: ${err.message}</td></tr>`;
  }
})();
