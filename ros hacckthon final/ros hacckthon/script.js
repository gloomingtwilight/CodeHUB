// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Simple validation
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    // For demo purposes, we'll use a simple check
    // In a real application, you would send this to your backend
    if (email === 'demo@example.com' && password === 'password') {
        // Create user data object
        const userData = {
            id: '1',
            name: 'Demo User',
            email: email,
            imageUrl: 'https://via.placeholder.com/40'
        };
        
        // Store user data
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } else {
        alert('Invalid email or password. Try demo@example.com / password');
    }
});

// Handle sign up link
document.getElementById('signupLink').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Sign up functionality will be implemented in the future.');
});

// Handle forgot password link
document.querySelector('.forgot-password').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Password reset functionality will be implemented in the future.');
});

// Check if user is already signed in
function checkAuthState() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        window.location.href = 'dashboard.html';
    }
}

// Initialize when the page loads
window.onload = function() {
    checkAuthState();
}; 