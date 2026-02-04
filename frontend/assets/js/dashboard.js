// Dashboard Navigation and Data Management
console.log('=== DASHBOARD.JS LOADING ===');

const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DASHBOARD.JS STARTED ===');
  
  // Get user data from localStorage
  const userRole = localStorage.getItem('userRole');
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  
  console.log('Dashboard.js - Role:', userRole, 'Logged in:', isLoggedIn);

  // NAVIGATION MANAGEMENT
  handleNavigation(userRole, isLoggedIn);
  
  // DASHBOARD DATA MANAGEMENT - Now uses backend API
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
  console.log('- Admin links:', adminLinks.length);
  
  // List all admin links found
  adminLinks.forEach((link, idx) => {
    console.log(`  Admin link ${idx + 1}: ${link.textContent.trim()} (${link.getAttribute('href')})`);
  });
  
  // Normalize Users link label
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

  // Handle planner-only links (My Account) - coordinators also see this
  console.log('=== PLANNER LINKS ===');
  plannerLinks.forEach((link, index) => {
    const shouldShow = isLoggedIn === 'true' && (userRole === 'planner' || userRole === 'coordinator');
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${link.textContent.trim()}: ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });

  // Handle admin-only links (Profile, Users, Data Management)
  console.log('=== ADMIN LINKS ===');
  adminLinks.forEach((link, index) => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    const shouldShow = isLoggedIn === 'true' && userRole === 'admin';
    link.style.display = shouldShow ? 'inline' : 'none';
    console.log(`${index + 1}. ${text} (${href}): ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
  });
  
  console.log('=== NAVIGATION COMPLETE ===');
}

async function handleDashboardData() {
  console.log('=== HANDLING DASHBOARD DATA ===');
  
  // Show loading state
  showLoadingState(true);
  
  try {
    // Fetch dashboard statistics from backend API
    const response = await fetch(`${API_BASE}/api/dashboard/stats`, {
      method: 'GET',
      credentials: 'include', // Include session cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Dashboard stats received:', data);

    if (data.error) {
      throw new Error(data.message || data.error);
    }

    const stats = data.stats || {};

    // Update dashboard statistics
    updateDashboardStats(stats);

    // Update ongoing projects list
    updateProjectsList(stats.ongoing_projects || []);
    
    console.log('=== DASHBOARD DATA COMPLETE ===');
  } catch (error) {
    console.error('Error handling dashboard data:', error);
    
    // Fallback to localStorage if API fails (backward compatibility)
    console.log('Falling back to localStorage...');
    handleDashboardDataFallback();
  } finally {
    showLoadingState(false);
  }
}

function updateDashboardStats(stats) {
  // Update Pending Tasks count
  const pendingTasksElement = document.getElementById('pendingTasksCount');
  if (pendingTasksElement) {
    pendingTasksElement.textContent = stats.pending_tasks || 0;
    console.log('Pending tasks updated:', stats.pending_tasks || 0);
  }

  // Update Total Budget amount
  const totalBudgetElement = document.getElementById('totalBudgetAmount');
  if (totalBudgetElement) {
    const budgetAmount = stats.total_budget || 0;
    totalBudgetElement.textContent = budgetAmount.toFixed(2);
    console.log('Total budget updated:', budgetAmount.toFixed(2));
  }

  // Update Active Clients count
  const activeClientsElement = document.getElementById('activeClientsCount');
  if (activeClientsElement) {
    activeClientsElement.textContent = stats.active_clients || 0;
    console.log('Active clients updated:', stats.active_clients || 0);
  }

  // Update Upcoming Events count
  const upcomingEventsElement = document.getElementById('upcomingEventsCount');
  if (upcomingEventsElement) {
    upcomingEventsElement.textContent = stats.upcoming_events || 0;
    console.log('Upcoming events updated:', stats.upcoming_events || 0);
  }
}

function updateProjectsList(projects) {
  const projectsList = document.getElementById('projectsList');
  if (!projectsList) {
    return;
  }

  projectsList.innerHTML = '';

  if (projects.length === 0) {
    const noProjectsItem = document.createElement('li');
    noProjectsItem.textContent = 'No ongoing projects.';
    projectsList.appendChild(noProjectsItem);
    console.log('No projects message added');
  } else {
    projects.forEach((project) => {
      const projectItem = document.createElement('li');
      const projectLink = document.createElement('a');
      projectLink.href = `client_management.html?projectId=${encodeURIComponent(project.id)}`;
      projectLink.textContent = `${project.bride_name || 'Bride'} & ${project.groom_name || 'Groom'}`;
      projectItem.appendChild(projectLink);
      projectsList.appendChild(projectItem);
    });
    console.log('Projects list updated with', projects.length, 'projects');
  }
}

function showLoadingState(show) {
  // Optional: Add loading indicators
  const cards = document.querySelectorAll('.dashboard-card');
  cards.forEach(card => {
    if (show) {
      card.style.opacity = '0.6';
    } else {
      card.style.opacity = '1';
    }
  });
}

function handleDashboardDataFallback() {
  // Fallback to localStorage if backend API is not available
  console.log('Using localStorage fallback for dashboard data');
  
  try {
    // Load projects from localStorage
    const projects = JSON.parse(localStorage.getItem('weddingProjects')) || [];
    console.log('Projects loaded from localStorage:', projects.length);

    // Load tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    console.log('Tasks loaded from localStorage:', tasks.length);

    // Load budget items from localStorage
    const budgetItems = JSON.parse(localStorage.getItem('budget')) || [];
    console.log('Budget items loaded from localStorage:', budgetItems.length);

    // Calculate pending tasks count
    const pendingTasksCount = tasks.filter(task => task.status !== 'completed').length;

    // Calculate total budget amount
    const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + (item.actual || 0), 0);

    // Update dashboard stats with fallback data
    updateDashboardStats({
      pending_tasks: pendingTasksCount,
      total_budget: totalBudgetAmount,
      active_clients: 0,
      upcoming_events: 0
    });

    // Update projects list
    updateProjectsList(projects.map(p => ({
      id: p.id,
      bride_name: p.brideName || p.bride_name,
      groom_name: p.groomName || p.groom_name
    })));
  } catch (error) {
    console.error('Error in fallback data handling:', error);
  }
}