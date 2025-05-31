document.addEventListener('DOMContentLoaded', () => {
    // This page is public - no auth required for browsing exercises
    const searchInput = document.getElementById('search-input');
    const searchResultsDropdown = document.getElementById('search-results-dropdown');
    const exerciseCategoryGrid = document.getElementById('exercise-category-grid');
    const exerciseListContainer = document.getElementById('exercise-list-container');
    const exerciseListTitle = document.getElementById('exercise-list-title');
    const exerciseItemsGrid = document.getElementById('exercise-items-grid');
    const backToCategoriesBtn = document.getElementById('back-to-categories-btn');

    const exercises = getAllExercises(); // From all-exercises.js

    // Group exercises by type for category display
    const exercisesByType = exercises.reduce((acc, ex) => {
        if (!acc[ex.type]) {
            acc[ex.type] = [];
        }
        acc[ex.type].push(ex);
        return acc;
    }, {});

    // ...existing code...
    // Keep all the existing functionality as it was
});
            return acc;
        }, {});

        // Populate Exercise Categories
    function populateCategories() {
        exerciseCategoryGrid.innerHTML = '';
        exerciseListContainer.style.display = 'none';
        exerciseCategoryGrid.style.display = 'grid'; // Make sure it's grid

        for (const type in exercisesByType) {
            const categoryCard = `
                <div class="workout-card category-card" data-muscle="${type}">
                    <h2>${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
                    <p>View exercises for ${type}</p>
                    <ul class="exercise-preview">
                        ${exercisesByType[type].slice(0, 3).map(ex => `<li>${ex.name}</li>`).join('')}
                    </ul>
                    <button class="select-workout-btn view-category-btn">View All ${type.charAt(0).toUpperCase() + type.slice(1)} Exercises</button>
                </div>
            `;
            exerciseCategoryGrid.insertAdjacentHTML('beforeend', categoryCard);
        }

        document.querySelectorAll('.category-card .view-category-btn, .category-card h2, .category-card p, .category-card .exercise-preview').forEach(element => {
            element.addEventListener('click', (e) => {
                const muscleGroup = e.target.closest('.category-card').dataset.muscle;
                showExercisesForCategory(muscleGroup);
            });
        });
    }

    // Show exercises for a specific category
    function showExercisesForCategory(muscleGroup) {
        exerciseCategoryGrid.style.display = 'none';
        exerciseListContainer.style.display = 'block';
        exerciseListTitle.textContent = `${muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1)} Exercises`;
        exerciseItemsGrid.innerHTML = '';

        const categoryExercises = exercisesByType[muscleGroup];
        if (categoryExercises) {
            categoryExercises.forEach(ex => {
                const exerciseItemCard = `
                    <div class="workout-card exercise-detail-card" data-exercise-id="${ex.id}">
                        <h3>${ex.name}</h3>
                        <p class="exercise-difficulty-display">Difficulty: ${ex.difficulty}</p>
                        <p class="exercise-description-display">${ex.description}</p>
                        <!-- Add to workout button can be added here later -->
                    </div>
                `;
                exerciseItemsGrid.insertAdjacentHTML('beforeend', exerciseItemCard);
            });
        }
    }

    backToCategoriesBtn.addEventListener('click', populateCategories);

    // --- Search Functionality (Common across pages) ---
    function performSearch(searchTerm, isKeyPress = false) {
        if (searchTerm.length < 2 && !isKeyPress) {
            searchResultsDropdown.style.display = 'none';
            return;
        }
        if (isKeyPress) {
            window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
            return;
        }

        const filtered = exercises.filter(ex => 
            ex.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);

        if (filtered.length > 0) {
            searchResultsDropdown.innerHTML = filtered
                .map(ex => `<div class="result-item" data-exercise-name="${ex.name}">${ex.name}</div>`)
                .join('');
            searchResultsDropdown.style.display = 'block';
        } else {
            searchResultsDropdown.innerHTML = '<div class="no-results">No exercises found</div>';
            searchResultsDropdown.style.display = 'block';
        }
    }

    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchInput.value, true);
        }
    });

    searchResultsDropdown.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.result-item');
        if (resultItem) {
            const exerciseName = resultItem.dataset.exerciseName;
            window.location.href = `search-results.html?q=${encodeURIComponent(exerciseName)}`;
            searchResultsDropdown.style.display = 'none';
            searchInput.value = '';
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
            searchResultsDropdown.style.display = 'none';
        }
    });

    // Initial population
    populateCategories();

    // Check URL parameters for specific muscle group to display initially
    const urlParams = new URLSearchParams(window.location.search);
    const targetMuscle = urlParams.get('muscle');
    if (targetMuscle && exercisesByType[targetMuscle]) {
        showExercisesForCategory(targetMuscle);
    }
});

// Exercise data for each muscle group
const exerciseData = {
    chest: [
        { name: 'Bench Press', description: 'Classic chest exercise using barbell', difficulty: 'Intermediate' },
        { name: 'Push-ups', description: 'Bodyweight exercise for chest', difficulty: 'Beginner' },
        { name: 'Dumbbell Flyes', description: 'Isolation exercise for chest', difficulty: 'Intermediate' },
        { name: 'Incline Bench Press', description: 'Upper chest focus', difficulty: 'Intermediate' },
        { name: 'Decline Bench Press', description: 'Lower chest focus', difficulty: 'Advanced' }
    ],
    back: [
        { name: 'Pull-ups', description: 'Upper back and lats', difficulty: 'Intermediate' },
        { name: 'Rows', description: 'Middle back strength', difficulty: 'Beginner' },
        { name: 'Lat Pulldowns', description: 'Latissimus dorsi focus', difficulty: 'Beginner' },
        { name: 'Deadlifts', description: 'Full back development', difficulty: 'Advanced' },
        { name: 'Face Pulls', description: 'Rear deltoids and upper back', difficulty: 'Beginner' }
    ],
    legs: [
        { name: 'Squats', description: 'Quad and glute focus', difficulty: 'Intermediate' },
        { name: 'Deadlifts', description: 'Hamstring and lower back', difficulty: 'Advanced' },
        { name: 'Lunges', description: 'Unilateral leg exercise', difficulty: 'Beginner' },
        { name: 'Leg Press', description: 'Machine-based leg exercise', difficulty: 'Beginner' },
        { name: 'Calf Raises', description: 'Calf muscle isolation', difficulty: 'Beginner' }
    ],
    shoulders: [
        { name: 'Overhead Press', description: 'Shoulder strength builder', difficulty: 'Intermediate' },
        { name: 'Lateral Raises', description: 'Side deltoid focus', difficulty: 'Beginner' },
        { name: 'Front Raises', description: 'Front deltoid focus', difficulty: 'Beginner' },
        { name: 'Face Pulls', description: 'Rear deltoid focus', difficulty: 'Beginner' },
        { name: 'Arnold Press', description: 'Rotating shoulder press', difficulty: 'Intermediate' }
    ],
    arms: [
        { name: 'Bicep Curls', description: 'Bicep isolation', difficulty: 'Beginner' },
        { name: 'Tricep Extensions', description: 'Tricep isolation', difficulty: 'Beginner' },
        { name: 'Hammer Curls', description: 'Forearm and bicep focus', difficulty: 'Beginner' },
        { name: 'Skull Crushers', description: 'Tricep strength builder', difficulty: 'Intermediate' },
        { name: 'Preacher Curls', description: 'Bicep isolation with support', difficulty: 'Intermediate' }
    ],
    core: [
        { name: 'Crunches', description: 'Basic abdominal exercise', difficulty: 'Beginner' },
        { name: 'Planks', description: 'Core stability exercise', difficulty: 'Beginner' },
        { name: 'Russian Twists', description: 'Oblique focus', difficulty: 'Intermediate' },
        { name: 'Leg Raises', description: 'Lower abdominal focus', difficulty: 'Intermediate' },
        { name: 'Mountain Climbers', description: 'Dynamic core exercise', difficulty: 'Intermediate' }
    ]
};

// DOM Elements
const searchResults = document.getElementById('search-results');
const muscleButtons = document.querySelectorAll('.select-workout-btn');

// Check URL parameters for specific muscle group
const urlParams = new URLSearchParams(window.location.search);
const targetMuscle = urlParams.get('muscle');

// If a specific muscle group is requested, show its exercises
if (targetMuscle && exerciseData[targetMuscle]) {
    showExercises(targetMuscle);
}

// Event Listeners
muscleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const muscleGroup = button.dataset.muscle;
        showExercises(muscleGroup);
    });
});

    // Search functionality
function performSearch(searchTerm) {
    if (searchTerm.length < 2) {
        searchResults.style.display = 'none';
        return;
    }

    const allExercises = Object.entries(exerciseData).flatMap(([muscle, exercises]) =>
        exercises.map(exercise => ({
            ...exercise,
            muscle
        }))
    );

    const filteredExercises = allExercises.filter(exercise => 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredExercises.length > 0) {
        searchResults.innerHTML = filteredExercises
            .map(exercise => `
                <div class="result-item" data-muscle="${exercise.muscle}">
                    <strong>${exercise.name}</strong>
                    <small>${exercise.muscle.charAt(0).toUpperCase() + exercise.muscle.slice(1)} - ${exercise.difficulty}</small>
                </div>
            `)
            .join('');
        searchResults.style.display = 'block';
            } else {
        searchResults.innerHTML = '<div class="no-results">No exercises found</div>';
        searchResults.style.display = 'block';
    }
}

// Handle search input
searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
});

// Handle Enter key
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        performSearch(searchInput.value);
    }
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
    }
});

// Handle search result clicks
searchResults.addEventListener('click', (e) => {
    const resultItem = e.target.closest('.result-item');
    if (resultItem) {
        const muscleGroup = resultItem.dataset.muscle;
        showExercises(muscleGroup);
        searchResults.style.display = 'none';
        searchInput.value = '';
    }
    }
});

// Function to show exercises for a specific muscle group
function showExercises(muscleGroup) {
    const exercises = exerciseData[muscleGroup];
    if (!exercises) return;

    // Create modal or new page to display exercises
    const exerciseList = exercises.map(exercise => `
        <div class="exercise-item">
            <h3>${exercise.name}</h3>
            <p>${exercise.description}</p>
            <span class="difficulty">${exercise.difficulty}</span>
        </div>
    `).join('');

    // For now, we'll just alert the exercises
    // In a real application, you'd want to create a proper modal or new page
    alert(`Exercises for ${muscleGroup}:\n\n${exercises.map(e => e.name).join('\n')}`);
}
