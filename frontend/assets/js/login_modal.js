// Login Modal Management
const modal = document.getElementById('loginModal');
const modalBG = document.getElementById('modalBG');

// Open login modal
if (document.getElementById('openLogin')) {
  document.getElementById('openLogin').onclick = function() {
    modal.classList.add('show');
    modalBG.classList.add('show');
  }
}

// Close modal function
window.closeModal = function() {
  modal.classList.remove('show');
  modalBG.classList.remove('show');
  // Clear any error messages
  const loginMsg = document.getElementById('loginMsg');
  if (loginMsg) {
    loginMsg.textContent = '';
    loginMsg.style.color = '';
  }
}

// Close modal when clicking background
if (modalBG) {
  modalBG.onclick = closeModal;
}

// Handle login form submission
if (document.getElementById('emailLoginForm')) {
  document.getElementById('emailLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginMsg = document.getElementById('loginMsg');
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Basic validation
    if (!email || !password) {
      showMessage('Please fill in all fields.', 'error');
      return;
    }
    
    if (!isValidEmail(email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    showMessage('Logging in...', 'info');
    
    // Make API call to backend with session support
    fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      credentials: 'include', // Include cookies for session-based auth
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.error) {
        showMessage(data.error, 'error');
      } else {
        // Store user data in localStorage
        localStorage.setItem('userRole', data.user.role || 'planner');
        localStorage.setItem('userName', data.user.name || '');
        localStorage.setItem('userEmail', data.user.email || '');
        localStorage.setItem('userUsername', data.user.username || '');
        localStorage.setItem('isLoggedIn', 'true');
        
        showMessage('Login successful! Redirecting...', 'success');
        
        // Redirect after delay - both admin and planner go to Home page
        setTimeout(() => {
          location.href = 'index.html';
        }, 1500);
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      if (error.message.includes('HTTP error! status: 500')) {
        showMessage('Server error. Please try again later.', 'error');
      } else if (error.message.includes('HTTP error! status: 404')) {
        showMessage('User not found. Please check your email.', 'error');
      } else if (error.message.includes('HTTP error! status: 401')) {
        showMessage('Invalid password. Please try again.', 'error');
      } else {
        showMessage('Network error. Please check your connection.', 'error');
      }
    })
    .finally(() => {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    });
  });
}

// Helper function to show messages
function showMessage(message, type) {
  const loginMsg = document.getElementById('loginMsg');
  if (loginMsg) {
    loginMsg.textContent = message;
    switch (type) {
      case 'error':
        loginMsg.style.color = '#dc3545';
        break;
      case 'success':
        loginMsg.style.color = '#28a745';
        break;
      case 'info':
        loginMsg.style.color = '#17a2b8';
        break;
      default:
        loginMsg.style.color = '#6c757d';
    }
  }
}

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Handle logout - simplified version for other pages
function handleLogout() {
  // Clear localStorage
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userUsername');
  localStorage.removeItem('isLoggedIn');
  
  // Redirect to home page
  location.href = 'index.html';
}

// Export functions for use in other scripts
window.loginModal = {
  closeModal,
  handleLogout
};