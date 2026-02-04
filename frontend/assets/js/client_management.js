document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:5000';
  const STATUS_OPTIONS = [
    { value: 'planning', label: 'Planning' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  // Removed hardcoded fallback - wedding types should only come from database
  // const FALLBACK_WEDDING_TYPES = []; // No longer needed - always use database

  const state = {
    projects: [],
    planners: [],
    weddingTypes: [],
    editingProjectId: null,
    selectedRowId: null,
    user: null,
    isAdmin: false,
    isCoordinator: false,
    isAuthenticated: false
  };

  const elements = {
    tableBody: document.getElementById('clientTableBody'),
    table: document.getElementById('clientTable'),
    emptyState: document.getElementById('projectsEmptyState'),
    projectsCount: document.getElementById('projectsCount'),
    form: document.getElementById('clientForm'),
    formTitle: document.getElementById('formTitle'),
    formModeBadge: document.getElementById('formModeBadge'),
    formMessage: document.getElementById('formMessage'),
    assignedBadge: document.getElementById('assignedDisplayBadge'),
    newProjectBtn: document.getElementById('newProjectBtn'),
    cancelBtn: document.getElementById('cancelEditBtn'),
    deleteBtn: document.getElementById('deleteProjectBtn'),
    saveBtn: document.getElementById('saveProjectBtn'),
    roleBadge: document.getElementById('roleBadge'),
    brideName: document.getElementById('brideName'),
    groomName: document.getElementById('groomName'),
    contactNumber: document.getElementById('contactNumber'),
    contactEmail: document.getElementById('contactEmail'),
    weddingDate: document.getElementById('projectWeddingDate'),
    weddingType: document.getElementById('projectWeddingType'),
    status: document.getElementById('projectStatus'),
    assignee: document.getElementById('projectAssignee'),
    notes: document.getElementById('projectNotes')
  };

  init().catch(error => {
    console.error('Client management init error:', error);
    showFormMessage('error', 'Failed to initialise client management. Please refresh and try again.');
  });

  async function init() {
    setupEventListeners();
    await ensureAuthentication();
    if (!state.isAuthenticated) {
      return;
    }

    configureRoleBadges();
    await loadWeddingTypes();
    if (state.isAdmin) {
      await loadPlanners();
      populateAssigneeOptions();
    } else {
      populatePlannerAssignee();
    }

    // Hide "New Project" button for coordinators (they can't create projects)
    if (state.isCoordinator && elements.newProjectBtn) {
      elements.newProjectBtn.style.display = 'none';
    }

    populateWeddingTypeOptions();
    await loadProjects();
    renderProjects();
    resetForm();
  }

  function setupEventListeners() {
    elements.form.addEventListener('submit', handleFormSubmission);
    elements.tableBody.addEventListener('click', handleTableClick);
    elements.newProjectBtn.addEventListener('click', () => {
      resetForm();
      elements.form.scrollIntoView({ behavior: 'smooth' });
    });
    elements.cancelBtn.addEventListener('click', resetForm);
    elements.deleteBtn.addEventListener('click', handleDeleteClick);
  }

  async function ensureAuthentication() {
    try {
      const response = await fetch(`${API_BASE}/auth/check-auth`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Authentication required');
      }

      const data = await response.json();
      if (!data.user) {
        throw new Error('Authentication required');
      }

      state.user = data.user;
      state.isAdmin = data.user.role === 'admin';
      state.isCoordinator = data.user.role === 'coordinator';
      state.isAuthenticated = true;

      // Keep local storage aligned for navigation scripts
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userName', data.user.name || data.user.username || '');
      localStorage.setItem('userEmail', data.user.email || '');
      localStorage.setItem('isLoggedIn', 'true');
    } catch (error) {
      console.warn('Authentication check failed:', error);
      state.isAuthenticated = false;
      disableClientManagement('Please log in to manage wedding projects.');
    }
  }

  function configureRoleBadges() {
    if (!state.isAuthenticated) {
      return;
    }

    if (state.isAdmin) {
      elements.roleBadge.textContent = 'Admin View';
      elements.formModeBadge.textContent = 'Admin Mode';
      elements.newProjectBtn.style.display = 'inline-flex';
    } else {
      elements.roleBadge.textContent = 'Planner View';
      elements.formModeBadge.textContent = 'Planner Mode';
      elements.newProjectBtn.style.display = 'none';
    }
  }

  async function loadWeddingTypes() {
    try {
      const response = await fetch(`${API_BASE}/api/wedding/wedding-types`);
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const data = await response.json();
      state.weddingTypes = Array.isArray(data.wedding_types)
        ? data.wedding_types.map(item => item.name)
        : [];
      // Removed fallback to hardcoded list - always use database only
      // If no wedding types found, keep empty array and show appropriate message
    } catch (error) {
      console.warn('Failed to load wedding types from database.', error);
      state.weddingTypes = []; // No fallback - must load from database
      // Show error message to user
      showFormMessage('error', 'Failed to load wedding types from database. Please refresh the page.');
    }
  }

  async function loadPlanners() {
    try {
      const response = await fetch(`${API_BASE}/api/projects/assignees`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const data = await response.json();
      state.planners = Array.isArray(data.planners) ? data.planners : [];
    } catch (error) {
      console.error('Failed to load planners:', error);
      state.planners = [];
      showFormMessage('error', 'Unable to load planner list. You can still assign later.');
    }
  }

  async function loadProjects() {
    try {
      const response = await fetch(`${API_BASE}/api/projects/`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          disableClientManagement('Session expired. Please log in again.');
          state.isAuthenticated = false;
          return;
        }
        throw new Error(`HTTP status ${response.status}`);
      }

      const data = await response.json();
      state.projects = Array.isArray(data.projects) ? data.projects : [];
    } catch (error) {
      console.error('Failed to load projects:', error);
      showFormMessage('error', 'Unable to load projects. Please check your connection or try again later.');
      state.projects = [];
    }
  }

  function renderProjects() {
    elements.tableBody.innerHTML = '';

    if (!state.projects.length) {
      elements.emptyState.hidden = false;
      updateProjectsCount();
      return;
    }

    elements.emptyState.hidden = true;

    state.projects.forEach(project => {
      const tr = document.createElement('tr');
      tr.dataset.projectId = project.id;

      const statusClass = `status-${(project.status || 'planning').toLowerCase()}`;
      const statusLabel = formatStatus(project.status);
      const dateText = formatDate(project.wedding_date);
      const weddingType = project.wedding_type || 'Not specified';
      const assignedName = project.assigned_to_name || project.assigned_to_email || 'Unassigned';

      tr.innerHTML = `
        <td>
          <div class="cell-primary">${project.bride_name || '—'}</div>
          <div class="cell-secondary">with ${project.groom_name || '—'}</div>
          ${project.notes ? `<div class="cell-tertiary">${truncate(project.notes, 70)}</div>` : ''}
        </td>
        <td>
          <div class="cell-primary">${weddingType}</div>
          <div class="cell-secondary">${dateText}</div>
        </td>
        <td>
          <div class="cell-primary">${project.contact_number || '—'}</div>
          <div class="cell-secondary">${project.contact_email || '—'}</div>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </td>
        <td>
          ${renderAssigneeChip(assignedName, project.assigned_to_name, project.assigned_to_email)}
        </td>
        <td class="actions-col">
          <button class="table-btn primary" data-action="edit" data-id="${project.id}">
            ${state.isAdmin || (!state.isCoordinator && (Number(project.assigned_to) === Number(state.user?.id) || Number(project.created_by) === Number(state.user?.id))) ? 'Edit' : 'View'}
          </button>
          ${state.isAdmin ? `<button class="table-btn danger" data-action="delete" data-id="${project.id}">Delete</button>` : ''}
        </td>
      `;

      elements.tableBody.appendChild(tr);
    });

    updateProjectsCount();
    highlightSelectedRow();
  }

  function updateProjectsCount() {
    const count = state.projects.length;
    elements.projectsCount.textContent = `${count} project${count === 1 ? '' : 's'}`;
  }

  function handleTableClick(event) {
    const action = event.target.dataset.action;
    if (!action) {
      return;
    }

    const projectId = Number(event.target.dataset.id);
    const project = state.projects.find(p => Number(p.id) === projectId);

    if (!project) {
      showFormMessage('error', 'Selected project could not be found. Please refresh.');
      return;
    }

    if (action === 'edit') {
      openProject(project);
    } else if (action === 'delete' && state.isAdmin) {
      confirmDelete(project);
    }
  }

  function openProject(project) {
    state.editingProjectId = project.id;
    state.selectedRowId = project.id;
    highlightSelectedRow();

    // Coordinators can only view, not edit
    if (state.isCoordinator) {
      elements.formTitle.textContent = `Viewing ${project.bride_name || 'Project'}`;
    } else {
      elements.formTitle.textContent = `Editing ${project.bride_name || 'Project'}`;
    }
    elements.saveBtn.textContent = state.isAdmin ? 'Save Changes' : 'Save Notes';
    elements.deleteBtn.hidden = !state.isAdmin;

    elements.brideName.value = project.bride_name || '';
    elements.groomName.value = project.groom_name || '';
    elements.contactNumber.value = project.contact_number || '';
    elements.contactEmail.value = project.contact_email || '';
    elements.weddingDate.value = project.wedding_date ? project.wedding_date.slice(0, 10) : '';
    elements.weddingType.value = normalizeWeddingType(project.wedding_type);
    elements.status.value = (project.status || 'planning').toLowerCase();
    elements.notes.value = project.notes || '';

    if (state.isAdmin) {
      elements.assignee.value = project.assigned_to ? String(project.assigned_to) : '';
    } else {
      populatePlannerAssignee(project);
    }

    updateAssignedBadge(project);
    applyFieldAccessRules(project);
    clearFormMessage();
  }

  function resetForm() {
    state.editingProjectId = null;
    state.selectedRowId = null;
    elements.form.reset();
    elements.weddingType.value = '';
    elements.status.value = 'planning';
    elements.notes.value = '';
    elements.assignee.value = '';
    elements.deleteBtn.hidden = true;
    elements.saveBtn.textContent = state.isAdmin ? 'Create Project' : 'Save Notes';
    elements.formTitle.textContent = state.isAdmin ? 'Create New Project' : 'Select a Project to View';
    elements.assignedBadge.hidden = true;
    clearFormMessage();
    highlightSelectedRow();
    applyFieldAccessRules();
  }

  function applyFieldAccessRules(project = null) {
    // Coordinators cannot edit projects at all (read-only access)
    if (state.isCoordinator) {
      toggleAdminFields(false);
      elements.status.disabled = true;
      elements.notes.disabled = true;
      elements.saveBtn.disabled = true;
      return;
    }

    if (state.isAdmin) {
      toggleAdminFields(true);
      elements.saveBtn.disabled = false;
      return;
    }

    toggleAdminFields(false);

    const userId = state.user ? Number(state.user.id) : null;
    const isOwnProject = Boolean(project) && (
      Number(project.assigned_to) === userId ||
      Number(project.created_by) === userId
    );

    elements.status.disabled = !isOwnProject;
    elements.notes.disabled = !isOwnProject;
    elements.saveBtn.disabled = !isOwnProject;

    if (!project) {
      elements.saveBtn.disabled = true;
    }
  }

  function toggleAdminFields(enabled) {
    [
      elements.brideName,
      elements.groomName,
      elements.contactNumber,
      elements.contactEmail,
      elements.weddingDate,
      elements.weddingType,
      elements.assignee
    ].forEach(input => {
      if (enabled) {
        input.removeAttribute('disabled');
      } else {
        input.setAttribute('disabled', 'disabled');
      }
    });
  }

  function handleDeleteClick() {
    if (!state.isAdmin || !state.editingProjectId) {
      return;
    }

    const project = state.projects.find(p => Number(p.id) === Number(state.editingProjectId));
    if (!project) {
      showFormMessage('error', 'Project not found. Please refresh.');
      return;
    }

    confirmDelete(project);
  }

  function confirmDelete(project) {
    const confirmed = window.confirm(`Delete the project for ${project.bride_name || 'this couple'}?`);
    if (!confirmed) {
      return;
    }
    deleteProject(project.id).catch(error => {
      console.error('Delete failed:', error);
      showFormMessage('error', error.message || 'Failed to delete project.');
    });
  }

  async function deleteProject(projectId) {
    try {
      elements.saveBtn.disabled = true;
      elements.deleteBtn.disabled = true;

      const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await safeJson(response);
        throw new Error(errorData?.error || `Delete failed with status ${response.status}`);
      }

      showFormMessage('success', 'Project deleted successfully.');
      await loadProjects();
      renderProjects();
      resetForm();
    } catch (error) {
      throw error;
    } finally {
      elements.saveBtn.disabled = false;
      elements.deleteBtn.disabled = false;
    }
  }

  async function handleFormSubmission(event) {
    event.preventDefault();
    clearFormMessage();

    if (!state.isAuthenticated) {
      showFormMessage('error', 'You must be logged in to save changes.');
      return;
    }

    // Coordinators cannot submit project updates
    if (state.isCoordinator) {
      showFormMessage('error', 'Coordinators cannot edit projects. You have read-only access.');
      return;
    }

    try {
      let saveResult = false;
      if (state.isAdmin) {
        saveResult = await handleAdminSubmission();
      } else {
        saveResult = await handlePlannerSubmission();
      }
      if (!saveResult) {
        return;
      }

      await loadProjects();
      renderProjects();
      if (state.isAdmin) {
        resetForm();
      }
    } catch (error) {
      console.error('Save failed:', error);
      showFormMessage('error', error.message || 'Unable to save project.');
    }
  }

  async function handleAdminSubmission() {
    const validationError = validateAdminForm();
    if (validationError) {
      showFormMessage('error', validationError);
      return false;
    }

    const payload = {
      bride_name: elements.brideName.value.trim(),
      groom_name: elements.groomName.value.trim(),
      contact_number: elements.contactNumber.value.trim(),
      contact_email: elements.contactEmail.value.trim().toLowerCase(),
      wedding_date: elements.weddingDate.value,
      wedding_type: elements.weddingType.value.trim(),
      status: elements.status.value,
      notes: elements.notes.value.trim(),
      assigned_to: elements.assignee.value || null
    };

    if (state.editingProjectId) {
      await submitProjectUpdate(state.editingProjectId, payload, 'Project updated successfully.');
    } else {
      await submitProjectCreate(payload);
    }
    return true;
  }

  async function handlePlannerSubmission() {
    if (!state.editingProjectId) {
      showFormMessage('error', 'Select a project to update notes or status.');
      return false;
    }

    const project = state.projects.find(p => Number(p.id) === Number(state.editingProjectId));
    if (!project) {
      showFormMessage('error', 'Project not found. Refresh and try again.');
      return false;
    }

    const userId = Number(state.user.id);
    const canEdit = Number(project.assigned_to) === userId || Number(project.created_by) === userId;
    if (!canEdit) {
      showFormMessage('error', 'You can only update projects assigned to you.');
      return false;
    }

    const payload = {
      status: elements.status.value,
      notes: elements.notes.value.trim()
    };

    await submitProjectUpdate(state.editingProjectId, payload, 'Updates saved.');
    return true;
  }

  async function submitProjectCreate(payload) {
    elements.saveBtn.disabled = true;
    const response = await fetch(`${API_BASE}/api/projects/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    elements.saveBtn.disabled = false;

    if (!response.ok) {
      const errorData = await safeJson(response);
      throw new Error(errorData?.error || `Create failed with status ${response.status}`);
    }

    showFormMessage('success', 'Project created successfully.');
  }

  async function submitProjectUpdate(projectId, payload, successMessage) {
    elements.saveBtn.disabled = true;
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    elements.saveBtn.disabled = false;

    if (!response.ok) {
      const errorData = await safeJson(response);
      throw new Error(errorData?.error || `Update failed with status ${response.status}`);
    }

    showFormMessage('success', successMessage);
  }

  function validateAdminForm() {
    const requiredFields = [
      { element: elements.brideName, label: "Bride's name" },
      { element: elements.groomName, label: "Groom's name" },
      { element: elements.contactNumber, label: 'Contact number' },
      { element: elements.contactEmail, label: 'Contact email' },
      { element: elements.weddingDate, label: 'Wedding date' },
      { element: elements.weddingType, label: 'Wedding type' }
    ];

    for (const field of requiredFields) {
      if (!field.element.value.trim()) {
        return `Please provide ${field.label}.`;
      }
    }

    if (!/^[0-9]{10}$/.test(elements.contactNumber.value.trim())) {
      return 'Contact number should be a 10-digit number.';
    }

    return null;
  }

  function populateWeddingTypeOptions() {
    const currentValue = elements.weddingType.value;
    elements.weddingType.innerHTML = '<option value="">Select type...</option>';
    state.weddingTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      elements.weddingType.appendChild(option);
    });
    if (currentValue) {
      elements.weddingType.value = normalizeWeddingType(currentValue);
    }
  }

  function populateAssigneeOptions() {
    const currentValue = elements.assignee.value;
    elements.assignee.innerHTML = '<option value="">Unassigned</option>';

    state.planners.forEach(planner => {
      const option = document.createElement('option');
      option.value = planner.id;
      option.textContent = planner.name || planner.username || planner.email;
      elements.assignee.appendChild(option);
    });

    if (currentValue) {
      elements.assignee.value = currentValue;
    }
  }

  function populatePlannerAssignee(project = null) {
    elements.assignee.innerHTML = '';
    const option = document.createElement('option');
    option.value = state.user ? String(state.user.id) : '';
    option.textContent = state.user?.name || state.user?.username || state.user?.email || 'Current planner';
    elements.assignee.appendChild(option);
    elements.assignee.value = option.value;

    if (project && project.assigned_to && Number(project.assigned_to) !== Number(option.value)) {
      const otherOption = document.createElement('option');
      otherOption.value = project.assigned_to;
      otherOption.textContent = project.assigned_to_name || project.assigned_to_email || 'Assigned planner';
      elements.assignee.appendChild(otherOption);
      elements.assignee.value = otherOption.value;
    }
  }

  function updateAssignedBadge(project) {
    const assignedName = project?.assigned_to_name || project?.assigned_to_email;
    if (assignedName) {
      elements.assignedBadge.textContent = `Assigned to: ${assignedName}`;
      elements.assignedBadge.hidden = false;
    } else {
      elements.assignedBadge.hidden = true;
    }
  }

  function highlightSelectedRow() {
    const rows = elements.tableBody.querySelectorAll('tr');
    rows.forEach(row => {
      if (Number(row.dataset.projectId) === Number(state.selectedRowId)) {
        row.classList.add('active-row');
      } else {
        row.classList.remove('active-row');
      }
    });
  }

  function disableClientManagement(message) {
    elements.formMessage.hidden = false;
    elements.formMessage.textContent = message;
    elements.formMessage.className = 'form-message error';
    elements.form.querySelectorAll('input, select, textarea, button').forEach(el => {
      el.disabled = true;
    });
    elements.newProjectBtn.disabled = true;
  }

  function renderAssigneeChip(displayName, extractedName, email) {
    const name = extractedName || displayName || 'Unassigned';
    const initials = getInitials(name);
    const detail = email ? `<span>${email}</span>` : '';
    return `
      <span class="assignee-chip">
        <span class="initials">${initials}</span>
        <span>${name}</span>
        ${detail}
      </span>
    `;
  }

  function formatStatus(status) {
    const match = STATUS_OPTIONS.find(option => option.value === (status || '').toLowerCase());
    return match ? match.label : 'Planning';
  }

  function formatDate(dateString) {
    if (!dateString) {
      return 'Date pending';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  function normalizeWeddingType(type) {
    if (!type) return '';
    const match = state.weddingTypes.find(
      existing => existing.toLowerCase() === type.toLowerCase()
    );
    return match || type;
  }

  function getInitials(name) {
    if (!name) return 'NA';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function clearFormMessage() {
    elements.formMessage.hidden = true;
    elements.formMessage.textContent = '';
    elements.formMessage.className = 'form-message';
  }

  function showFormMessage(type, message) {
    elements.formMessage.hidden = false;
    elements.formMessage.textContent = message;
    elements.formMessage.className = `form-message ${type}`;
  }

  async function safeJson(response) {
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }
});
