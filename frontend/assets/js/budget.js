// Budget Management for Wedding Planning System
(() => {
  const API_BASE = 'http://localhost:5000';
  const LAST_PROJECT_KEY = 'budget:lastProject';

  const projectSelect = document.getElementById('projectSelect');
  const addBudgetBtn = document.getElementById('addBudgetBtn');
  const emptyAddBtn = document.getElementById('emptyAddBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');

  const budgetTableSection = document.getElementById('budgetTableSection');
  const budgetEmptyState = document.getElementById('budgetEmptyState');
  const budgetTbody = document.getElementById('budgetTbody');

  const summaryBar = document.getElementById('budgetSummary');
  const summaryPlanned = document.getElementById('summaryPlanned');
  const summaryActual = document.getElementById('summaryActual');
  const summaryVariance = document.getElementById('summaryVariance');

  const successAlert = document.getElementById('budgetSuccess');
  const errorAlert = document.getElementById('budgetError');

  const budgetModal = document.getElementById('budgetFormModal');
  const modalOverlay = budgetModal.querySelector('.budget-modal__overlay');
  const modalCloseBtn = document.getElementById('budgetModalClose');
  const modalCancelBtn = document.getElementById('budgetModalCancel');
  const budgetForm = document.getElementById('budgetForm');
  const budgetFormTitle = document.getElementById('budgetFormTitle');

  const budgetItemIdInput = document.getElementById('budgetItemId');
  const categoryInput = document.getElementById('budgetCategory');
  const plannedInput = document.getElementById('budgetPlanned');
  const actualInput = document.getElementById('budgetActual');
  const dateInput = document.getElementById('budgetDate');
  const vendorInput = document.getElementById('budgetVendor');
  const notesInput = document.getElementById('budgetNotes');

  const state = {
    budgets: [],
    projects: [],
    totals: { planned: 0, actual: 0, variance: 0 },
    currentProjectId: null,
    user: null,
    isAdmin: false,
    isCoordinator: false,
    isLoading: false
  };

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
      
      // Hide form buttons for coordinators (read-only access)
      if (state.isCoordinator) {
        if (addBudgetBtn) addBudgetBtn.style.display = 'none';
        if (emptyAddBtn) emptyAddBtn.style.display = 'none';
      } else {
        if (addBudgetBtn) addBudgetBtn.style.display = '';
        if (emptyAddBtn) emptyAddBtn.style.display = '';
      }
    } catch (error) {
      showError('Please log in to use the budget manager.');
      disableBudgetManager();
      throw error;
    }
  }

  function disableBudgetManager() {
    projectSelect.disabled = true;
    if (addBudgetBtn) addBudgetBtn.disabled = true;
    if (emptyAddBtn) emptyAddBtn.disabled = true;
    budgetTableSection.hidden = true;
    budgetEmptyState.hidden = true;
    summaryBar.hidden = true;
  }

  function getProjectLabel(project) {
    const bride = project?.bride_name || 'Unknown Bride';
    const groom = project?.groom_name || 'Unknown Groom';
    const weddingDate = project?.wedding_date || 'No date';
    return `${bride} & ${groom} (${weddingDate})`;
  }

  function populateProjects() {
    projectSelect.innerHTML = '<option value="">Select a project</option>';

    state.projects.forEach((project) => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = getProjectLabel(project);
      projectSelect.appendChild(option);
    });

    const lastProject = localStorage.getItem(LAST_PROJECT_KEY);
    if (lastProject && [...projectSelect.options].some(opt => opt.value === lastProject)) {
      projectSelect.value = lastProject;
      state.currentProjectId = parseInt(lastProject, 10);
    } else if (state.projects.length > 0) {
      projectSelect.value = String(state.projects[0].id);
      state.currentProjectId = state.projects[0].id;
    } else {
      projectSelect.value = '';
      state.currentProjectId = null;
    }

    projectSelect.disabled = state.projects.length === 0;
  }

  async function fetchProjects() {
    try {
      const response = await fetch(`${API_BASE}/api/projects/`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        state.projects = [];
        populateProjects();
        renderBudgets();
        showError('Please log in to view projects.');
        return;
      }

      if (!response.ok) {
        let errorMessage = 'Failed to load projects.';
        try {
          const errorPayload = await response.json();
          if (errorPayload?.error) {
            errorMessage = errorPayload.error;
          } else if (errorPayload?.message) {
            errorMessage = errorPayload.message;
          }
        } catch (_) {
          // ignore parsing errors
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      state.projects = Array.isArray(data.projects) ? data.projects : [];
      populateProjects();
      
      // Load budget items if project is selected
      if (state.currentProjectId) {
        await loadBudgets(state.currentProjectId);
      } else {
        renderBudgets();
      }
    } catch (error) {
      console.error('Error fetching projects for budget manager:', error);
      showError(error.message || 'Failed to load projects. Please try again.');
      state.projects = [];
      populateProjects();
      renderBudgets();
    }
  }

  async function loadBudgets(projectId) {
    if (!projectId) {
      state.budgets = [];
      state.totals = { planned: 0, actual: 0, variance: 0 };
      renderBudgets();
      return;
    }

    try {
      state.isLoading = true;
      showLoadingState();

      const response = await fetch(`${API_BASE}/api/budget/projects/${projectId}/items`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await safeJson(response);
        
        if (response.status === 403) {
          // Access denied - clear selection
          state.currentProjectId = null;
          projectSelect.value = '';
          state.budgets = [];
          state.totals = { planned: 0, actual: 0, variance: 0 };
          renderBudgets();
          showError('Access denied to this project.');
          return;
        } else if (response.status === 404) {
          // Project not found - clear selection
          state.currentProjectId = null;
          projectSelect.value = '';
          state.budgets = [];
          state.totals = { planned: 0, actual: 0, variance: 0 };
          renderBudgets();
          showError('Project not found.');
          return;
        }
        
        const errorMessage = data?.error || data?.message || `Failed to load budget items (HTTP ${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      state.budgets = Array.isArray(data.items) ? data.items : [];
      state.totals = data.totals || { planned: 0, actual: 0, variance: 0 };
      
      renderBudgets();
    } catch (error) {
      console.error('Error loading budget items:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showError('Unable to connect to server. Please check if the backend is running.');
      } else {
        showError(error.message || 'Failed to load budget items.');
      }
      
      state.budgets = [];
      state.totals = { planned: 0, actual: 0, variance: 0 };
      renderBudgets();
    } finally {
      state.isLoading = false;
      hideLoadingState();
    }
  }

  function showLoadingState() {
    if (budgetTableSection) {
      budgetTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Loading budget items...</td></tr>';
      budgetTableSection.hidden = false;
    }
  }

  function hideLoadingState() {
    // Loading state will be cleared by renderBudgets()
  }

  function formatCurrency(value) {
    const numberValue = Number(value) || 0;
    return `Rs. ${numberValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toLocaleDateString();
    } catch {
      return value;
    }
  }

  function renderBudgets() {
    if (!state.currentProjectId) {
      budgetTableSection.hidden = true;
      budgetEmptyState.hidden = true;
      summaryBar.hidden = true;
      return;
    }

    if (state.budgets.length === 0) {
      budgetTableSection.hidden = true;
      budgetEmptyState.hidden = false;
      summaryBar.hidden = true;
      return;
    }

    budgetTableSection.hidden = false;
    budgetEmptyState.hidden = true;
    summaryBar.hidden = false;

    const rows = state.budgets.map(item => {
      const planned = item.planned_amount || 0;
      const actual = item.actual_amount || 0;
      const variance = planned - actual;

      // Check if user can edit/delete this item
      const canEdit = !state.isCoordinator; // Coordinators read-only
      const canDelete = !state.isCoordinator; // Coordinators read-only

      return `
        <tr data-id="${item.id}">
          <td>
            <div class="budget-category">
              <strong>${escapeHtml(item.category || '')}</strong>
              ${item.vendor ? `<div class="budget-vendor">${escapeHtml(item.vendor)}</div>` : ''}
              ${item.notes ? `<div class="budget-notes">${escapeHtml(item.notes)}</div>` : ''}
            </div>
          </td>
          <td>${formatCurrency(planned)}</td>
          <td>${formatCurrency(actual)}</td>
          <td>${formatCurrency(variance)}</td>
          <td>${formatDate(item.expense_date || item.updated_at)}</td>
          <td>
            <div class="budget-table__actions">
              ${canEdit ? `<button type="button" class="edit" data-action="edit">Edit</button>` : ''}
              ${canDelete ? `<button type="button" class="delete" data-action="delete">Delete</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    budgetTbody.innerHTML = rows.join('');

    // Update summary from backend totals
    summaryPlanned.textContent = formatCurrency(state.totals.planned || 0);
    summaryActual.textContent = formatCurrency(state.totals.actual || 0);
    summaryVariance.textContent = formatCurrency(state.totals.variance || 0);
  }

  function escapeHtml(value) {
    if (value == null) return '';
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function showAlert(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
    element.style.opacity = '1';
    setTimeout(() => {
      element.style.opacity = '0';
      setTimeout(() => {
        element.hidden = true;
      }, 250);
    }, 4000);
  }

  function showSuccess(message) {
    showAlert(successAlert, message);
  }

  function showError(message) {
    showAlert(errorAlert, message);
  }

  async function safeJson(response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function openModal(title, item = null) {
    budgetForm.reset();
    budgetFormTitle.textContent = title;
    budgetItemIdInput.value = item?.id || '';

    if (item) {
      categoryInput.value = item.category || '';
      plannedInput.value = item.planned_amount ?? '';
      actualInput.value = item.actual_amount ?? '';
      dateInput.value = item.expense_date ? item.expense_date.split('T')[0] : '';
      vendorInput.value = item.vendor || '';
      notesInput.value = item.notes || '';
    } else {
      dateInput.value = '';
    }

    budgetModal.hidden = false;
    categoryInput.focus();
  }

  function closeModal() {
    budgetModal.hidden = true;
  }

  async function handleProjectChange() {
    const projectId = projectSelect.value ? parseInt(projectSelect.value, 10) : null;
    state.currentProjectId = projectId;
    localStorage.setItem(LAST_PROJECT_KEY, projectId ? String(projectId) : '');
    
    if (projectId) {
      await loadBudgets(projectId);
    } else {
      state.budgets = [];
      state.totals = { planned: 0, actual: 0, variance: 0 };
      renderBudgets();
    }
  }

  async function handleTableAction(event) {
    const action = event.target.dataset.action;
    if (!action) return;

    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    const itemId = parseInt(row.dataset.id, 10);
    const item = state.budgets.find(b => b.id === itemId);
    if (!item) return;

    if (action === 'edit') {
      // Coordinators cannot edit
      if (state.isCoordinator) {
        showError('Coordinators cannot edit budget items.');
        return;
      }
      openModal('Edit Budget Item', item);
    }
    
    if (action === 'delete') {
      // Coordinators cannot delete
      if (state.isCoordinator) {
        showError('Coordinators cannot delete budget items.');
        return;
      }
      
      const confirmDelete = window.confirm('Delete this budget item? This cannot be undone.');
      if (confirmDelete) {
        await deleteBudgetItem(itemId);
      }
    }
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();

    // Coordinators cannot create/update budget items
    if (state.isCoordinator) {
      showError('Coordinators cannot create or update budget items.');
      closeModal();
      return;
    }

    if (!state.currentProjectId) {
      showError('Please select a project before adding budget items.');
      return;
    }

    const category = categoryInput.value.trim();
    const planned = Number(plannedInput.value);
    const actual = Number(actualInput.value);

    if (!category) {
      showError('Category is required.');
      categoryInput.focus();
      return;
    }

    if (Number.isNaN(planned) || planned < 0) {
      showError('Planned amount must be zero or greater.');
      plannedInput.focus();
      return;
    }

    if (Number.isNaN(actual) || actual < 0) {
      showError('Actual amount must be zero or greater.');
      actualInput.focus();
      return;
    }

    const itemId = budgetItemIdInput.value ? parseInt(budgetItemIdInput.value, 10) : null;
    
    try {
      if (itemId) {
        // Update existing item
        await updateBudgetItem(itemId, {
          category,
          planned_amount: planned,
          actual_amount: actual,
          expense_date: dateInput.value || null,
          vendor: vendorInput.value.trim() || null,
          notes: notesInput.value.trim() || null
        });
        showSuccess('Budget item updated successfully.');
      } else {
        // Create new item
        await createBudgetItem(state.currentProjectId, {
          category,
          planned_amount: planned,
          actual_amount: actual,
          expense_date: dateInput.value || null,
          vendor: vendorInput.value.trim() || null,
          notes: notesInput.value.trim() || null
        });
        showSuccess('Budget item added successfully.');
      }
      
      closeModal();
      await loadBudgets(state.currentProjectId); // Reload to get updated data
    } catch (error) {
      console.error('Error saving budget item:', error);
      showError(error.message || 'Failed to save budget item.');
    }
  }

  async function createBudgetItem(projectId, payload) {
    const response = await fetch(`${API_BASE}/api/budget/projects/${projectId}/items`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await safeJson(response);
      const errorMessage = data?.error || data?.message || 'Failed to create budget item';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.item;
  }

  async function updateBudgetItem(itemId, payload) {
    const response = await fetch(`${API_BASE}/api/budget/items/${itemId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await safeJson(response);
      const errorMessage = data?.error || data?.message || 'Failed to update budget item';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.item;
  }

  async function deleteBudgetItem(itemId) {
    try {
      const response = await fetch(`${API_BASE}/api/budget/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await safeJson(response);
        const errorMessage = data?.error || data?.message || 'Failed to delete budget item';
        throw new Error(errorMessage);
      }

      showSuccess('Budget item deleted successfully.');
      await loadBudgets(state.currentProjectId); // Reload to get updated data
    } catch (error) {
      console.error('Error deleting budget item:', error);
      showError(error.message || 'Failed to delete budget item.');
    }
  }

  function handleExportCsv() {
    if (state.budgets.length === 0) {
      showError('No budget data to export.');
      return;
    }

    const header = ['Category', 'Planned Amount', 'Actual Amount', 'Variance', 'Expense Date', 'Vendor', 'Notes'];
    const rows = state.budgets.map(item => {
      const planned = item.planned_amount || 0;
      const actual = item.actual_amount || 0;
      const variance = planned - actual;
      
      return [
        `"${(item.category || '').replace(/"/g, '""')}"`,
        planned,
        actual,
        variance,
        `"${(item.expense_date || '').replace(/"/g, '""')}"`,
        `"${(item.vendor || '').replace(/"/g, '""')}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'budget_report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess('CSV exported successfully.');
  }

  function handleDownloadPdf() {
    if (state.budgets.length === 0) {
      showError('No budget data to download.');
      return;
    }

    const selectedProject = state.projects.find(p => p.id === state.currentProjectId);
    const projectName = selectedProject ? getProjectLabel(selectedProject) : 'N/A';

    const tableHtml = `
      <html>
        <head>
          <title>Budget Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 10px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; text-transform: uppercase; letter-spacing: 0.06em; font-size: 11px; }
            .totals { margin-top: 20px; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Budget Report</h1>
          <p>Project: ${escapeHtml(projectName)}</p>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Planned (Rs.)</th>
                <th>Actual (Rs.)</th>
                <th>Variance (Rs.)</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${state.budgets.map(item => {
                const planned = item.planned_amount || 0;
                const actual = item.actual_amount || 0;
                const variance = planned - actual;
                return `
                  <tr>
                    <td>${escapeHtml(item.category || '')}</td>
                    <td>${formatCurrency(planned)}</td>
                    <td>${formatCurrency(actual)}</td>
                    <td>${formatCurrency(variance)}</td>
                    <td>${formatDate(item.expense_date)}</td>
                    <td>${escapeHtml(item.vendor || '') || '—'}</td>
                    <td>${escapeHtml(item.notes || '') || '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Planned: ${formatCurrency(state.totals.planned || 0)}</p>
            <p>Total Actual: ${formatCurrency(state.totals.actual || 0)}</p>
            <p>Variance: ${formatCurrency(state.totals.variance || 0)}</p>
          </div>
        </body>
      </html>
    `;

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      showError('Popup blocked. Allow popups to download the report.');
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(tableHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

  async function init() {
    try {
      await ensureAuthenticated();
      await fetchProjects();
    } catch (error) {
      console.error('Failed to initialize budget manager:', error);
      disableBudgetManager();
    }
  }

  // Event listeners
  projectSelect.addEventListener('change', handleProjectChange);
  
  if (addBudgetBtn) {
    addBudgetBtn.addEventListener('click', () => {
      if (!projectSelect.value) {
        showError('Select a project first.');
        return;
      }
      if (state.isCoordinator) {
        showError('Coordinators cannot create budget items.');
        return;
      }
      openModal('Add Budget Item');
    });
  }

  if (emptyAddBtn) {
    emptyAddBtn.addEventListener('click', () => {
      if (!projectSelect.value) {
        showError('Select a project first.');
        return;
      }
      if (state.isCoordinator) {
        showError('Coordinators cannot create budget items.');
        return;
      }
      openModal('Add Budget Item');
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', handleExportCsv);
  }

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', handleDownloadPdf);
  }

  if (budgetTbody) {
    budgetTbody.addEventListener('click', handleTableAction);
  }

  if (budgetForm) {
    budgetForm.addEventListener('submit', handleBudgetSubmit);
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', closeModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', closeModal);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && budgetModal && !budgetModal.hidden) {
      closeModal();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
      console.error('Failed to initialize budget manager:', error);
    });
  });
})();
