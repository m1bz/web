// public/search.js
(() => {
  const input = document.getElementById('global-search');
  const list  = document.getElementById('global-search-results');
  let timer, controller;

  if (!input || !list) return;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(timer);

    if (!q) {
      list.hidden = true;
      return;
    }

    // debounce 300ms
    timer = setTimeout(async () => {
      // cancel any in-flight request
      if (controller) controller.abort();
      controller = new AbortController();

      try {
        const res = await fetch(
          `/api/exercises?search=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Server error');
        const exercises = await res.json();

        if (exercises.length === 0) {
          list.hidden = true;
          return;
        }

        list.innerHTML = exercises.map(ex => `
          <li data-id="${ex.id}">
            <strong>${ex.name}</strong>
            <small>${ex.primary_muscle} • ${ex.equipment_type}</small>
          </li>
        `).join('');
        list.hidden = false;
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    }, 300);
  });

  // navigate on click
  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const id = li.dataset.id;
    window.location.href = `/exercise.html?id=${id}`;
  });

  // close dropdown if clicking elsewhere
  document.addEventListener('click', e => {
    if (
      !input.contains(e.target) &&
      !list.contains(e.target)
    ) list.hidden = true;
  });
})();
