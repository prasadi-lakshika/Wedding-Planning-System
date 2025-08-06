const modal = document.getElementById('loginModal');
const modalBG = document.getElementById('modalBG');
document.getElementById('openLogin').onclick = function() {
  modal.classList.add('show');
  modalBG.classList.add('show');
}
window.closeModal = function() {
  modal.classList.remove('show');
  modalBG.classList.remove('show');
}
modalBG.onclick = closeModal;

document.getElementById('emailLoginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  let email = document.getElementById('loginEmail').value;
  let password = document.getElementById('loginPassword').value;

  // Simulate backend user lookup and role assignment
  let users = JSON.parse(localStorage.getItem('weddingPlanners')) || [];
  let user = users.find(u => u.email === email && u.password === password);

  if(user){
    localStorage.setItem('userRole', user.role || 'planner'); // default to planner if no role
    document.getElementById('loginMsg').style.color = "#257a2c";
    document.getElementById('loginMsg').textContent = "Login successful! Redirecting…";
    setTimeout(()=>location.href="dashboard.html", 1300);
  } else {
    document.getElementById('loginMsg').style.color = "red";
    document.getElementById('loginMsg').textContent = "Invalid email or password.";
  }
});

// ======= Google Sign-In =======
window.handleGoogleCredentialResponse = function(response){
  // Simulate receiving user role from backend after Google sign-in
  const userRole = 'planner'; // This should come from backend in real implementation
  localStorage.setItem('userRole', userRole);
  alert('Google Sign-In successful! (Token received)');
  location.href="dashboard.html";
};
window.onload = function() {
  if(window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: 'YOUR_GOOGLE_CLIENT_ID',
      callback: handleGoogleCredentialResponse,
    });
  }
  // Update navigation based on user role
  updateNavigationByRole();
};

document.getElementById('googleLoginBtn').onclick = function(){
  if(window.google && google.accounts && google.accounts.id) {
    google.accounts.id.prompt((notification) => {});
  }
};

// Function to update navigation links based on user role
function updateNavigationByRole() {
  const userRole = localStorage.getItem('userRole');
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  // Remove existing admin link if any
  const existingAdminLink = document.getElementById('adminNavLink');
  if (existingAdminLink) {
    existingAdminLink.remove();
  }

  if (userRole === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = 'admin_dashboard.html';
    adminLink.id = 'adminNavLink';
    adminLink.textContent = 'Admin Dashboard';
    nav.appendChild(adminLink);
  }
}

// ======= Facebook Login =======
window.fbAsyncInit = function() {
  FB.init({
    appId      : 'YOUR_FACEBOOK_APP_ID',
    cookie     : true,
    xfbml      : true,
    version    : 'v17.0'
  });
};
document.getElementById('facebookLoginBtn').onclick = function() {
  if(window.FB) {
    FB.login(function(response) {
      if (response.authResponse) {
        alert('Facebook login successful!');
        location.href="dashboard.html";
      } else {
        alert('Facebook login failed or cancelled.');
      }
    }, {scope: 'public_profile,email'});
  }
};
