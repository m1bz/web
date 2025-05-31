document.addEventListener('DOMContentLoaded', () => {
    // Workout selection is a public page - no auth required
    initializeWorkoutSelection();
    
    function initializeWorkoutSelection() {
        // Workout selection functionality
        const workoutButtons = document.querySelectorAll('.select-workout-btn');
    
    workoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const workoutCard = e.target.closest('.workout-card');
            const workoutType = workoutCard.id.replace('-workout', '');
            
            // TODO: Redirect to specific workout page or start workout flow
            console.log(`Starting ${workoutType} workout`);
            alert(`Starting ${workoutType.toUpperCase()} workout! (Feature coming soon)`);
        });
    });

    // My Workouts button functionality
    const myWorkoutsBtn = document.getElementById('my-workouts-btn');
    
    myWorkoutsBtn.addEventListener('click', () => {
        window.location.href = 'my-workouts.html';
    });

    // Update button text based on saved workouts count
    function updateMyWorkoutsButton() {
        const customWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
        const count = customWorkouts.length;
        
        if (count > 0) {
            myWorkoutsBtn.textContent = `View My Workouts (${count})`;
            myWorkoutsBtn.classList.add('has-workouts');
            myWorkoutsBtn.disabled = false;
        } else {
            myWorkoutsBtn.textContent = 'No Custom Workouts Yet';
            myWorkoutsBtn.classList.remove('has-workouts');
            myWorkoutsBtn.disabled = true;
        }
    }

    // Initialize button state
    updateMyWorkoutsButton();

    // Note: The page-specific search input and dropdown logic has been removed.
    // It is now handled by shared-search.js, linked in workout-selection.html.
    }
});
