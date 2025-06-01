document.addEventListener('DOMContentLoaded', () => {
    const workoutsContainer = document.getElementById('workouts-container');
    
    function loadWorkouts() {
        const customWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
        
        if (customWorkouts.length === 0) {
            workoutsContainer.innerHTML = `
                <div class="empty-state">
                    <h2>No Custom Workouts Yet</h2>
                    <p>Create your first custom workout to get started!</p>
                    <a href="exercise-selection.html" class="create-first-btn">Create Your First Workout</a>
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
                        <span class="exercise-tag">${exercise.name}</span>
                    `).join('')}
                </div>
                <div class="workout-card-actions">
                    <button class="start-custom-workout" data-workout-id="${workout.id}">Start Workout</button>
                    <button class="delete-workout" data-workout-id="${workout.id}">Delete</button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        addWorkoutEventListeners();
    }
    
    function addWorkoutEventListeners() {
        // Start workout buttons
        document.querySelectorAll('.start-custom-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workoutId = e.target.dataset.workoutId;
                startCustomWorkout(workoutId);
            });
        });
        
        // Delete workout buttons
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
            alert(`Starting "${workout.name}" workout!\n\nExercises:\n${workout.exercises.map(ex => `• ${ex.name}`).join('\n')}\n\n(Workout execution feature coming soon)`);
        }
    }
    
    function deleteWorkout(workoutId) {
        if (confirm('Are you sure you want to delete this workout?')) {
            const customWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
            const updatedWorkouts = customWorkouts.filter(w => w.id !== workoutId);
            
            localStorage.setItem('customWorkouts', JSON.stringify(updatedWorkouts));
            loadWorkouts(); // Reload the display
        }
    }
    
    // Initialize
    loadWorkouts();
});
