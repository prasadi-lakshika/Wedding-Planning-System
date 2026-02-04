// my_account.js
document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const plannerOnlyLinks = document.querySelectorAll('.planner-only-link');

  // Show My Account link for planners and coordinators
  plannerOnlyLinks.forEach(link => {
    if (userRole === 'planner' || userRole === 'coordinator') {
      link.style.display = 'inline';
    } else {
      link.style.display = 'none';
    }
  });

  // Redirect non-planners/coordinators away from this page
  if (userRole !== 'planner' && userRole !== 'coordinator') {
    window.location.href = 'index.html';
    return;
  }

  // Fetch user info from backend API
  loadUserProfile();

  // Password change form handling
  const passwordForm = document.getElementById('passwordChangeForm');
  const passwordMsg = document.getElementById('passwordChangeMsg');

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordMsg.textContent = '';

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
      passwordMsg.textContent = 'New passwords do not match.';
      return;
    }

    // Call backend API to change password
    const API_BASE = 'http://localhost:5000';
    try {
      const response = await fetch(`${API_BASE}/auth/profile/password`, {
        method: 'PUT',
        credentials: 'include', // Include session cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmNewPassword
        })
      });
      const result = await response.json();
      if (response.ok) {
        passwordMsg.style.color = 'green';
        passwordMsg.textContent = result.message || 'Password changed successfully.';
        passwordForm.reset();
      } else {
        passwordMsg.style.color = 'red';
        passwordMsg.textContent = result.error || result.message || 'Failed to change password.';
      }
    } catch (error) {
      console.error('Password change error:', error);
      passwordMsg.style.color = 'red';
      passwordMsg.textContent = 'Error changing password. Please try again.';
    }
  });
  });

// Fetch user profile data from backend API
async function loadUserProfile() {
  const API_BASE = 'http://localhost:5000';
  
  try {
    // Show loading state
    document.getElementById('userName').textContent = 'Loading...';
    document.getElementById('userUsername').textContent = 'Loading...';
    document.getElementById('userEmail').textContent = 'Loading...';
    
    // Fetch user profile from backend
    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: 'GET',
      credentials: 'include', // Include session cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const userData = await response.json();
    
    // Populate user information
    document.getElementById('userName').textContent = userData.name || 'Not set';
    document.getElementById('userUsername').textContent = userData.username || 'Not set';
    document.getElementById('userEmail').textContent = userData.email || 'Not set';
    
    // Update localStorage with fresh data
    if (userData.name) localStorage.setItem('userName', userData.name);
    if (userData.username) localStorage.setItem('userUsername', userData.username);
    if (userData.email) localStorage.setItem('userEmail', userData.email);
    if (userData.role) localStorage.setItem('userRole', userData.role);
    
    console.log('User profile loaded successfully:', {
      id: userData.id,
      name: userData.name,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      phone_number: userData.phone_number,
      address: userData.address
    });
  } catch (error) {
    console.error('Error loading user profile:', error);
    
    // Fallback to localStorage if API fails
    const userName = localStorage.getItem('userName') || '';
    const userUsername = localStorage.getItem('userUsername') || '';
    const userEmail = localStorage.getItem('userEmail') || '';
    
    document.getElementById('userName').textContent = userName || 'Not available';
    document.getElementById('userUsername').textContent = userUsername || 'Not available';
    document.getElementById('userEmail').textContent = userEmail || 'Not available';
    
    // Show error message if available
    const passwordMsg = document.getElementById('passwordChangeMsg');
    if (passwordMsg) {
      passwordMsg.style.color = 'orange';
      passwordMsg.textContent = 'Unable to load latest profile data. Showing cached information.';
      setTimeout(() => {
        passwordMsg.textContent = '';
      }, 5000);
    }
  }
}