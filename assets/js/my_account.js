// my_account.js
document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const plannerOnlyLinks = document.querySelectorAll('.planner-only-link');

  // Show My Account link only for planners
  plannerOnlyLinks.forEach(link => {
    if (userRole === 'planner') {
      link.style.display = 'inline';
    } else {
      link.style.display = 'none';
    }
  });

  // Redirect non-planners away from this page
  if (userRole !== 'planner') {
    window.location.href = 'dashboard.html';
    return;
  }

  // Fetch user info from localStorage or backend API
  const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {
    name: '',
    username: '',
    email: ''
  };

  document.getElementById('userName').textContent = userInfo.name || '';
  document.getElementById('userUsername').textContent = userInfo.username || '';
  document.getElementById('userEmail').textContent = userInfo.email || '';

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
    try {
      const response = await fetch('/api/change_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const result = await response.json();
      if (response.ok) {
        passwordMsg.style.color = 'green';
        passwordMsg.textContent = 'Password changed successfully.';
        passwordForm.reset();
      } else {
        passwordMsg.style.color = 'red';
        passwordMsg.textContent = result.message || 'Failed to change password.';
      }
    } catch (error) {
      passwordMsg.style.color = 'red';
      passwordMsg.textContent = 'Error changing password.';
    }
  });

  // Social account linking/unlinking buttons
  const socialMsg = document.getElementById('socialLinkMsg');

  document.getElementById('linkGoogleBtn').addEventListener('click', () => {
    // Initiate Google OAuth linking flow
    window.location.href = '/auth/link/google';
  });

  document.getElementById('unlinkGoogleBtn').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/unlink/google', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        socialMsg.style.color = 'green';
        socialMsg.textContent = 'Google account unlinked successfully.';
      } else {
        socialMsg.style.color = 'red';
        socialMsg.textContent = result.message || 'Failed to unlink Google account.';
      }
    } catch (error) {
      socialMsg.style.color = 'red';
      socialMsg.textContent = 'Error unlinking Google account.';
    }
  });

  document.getElementById('linkFacebookBtn').addEventListener('click', () => {
    // Initiate Facebook OAuth linking flow
    window.location.href = '/auth/link/facebook';
  });

  document.getElementById('unlinkFacebookBtn').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/unlink/facebook', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        socialMsg.style.color = 'green';
        socialMsg.textContent = 'Facebook account unlinked successfully.';
      } else {
        socialMsg.style.color = 'red';
        socialMsg.textContent = result.message || 'Failed to unlink Facebook account.';
      }
    } catch (error) {
      socialMsg.style.color = 'red';
      socialMsg.textContent = 'Error unlinking Facebook account.';
    }
  });
});
