document.addEventListener('DOMContentLoaded', () => {
    // The auth guard will handle authentication checks
    // Use requireAuth to ensure user is logged in before loading profile
    requireAuth(() => {
        loadProfile();
    });
    
    function loadProfile() {
        const profileDetailsContainer = document.getElementById('profile-details');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const viewMyWorkoutsBtn = document.getElementById('view-my-workouts-btn');
        
        const currentUser = getCurrentUser();

        if (currentUser) {
            profileDetailsContainer.innerHTML = `
                <p><strong>Username:</strong> ${currentUser.username}</p>
                <p><strong>Full Name:</strong> ${currentUser.fullName}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Joined:</strong> ${currentUser.joinDate}</p>
                <!-- More profile details can be added here -->
            `;
        } else {
            // This case should ideally not be reached if checkLoginStatus() works correctly
            profileDetailsContainer.innerHTML = '<p>Could not load profile information. Please try logging in again.</p>';
        }

        editProfileBtn.addEventListener('click', () => {
            alert('Edit profile functionality is a work in progress!');
            // Later, this could show a form or redirect to an edit profile page.
        });

        viewMyWorkoutsBtn.addEventListener('click', () => {
            window.location.href = 'my-workouts.html'; 
        });
    }
});