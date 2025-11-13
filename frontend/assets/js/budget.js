(() => {
  const API_BASE = 'http://localhost:5000';
  const STORAGE_KEY = 'budget';
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

  let budgets = [];
  let projects = [];
  let currentProjectKey = '';

  function hydrateBudgets(rawItems) {
    const timestamp = () => new Date().toISOString();
    return rawItems.map((item, index) => {
      const projectKey = item.projectKey
        || (typeof item.projectId !== 'undefined' ? String(item.projectId)
        : `index-${item.projectIndex ?? index}`);

      return {
        id: item.id || `budget-${Date.now()}-${index}`,
        projectKey,
        category: item.category || '',
        planned: Number(item.planned) || 0,
        actual: Number(item.actual) || 0,
        vendor: item.vendor || '',
        notes: item.notes || '',
        expenseDate: item.expenseDate || '',
        updatedAt: item.updatedAt || timestamp()
      };
    });
  }

  function loadBudgets() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      budgets = hydrateBudgets(raw);
    } catch (error) {
      console.error('Failed to parse budgets from storage', error);
      budgets = [];
    }
  }

  function persistBudgets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  }

  function getProjectLabel(project, fallbackIndex) {
    const bride = project?.brideName || project?.bride_name || 'Unknown Bride';
    const groom = project?.groomName || project?.groom_name || 'Unknown Groom';
    const weddingDate = project?.weddingDate || project?.wedding_date || 'No date';
    const label = `${bride} & ${groom}`;
    return `${label} (${weddingDate})` || `Project ${fallbackIndex + 1}`;
  }

  function populateProjects() {
    projectSelect.innerHTML = '<option value="">Select a project</option>';

    projects.forEach((project, index) => {
      const key = typeof project.id !== 'undefined' ? String(project.id) : `index-${index}`;
      const option = document.createElement('option');
      option.value = key;
      option.textContent = getProjectLabel(project, index);
      projectSelect.appendChild(option);
    });

    const lastProject = localStorage.getItem(LAST_PROJECT_KEY);
    if (lastProject && [...projectSelect.options].some(opt => opt.value === lastProject)) {
      projectSelect.value = lastProject;
      currentProjectKey = lastProject;
    } else if (projects.length > 0) {
      const firstProjectKey = typeof projects[0].id !== 'undefined' ? String(projects[0].id) : 'index-0';
      projectSelect.value = firstProjectKey;
      currentProjectKey = firstProjectKey;
    } else {
      projectSelect.value = '';
      currentProjectKey = '';
    }

    projectSelect.disabled = projects.length === 0;
  }

  async function fetchProjects() {
    try {
      const response = await fetch(`${API_BASE}/api/projects/`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        projects = [];
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
      projects = Array.isArray(data.projects) ? data.projects : [];
      populateProjects();
      handleProjectChange();
    } catch (error) {
      console.error('Error fetching projects for budget manager:', error);
      showError(error.message || 'Failed to load projects. Please try again.');
      projects = [];
      populateProjects();
      renderBudgets();
    }
  }

  function filterBudgets() {
    if (!currentProjectKey) {
      return [];
    }
    return budgets.filter(item => item.projectKey === currentProjectKey);
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
    const filtered = filterBudgets();

    if (!currentProjectKey) {
      budgetTableSection.hidden = true;
      budgetEmptyState.hidden = true;
      summaryBar.hidden = true;
      return;
    }

    if (filtered.length === 0) {
      budgetTableSection.hidden = true;
      budgetEmptyState.hidden = false;
      summaryBar.hidden = true;
      return;
    }

    budgetTableSection.hidden = false;
    budgetEmptyState.hidden = true;
    summaryBar.hidden = false;

    let totalPlanned = 0;
    let totalActual = 0;

    const rows = filtered.map(item => {
      totalPlanned += item.planned;
      totalActual += item.actual;
      const variance = item.planned - item.actual;

      return `
        <tr data-id="${item.id}">
          <td>
            <div class="budget-category">
              <strong>${item.category}</strong>
              ${item.vendor ? `<div class="budget-vendor">${item.vendor}</div>` : ''}
              ${item.notes ? `<div class="budget-notes">${item.notes}</div>` : ''}
            </div>
          </td>
          <td>${formatCurrency(item.planned)}</td>
          <td>${formatCurrency(item.actual)}</td>
          <td>${formatCurrency(variance)}</td>
          <td>${formatDate(item.expenseDate || item.updatedAt)}</td>
          <td>
            <div class="budget-table__actions">
              <button type="button" class="edit" data-action="edit">Edit</button>
              <button type="button" class="delete" data-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

    budgetTbody.innerHTML = rows.join('');

    const variance = totalPlanned - totalActual;
    summaryPlanned.textContent = formatCurrency(totalPlanned);
    summaryActual.textContent = formatCurrency(totalActual);
    summaryVariance.textContent = formatCurrency(variance);
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

  function openModal(title, item = null) {
    budgetForm.reset();
    budgetFormTitle.textContent = title;
    budgetItemIdInput.value = item?.id || '';

    if (item) {
      categoryInput.value = item.category || '';
      plannedInput.value = item.planned ?? '';
      actualInput.value = item.actual ?? '';
      dateInput.value = item.expenseDate || '';
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

  function handleProjectChange() {
    currentProjectKey = projectSelect.value;
    localStorage.setItem(LAST_PROJECT_KEY, currentProjectKey);
    renderBudgets();
  }

  function handleTableAction(event) {
    const action = event.target.dataset.action;
    if (!action) return;

    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    const itemId = row.dataset.id;
    const item = budgets.find(b => b.id === itemId);
    if (!item) return;

    if (action === 'edit') {
      openModal('Edit Budget Item', item);
    }
    if (action === 'delete') {
      const confirmDelete = window.confirm('Delete this budget item? This cannot be undone.');
      if (confirmDelete) {
        budgets = budgets.filter(b => b.id !== itemId);
        persistBudgets();
        renderBudgets();
        showSuccess('Budget item deleted.');
      }
    }
  }

  function handleBudgetSubmit(event) {
    event.preventDefault();

    if (!currentProjectKey) {
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

    const payload = {
      id: budgetItemIdInput.value || `budget-${Date.now()}`,
      projectKey: currentProjectKey,
      category,
      planned,
      actual,
      expenseDate: dateInput.value || '',
      vendor: vendorInput.value.trim(),
      notes: notesInput.value.trim(),
      updatedAt: new Date().toISOString()
    };

    const existingIndex = budgets.findIndex(item => item.id === payload.id);
    if (existingIndex > -1) {
      budgets[existingIndex] = payload;
      showSuccess('Budget item updated.');
    } else {
      budgets.push(payload);
      showSuccess('Budget item added.');
    }

    persistBudgets();
    closeModal();
    renderBudgets();
  }

  function handleExportCsv() {
    const filtered = filterBudgets();
    if (filtered.length === 0) {
      showError('No budget data to export.');
      return;
    }

    const header = ['Category', 'Planned Amount', 'Actual Amount', 'Variance', 'Expense Date', 'Vendor', 'Notes'];
    const rows = filtered.map(item => ([
      `"${item.category.replace(/"/g, '""')}"`,
      item.planned,
      item.actual,
      item.planned - item.actual,
      `"${(item.expenseDate || '').replace(/"/g, '""')}"`,
      `"${(item.vendor || '').replace(/"/g, '""')}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]));

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
    const filtered = filterBudgets();
    if (filtered.length === 0) {
      showError('No budget data to download.');
      return;
    }

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
            .totals { margin-top: 20px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Budget Report</h1>
          <p>Project: ${projectSelect.options[projectSelect.selectedIndex]?.text || 'N/A'}</p>
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
              ${filtered.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${formatCurrency(item.planned)}</td>
                  <td>${formatCurrency(item.actual)}</td>
                  <td>${formatCurrency(item.planned - item.actual)}</td>
                  <td>${formatDate(item.expenseDate)}</td>
                  <td>${item.vendor || '—'}</td>
                  <td>${item.notes || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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
    loadBudgets();
    populateProjects();
    renderBudgets();

    projectSelect.addEventListener('change', handleProjectChange);
    addBudgetBtn.addEventListener('click', () => {
      if (!projectSelect.value) {
        showError('Select a project first.');
        return;
      }
      openModal('Add Budget Item');
    });

    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => {
        if (!projectSelect.value) {
          showError('Select a project first.');
          return;
        }
        openModal('Add Budget Item');
      });
    }

    exportCsvBtn.addEventListener('click', handleExportCsv);
    downloadPdfBtn.addEventListener('click', handleDownloadPdf);

    budgetTbody.addEventListener('click', handleTableAction);

    budgetForm.addEventListener('submit', handleBudgetSubmit);
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !budgetModal.hidden) {
        closeModal();
      }
    });

    await fetchProjects();
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
      console.error('Failed to initialize budget manager:', error);
    });
  });
})();
