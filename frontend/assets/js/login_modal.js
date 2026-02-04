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

// Forgot Password Modal Management
const forgotPasswordModal = document.getElementById('forgotPasswordModal');

// Open forgot password modal
if (document.getElementById('forgotPasswordLink')) {
  document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
    e.preventDefault();
    closeModal(); // Close login modal
    if (forgotPasswordModal) {
      forgotPasswordModal.style.display = 'block';
      forgotPasswordModal.classList.add('show');
      if (modalBG) {
        modalBG.classList.add('show');
      }
    }
  });
}

// Close forgot password modal function
window.closeForgotPasswordModal = function() {
  if (forgotPasswordModal) {
    forgotPasswordModal.style.display = 'none';
    forgotPasswordModal.classList.remove('show');
    if (modalBG) {
      modalBG.classList.remove('show');
    }
    // Clear form and messages
    const form = document.getElementById('forgotPasswordForm');
    if (form) {
      form.reset();
    }
    const msg = document.getElementById('forgotPasswordMsg');
    if (msg) {
      msg.textContent = '';
    }
    const success = document.getElementById('forgotPasswordSuccess');
    if (success) {
      success.style.display = 'none';
      success.textContent = '';
    }
  }
}

// Back to login link
if (document.getElementById('backToLoginLink')) {
  document.getElementById('backToLoginLink').addEventListener('click', function(e) {
    e.preventDefault();
    closeForgotPasswordModal();
    if (modal) {
      modal.classList.add('show');
      if (modalBG) {
        modalBG.classList.add('show');
      }
    }
  });
}

// Handle forgot password form submission
if (document.getElementById('forgotPasswordForm')) {
  document.getElementById('forgotPasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotPasswordEmail').value.trim();
    const msgDiv = document.getElementById('forgotPasswordMsg');
    const successDiv = document.getElementById('forgotPasswordSuccess');
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Clear previous messages
    if (msgDiv) {
      msgDiv.textContent = '';
    }
    if (successDiv) {
      successDiv.style.display = 'none';
      successDiv.textContent = '';
    }
    
    // Basic validation
    if (!email) {
      if (msgDiv) {
        msgDiv.textContent = 'Please enter your email address.';
        msgDiv.style.color = '#dc3545';
      }
      return;
    }
    
    if (!isValidEmail(email)) {
      if (msgDiv) {
        msgDiv.textContent = 'Please enter a valid email address.';
        msgDiv.style.color = '#dc3545';
      }
      return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    // Make API call to backend
    fetch('http://localhost:5000/auth/forgot-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.error) {
        if (msgDiv) {
          msgDiv.textContent = data.error;
          msgDiv.style.color = '#dc3545';
        }
      } else {
        // Show success message
        if (successDiv) {
          successDiv.textContent = data.message || 'If an account exists with this email, a password reset link has been sent.';
          successDiv.style.color = '#28a745';
          successDiv.style.display = 'block';
        }
        // Clear email field
        document.getElementById('forgotPasswordEmail').value = '';
      }
    })
    .catch(error => {
      console.error('Forgot password error:', error);
      if (msgDiv) {
        msgDiv.textContent = 'Network error. Please check your connection and try again.';
        msgDiv.style.color = '#dc3545';
      }
    })
    .finally(() => {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    });
  });
}

// Export functions for use in other scripts
window.loginModal = {
  closeModal,
  closeForgotPasswordModal,
  handleLogout
};