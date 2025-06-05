// public/admin.js
// Protect: only admin users (is_admin flag) can access
(async () => {
  const meRes = await fetch('/api/me', { credentials: 'same-origin' });
  if (meRes.status !== 200) return location.href = 'login.html';
  const user = await meRes.json();
  if (!user.is_admin) return location.href = 'index.html';

  // Fetch muscles for dropdowns
  try {
    const res = await fetch('/api/muscles', { credentials: 'same-origin' });
    if (res.ok) {
      const muscles = await res.json();
      const primarySelect = document.getElementById('primary-muscle-select');
      const secondarySelect = document.getElementById('secondary-muscles-select');
      muscles.forEach(m => {
        const opt = document.createElement('option'); opt.value = m.name; opt.textContent = m.name;
        primarySelect.appendChild(opt.cloneNode(true));
        secondarySelect.appendChild(opt);
      });
    }
  } catch (err) { console.error(err); }

  // Handle form submission
  document.getElementById('exercise-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const primary_muscle = formData.get('primary_muscle');
    const difficulty = formData.get('difficulty');
    const equipment_type = formData.get('equipment_type').trim();
    const equipment_subtype = formData.get('equipment_subtype').trim() || null;
    const instructions = formData.get('instructions').trim();

    // collect secondary as array
    const secondaryNodeList = document.getElementById('secondary-muscles-select').selectedOptions;
    const secondary_muscles = Array.from(secondaryNodeList).map(opt => opt.value);

    // construct payload
    const payload = { name, primary_muscle, secondary_muscles, difficulty, equipment_type, equipment_subtype, instructions };
    try {
      const res = await fetch('/api/add-exercise', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload)
      });
      const msgEl = document.getElementById('submit-message');
      if (res.ok) {
        msgEl.textContent = 'Exercise added successfully.';
        msgEl.style.color = '#2ecc71'; msgEl.hidden = false;
        form.reset();
      } else {
        const err = await res.json();
        msgEl.textContent = err.message || 'Error adding exercise.';
        msgEl.style.color = '#e74c3c'; msgEl.hidden = false;
      }
    } catch (err) {
      console.error(err);
    }
  });
})();