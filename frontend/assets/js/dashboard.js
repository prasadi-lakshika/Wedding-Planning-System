// Dashboard Navigation and Data Management
console.log('=== DASHBOARD.JS LOADING ===');

document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DASHBOARD.JS STARTED ===');
  
  // Get user data from localStorage
  const userRole = localStorage.getItem('userRole');
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  
  console.log('Dashboard.js - Role:', userRole, 'Logged in:', isLoggedIn);

  // NAVIGATION MANAGEMENT
  handleNavigation(userRole, isLoggedIn);
  
  // DASHBOARD DATA MANAGEMENT
  handleDashboardData();
  
  console.log('=== DASHBOARD.JS COMPLETE ===');
});

function handleNavigation(userRole, isLoggedIn) {
  console.log('=== HANDLING NAVIGATION ===');
  
  // Get navigation elements
  const loginBtn = document.getElementById('openLogin');
  const logoutLink = document.getElementById('logoutLink');
  const commonLinks = document.querySelectorAll('.common-link');
  const plannerLinks = document.querySelectorAll('.planner-only-link');
  const adminLinks = document.querySelectorAll('.admin-only-link');

  console.log('Elements found:');
  console.log('- Login button:', !!loginBtn);
  console.log('- Logout link:', !!logoutLink);
  console.log('- Common links:', commonLinks.length);
  console.log('- Planner links:', plannerLinks.length);
  console.log('- Users links:', adminLinks.length);
  const usersNavLink = Array.from(adminLinks).find(link => link.getAttribute('href') === 'admin_dashboard.html');
  if (usersNavLink) {
    usersNavLink.textContent = 'Users';
  }

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

  // Handle common links (Home, Dashboard, etc.)
  console.log('=== COMMON LINKS ===');
  commonLinks.forEach((link, index) => {
    const shouldShow = isLoggedIn === 'true';
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${link.textContent.trim()}: ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });

  // Handle planner-only links (My Account)
  console.log('=== PLANNER LINKS ===');
  plannerLinks.forEach((link, index) => {
    const shouldShow = isLoggedIn === 'true' && userRole === 'planner';
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${link.textContent.trim()}: ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });

  // Handle users-only links (Profile, Users)
  console.log('=== USERS LINKS ===');
  adminLinks.forEach((link, index) => {
    const shouldShow = isLoggedIn === 'true' && userRole === 'admin';
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${link.textContent.trim()}: ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });
  
  console.log('=== NAVIGATION COMPLETE ===');
}

function handleDashboardData() {
  console.log('=== HANDLING DASHBOARD DATA ===');
  
  try {
    // Load projects from localStorage
    const projects = JSON.parse(localStorage.getItem('weddingProjects')) || [];
    console.log('Projects loaded:', projects.length);

    // Load tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    console.log('Tasks loaded:', tasks.length);

    // Load budget items from localStorage
    const budgetItems = JSON.parse(localStorage.getItem('budget')) || [];
    console.log('Budget items loaded:', budgetItems.length);

    // Calculate pending tasks count
    const pendingTasksCount = tasks.filter(task => task.status !== 'completed').length;

    // Calculate total budget amount
    const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + (item.actual || 0), 0);

    // Update dashboard stats
    const pendingTasksElement = document.getElementById('pendingTasksCount');
    const totalBudgetElement = document.getElementById('totalBudgetAmount');
    
    if (pendingTasksElement) {
      pendingTasksElement.textContent = pendingTasksCount;
      console.log('Pending tasks updated:', pendingTasksCount);
    }
    
    if (totalBudgetElement) {
      totalBudgetElement.textContent = totalBudgetAmount.toFixed(2);
      console.log('Total budget updated:', totalBudgetAmount.toFixed(2));
    }

    // Update projects list
    const projectsList = document.getElementById('projectsList');
    if (projectsList) {
      projectsList.innerHTML = '';

      if (projects.length === 0) {
        const noProjectsItem = document.createElement('li');
        noProjectsItem.textContent = 'No ongoing projects.';
        projectsList.appendChild(noProjectsItem);
        console.log('No projects message added');
      } else {
        projects.forEach((project, index) => {
          const projectItem = document.createElement('li');
          const projectLink = document.createElement('a');
          projectLink.href = `client_management.html?projectId=${encodeURIComponent(project.id)}`;
          projectLink.textContent = `${project.brideName || 'Bride'} & ${project.groomName || 'Groom'}`;
          projectItem.appendChild(projectLink);
          projectsList.appendChild(projectItem);
        });
        console.log('Projects list updated with', projects.length, 'projects');
      }
    }
    
    console.log('=== DASHBOARD DATA COMPLETE ===');
  } catch (error) {
    console.error('Error handling dashboard data:', error);
  }
}