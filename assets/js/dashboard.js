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
  
  // Add admin dashboard link visibility
  const adminDashboardLink = document.querySelector('a.admin-dashboard-link');
  if (adminDashboardLink) {
    if (userRole === 'admin') {
      adminDashboardLink.style.display = 'inline';
    } else {
      adminDashboardLink.style.display = 'none';
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

  // Load projects from localStorage
  const projects = JSON.parse(localStorage.getItem('weddingProjects')) || [];

  // Load tasks from localStorage
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];

  // Load budget items from localStorage
  const budgetItems = JSON.parse(localStorage.getItem('budget')) || [];

  // Calculate pending tasks count
  const pendingTasksCount = tasks.filter(task => task.status !== 'completed').length;

  // Calculate total budget amount
  const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + (item.actual || 0), 0);

  // Render quick stats
  document.getElementById('pendingTasksCount').textContent = pendingTasksCount;
  document.getElementById('totalBudgetAmount').textContent = totalBudgetAmount.toFixed(2);

  // Render ongoing projects list
  const projectsList = document.getElementById('projectsList');
  projectsList.innerHTML = '';

  if (projects.length === 0) {
    const noProjectsItem = document.createElement('li');
    noProjectsItem.textContent = 'No ongoing projects.';
    projectsList.appendChild(noProjectsItem);
  } else {
    projects.forEach(project => {
      const projectItem = document.createElement('li');
      const projectLink = document.createElement('a');
      projectLink.href = `client_management.html?projectId=${encodeURIComponent(project.id)}`;
      projectLink.textContent = `${project.brideName || 'Bride'} & ${project.groomName || 'Groom'}`;
      projectItem.appendChild(projectLink);
      projectsList.appendChild(projectItem);
    });
  }
});
