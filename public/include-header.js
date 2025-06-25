// public/include-header.js
(async function() {
  try {
    // 1. Fetch the header HTML
    const res = await fetch('header.html');
    if (!res.ok) throw new Error('Could not load header');
    const html = await res.text();

    // 2. Inject into the placeholder
    const container = document.getElementById('site-header');
    container.innerHTML = html;

    // 3. (Optional) If you want to change the <h1> per page:
    const pageTitles = {
      'home.html':      'Welcome Home',
      'admin.html':     'Admin: Add Exercise',
      'generate-workout.html': 'Generate Workout'
      // add more mappings here...
    };
    const path = window.location.pathname.split('/').pop();
    const newTitle = pageTitles[path];
    if (newTitle) {
      const h1 = container.querySelector('h1');
      if (h1) h1.textContent = newTitle;
    }

    // 4. Finally, load auth.js to wire up the user button
    const script = document.createElement('script');
    script.src = 'auth.js';
    script.defer = true;
    document.head.appendChild(script);

    const searchScript = document.createElement('script');
    searchScript.src   = 'search.js';
    searchScript.defer = true;
    document.body.appendChild(searchScript);

  } catch (err) {
    console.error(err);
  }
})();
