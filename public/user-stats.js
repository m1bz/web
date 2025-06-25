(async () => {
  const container = document.getElementById('stats-container');

  try {
    const me = await fetch('/api/me', { credentials: 'same-origin' });
    if (me.status === 204) {
      container.innerHTML = `<p>Please <a href="login.html">log in</a> to view your stats.</p>`;
      return;
    }

    const res = await fetch('/api/user-stats', { credentials: 'same-origin' });
    if (!res.ok) {
      if (res.status === 401) {
        container.innerHTML = `<p>Please <a href="login.html">log in</a> to view your stats.</p>`;
      } else {
        container.textContent = 'Error loading stats.';
      }
      return;
    }

    const stats = await res.json();

    container.innerHTML = `
      <h2>Your Workout Stats</h2>
      <div class="stat-grid">
        <div class="stat-card"><strong>Total Logged:</strong> ${stats.totalLogged}</div>
        <div class="stat-card"><strong>First Workout:</strong> ${stats.firstLogged || 'N/A'}</div>
        <div class="stat-card"><strong>Last Workout:</strong> ${stats.lastLogged || 'N/A'}</div>
        <div class="stat-card"><strong>Favorite Muscle:</strong> ${stats.favoriteMuscle || 'N/A'}</div>
        <div class="stat-card"><strong>Top Equipment:</strong> ${stats.topEquipment || 'N/A'}</div>
        <div class="stat-card"><strong>Top Workout:</strong> ${stats.topWorkout?.name || 'N/A'} (${stats.topWorkout?.times || 0} times)</div>
        <div class="stat-card"><strong>Most Active Day:</strong> ${stats.topDay || 'N/A'}</div>
        <div class="stat-card"><strong>Workout Streak:</strong> ${stats.workoutStreak} day(s)</div>
        <div class="stat-card"><strong>Body Mass Index (BMI):</strong> ${stats.bmi ?? 'N/A'}</div>
        <div class="stat-card"><strong>Distinct Exercises Performed:</strong> ${stats.distinctExercises}</div>
      </div>
    `;
  } catch (err) {
    console.error('Error fetching stats:', err);
    container.textContent = 'Failed to load stats.';
  }
})();
