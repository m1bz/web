// This is the main JavaScript file for the web project.
// It contains the logic for the application, such as DOM manipulation and event handling.

// Mock authentication (will be replaced by auth.js logic)
// const mockCredentials = {
//     username: 'admin',
//     password: 'admin'
// };
// let isAuthenticated = false; // Managed by auth.js

// DOM Elements
const exploreExercisesBtn = document.getElementById('explore-exercises-btn');
const createWorkoutBtn = document.getElementById('create-workout-btn');
const searchInput = document.getElementById('search-input');
const searchResultsDropdown = document.getElementById('search-results-dropdown'); // Renamed for clarity

// Event Listeners for main page buttons
exploreExercisesBtn.addEventListener('click', () => {
    window.location.href = 'exercise-selection.html';
});

createWorkoutBtn.addEventListener('click', () => {
    // Auth check will be handled by auth.js or a dedicated function
    // For now, assuming checkLoginStatus() exists in auth.js
    if (checkLoginStatus()) {
        window.location.href = 'workout-selection.html'; 
    } else {
        window.location.href = 'login.html'; // Redirect to login page
    }
});

// --- Search Functionality (Common across pages, adapted for index.js) ---
function performSearch(searchTerm, isKeyPress = false) {
    if (searchTerm.length < 2 && !isKeyPress) {
        searchResultsDropdown.style.display = 'none';
        return;
    }
    // If Enter is pressed, redirect to the search results page
    if (isKeyPress) {
        window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
        return;
    }

    const exercises = getAllExercises(); // From all-exercises.js
    const filteredExercises = exercises.filter(exercise => 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Show top 5 suggestions

    if (filteredExercises.length > 0) {
        searchResultsDropdown.innerHTML = filteredExercises
            .map(ex => `<div class="result-item" data-exercise-name="${ex.name}">${ex.name}</div>`)
            .join('');
        searchResultsDropdown.style.display = 'block';
    } else {
        searchResultsDropdown.innerHTML = '<div class="no-results">No exercises found</div>';
        searchResultsDropdown.style.display = 'block'; // Keep open to show "no results"
    }
}

// Handle search input
searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
});

// Handle Enter key in search bar
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        performSearch(searchInput.value, true); // Pass true for isKeyPress
    }
});

// Handle search result dropdown clicks
searchResultsDropdown.addEventListener('click', (e) => {
    const resultItem = e.target.closest('.result-item');
    if (resultItem) {
        const exerciseName = resultItem.dataset.exerciseName;
        // Redirect to search results page with the specific exercise name as query
        window.location.href = `search-results.html?q=${encodeURIComponent(exerciseName)}`;
        searchResultsDropdown.style.display = 'none';
        searchInput.value = ''; // Clear search input
    }
});

// Close search results dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
        searchResultsDropdown.style.display = 'none';
    }
});

// Remove old auth logic if any was here, it will be in auth.js
// Example: The old prompt-based login is removed.

// Add event listeners for action buttons
const startWorkoutBtn = document.getElementById('start-workout-btn');
const createOwnBtn = document.getElementById('create-own-btn');
const statisticsBtn = document.getElementById('statistics-btn');

startWorkoutBtn.addEventListener('click', () => {
    window.location.href = 'workout-selection.html';
});

createOwnBtn.addEventListener('click', () => {
    window.location.href = 'exercise-selection.html';
});

statisticsBtn.addEventListener('click', () => {
    // TODO: Implement statistics functionality
    console.log('Statistics clicked');
});