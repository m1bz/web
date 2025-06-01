document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');

    // Get search query from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    // Sample data for search results (replace with your actual data or API call)
    const sampleData = [
        "JavaScript Tutorial",
        "HTML Basics",
        "CSS Styling Guide",
        "Web Development Tools",
        "React Framework",
        "Node.js Backend",
        "Database Integration",
        "API Development"
    ];

    // If there's a query, fill the input and perform search
    if (query) {
        searchInput.value = query;
        
        // Filter results based on query
        const results = sampleData.filter(item => 
            item.toLowerCase().includes(query.toLowerCase())
        );
        
        // Display results
        displayResults(results, query);
    }

    // Function to display search results
    function displayResults(results, searchTerm) {
        searchResultsContainer.innerHTML = '';
        
        // Show search term
        const searchHeader = document.createElement('h2');
        searchHeader.textContent = `Results for: "${searchTerm}"`;
        searchResultsContainer.appendChild(searchHeader);

        if (results.length > 0) {
            const resultsList = document.createElement('ul');
            resultsList.className = 'results-list';
            
            results.forEach(result => {
                const listItem = document.createElement('li');
                listItem.textContent = result;
                resultsList.appendChild(listItem);
            });
            
            searchResultsContainer.appendChild(resultsList);
        } else {
            const noResults = document.createElement('p');
            noResults.textContent = 'No results found for your search.';
            searchResultsContainer.appendChild(noResults);
        }
    }

    // Handle new searches from results page
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
            }
        }
    });
});