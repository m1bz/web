// This is the main JavaScript file for the web project.
// It contains the logic for the application, such as DOM manipulation and event handling.

document.addEventListener('DOMContentLoaded', () => {
    // Sample data for search results (replace with your actual data)
    const sampleData = [
        "JavaScript Tutorial",
        "HTML Basics", 
        "CSS Styling Guide",
        "Web Development Tools",
        "React Framework",
        "Node.js Backend",
        "Database Integration",
        "API Development",
        "Python Programming",
        "Machine Learning",
        "Data Science",
        "Frontend Development",
        "Backend Development",
        "Full Stack Development"
    ];

    // Get search elements
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    // Add event listener for input changes (live search)
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        
        // Clear previous results
        searchResults.innerHTML = '';
        
        // If search input is empty, hide results
        if (query.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        // Filter results based on input
        const filteredResults = sampleData.filter(item => 
            item.toLowerCase().includes(query)
        );

        // Display results
        if (filteredResults.length > 0) {
            searchResults.style.display = 'block';
            
            filteredResults.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.textContent = result;
                
                // Add click handler for result items
                resultItem.addEventListener('click', () => {
                    searchInput.value = result;
                    searchResults.style.display = 'none';
                });
                
                searchResults.appendChild(resultItem);
            });
        } else {
            // Show no results message
            searchResults.style.display = 'block';
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No results found';
            searchResults.appendChild(noResults);
        }
    });

    // Handle search form submission (Enter key press)
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                // Redirect to search page with query parameter
                window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
            }
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== searchResults) {
            searchResults.style.display = 'none';
        }
    });
});