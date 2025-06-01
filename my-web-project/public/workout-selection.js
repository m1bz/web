document.addEventListener('DOMContentLoaded', () => {
    // Search functionality (reuse from index.js)
    const sampleData = [
        "Push Workout",
        "Pull Workout", 
        "Legs Workout",
        "Push-ups",
        "Pull-ups",
        "Squats",
        "Shoulder Press",
        "Rows",
        "Lunges"
    ];

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    // Search functionality
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        
        searchResults.innerHTML = '';
        
        if (query.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        const filteredResults = sampleData.filter(item => 
            item.toLowerCase().includes(query)
        );

        if (filteredResults.length > 0) {
            searchResults.style.display = 'block';
            
            filteredResults.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.textContent = result;
                
                resultItem.addEventListener('click', () => {
                    searchInput.value = result;
                    searchResults.style.display = 'none';
                });
                
                searchResults.appendChild(resultItem);
            });
        } else {
            searchResults.style.display = 'block';
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No results found';
            searchResults.appendChild(noResults);
        }
    });

    // Workout selection functionality
    const workoutButtons = document.querySelectorAll('.select-workout-btn');
    
    workoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const workoutCard = e.target.closest('.workout-card');
            const workoutType = workoutCard.id.replace('-workout', '');
            
            // TODO: Redirect to specific workout page
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
        } else {
            myWorkoutsBtn.textContent = 'No Custom Workouts Yet';
            myWorkoutsBtn.disabled = true;
        }
    }

    // Initialize button state
    updateMyWorkoutsButton();

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== searchResults) {
            searchResults.style.display = 'none';
        }
    });
});
