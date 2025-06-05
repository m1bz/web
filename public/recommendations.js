// public/recommendations.js
(async () => {
  // Auth guard
  const meRes = await fetch('/api/me', { credentials: 'same-origin' });
  if (meRes.status !== 200) {
    location.href = 'login.html';
    return;
  }

  const container = document.getElementById('recommendations-container');
  const loading = document.getElementById('loading');

  try {
    const res = await fetch('/api/recommendations', { credentials: 'same-origin' });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to load recommendations');
    }

    const data = await res.json();
    loading.style.display = 'none';
    
    if (data.message && data.recommendations?.length === 0) {
      container.innerHTML = `
        <div class="recommendation-section">
          <h2>📊 No Recommendations Available</h2>
          <p>${data.message}</p>
          <p>Try saving some workouts first, or encourage others to join and share their routines!</p>
        </div>
      `;
      return;
    }

    renderRecommendations(data);

  } catch (error) {
    loading.style.display = 'none';
    container.innerHTML = `
      <div class="recommendation-section">
        <h2>❌ Error Loading Recommendations</h2>
        <p>${error.message}</p>
        <p>Make sure you have completed your profile with age and gender information.</p>
        <a href="profile.html" class="btn-primary">Complete Profile</a>
      </div>
    `;
  }
})();

function renderRecommendations(data) {
  const container = document.getElementById('recommendations-container');
  
  // Limit exercises to top 5 and workouts to top 3
  const topExercises = data.popularExercises.slice(0, 5);
  const topWorkouts = data.recentWorkouts.slice(0, 3);
  
  const html = `
    <!-- User Profile Summary -->
    <div class="recommendation-section">
      <div class="recommendation-header">
        👤 Your Profile
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${data.userProfile.age}</div>
          <div class="stat-label">Your Age</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.userProfile.gender}</div>
          <div class="stat-label">Gender</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">±${data.userProfile.ageRange}</div>
          <div class="stat-label">Age Range</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.similarUsersCount}</div>
          <div class="stat-label">Similar Users</div>
        </div>
      </div>
    </div>

    <!-- Top 5 Popular Exercises -->
    ${topExercises.length > 0 ? `
    <div class="recommendation-section">
      <div class="recommendation-header">
        🔥 Top 5 Popular Exercises
        <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-secondary);">
          From ${data.similarUsersCount} similar users
        </span>
      </div>
      ${topExercises.map((exercise, index) => `
        <div class="exercise-recommendation">
          <div class="exercise-info">
            <h4>#${index + 1} ${exercise.name}</h4>
            <div class="exercise-meta">
              ${exercise.muscle} • ${exercise.difficulty} • ${exercise.equipmentType}
              <br>
              <small>Avg user age: ${exercise.avgUserAge} years</small>
            </div>
          </div>
          <div class="usage-badge">${exercise.usageCount} uses</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Popular Muscle Group Combinations -->
    ${data.popularMuscleGroups.length > 0 ? `
    <div class="recommendation-section">
      <div class="recommendation-header">
        💪 Popular Muscle Group Combinations
      </div>
      ${data.popularMuscleGroups.map(mg => `
        <div style="margin: 1rem 0;">
          <div style="margin-bottom: 0.5rem;">
            ${mg.muscleGroups.split(', ').map(muscle => 
              `<span class="muscle-group-tag">${muscle}</span>`
            ).join('')}
          </div>
          <small style="color: var(--text-secondary);">
            Used ${mg.patternCount} times • Avg user age: ${mg.avgUserAge} years
          </small>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Top 3 Recent Workout Ideas -->
    ${topWorkouts.length > 0 ? `
    <div class="recommendation-section">
      <div class="recommendation-header">
        ⚡ Top 3 Workout Ideas
        <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-secondary);">
          Recent popular workouts from similar users
        </span>
      </div>
      ${topWorkouts.map((workout, index) => `
        <div class="workout-preview">
          <div class="workout-header">
            <div>
              <div class="workout-name">#${index + 1} ${workout.name}</div>
              <div class="workout-author">
                By ${workout.createdBy} (${workout.userAge} years old) • 
                ${new Date(workout.createdAt).toLocaleDateString()}
                ${workout.namePopularity > 1 ? ` • ${workout.namePopularity} similar workouts` : ''}
              </div>
            </div>
            <button class="copy-workout-btn" onclick="copyWorkout(${index}, '${workout.name.replace(/'/g, "\\'")}')">
              Copy Workout
            </button>
          </div>
          <div style="margin-top: 0.5rem;">
            <strong>Body parts:</strong> ${workout.bodyPartsWorked.join(', ')}
            <br>
            <strong>Exercises:</strong> ${workout.workoutData.length} exercises
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;

  container.innerHTML = html;
  
  // Store workout data for copying (only the top 3)
  window.recommendedWorkouts = topWorkouts;
}

async function copyWorkout(index, workoutName) {
  const workout = window.recommendedWorkouts[index];
  if (!workout) return;

  const copyName = prompt(`Copy workout as:`, `${workoutName} (Copy)`);
  if (!copyName) return;

  try {
    const payload = {
      name: copyName,
      exercises: workout.workoutData,
      bodyParts: workout.bodyPartsWorked,
    };

    const res = await fetch('/api/save-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert('Workout copied successfully!');
    } else {
      alert('Error copying workout');
    }
  } catch (error) {
    console.error('Copy workout error:', error);
    alert('Error copying workout');
  }
}