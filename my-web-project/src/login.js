document.addEventListener('DOMContentLoaded', () => {
    // The auth guard will handle redirects automatically
    // Just initialize the login form
    initializeLoginForm();
    
    function initializeLoginForm() {
        const loginForm = document.getElementById('login-form');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorMessageElement = document.getElementById('login-error-message');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (loginUser(username, password)) { // loginUser is from auth.js
                errorMessageElement.style.display = 'none';
                console.log('[Login] Login successful, redirecting to profile');
                // Redirect to a specific page after login, e.g., profile or previous page
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect') || 'profile.html';
                window.location.href = redirectUrl;
            } else {
                errorMessageElement.textContent = 'Invalid username or password. Please try again.';
                errorMessageElement.style.display = 'block';
            }
        });
    }
});