document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const profileNavLink = document.getElementById('profileNavLink');
  const adminLinks = document.querySelectorAll('.admin-only');
  const logoutLink = document.getElementById('logoutLink');

  // Show or hide Profile link based on role
  if (profileNavLink) {
    if (userRole === 'admin') {
      profileNavLink.style.display = 'inline';
    } else {
      profileNavLink.style.display = 'none';
    }
  }

  // Show or hide admin-only links
  adminLinks.forEach(link => {
    if (userRole === 'admin') {
      link.style.display = 'inline';
    } else {
      link.style.display = 'none';
    }
  });

  // Show logout link if logged in
  if (userRole) {
    logoutLink.style.display = 'inline';
  } else {
    logoutLink.style.display = 'none';
  }

  logoutLink.addEventListener('click', () => {
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
  });
});
