// Guard page
const res = await fetch('/api/me', { credentials: 'same-origin' });
if (res.status !== 200) location.href = 'login.html';

const $grid = document.getElementById('saved-grid');
const $listView = document.getElementById('workout-list-view');
const $detailsView = document.getElementById('workout-details-view');

let workouts = [];
let allExercises = [];

// Load all exercises for detailed information
async function loadExercises() {
  try {
    const res = await fetch('/api/exercises', { credentials: 'same-origin' });
    if (res.ok) {
      allExercises = await res.json();
    }
  } catch (err) {
    console.error('Error loading exercises:', err);
  }
}

// Load saved workouts
async function loadWorkouts() {
  try {
    const out = await fetch('/api/saved-workouts', { credentials: 'same-origin' });
    if (out.ok) {
      workouts = await out.json();
      if (!workouts.length) {
        $grid.innerHTML = '<p>No saved workouts yet.</p>';
      } else {
        $grid.innerHTML = workouts.map((w, index) => renderWorkoutCard(w, index)).join('');
      }
    } else {
      $grid.innerHTML = '<p>Error loading workouts.</p>';
    }
  } catch {
    $grid.innerHTML = '<p>Error loading workouts.</p>';
  }
}

function renderWorkoutCard(w, index) {
  const exNames = w.workout_data.map(e => e.name).join(', ');
  return `
    <article class="card" onclick="showWorkoutDetails(${index})" style="cursor: pointer;">
      <h3>${w.name}</h3>
      <small>${new Date(w.created_at).toLocaleDateString()} · ${w.body_parts_worked.join(', ')}</small>
      <p>${exNames}</p>
      <div style="margin-top: 1rem; font-size: 0.9rem; color: #bdc3c7;">
        ${w.workout_data.length} exercise${w.workout_data.length !== 1 ? 's' : ''} · Click to view details
      </div>
    </article>
  `;
}

async function showWorkoutDetails(workoutIndex) {
  const workout = workouts[workoutIndex];
  if (!workout) return;

  // Show loading state
  $listView.style.display = 'none';
  $detailsView.style.display = 'block';
  document.getElementById('exercises-details').innerHTML = '<div class="loading">Loading exercise details...</div>';

  // Update workout header
  document.getElementById('detail-workout-name').textContent = workout.name;
  document.getElementById('detail-workout-meta').textContent = 
    `Created on ${new Date(workout.created_at).toLocaleDateString()} · ${workout.body_parts_worked.join(', ')}`;

  // Update workout stats
  const uniqueMuscles = new Set();
  workout.workout_data.forEach(ex => {
    uniqueMuscles.add(ex.primary_muscle);
    if (ex.secondary_muscles) {
      ex.secondary_muscles.forEach(m => uniqueMuscles.add(m));
    }
  });

  document.getElementById('workout-stats').innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${workout.workout_data.length}</div>
      <div class="stat-label">Exercises</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${workout.body_parts_worked.length}</div>
      <div class="stat-label">Body Parts</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${uniqueMuscles.size}</div>
      <div class="stat-label">Total Muscles</div>
    </div>
  `;

  // Load detailed exercise information
  try {
    const exerciseDetails = await Promise.all(
      workout.workout_data.map(async (workoutEx) => {
        // Find the full exercise details
        const fullExercise = allExercises.find(ex => ex.id === workoutEx.id || ex.name === workoutEx.name);
        if (fullExercise) {
          // Load media for this exercise
          try {
            const mediaRes = await fetch(`/api/exercise-media/${fullExercise.id}`, { credentials: 'same-origin' });
            const media = mediaRes.ok ? await mediaRes.json() : [];
            return { ...fullExercise, media };
          } catch {
            return { ...fullExercise, media: [] };
          }
        }
        // Fallback to workout data if full exercise not found
        return { ...workoutEx, media: [] };
      })
    );

    // Render exercise details
    document.getElementById('exercises-details').innerHTML = 
      exerciseDetails.map(renderExerciseDetail).join('');

  } catch (err) {
    console.error('Error loading exercise details:', err);
    document.getElementById('exercises-details').innerHTML = 
      '<div class="error">Error loading exercise details. Please try again.</div>';
  }
}

function renderExerciseDetail(exercise) {
  const secondaryMuscles = exercise.secondary_muscles || [];
  const mediaHtml = exercise.media && exercise.media.length > 0 
    ? `<div class="exercise-media">
         ${exercise.media.map(m => 
           m.media_type === 'image' 
             ? `<img src="${m.media_path}" alt="${exercise.name}" loading="lazy">`
             : `<video src="${m.media_path}" controls></video>`
         ).join('')}
       </div>`
    : '';

  return `
    <div class="exercise-card">
      <div class="exercise-name">${exercise.name}</div>
      <div class="exercise-meta">
        ${exercise.primary_muscle} · ${exercise.difficulty} · ${exercise.equipment_type}
        ${exercise.equipment_subtype ? ` (${exercise.equipment_subtype})` : ''}
      </div>
      
      ${secondaryMuscles.length > 0 ? `
        <div class="secondary-muscles">
          <strong>Secondary muscles:</strong>
          <div class="muscle-tags">
            ${secondaryMuscles.map(muscle => `<span class="muscle-tag">${muscle}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="exercise-instructions">
        <strong>Instructions:</strong><br>
        ${exercise.instructions || 'No instructions available.'}
      </div>
      
      ${mediaHtml}
    </div>
  `;
}

function showWorkoutList() {
  $detailsView.style.display = 'none';
  $listView.style.display = 'block';
}

// Make functions global for onclick handlers
window.showWorkoutDetails = showWorkoutDetails;
window.showWorkoutList = showWorkoutList;

// Initialize the page
await loadExercises();
await loadWorkouts();