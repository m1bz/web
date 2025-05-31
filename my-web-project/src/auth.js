const MOCK_USER = {
    username: 'admin',
    password: 'admin',
    fullName: 'Spartacus Admin',
    email: 'admin@spartacus.fit',
    joinDate: new Date().toLocaleDateString()
};

const USER_STORAGE_KEY = 'spartacusUser';

// Authentication state management to prevent race conditions
let authCheckInProgress = false;
let authState = null;
let guardActive = false;
let isUserLoggedIn = false; // Global flag to track login status

// Initialize auth state on page load
function initializeAuthState() {
    try {
        const item = localStorage.getItem(USER_STORAGE_KEY);
        isUserLoggedIn = !!(item && item !== 'null' && item !== '');
        authState = isUserLoggedIn;
        console.log(`[Auth] Initialized auth state: isUserLoggedIn=${isUserLoggedIn}`);
        return isUserLoggedIn;
    } catch (error) {
        console.error('[Auth] Error initializing auth state:', error);
        isUserLoggedIn = false;
        authState = false;
        return false;
    }
}

// Authentication guard configuration
const AUTH_GUARD = {
    protectedPages: ['profile.html', 'my-workouts.html'],
    publicPages: ['index.html', 'login.html', 'search-results.html', 'exercise-selection.html', 'workout-selection.html'],
    loginRedirectDelay: 150, // Small delay to prevent race conditions
};

function checkLoginStatus() {
    try {
        // Always return the current global state if it's been initialized
        if (authState !== null) {
            console.log(`[Auth] checkLoginStatus returning cached state: ${authState}`);
            return authState;
        }
        
        // If not initialized, initialize now
        return initializeAuthState();
    } catch (error) {
        console.error('[Auth] Error checking login status:', error);
        isUserLoggedIn = false;
        authState = false;
        return false;
    }
}

// Function to get if user is logged in (simple boolean check)
function isLoggedIn() {
    return isUserLoggedIn;
}

function getCurrentUser() {
    try {
        const user = localStorage.getItem(USER_STORAGE_KEY);
        // console.log(`[Auth] getCurrentUser on ${window.location.pathname}: item value (first 30 chars)=${user ? user.substring(0, 30) + '...' : 'null'}`);
        return user && user !== 'null' && user !== '' ? JSON.parse(user) : null;
    } catch (error) {
        console.error('[Auth] Error getting current user:', error);
        return null;
    }
}

function loginUser(username, password) {
    console.log(`[Auth] Attempting login for user: ${username} on ${window.location.pathname}`);
    if (username === MOCK_USER.username && password === MOCK_USER.password) {
        const userToStore = { ...MOCK_USER };
        delete userToStore.password; // Don't store password
        const userJSON = JSON.stringify(userToStore);
        localStorage.setItem(USER_STORAGE_KEY, userJSON);
        
        // Update auth state immediately
        isUserLoggedIn = true;
        authState = true;
        
        console.log(`[Auth] Login SUCCESSFUL for ${username}. Updated isUserLoggedIn to: ${isUserLoggedIn}`);
        return true;
    }
    console.log(`[Auth] Login FAILED for ${username}`);
    return false;
}

// Authentication Guard Functions
function activateAuthGuard() {
    if (guardActive) return;
    guardActive = true;
    console.log('[Auth Guard] Activating authentication guard');
    
    // Initialize auth state first
    initializeAuthState();
    
    // Check current page and apply appropriate guard logic
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    console.log(`[Auth Guard] Checking page: ${currentPage}, isUserLoggedIn: ${isUserLoggedIn}`);
    
    if (AUTH_GUARD.protectedPages.includes(currentPage)) {
        protectedPageGuard(currentPage);
    } else if (currentPage === 'login.html') {
        loginPageGuard();
    } else {
        console.log(`[Auth Guard] Public page ${currentPage}, no redirect needed`);
    }
}

function protectedPageGuard(pageName) {
    console.log(`[Auth Guard] Applying protected page guard for: ${pageName}, current login status: ${isUserLoggedIn}`);
    
    // Use a small delay to ensure all scripts have loaded
    setTimeout(() => {
        if (!isUserLoggedIn) {
            console.log(`[Auth Guard] User not authenticated, redirecting to login from ${pageName}`);
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `login.html?redirect=${redirectUrl}`;
        } else {
            console.log(`[Auth Guard] User authenticated, allowing access to ${pageName}`);
        }
    }, AUTH_GUARD.loginRedirectDelay);
}

function loginPageGuard() {
    console.log(`[Auth Guard] Applying login page guard, current login status: ${isUserLoggedIn}`);
    
    // Use a small delay to ensure all scripts have loaded
    setTimeout(() => {
        if (isUserLoggedIn) {
            console.log('[Auth Guard] User already authenticated, redirecting from login page');
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect') || 'profile.html';
            
            // Clean the redirect URL to prevent loops
            const cleanRedirectUrl = redirectUrl.replace(/^\/+/, '');
            if (cleanRedirectUrl && cleanRedirectUrl !== 'login.html') {
                window.location.href = cleanRedirectUrl;
            } else {
                window.location.href = 'profile.html';
            }
        } else {
            console.log('[Auth Guard] User not authenticated, showing login form');
        }
    }, AUTH_GUARD.loginRedirectDelay);
}

function requireAuth(callback) {
    if (isUserLoggedIn) {
        callback();
    } else {
        console.log('[Auth Guard] Authentication required, redirecting to login');
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?redirect=${redirectUrl}`;
    }
}

function logoutUser() {
    const currentItem = localStorage.getItem(USER_STORAGE_KEY);
    console.log(`[Auth] Logging out user on ${window.location.pathname}. Current item (first 30 chars): ${currentItem ? currentItem.substring(0, 30) + '...' : 'null'}`);
    localStorage.removeItem(USER_STORAGE_KEY);
    
    // Update auth state immediately
    isUserLoggedIn = false;
    authState = false;
    
    console.log(`[Auth] User logged out. Updated isUserLoggedIn to: ${isUserLoggedIn}`);
    updateUserProfileButton(); // Update header immediately
    
    // Redirect to home or login page after logout
    if (window.location.pathname.includes('profile.html') || 
        window.location.pathname.includes('my-workouts.html')) {
        window.location.href = 'index.html';
    } else {
        // If on a page like index.html or login.html already, just let updateUserProfileButton handle UI.
        // No forced redirect needed unless already on a protected page.
    }
}

function updateUserProfileButton() {
    const container = document.getElementById('user-profile-button-container');
    if (!container) {
        // console.warn("[Auth] User profile button container not found on this page:", window.location.pathname);
        return;
    }

    const currentUser = getCurrentUser();
    // console.log(`[Auth] updateUserProfileButton on ${window.location.pathname}. currentUser:`, currentUser);

    if (currentUser) {
        container.innerHTML = `
            <div class="user-profile-button" id="user-profile-button">
                <span id="username-display">${currentUser.username}</span>
                <div class="dropdown-content" id="user-dropdown">
                    <a href="profile.html">Profile</a>
                    <a href="#" id="logout-btn">Logout</a>
                </div>
            </div>
        `;
        
        // Add click functionality for dropdown
        const userProfileButton = document.getElementById('user-profile-button');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (userProfileButton) {
            userProfileButton.addEventListener('click', (e) => {
                e.stopPropagation();
                userProfileButton.classList.toggle('active');
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                logoutUser();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userProfileButton.contains(e.target)) {
                userProfileButton.classList.remove('active');
            }
        });
        
    } else {
        container.innerHTML = '<a href="login.html" class="action-btn login-btn">Login</a>';
    }
}

// Call this on every page load to set the correct header button and activate auth guard
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth state first
    initializeAuthState();
    
    // Update UI and activate guard
    updateUserProfileButton();
    activateAuthGuard();
});