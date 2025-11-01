const API_BASE = '/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Show loading state
    submitBtn.textContent = 'Signing In...';
    submitBtn.disabled = true;
    
    try {
        console.log('Attempting login for:', email);
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.status === 'success') {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            messageDiv.textContent = 'Login successful! Redirecting...';
            messageDiv.className = 'message success';
            
            // Redirect to dashboard based on role
            setTimeout(() => {
                if (data.data.user.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/employee';
                }
            }, 1000);
        } else {
            messageDiv.textContent = data.message || 'Login failed. Please try again.';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageDiv.textContent = 'Network error. Please check your connection and try again.';
        messageDiv.className = 'message error';
    } finally {
        // Reset button state
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled = false;
    }
});

// Check if already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            const userData = JSON.parse(user);
            if (userData.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/employee';
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.clear();
        }
    }
});

// Add this function to test API connectivity
window.testAPI = async function() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('API Health Check:', data);
        return data;
    } catch (error) {
        console.error('API Health Check Failed:', error);
        return null;
    }
};