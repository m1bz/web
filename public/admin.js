// public/admin.js (full file) 
(async () => {
  /* 1. AUTH GUARD */
  const meRes = await fetch('/api/me', { credentials: 'same-origin' });
  if (meRes.status !== 200) {
    location.href = 'login.html';
    return;
  }
  const me = await meRes.json();
  if (!me.is_admin) {
    location.href = 'home.html';
    return;
  }

  /* 2. POPULATE MUSCLE DROPDOWNS */
  try {
    const res = await fetch('/api/muscles', { credentials: 'same-origin' });
    if (res.ok) {
      const muscles = await res.json();
      const $primary   = document.getElementById('primary-muscle-select');
      const $secondary = document.getElementById('secondary-muscles-select');
      muscles.forEach(({ name }) => {
        $primary.appendChild(new Option(name, name));
        $secondary.appendChild(new Option(name, name));
      });
    } else {
      console.error('Failed to load muscles:', res.statusText);
    }
  } catch (err) {
    console.error('Error loading muscles:', err);
  }

  /* 3. FORM SUBMIT HANDLER (MULTIPART) */
  const $form = document.getElementById('exercise-form');
  const $msg  = document.getElementById('submit-message');
  if (!$form) {
    console.error('Form #exercise-form not found');
    return;
  }

  $form.addEventListener('submit', async function(e) {
    e.preventDefault();
    // hide any previous message
    $msg.hidden = true;

    const formData = new FormData($form);

    // append all selected secondary muscles
    const secSelect = document.getElementById('secondary-muscles-select');
    if (secSelect) {
      Array.from(secSelect.selectedOptions)
        .forEach(opt => formData.append('secondary_muscles', opt.value));
    }

    try {
      const res = await fetch('/api/add-exercise', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        $msg.textContent = json.message || 'Exercise added successfully.';
        $msg.className   = 'success-msg';
        $form.reset();
      } else {
        $msg.textContent = json.message || 'Error adding exercise.';
        $msg.className   = 'error-msg';
      }
    } catch (err) {
      console.error('Network error:', err);
      $msg.textContent = 'Network error. Please try again.';
      $msg.className   = 'error-msg';
    }

    $msg.hidden = false;
  });
})();
