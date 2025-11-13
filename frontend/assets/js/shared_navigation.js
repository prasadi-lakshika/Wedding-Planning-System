// Shared Navigation Management for All Pages
console.log('=== SHARED NAVIGATION LOADED ===');

// Function to handle navigation visibility for any page
function handlePageNavigation(userRole, isLoggedIn) {
  console.log('=== HANDLING PAGE NAVIGATION ===');
  console.log('Role:', userRole, 'Logged in:', isLoggedIn);
  
  // Get navigation elements
  const loginBtn = document.getElementById('openLogin');
  const logoutLink = document.getElementById('logoutLink');
  const commonLinks = document.querySelectorAll('.common-link');
  const plannerLinks = document.querySelectorAll('.planner-only-link');
  const adminLinks = document.querySelectorAll('.admin-only-link');

  // Normalize Users link label
  const usersNavLink = Array.from(adminLinks).find(link => link.getAttribute('href') === 'admin_dashboard.html');
  if (usersNavLink) {
    usersNavLink.textContent = 'Users';
  }

  console.log('Elements found:');
  console.log('- Login button:', !!loginBtn);
  console.log('- Logout link:', !!logoutLink);
  console.log('- Common links:', commonLinks.length);
  console.log('- Planner links:', plannerLinks.length);
  console.log('- Users links:', adminLinks.length);

  // Handle login button visibility
  if (loginBtn) {
    const shouldHide = isLoggedIn === 'true';
    loginBtn.style.display = shouldHide ? 'none' : 'block';
    console.log('Login button:', shouldHide ? 'HIDDEN' : 'SHOWN');
  }

  // Handle logout link visibility
  if (logoutLink) {
    const shouldShow = isLoggedIn === 'true';
    logoutLink.style.display = shouldShow ? 'inline' : 'none';
    console.log('Logout link:', shouldShow ? 'SHOWN' : 'HIDDEN');
    
    // Add logout click handler
    if (shouldShow) {
      logoutLink.onclick = function(e) {
        e.preventDefault();
        console.log('Logout clicked');
        
        // Clear localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userUsername');
        localStorage.removeItem('isLoggedIn');
        
        // Redirect to home page
        window.location.href = 'index.html';
      };
    }
  }

  // Handle common links
  console.log('=== COMMON LINKS ===');
  commonLinks.forEach((link, index) => {
    const shouldShow = isLoggedIn === 'true';
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${link.textContent.trim()}: ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });

  // Handle planner-only links
  console.log('=== PLANNER LINKS ===');
  plannerLinks.forEach((link, index) => {
    const shouldShow = isLoggedIn === 'true' && userRole === 'planner';
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${link.textContent.trim()}: ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });

  // Handle users-only links
  console.log('=== USERS LINKS ===');
  adminLinks.forEach((link, index) => {
    const shouldShow = isLoggedIn === 'true' && userRole === 'admin';
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${link.textContent.trim()}: ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });
  
  console.log('=== PAGE NAVIGATION COMPLETE ===');
}

// Function to check authentication and redirect if needed
function checkAuthenticationAndRedirect() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const userRole = localStorage.getItem('userRole');
  
  console.log('=== AUTH CHECK ===');
  console.log('isLoggedIn:', isLoggedIn);
  console.log('userRole:', userRole);
  
  if (isLoggedIn !== 'true') {
    alert('Please login to access this page.');
    window.location.href = 'index.html';
    return false;
  }
  
  return { userRole, isLoggedIn };
}

// Initialize navigation for any page
function initializePageNavigation() {
  document.addEventListener('DOMContentLoaded', function() {
    const authData = checkAuthenticationAndRedirect();
    
    if (authData) {
      handlePageNavigation(authData.userRole, authData.isLoggedIn);
    }
  });
}

// Export functions for global use
window.sharedNavigation = {
  handlePageNavigation,
  checkAuthenticationAndRedirect,
  initializePageNavigation
};