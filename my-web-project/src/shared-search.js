document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchResultsDropdown = document.getElementById('search-results-dropdown');

    if (!searchInput || !searchResultsDropdown) {
        // console.warn('Shared search elements not found on this page.');
        return; // Exit if search elements aren't on the current page
    }

    function performSharedSearch(searchTerm, isKeyPress = false) {
        if (searchTerm.length < 2 && !isKeyPress) {
            searchResultsDropdown.style.display = 'none';
            return;
        }
        
        if (isKeyPress) {
            window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
            return;
        }

        // Ensure getAllExercises is available (it should be if all-exercises.js is included before this)
        if (typeof getAllExercises !== 'function') {
            console.error('getAllExercises function is not available. Make sure all-exercises.js is loaded.');
            return;
        }
        const exercises = getAllExercises();
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
            searchResultsDropdown.style.display = 'block';
        }
    }

    searchInput.addEventListener('input', (e) => {
        performSharedSearch(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSharedSearch(searchInput.value, true);
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

    // Global click listener to close dropdown
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
            searchResultsDropdown.style.display = 'none';
        }
    });
}); 