// public/log-workout.js
document.addEventListener('DOMContentLoaded', async () => {
  const select   = document.getElementById('workout-select');
  const logBtn   = document.getElementById('log-btn');
  const message  = document.getElementById('log-message');

  // Helper function to set message with appropriate styling
  function setMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `status-message ${type}-message`;
  }

  /* 1. Load the user's saved workouts */
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
        setMessage('You need to create and save some workouts first before you can log them.', 'info');
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
      setMessage('Select a workout from the dropdown above to log it for today.', 'info');

    } catch (err) {
      console.error(err);
      setMessage('Error loading workouts. Please try refreshing the page.', 'error');
    }
  }

  /* 2. Log the chosen workout (one per 24 h) */
  logBtn.addEventListener('click', async () => {
    const workoutId = select.value;
    if (!workoutId) return;

    logBtn.disabled  = true;
    logBtn.textContent = 'Logging...';
    setMessage('Logging your workout...', 'info');

    try {
      const res = await fetch('/api/log-workout', {
        method: 'POST',
        credentials: 'same-origin',       // ← **important**
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedWorkoutId: workoutId })
      });

      if (res.status === 429) {
        setMessage('You already logged a workout today. Come back tomorrow!', 'error');
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.message || 'Failed to log workout. Please try again.', 'error');
      } else {
        setMessage('✅ Workout logged successfully! Great job on completing your workout today.', 'success');
        select.value = ''; // Reset selection
      }

    } catch (err) {
      console.error(err);
      setMessage('Network error – please check your connection and try again.', 'error');
    } finally {
      logBtn.disabled = false;
      logBtn.textContent = 'Log Workout';
    }
  });

  fetchSavedWorkouts();
});