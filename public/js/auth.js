const API_BASE = 'http://localhost:5000/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            messageDiv.textContent = 'Login successful! Redirecting...';
            messageDiv.className = 'message success';
            
            // Redirect to dashboard based on role
            setTimeout(() => {
                if (data.data.user.role === 'admin') {
                    window.location.href = 'html/dashboard.html';
                } else {
                    window.location.href = 'html/employee-dashboard.html';
                }
            }, 1500);
        } else {
            messageDiv.textContent = data.message || 'Login failed';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'message error';
    }
});

// Check if already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        const userData = JSON.parse(user);
        if (userData.role === 'admin') {
            window.location.href = 'html/dashboard.html';
        } else {
            window.location.href = 'html/employee-dashboard.html';
        }
    }
});
