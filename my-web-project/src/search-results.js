document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');
    const searchQueryDisplay = document.getElementById('search-query-display');
    const searchInputHeader = document.getElementById('search-input'); // Search input in the header
    const searchResultsDropdownHeader = document.getElementById('search-results-dropdown');

    // Function to display search results on the page
    function displayResults(filteredExercises, query) {
        searchQueryDisplay.innerHTML = `<p>Showing results for: <strong>"${query}"</strong></p>`;
        resultsContainer.innerHTML = ''; // Clear previous results

        if (filteredExercises.length === 0) {
            resultsContainer.innerHTML = '<p class="empty-message">No exercises found matching your search.</p>';
            return;
        }

        filteredExercises.forEach(exercise => {
            const exerciseCard = `
                <div class="workout-card exercise-result-card" data-exercise-id="${exercise.id}">
                    <h2>${exercise.name}</h2>
                    <p class="exercise-type-display">Muscle Group: ${exercise.type.charAt(0).toUpperCase() + exercise.type.slice(1)}</p>
                    <p class="exercise-difficulty-display">Difficulty: ${exercise.difficulty}</p>
                    <p class="exercise-description-display">${exercise.description}</p>
                    <button class="select-workout-btn view-exercise-details-btn">View Details</button>
                </div>
            `;
            resultsContainer.insertAdjacentHTML('beforeend', exerciseCard);
        });

        // Add event listeners to the new "View Details" buttons
        document.querySelectorAll('.view-exercise-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.exercise-result-card');
                const exerciseId = card.dataset.exerciseId;
                // For now, alert, later redirect to a dedicated exercise page or show modal
                const exercise = getAllExercises().find(ex => ex.id === exerciseId);
                if (exercise) {
                    alert(`Exercise: ${exercise.name}\nType: ${exercise.type}\nDifficulty: ${exercise.difficulty}\nDescription: ${exercise.description}`);
                }
            });
        });
    }

    // Get search query from URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (query) {
        searchInputHeader.value = query; // Populate header search bar
        const exercises = getAllExercises(); // From all-exercises.js
        const filteredExercises = exercises.filter(exercise => 
            exercise.name.toLowerCase().includes(query.toLowerCase()) ||
            exercise.type.toLowerCase().includes(query.toLowerCase()) ||
            exercise.description.toLowerCase().includes(query.toLowerCase())
        );
        displayResults(filteredExercises, query);
    } else {
        searchQueryDisplay.innerHTML = '<p>No search query provided.</p>';
        resultsContainer.innerHTML = '<p class="empty-message">Please use the search bar to find exercises.</p>';
    }

    // --- Header Search Bar Logic (copied and adapted from other pages for consistency) ---
    function performHeaderSearch(searchTerm, isKeyPress = false) {
        if (searchTerm.length < 2 && !isKeyPress) {
            searchResultsDropdownHeader.style.display = 'none';
            return;
        }
        if (isKeyPress && searchTerm.length === 0) { // Allow empty search on enter
             window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
             return;
        }
        if (isKeyPress){
            window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
            return;
        }

        const exercises = getAllExercises();
        const filtered = exercises.filter(ex => 
            ex.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5); // Limit to 5 suggestions

        if (filtered.length > 0) {
            searchResultsDropdownHeader.innerHTML = filtered
                .map(ex => `<div class="result-item" data-exercise-id="${ex.id}">${ex.name}</div>`)
                .join('');
            searchResultsDropdownHeader.style.display = 'block';
        } else {
            searchResultsDropdownHeader.style.display = 'none';
        }
    }

    searchInputHeader.addEventListener('input', (e) => {
        performHeaderSearch(e.target.value);
    });

    searchInputHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performHeaderSearch(searchInputHeader.value, true);
        }
    });

    searchResultsDropdownHeader.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.result-item');
        if (resultItem) {
            const exerciseId = resultItem.dataset.exerciseId;
            const exercise = getAllExercises().find(ex => ex.id === exerciseId);
            if (exercise) {
                // Redirect to search results page with the specific exercise as query, 
                // or ideally to a specific exercise page if that exists
                window.location.href = `search-results.html?q=${encodeURIComponent(exercise.name)}`;
            }
            searchResultsDropdownHeader.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInputHeader.contains(e.target) && !searchResultsDropdownHeader.contains(e.target)) {
            searchResultsDropdownHeader.style.display = 'none';
        }
    });
});