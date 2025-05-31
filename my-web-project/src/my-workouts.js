document.addEventListener('DOMContentLoaded', () => {
    // Use the auth guard to protect this page
    requireAuth(() => {
        loadWorkouts();
        setupEventListeners();
    });

    const workoutsContainer = document.getElementById('workouts-container');
    
    function loadWorkouts() {
        const customWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
        
        if (customWorkouts.length === 0) {
            workoutsContainer.innerHTML = `
                <div class="empty-state workout-card" style="grid-column: 1 / -1;">
                    <h2>No Custom Workouts Yet</h2>
                    <p>Create your first custom workout to get started!</p>
                    <a href="exercise-selection.html" class="select-workout-btn create-first-btn">Create Your First Workout</a>
                </div>
            `;
            return;
        }
        
        workoutsContainer.innerHTML = customWorkouts.map(workout => `
            <div class="workout-card custom-workout-card" data-workout-id="${workout.id}">
                <h3>${workout.name}</h3>
                <p class="workout-date">Created: ${new Date(workout.created).toLocaleDateString()}</p>
                <div class="exercise-list">
                    ${workout.exercises.map(exercise => `
                        <span class="exercise-tag">${exercise.name} (${exercise.type})</span>
                    `).join('')}
                </div>
                <div class="workout-card-actions">
                    <button class="select-workout-btn start-custom-workout" data-workout-id="${workout.id}">Start Workout</button>
                    <button class="delete-workout clear-workout-btn" data-workout-id="${workout.id}">Delete</button>
                </div>
            </div>
        `).join('');
        
        addWorkoutEventListeners();
    }
    
    function addWorkoutEventListeners() {
        document.querySelectorAll('.start-custom-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workoutId = e.target.dataset.workoutId;
                startCustomWorkout(workoutId);
            });
        });
        
        document.querySelectorAll('.delete-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workoutId = e.target.dataset.workoutId;
                deleteWorkout(workoutId);
            });
        });
    }
    
    function startCustomWorkout(workoutId) {
        const customWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
        const workout = customWorkouts.find(w => w.id === workoutId);
        
        if (workout) {
            alert(`Starting "${workout.name}" workout!\n\nExercises:\n${workout.exercises.map(ex => `• ${ex.name} (${ex.type})`).join('\n')}\n\n(Workout execution feature coming soon)`);
        }
    }
    
    function deleteWorkout(workoutId) {
        if (confirm('Are you sure you want to delete this workout?')) {
            let customWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
            customWorkouts = customWorkouts.filter(w => w.id !== workoutId);
            localStorage.setItem('customWorkouts', JSON.stringify(customWorkouts));
            loadWorkouts();
        }
    }
    
        function setupEventListeners() {
        // Any additional event listeners can be added here
        // Note: The page-specific search input and dropdown logic has been removed.
        // It is now handled by shared-search.js, linked in my-workouts.html.
    }
});
