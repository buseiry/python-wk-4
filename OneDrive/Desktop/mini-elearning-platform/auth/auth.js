// Store users in memory (for prototype purposes)
let users = [];
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Setup form handlers
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

// Handle signup
function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('signupMessage');

    // Validation
    if (!name || !email || !password) {
        showMessage(messageDiv, 'All fields are required', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage(messageDiv, 'Password must be at least 6 characters', 'error');
        return;
    }

    // Check if user already exists
    const userExists = users.find(u => u.email === email);
    if (userExists) {
        showMessage(messageDiv, 'Email already registered', 'error');
        return;
    }

    // Create new user
    const newUser = {
        id: Date.now(),
        name,
        email,
        password // In production, NEVER store plain passwords!
    };

    users.push(newUser);
    showMessage(messageDiv, 'Account created successfully! Redirecting to login...', 'success');

    // Redirect to login after 2 seconds
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

// Handle login
function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    // Validation
    if (!email || !password) {
        showMessage(messageDiv, 'All fields are required', 'error');
        return;
    }

    // Find user
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showMessage(messageDiv, 'Invalid email or password', 'error');
        return;
    }

    // Set current user
    currentUser = user;
    showMessage(messageDiv, 'Login successful! Redirecting...', 'success');

    // Redirect to home page after 1.5 seconds
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1500);
}

// Show message helper
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';

    // Hide after 5 seconds for errors
    if (type === 'error') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Export current user (for use in main app)
function getCurrentUser() {
    return currentUser;
}