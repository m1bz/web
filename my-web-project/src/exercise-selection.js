document.addEventListener('DOMContentLoaded', () => {
    const exerciseItems = document.querySelectorAll('.exercise-item');
    const selectedList = document.getElementById('selected-list');
    const workoutNameInput = document.getElementById('workout-name');
    const saveWorkoutBtn = document.getElementById('save-workout-btn');
    const clearWorkoutBtn = document.getElementById('clear-workout-btn');
    
    let selectedExercises = [];

    // Exercise selection functionality
    exerciseItems.forEach(item => {
        item.addEventListener('click', () => {
            const exerciseName = item.querySelector('h3').textContent;
            const exerciseType = item.querySelector('p').textContent;
            const exerciseData = item.dataset.exercise;
            
            if (item.classList.contains('selected')) {
                // Remove exercise
                item.classList.remove('selected');
                selectedExercises = selectedExercises.filter(ex => ex.id !== exerciseData);
            } else {
                // Add exercise
                item.classList.add('selected');
                selectedExercises.push({
                    id: exerciseData,
                    name: exerciseName,
                    type: exerciseType
                });
            }
            
            updateSelectedList();
            updateSaveButton();
        });
    });

    // Update selected exercises display
    function updateSelectedList() {
        if (selectedExercises.length === 0) {
            selectedList.innerHTML = '<p class="empty-message">Select exercises to add to your workout</p>';
            return;
        }

        selectedList.innerHTML = selectedExercises.map(exercise => `
            <div class="selected-exercise">
                <span class="exercise-name">${exercise.name}</span>
                <span class="exercise-type">${exercise.type}</span>
                <button class="remove-exercise" data-id="${exercise.id}">×</button>
            </div>
        `).join('');

        // Add remove functionality
        document.querySelectorAll('.remove-exercise').forEach(btn => {
            btn.addEventListener('click', () => {
                const exerciseId = btn.dataset.id;
                selectedExercises = selectedExercises.filter(ex => ex.id !== exerciseId);
                
                // Update UI
                const exerciseItem = document.querySelector(`[data-exercise="${exerciseId}"]`);
                exerciseItem.classList.remove('selected');
                
                updateSelectedList();
                updateSaveButton();
            });
        });
    }

    // Update save button state
    function updateSaveButton() {
        const hasExercises = selectedExercises.length > 0;
        const hasName = workoutNameInput.value.trim().length > 0;
        saveWorkoutBtn.disabled = !(hasExercises && hasName);
    }

    // Workout name input handler
    workoutNameInput.addEventListener('input', updateSaveButton);

    // Save workout functionality
    saveWorkoutBtn.addEventListener('click', () => {
        const workoutName = workoutNameInput.value.trim();
        
        if (workoutName && selectedExercises.length > 0) {
            // Get existing workouts from localStorage
            const existingWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
            
            // Create new workout
            const newWorkout = {
                id: Date.now().toString(),
                name: workoutName,
                exercises: selectedExercises,
                created: new Date().toISOString()
            };
            
            // Add to existing workouts
            existingWorkouts.push(newWorkout);
            
            // Save to localStorage
            localStorage.setItem('customWorkouts', JSON.stringify(existingWorkouts));
            
            alert(`Workout "${workoutName}" saved successfully!`);
            
            // Clear form
            clearWorkout();
        }
    });

    // Clear workout functionality
    clearWorkoutBtn.addEventListener('click', clearWorkout);

    function clearWorkout() {
        selectedExercises = [];
        workoutNameInput.value = '';
        exerciseItems.forEach(item => item.classList.remove('selected'));
        updateSelectedList();
        updateSaveButton();
    }

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        
        exerciseItems.forEach(item => {
            const exerciseName = item.querySelector('h3').textContent.toLowerCase();
            const exerciseType = item.querySelector('p').textContent.toLowerCase();
            
            if (exerciseName.includes(query) || exerciseType.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = query ? 'none' : 'block';
            }
        });
    });
});
