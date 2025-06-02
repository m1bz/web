// index.js

// 1) NAVIGATION BUTTONS
// Replace "explore.html", "workouts.html", etc. with your real filenames/paths.

const exploreBtn = document.getElementById("explore-btn");
const workoutsBtn = document.getElementById("workouts-btn");
const myWorkoutsBtn = document.getElementById("my-workouts-btn");
const directoryBtn = document.getElementById("directory-btn");

if (exploreBtn) {
  exploreBtn.addEventListener("click", () => {
    window.location.href = "explore.html";
  });
}

if (workoutsBtn) {
  workoutsBtn.addEventListener("click", () => {
    window.location.href = "workouts.html";
  });
}

if (myWorkoutsBtn) {
  myWorkoutsBtn.addEventListener("click", () => {
    window.location.href = "my-workouts.html";
  });
}

if (directoryBtn) {
  directoryBtn.addEventListener("click", () => {
    window.location.href = "directory.html";
  });
}


// 2) SEARCH INPUT STUB
// This simply shows a “No results found” message whenever you type something.
// You can replace this stub with real AJAX/fetch calls or local‐lookup logic.

const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

if (searchInput && searchResults) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();

    // If the box is empty, hide the results container
    if (query === "") {
      searchResults.style.display = "none";
      searchResults.innerHTML = "";
      return;
    }

    // For now, we’ll just display a “no results” message.
    // Replace this with your actual search logic (e.g. fetch API).
    searchResults.innerHTML = `
      <div class="no-results">
        No results found for “${query}”
      </div>
    `;
    searchResults.style.display = "block";
  });

  // Optional: Hide results when clicking outside the input/results
  document.addEventListener("click", (evt) => {
    if (
      !searchResults.contains(evt.target) &&
      evt.target !== searchInput
    ) {
      searchResults.style.display = "none";
    }
  });
}
