// public/log-workout.js
document.addEventListener('DOMContentLoaded', async () => {
  const select   = document.getElementById('workout-select');
  const logBtn   = document.getElementById('log-btn');
  const message  = document.getElementById('log-message');

  /* 1. Load the user’s saved workouts */
  async function fetchSavedWorkouts() {
    try {
      const res = await fetch('/api/saved-workouts', {
        credentials: 'same-origin'        // ← **important**
      });
      if (!res.ok) throw new Error('Failed to fetch workouts');
      const workouts = await res.json();

      if (!workouts.length) {
        select.innerHTML =
          '<option disabled selected>No saved workouts yet.</option>';
        logBtn.disabled = true;
        return;
      }

      select.innerHTML =
        '<option disabled selected>Select a workout</option>';
      workouts.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent =
          `${w.name} (saved ${new Date(w.created_at).toLocaleDateString()})`;
        select.appendChild(opt);
      });
      logBtn.disabled = false;

    } catch (err) {
      console.error(err);
      message.textContent = 'Error loading workouts.';
    }
  }

  /* 2. Log the chosen workout (one per 24 h) */
  logBtn.addEventListener('click', async () => {
    const workoutId = select.value;
    if (!workoutId) return;

    logBtn.disabled  = true;
    message.textContent = 'Logging…';

    try {
      const res = await fetch('/api/log-workout', {
        method: 'POST',
        credentials: 'same-origin',       // ← **important**
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedWorkoutId: workoutId })
      });

      if (res.status === 429) {
        message.textContent = 'You already logged a workout today.';
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        message.textContent = data.message || 'Failed to log workout.';
      } else {
        message.textContent = '✅ Workout logged!';
      }

    } catch (err) {
      console.error(err);
      message.textContent = 'Network error – please try again.';
    } finally {
      logBtn.disabled = false;
    }
  });

  fetchSavedWorkouts();
});
