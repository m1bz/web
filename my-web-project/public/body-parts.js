document.addEventListener('DOMContentLoaded', () => {
    const bodyPartCards = document.querySelectorAll('.body-part-card');
    const buttons = document.querySelectorAll('.select-workout-btn');

    // Add click event listeners to buttons instead of cards
    buttons.forEach((button, index) => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = e.target.closest('.body-part-card');
            const bodyPart = card.dataset.bodypart;
            // Redirect to exercises page with body part parameter
            window.location.href = `exercises-by-bodypart.html?bodypart=${bodyPart}`;
        });
    });

    // Add hover effects to cards (reusing existing workout card behavior)
    bodyPartCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Add search functionality similar to other pages
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    const bodyParts = [
        "Shoulders", "Chest", "Back", "Biceps", "Triceps", 
        "Abs", "Obliques", "Quads", "Hamstrings", "Glutes", "Calves"
    ];

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        
        searchResults.innerHTML = '';
        
        if (query.length === 0) {
            searchResults.style.display = 'none';
            // Show all cards
            bodyPartCards.forEach(card => {
                card.style.display = 'block';
            });
            return;
        }

        // Filter cards
        bodyPartCards.forEach(card => {
            const bodyPartName = card.querySelector('h2').textContent.toLowerCase();
            if (bodyPartName.includes(query)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        // Show search results
        const filteredResults = bodyParts.filter(bodyPart => 
            bodyPart.toLowerCase().includes(query)
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
                    // Filter cards to show only the selected one
                    bodyPartCards.forEach(card => {
                        const bodyPartName = card.querySelector('h2').textContent;
                        if (bodyPartName === result) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
                
                searchResults.appendChild(resultItem);
            });
        } else {
            searchResults.style.display = 'block';
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No body parts found';
            searchResults.appendChild(noResults);
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== searchResults) {
            searchResults.style.display = 'none';
        }
    });
});
