// Guard page
const res = await fetch('/api/me', { credentials: 'same-origin' });
if (res.status !== 200) location.href = 'login.html';

const $grid = document.getElementById('saved-grid');

try {
  const out = await fetch('/api/saved-workouts', { credentials: 'same-origin' });
  if (out.ok) {
    const list = await out.json();
    if (!list.length) {
      $grid.innerHTML = '<p>No saved workouts yet.</p>';
    } else {
      $grid.innerHTML = list.map(w => renderCard(w)).join('');
    }
  } else {
    $grid.innerHTML = '<p>Error loading workouts.</p>';
  }
} catch {
  $grid.innerHTML = '<p>Error loading workouts.</p>';
}

function renderCard(w) {
  const exNames = w.workout_data.map(e => e.name).join(', ');
  return `
    <article class="card">
      <h3>${w.name}</h3>
      <small>${new Date(w.created_at).toLocaleDateString()} · ${w.body_parts_worked.join(', ')}</small>
      <p>${exNames}</p>
    </article>
  `;
}