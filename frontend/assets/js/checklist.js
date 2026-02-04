(() => {
  const API_BASE = 'http://localhost:5000';
  const LAST_PROJECT_KEY = 'checklist:lastProjectId';

  const state = {
    user: null,
    isAdmin: false,
    isCoordinator: false,
    projects: [],
    planners: [],
    tasks: [],
    summary: null,
    selectedProjectId: null,
    editingTaskId: null,
    isLoadingTasks: false,
  };

  const elements = {
    list: document.getElementById('taskList'),
    progressPercent: document.getElementById('progressPercent'),
    progressFill: document.getElementById('progressFill'),
    taskSummary: document.getElementById('taskSummary'),
    totalTasks: document.getElementById('totalTasks'),
    completedTasks: document.getElementById('completedTasks'),
    inProgressTasks: document.getElementById('inProgressTasks'),
    pendingTasks: document.getElementById('pendingTasks'),
    projectSelect: document.getElementById('projectSelect'),
    assigneeSelect: document.getElementById('assigneeSelect'),
    statusSelect: document.getElementById('statusSelect'),
    taskInput: document.getElementById('taskInput'),
    descriptionInput: document.getElementById('descriptionInput'),
    dueDateInput: document.getElementById('dueDateInput'),
    addTaskForm: document.getElementById('addTaskForm'),
    message: document.getElementById('taskMessage'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    loadingIndicator: document.getElementById('tasksLoading'),
  };

  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch((error) => {
      console.error('Checklist initialization failed:', error);
      showMessage('error', 'Failed to load checklist. Please refresh and try again.');
      disableForm();
    });
  });

  async function initialize() {
    bindEventListeners();
    clearMessage(); // Clear any initial error messages
    await ensureAuthenticated();
    await Promise.all([loadProjects(), loadPlanners()]);
    populateProjectOptions();
    populateAssigneeOptions();
    restoreLastProject();
    
    // Hide task creation form for coordinators (they can only edit existing tasks)
    if (state.isCoordinator && elements.addTaskForm) {
      const formContainer = elements.addTaskForm.closest('.checklist-form-container');
      if (formContainer) {
        formContainer.style.display = 'none'; // Hide the entire form container
      }
    }
    
    // Only load tasks if we have a valid project selected
    if (state.selectedProjectId) {
      // Double-check project exists before loading tasks
      const project = state.projects.find(p => p.id === state.selectedProjectId);
      if (project) {
        await loadTasks(state.selectedProjectId);
      } else {
        // Invalid project - clear it
        state.selectedProjectId = null;
        elements.projectSelect.value = '';
        localStorage.removeItem(LAST_PROJECT_KEY);
        renderTasks();
        updateProgress();
        updateSummary();
        clearMessage(); // Clear any error messages
      }
    } else {
      // No project selected - show empty state
      renderTasks();
      updateProgress();
      updateSummary();
      clearMessage(); // Clear any error messages
    }
  }

  function bindEventListeners() {
    elements.addTaskForm.addEventListener('submit', handleFormSubmit);
    elements.projectSelect.addEventListener('change', handleProjectChange);
    elements.cancelEditBtn.addEventListener('click', resetForm);
    elements.list.addEventListener('click', handleTaskActionClick);
    elements.list.addEventListener('change', handleTaskToggleChange);
  }

  async function ensureAuthenticated() {
    try {
      const response = await fetch(`${API_BASE}/auth/check-auth`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Authentication required');
      }
      const data = await response.json();
      state.user = data.user;
      state.isAdmin = data.user.role === 'admin';
      state.isCoordinator = data.user.role === 'coordinator';
    } catch (error) {
      showMessage('error', 'Please log in to use the checklist.');
      disableForm();
      throw error;
    }
  }

  function disableForm() {
    elements.addTaskForm.querySelectorAll('input, select, textarea, button').forEach((el) => {
      el.disabled = true;
    });
  }

  async function loadProjects() {
    const response = await fetch(`${API_BASE}/api/projects/`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to load projects');
    }
    const data = await response.json();
    state.projects = Array.isArray(data.projects) ? data.projects : [];
  }

  async function loadPlanners() {
    const response = await fetch(`${API_BASE}/api/projects/assignees`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to load planners');
    }
    const data = await response.json();
    state.planners = Array.isArray(data.planners) ? data.planners : [];
  }

  function populateProjectOptions() {
    elements.projectSelect.innerHTML = '<option value="">Select a project</option>';
    state.projects.forEach((project) => {
    const option = document.createElement('option');
      option.value = project.id;
      option.textContent = `${project.bride_name || 'Bride'} & ${project.groom_name || 'Groom'} (${project.wedding_date || 'Date TBD'})`;
      elements.projectSelect.appendChild(option);
  });
    elements.projectSelect.disabled = state.projects.length === 0;
    // Note: Coordinators can select projects to view their assigned tasks, but cannot edit projects
    // The dropdown is read-only for selection purposes only
    if (state.projects.length === 0) {
      showMessage('info', 'No projects available. Create a project first to start a checklist.');
    }
  }

  function populateAssigneeOptions() {
    elements.assigneeSelect.innerHTML = '<option value="">Unassigned</option>';

    if (state.isAdmin) {
      if (state.user) {
        const selfOption = document.createElement('option');
        selfOption.value = state.user.id;
        selfOption.textContent = state.user.name || state.user.username || state.user.email;
        elements.assigneeSelect.appendChild(selfOption);
      }
      // Admin can assign to planners and coordinators
      state.planners.forEach((planner) => {
        const option = document.createElement('option');
        option.value = planner.id;
        const roleLabel = planner.role === 'coordinator' ? ' (Coordinator)' : '';
        option.textContent = `${planner.name || planner.username || planner.email}${roleLabel}`;
        elements.assigneeSelect.appendChild(option);
      });
    } else if (state.isCoordinator) {
      // Coordinators can only assign to themselves
      const option = document.createElement('option');
      option.value = state.user.id;
      option.textContent = state.user.name || state.user.username || state.user.email;
      elements.assigneeSelect.innerHTML = '';
      elements.assigneeSelect.appendChild(option);
      elements.assigneeSelect.value = String(state.user.id);
      elements.assigneeSelect.disabled = true;
    } else {
      // Planners can assign to themselves or coordinators
      if (state.user) {
        const selfOption = document.createElement('option');
        selfOption.value = state.user.id;
        selfOption.textContent = `${state.user.name || state.user.username || state.user.email} (Me)`;
        elements.assigneeSelect.appendChild(selfOption);
      }
      // Add coordinators to the list
      state.planners
        .filter(p => p.role === 'coordinator')
        .forEach((coordinator) => {
    const option = document.createElement('option');
          option.value = coordinator.id;
          option.textContent = `${coordinator.name || coordinator.username || coordinator.email} (Coordinator)`;
          elements.assigneeSelect.appendChild(option);
  });
      // Default to self, but allow changing
      if (state.user) {
        elements.assigneeSelect.value = String(state.user.id);
      }
    }
  }

  function restoreLastProject() {
    const stored = localStorage.getItem(LAST_PROJECT_KEY);
    const matched = stored && state.projects.some((project) => String(project.id) === stored);

    if (matched) {
      state.selectedProjectId = parseInt(stored, 10);
      elements.projectSelect.value = stored;
    return;
  }

    if (state.projects.length > 0) {
      const firstProject = state.projects[0];
      state.selectedProjectId = firstProject.id;
      elements.projectSelect.value = String(firstProject.id);
      localStorage.setItem(LAST_PROJECT_KEY, String(firstProject.id));
}
  }

  async function handleProjectChange() {
    const value = elements.projectSelect.value;
    clearMessage(); // Clear any previous error messages when changing projects
    if (!value) {
      state.selectedProjectId = null;
      state.tasks = [];
      state.summary = null;
  renderTasks();
      updateProgress();
      updateSummary();
      localStorage.removeItem(LAST_PROJECT_KEY);
      return;
    }
    state.selectedProjectId = parseInt(value, 10);
    localStorage.setItem(LAST_PROJECT_KEY, value);
    await loadTasks(state.selectedProjectId);
  }

  async function loadTasks(projectId) {
    if (!projectId) {
      state.tasks = [];
      state.summary = null;
  renderTasks();
      updateProgress();
      updateSummary();
      return;
    }

    // Validate project exists and user has access
    const project = state.projects.find(p => p.id === projectId);
    if (!project) {
      // Project doesn't exist or user doesn't have access
      state.selectedProjectId = null;
      elements.projectSelect.value = '';
      state.tasks = [];
      state.summary = null;
      renderTasks();
      updateProgress();
      updateSummary();
      localStorage.removeItem(LAST_PROJECT_KEY);
      return;
    }

    try {
      state.isLoadingTasks = true;
      updateLoadingState();
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/tasks`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await safeJson(response);
        
        // Handle different error cases
        if (response.status === 403) {
          // Access denied - clear selection and don't show error
          state.selectedProjectId = null;
          elements.projectSelect.value = '';
          state.tasks = [];
          state.summary = null;
          renderTasks();
          updateProgress();
          updateSummary();
          localStorage.removeItem(LAST_PROJECT_KEY);
          clearMessage(); // Clear any error messages
          return;
        } else if (response.status === 404) {
          // Project not found - clear selection and don't show error
          state.selectedProjectId = null;
          elements.projectSelect.value = '';
          state.tasks = [];
          state.summary = null;
          renderTasks();
  updateProgress();
          updateSummary();
          localStorage.removeItem(LAST_PROJECT_KEY);
          clearMessage(); // Clear any error messages
    return;
  }

        // For other errors, show message but continue
        const errorMessage = data?.error || data?.message || `Failed to load tasks (HTTP ${response.status})`;
        console.warn('Failed to load tasks:', errorMessage);
        
        // Still set empty state so UI is usable
        state.tasks = [];
        state.summary = null;
        renderTasks();
        updateProgress();
        updateSummary();
        
        // Only show error if it's a server error (500+)
        if (response.status >= 500) {
          showMessage('error', 'Server error. Please try again later.');
  } else {
          clearMessage(); // Clear error for non-server errors
        }
        return;
  }

      const data = await response.json();
      state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      state.summary = data.summary || null;
  renderTasks();
      updateProgress();
      updateSummary();
      clearMessage(); // Clear any previous error messages
    } catch (error) {
      console.error('Error loading tasks:', error);
      
      // Network errors or other unexpected errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        // Network error - backend might not be running
        state.tasks = [];
        state.summary = null;
        renderTasks();
        updateProgress();
        updateSummary();
        // Only show error if backend is clearly not running
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          showMessage('error', 'Unable to connect to server. Please check if the backend is running.');
        } else {
          clearMessage(); // Clear error for other fetch issues
  }
      } else {
        // Other errors - don't show for expected failures
        state.tasks = [];
        state.summary = null;
  renderTasks();
        updateProgress();
        updateSummary();
        clearMessage(); // Clear error messages for unexpected but handled errors
      }
    } finally {
      state.isLoadingTasks = false;
      updateLoadingState();
    }
  }

  function updateLoadingState() {
    elements.loadingIndicator.style.display = state.isLoadingTasks ? 'block' : 'none';
  }

  function renderTasks() {
    elements.list.innerHTML = '';
    if (!state.selectedProjectId) {
      elements.list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">Select a project to view its checklist</div>
          <div class="empty-state-hint">Choose a project from the dropdown above to see tasks</div>
        </div>
      `;
      return;
    }
    if (!state.tasks.length) {
      elements.list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-text">No tasks yet</div>
          <div class="empty-state-hint">Add a task to get started with this project's checklist</div>
        </div>
      `;
    return;
  }
    state.tasks.forEach((task) => {
      const taskDiv = document.createElement('div');
      taskDiv.className = `task-item ${task.status === 'completed' ? 'completed' : ''}`;
      taskDiv.dataset.taskId = task.id;
      taskDiv.innerHTML = buildTaskItem(task);
      elements.list.appendChild(taskDiv);
    });
  }

  function buildTaskItem(task) {
    const isCompleted = task.status === 'completed';
    const canModify = userCanModifyTask(task);
    const canDelete = userCanDeleteTask(task);
    const dueText = formatDate(task.due_date);
    const assignedName = task.assigned_to_name || task.assigned_to_email || 'Unassigned';
    const statusLabel = formatStatus(task.status);
    const description = task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : '';

    return `
      <div class="task-checkbox">
        <input type="checkbox" data-action="toggle" ${isCompleted ? 'checked' : ''} ${canModify ? '' : 'disabled'}>
        <div class="task-content">
          <div class="task-title ${isCompleted ? 'completed' : ''}">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <div class="task-meta-item">
              <span class="status-badge ${task.status}">${statusLabel}</span>
            </div>
            <div class="task-meta-item">
              <span>👤</span>
              <span>${escapeHtml(assignedName)}</span>
            </div>
            ${dueText !== 'No due date' ? `
            <div class="task-meta-item">
              <span>📅</span>
              <span>${dueText}</span>
            </div>
            ` : ''}
          </div>
          ${description}
        </div>
      </div>
      <div class="task-actions">
        ${canModify ? `<button type="button" class="btn-edit" data-action="edit">Edit</button>` : ''}
        ${canDelete ? `<button type="button" class="btn-delete" data-action="delete">Delete</button>` : ''}
      </div>
    `;
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function userCanModifyTask(task) {
    if (state.isAdmin) return true;
    if (state.isCoordinator) {
      // Coordinators can only modify tasks assigned to them
      return state.user && task.assigned_to === state.user.id;
    }
    // Planners can modify tasks assigned to them or created by them
    return (
      state.user &&
      (task.assigned_to === state.user.id || task.created_by === state.user.id)
    );
  }
  
  function userCanDeleteTask(task) {
    // Coordinators cannot delete tasks
    if (state.isCoordinator) return false;
    if (state.isAdmin) return true;
    // Planners can only delete their own or assigned tasks
    return (
      state.user &&
      (task.assigned_to === state.user.id || task.created_by === state.user.id)
    );
}

  function updateProgress() {
    if (!state.summary) {
      elements.progressPercent.textContent = '0%';
      elements.progressFill.style.width = '0%';
      elements.progressFill.textContent = '0%';
      return;
    }
    
    const completionRate = state.summary.completion_rate || 0;
    elements.progressPercent.textContent = `${completionRate}%`;
    elements.progressFill.style.width = `${completionRate}%`;
    elements.progressFill.textContent = `${completionRate}%`;
  }

  function updateSummary() {
    if (!state.summary || !state.tasks.length) {
      elements.taskSummary.style.display = 'none';
      elements.taskSummary.textContent = '';
      elements.totalTasks.textContent = '0';
      elements.completedTasks.textContent = '0';
      elements.inProgressTasks.textContent = '0';
      elements.pendingTasks.textContent = '0';
      return;
    }

    const summary = state.summary;
    elements.taskSummary.style.display = 'block';
    elements.taskSummary.textContent = `${summary.total} task${summary.total === 1 ? '' : 's'} total`;
    
    // Update stats
    elements.totalTasks.textContent = summary.total || 0;
    elements.completedTasks.textContent = summary.completed || 0;
    elements.inProgressTasks.textContent = summary.in_progress || 0;
    elements.pendingTasks.textContent = summary.pending || 0;
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    clearMessage();

    // Coordinators cannot create new tasks, only update existing ones
    if (state.isCoordinator && !state.editingTaskId) {
      showMessage('error', 'Coordinators cannot create new tasks. Only admins and planners can create tasks.');
      return;
    }

    if (!state.selectedProjectId) {
      showMessage('error', 'Select a project before adding tasks.');
    return;
  }

    const payload = buildTaskPayloadFromForm();
    if (!payload) return;

    try {
      if (state.editingTaskId) {
        await updateTaskOnServer(state.selectedProjectId, state.editingTaskId, payload);
        showMessage('success', 'Task updated successfully.');
  } else {
        await createTaskOnServer(state.selectedProjectId, payload);
        showMessage('success', 'Task added successfully.');
      }
      await loadTasks(state.selectedProjectId);
      resetForm();
    } catch (error) {
      console.error(error);
      showMessage('error', error.message || 'Task save failed.');
    }
  }

  function buildTaskPayloadFromForm() {
    const title = elements.taskInput.value.trim();
    const status = elements.statusSelect.value;
    const description = elements.descriptionInput.value.trim();
    const dueDate = elements.dueDateInput.value;
    const assignedTo = elements.assigneeSelect.value;

    if (!title) {
      showMessage('error', 'Task title is required.');
      return null;
    }

    const payload = {
      title,
      status,
      description: description || null,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
    };

    // Only coordinators are forced to assign to themselves
    // Admins and planners can assign to others (planners can assign to coordinators)
    if (state.isCoordinator) {
      payload.assigned_to = state.user.id;
    }

    return payload;
  }

  async function createTaskOnServer(projectId, payload) {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/tasks`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await safeJson(response);
      throw new Error(data?.error || 'Failed to create task');
  }
  }

  async function updateTaskOnServer(projectId, taskId, payload) {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await safeJson(response);
      throw new Error(data?.error || 'Failed to update task');
    }
  }

  async function handleTaskActionClick(event) {
    const action = event.target.dataset.action;
    if (!action) return;

    const taskItem = event.target.closest('.task-item[data-task-id]');
    if (!taskItem) return;
    const taskId = parseInt(taskItem.dataset.taskId, 10);
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    switch (action) {
      case 'edit':
        populateFormForEdit(task);
        elements.addTaskForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      case 'delete':
        await confirmAndDeleteTask(task);
        break;
      default:
        break;
    }
  }

  async function handleTaskToggleChange(event) {
    if (event.target.dataset.action !== 'toggle') return;

    const taskItem = event.target.closest('.task-item[data-task-id]');
    if (!taskItem) return;
    const taskId = parseInt(taskItem.dataset.taskId, 10);
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || !userCanModifyTask(task)) return;

    const newStatus = event.target.checked ? 'completed' : 'pending';
    try {
      await updateTaskOnServer(state.selectedProjectId, taskId, { status: newStatus });
      await loadTasks(state.selectedProjectId);
      showMessage('success', `Task marked as ${newStatus === 'completed' ? 'completed' : 'pending'}.`);
    } catch (error) {
      console.error(error);
      showMessage('error', 'Unable to update task status.');
      event.target.checked = task.status === 'completed';
    }
  }

  function populateFormForEdit(task) {
    // Show form container for coordinators when editing (it's hidden by default)
    if (state.isCoordinator && elements.addTaskForm) {
      const formContainer = elements.addTaskForm.closest('.checklist-form-container');
      if (formContainer) {
        formContainer.style.display = 'block'; // Show the form container
      }
    }
    
    state.editingTaskId = task.id;
    elements.taskInput.value = task.title;
    elements.statusSelect.value = task.status;
    elements.descriptionInput.value = task.description || '';
    elements.dueDateInput.value = task.due_date ? task.due_date.split('T')[0] : '';
    elements.assigneeSelect.value = task.assigned_to ? String(task.assigned_to) : '';
    
    // Disable project dropdown when editing (task is already associated with a project)
    if (elements.projectSelect) {
      elements.projectSelect.disabled = true;
    }
    
    // Only coordinators are forced to assign to themselves
    // Admins and planners can assign to others (planners can assign to coordinators)
    if (state.isCoordinator) {
      elements.assigneeSelect.value = String(state.user.id);
      // Disable title and assignee fields for coordinators (they can only edit status, description, due_date)
      if (elements.taskInput) elements.taskInput.disabled = true;
      if (elements.assigneeSelect) elements.assigneeSelect.disabled = true;
    } else {
      // Re-enable fields for non-coordinators
      if (elements.taskInput) elements.taskInput.disabled = false;
      if (elements.assigneeSelect) elements.assigneeSelect.disabled = false;
    }
    elements.cancelEditBtn.style.display = 'inline-block';
    const submitBtn = elements.addTaskForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Update Task';
    }
  }

  async function confirmAndDeleteTask(task) {
    // Coordinators cannot delete tasks
    if (state.isCoordinator) {
      showMessage('error', 'Coordinators cannot delete tasks.');
      return;
    }
    
    const confirmed = window.confirm('Delete this task? This cannot be undone.');
    if (!confirmed) return;
    try {
      const response = await fetch(`${API_BASE}/api/projects/${state.selectedProjectId}/tasks/${task.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await safeJson(response);
        throw new Error(data?.error || 'Failed to delete task');
      }
      showMessage('success', 'Task deleted.');
      await loadTasks(state.selectedProjectId);
    } catch (error) {
      console.error(error);
      showMessage('error', error.message || 'Unable to delete task.');
    }
  }

  function resetForm() {
    state.editingTaskId = null;
    elements.addTaskForm.reset();
    if (state.isAdmin) {
      elements.assigneeSelect.value = '';
    } else {
      elements.assigneeSelect.value = String(state.user.id);
    }
    
    // Re-enable all fields
    if (elements.taskInput) elements.taskInput.disabled = false;
    if (elements.assigneeSelect) elements.assigneeSelect.disabled = false;
    // Re-enable project dropdown (disabled during edit)
    if (elements.projectSelect) {
      elements.projectSelect.disabled = state.projects.length === 0;
    }
    
    // Hide form container for coordinators after cancel/save (they can only edit, not create)
    if (state.isCoordinator && elements.addTaskForm) {
      const formContainer = elements.addTaskForm.closest('.checklist-form-container');
      if (formContainer) {
        formContainer.style.display = 'none';
      }
    }
    
    elements.cancelEditBtn.style.display = 'none';
    const submitBtn = elements.addTaskForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Add Task';
    }
  }

  function showMessage(type, text) {
    if (!elements.message) return;
    // Remove all previous message classes
    elements.message.classList.remove('success', 'error', 'info', 'show');
    elements.message.textContent = text;
    elements.message.className = `message ${type} show`;
    setTimeout(() => {
      if (elements.message) {
        elements.message.classList.remove('show');
        // Clear text after animation
        setTimeout(() => {
          if (elements.message) {
            elements.message.textContent = '';
  }
        }, 300);
      }
    }, 5000);
  }

  function clearMessage() {
    if (!elements.message) return;
    elements.message.classList.remove('show', 'success', 'error', 'info');
    // Clear text immediately since we're removing the show class
    elements.message.textContent = '';
  }

  async function safeJson(response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function formatStatus(status) {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  function formatDate(value) {
    if (!value) return 'No due date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString();
  }
})();
