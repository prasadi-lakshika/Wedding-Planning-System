const API_BASE = 'http://localhost:5000';

// State
const state = {
  currentTab: 'wedding-types',
  weddingTypes: [],
  culturalColors: [],
  colorRules: [],
  foodLocations: [],
  restrictedColours: [],
  selectedRecord: null
};

// Elements
const elements = {
  // Tabs
  tabBtns: null,
  tabContents: null,
  
  // Alerts
  listAlert: null,
  
  // Forms and buttons
  forms: {},
  cancelBtns: {},
  newBtns: {},
  filterSelects: {},
  tableBodies: {},
  
  // Wedding Types
  weddingTypeForm: null,
  weddingTypeId: null,
  weddingTypeName: null,
  weddingTypeDescription: null,
  weddingTypeIsActive: null,
  weddingTypeFormTitle: null,
  weddingTypeFormAlert: null,
  weddingTypeTableBody: null,
  
  // Cultural Colors
  culturalColorForm: null,
  culturalColorWeddingType: null,
  culturalColorName: null,
  culturalColorRgb: null,
  culturalColorPreview: null,
  culturalColorSignificance: null,
  culturalColorOldWeddingType: null,
  culturalColorOldColourName: null,
  culturalColorFormTitle: null,
  culturalColorFormAlert: null,
  culturalColorTableBody: null,
  culturalColorFilter: null,
  
  // Color Rules
  colorRuleForm: null,
  colorRuleWeddingType: null,
  colorRuleBrideColour: null,
  colorRuleGroomColour: null,
  colorRuleBridesmaidsColour: null,
  colorRuleBestMenColour: null,
  colorRuleFlowerDecoColour: null,
  colorRuleHallDecorColour: null,
  colorRuleOldWeddingType: null,
  colorRuleOldBrideColour: null,
  colorRuleFormTitle: null,
  colorRuleFormAlert: null,
  colorRuleTableBody: null,
  colorRuleFilter: null,
  
  // Food & Locations
  foodLocationForm: null,
  foodLocationWeddingType: null,
  foodLocationFoodMenu: null,
  foodLocationDrinks: null,
  foodLocationPreShootLocations: null,
  foodLocationOldWeddingType: null,
  foodLocationFormTitle: null,
  foodLocationFormAlert: null,
  foodLocationTableBody: null,
  foodLocationFilter: null,
  
  // Restricted Colours
  restrictedColourForm: null,
  restrictedColourWeddingType: null,
  restrictedColourName: null,
  restrictedColourFormTitle: null,
  restrictedColourFormAlert: null,
  restrictedColourTableBody: null,
  restrictedColourFilter: null,
  
  // Delete Modal
  deleteConfirmModal: null,
  deleteConfirmMessage: null,
  deleteConfirmBtn: null,
  deleteCancelBtn: null,
  closeDeleteModal: null
};

document.addEventListener('DOMContentLoaded', async () => {
  const authorized = await ensureAdminAccess();
  if (!authorized) {
    return;
  }

  sharedNavigation.handlePageNavigation('admin', 'true');
  initializeElements();
  attachEventListeners();
  await initializePage();
});

async function ensureAdminAccess() {
  try {
    const response = await fetch(`${API_BASE}/auth/check-auth`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      redirectToHome('Please log in as an administrator to access this page.');
      return false;
    }

    const data = await response.json();
    if (!data.authenticated || !data.user || data.user.role !== 'admin') {
      redirectToHome('Access denied. Administrator role required.');
      return false;
    }

    localStorage.setItem('userRole', data.user.role);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', data.user.name || data.user.username || '');
    localStorage.setItem('userEmail', data.user.email || '');
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    redirectToHome('Session validation failed. Please log in again.');
    return false;
  }
}

function redirectToHome(message) {
  alert(message);
  window.location.href = 'index.html';
}

function initializeElements() {
  // Tabs
  elements.tabBtns = document.querySelectorAll('.tab-btn');
  elements.tabContents = document.querySelectorAll('.tab-content');
  
  // Alerts
  elements.listAlert = document.getElementById('listAlert');
  
  // Wedding Types
  elements.weddingTypeForm = document.getElementById('weddingTypeForm');
  elements.weddingTypeId = document.getElementById('weddingTypeId');
  elements.weddingTypeName = document.getElementById('weddingTypeName');
  elements.weddingTypeDescription = document.getElementById('weddingTypeDescription');
  elements.weddingTypeIsActive = document.getElementById('weddingTypeIsActive');
  elements.weddingTypeFormTitle = document.getElementById('weddingTypeFormTitle');
  elements.weddingTypeFormAlert = document.getElementById('weddingTypeFormAlert');
  elements.weddingTypeTableBody = document.getElementById('weddingTypeTableBody');
  elements.newBtns.weddingType = document.getElementById('weddingTypeNewBtn');
  elements.cancelBtns.weddingType = document.getElementById('weddingTypeCancelBtn');
  
  // Cultural Colors
  elements.culturalColorForm = document.getElementById('culturalColorForm');
  elements.culturalColorWeddingType = document.getElementById('culturalColorWeddingType');
  elements.culturalColorName = document.getElementById('culturalColorName');
  elements.culturalColorRgb = document.getElementById('culturalColorRgb');
  elements.culturalColorPreview = document.getElementById('culturalColorPreview');
  elements.culturalColorSignificance = document.getElementById('culturalColorSignificance');
  elements.culturalColorOldWeddingType = document.getElementById('culturalColorOldWeddingType');
  elements.culturalColorOldColourName = document.getElementById('culturalColorOldColourName');
  elements.culturalColorFormTitle = document.getElementById('culturalColorFormTitle');
  elements.culturalColorFormAlert = document.getElementById('culturalColorFormAlert');
  elements.culturalColorTableBody = document.getElementById('culturalColorTableBody');
  elements.newBtns.culturalColor = document.getElementById('culturalColorNewBtn');
  elements.cancelBtns.culturalColor = document.getElementById('culturalColorCancelBtn');
  elements.filterSelects.culturalColor = document.getElementById('culturalColorFilter');
  
  // Color Rules
  elements.colorRuleForm = document.getElementById('colorRuleForm');
  elements.colorRuleWeddingType = document.getElementById('colorRuleWeddingType');
  elements.colorRuleBrideColour = document.getElementById('colorRuleBrideColour');
  elements.colorRuleGroomColour = document.getElementById('colorRuleGroomColour');
  elements.colorRuleBridesmaidsColour = document.getElementById('colorRuleBridesmaidsColour');
  elements.colorRuleBestMenColour = document.getElementById('colorRuleBestMenColour');
  elements.colorRuleFlowerDecoColour = document.getElementById('colorRuleFlowerDecoColour');
  elements.colorRuleHallDecorColour = document.getElementById('colorRuleHallDecorColour');
  elements.colorRuleOldWeddingType = document.getElementById('colorRuleOldWeddingType');
  elements.colorRuleOldBrideColour = document.getElementById('colorRuleOldBrideColour');
  elements.colorRuleFormTitle = document.getElementById('colorRuleFormTitle');
  elements.colorRuleFormAlert = document.getElementById('colorRuleFormAlert');
  elements.colorRuleTableBody = document.getElementById('colorRuleTableBody');
  elements.newBtns.colorRule = document.getElementById('colorRuleNewBtn');
  elements.cancelBtns.colorRule = document.getElementById('colorRuleCancelBtn');
  elements.filterSelects.colorRule = document.getElementById('colorRuleFilter');
  
  // Food & Locations
  elements.foodLocationForm = document.getElementById('foodLocationForm');
  elements.foodLocationWeddingType = document.getElementById('foodLocationWeddingType');
  elements.foodLocationFoodMenu = document.getElementById('foodLocationFoodMenu');
  elements.foodLocationDrinks = document.getElementById('foodLocationDrinks');
  elements.foodLocationPreShootLocations = document.getElementById('foodLocationPreShootLocations');
  elements.foodLocationOldWeddingType = document.getElementById('foodLocationOldWeddingType');
  elements.foodLocationFormTitle = document.getElementById('foodLocationFormTitle');
  elements.foodLocationFormAlert = document.getElementById('foodLocationFormAlert');
  elements.foodLocationTableBody = document.getElementById('foodLocationTableBody');
  elements.newBtns.foodLocation = document.getElementById('foodLocationNewBtn');
  elements.cancelBtns.foodLocation = document.getElementById('foodLocationCancelBtn');
  elements.filterSelects.foodLocation = document.getElementById('foodLocationFilter');
  
  // Restricted Colours
  elements.restrictedColourForm = document.getElementById('restrictedColourForm');
  elements.restrictedColourWeddingType = document.getElementById('restrictedColourWeddingType');
  elements.restrictedColourName = document.getElementById('restrictedColourName');
  elements.restrictedColourFormTitle = document.getElementById('restrictedColourFormTitle');
  elements.restrictedColourFormAlert = document.getElementById('restrictedColourFormAlert');
  elements.restrictedColourTableBody = document.getElementById('restrictedColourTableBody');
  elements.newBtns.restrictedColour = document.getElementById('restrictedColourNewBtn');
  elements.cancelBtns.restrictedColour = document.getElementById('restrictedColourCancelBtn');
  elements.filterSelects.restrictedColour = document.getElementById('restrictedColourFilter');
  
  // Delete Modal
  elements.deleteConfirmModal = document.getElementById('deleteConfirmModal');
  elements.deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
  elements.deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  elements.deleteCancelBtn = document.getElementById('deleteCancelBtn');
  elements.closeDeleteModal = document.getElementById('closeDeleteModal');
  
  // Forms map
  elements.forms = {
    weddingType: elements.weddingTypeForm,
    culturalColor: elements.culturalColorForm,
    colorRule: elements.colorRuleForm,
    foodLocation: elements.foodLocationForm,
    restrictedColour: elements.restrictedColourForm
  };
}

function attachEventListeners() {
  // Tab navigation
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Form submissions
  elements.weddingTypeForm.addEventListener('submit', handleWeddingTypeSubmit);
  elements.culturalColorForm.addEventListener('submit', handleCulturalColorSubmit);
  elements.colorRuleForm.addEventListener('submit', handleColorRuleSubmit);
  elements.foodLocationForm.addEventListener('submit', handleFoodLocationSubmit);
  elements.restrictedColourForm.addEventListener('submit', handleRestrictedColourSubmit);
  
  // New buttons
  elements.newBtns.weddingType.addEventListener('click', () => resetForm('weddingType'));
  elements.newBtns.culturalColor.addEventListener('click', () => resetForm('culturalColor'));
  elements.newBtns.colorRule.addEventListener('click', () => resetForm('colorRule'));
  elements.newBtns.foodLocation.addEventListener('click', () => resetForm('foodLocation'));
  elements.newBtns.restrictedColour.addEventListener('click', () => resetForm('restrictedColour'));
  
  // Cancel buttons
  elements.cancelBtns.weddingType.addEventListener('click', () => resetForm('weddingType'));
  elements.cancelBtns.culturalColor.addEventListener('click', () => resetForm('culturalColor'));
  elements.cancelBtns.colorRule.addEventListener('click', () => resetForm('colorRule'));
  elements.cancelBtns.foodLocation.addEventListener('click', () => resetForm('foodLocation'));
  elements.cancelBtns.restrictedColour.addEventListener('click', () => resetForm('restrictedColour'));
  
  // Filters
  elements.filterSelects.culturalColor.addEventListener('change', () => loadCulturalColors());
  elements.filterSelects.colorRule.addEventListener('change', () => loadColorRules());
  elements.filterSelects.foodLocation.addEventListener('change', () => loadFoodLocations());
  elements.filterSelects.restrictedColour.addEventListener('change', () => loadRestrictedColours());
  
  // Cultural Color RGB preview
  elements.culturalColorRgb.addEventListener('input', updateColorPreview);
  
  // Color Rule - Wedding Type change updates bride color options
  elements.colorRuleWeddingType.addEventListener('change', () => {
    loadBrideColorOptions();
  });
  
  // Delete modal
  elements.deleteCancelBtn.addEventListener('click', hideDeleteModal);
  elements.closeDeleteModal.addEventListener('click', hideDeleteModal);
}

async function initializePage() {
  await loadWeddingTypes();
  await loadCulturalColors();
  await loadColorRules();
  await loadFoodLocations();
  await loadRestrictedColours();
  populateWeddingTypeFilters();
}

function switchTab(tabName) {
  state.currentTab = tabName;
  
  // Update tab buttons
  elements.tabBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update tab contents
  elements.tabContents.forEach(content => {
    if (content.id === `tab-${tabName}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // Load data if needed
  if (tabName === 'wedding-types' && state.weddingTypes.length === 0) {
    loadWeddingTypes();
  } else if (tabName === 'cultural-colors' && state.culturalColors.length === 0) {
    loadCulturalColors();
  } else if (tabName === 'color-rules' && state.colorRules.length === 0) {
    loadColorRules();
  } else if (tabName === 'food-locations' && state.foodLocations.length === 0) {
    loadFoodLocations();
  } else if (tabName === 'restricted-colours' && state.restrictedColours.length === 0) {
    loadRestrictedColours();
  }
}

// ============================================================================
// WEDDING TYPES
// ============================================================================

async function loadWeddingTypes() {
  clearAlert(elements.listAlert);
  try {
    const response = await fetch(`${API_BASE}/api/admin/data/wedding-types`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.weddingTypes = data.wedding_types || [];
    renderWeddingTypes();
  } catch (error) {
    console.error('Failed to load wedding types:', error);
    showAlert(elements.listAlert, 'error', 'Failed to load wedding types. Please try again later.');
  }
}

function renderWeddingTypes() {
  elements.weddingTypeTableBody.innerHTML = '';

  if (!state.weddingTypes.length) {
    elements.weddingTypeTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No wedding types found.</td></tr>';
    return;
  }

  state.weddingTypes.forEach(wt => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${wt.id}</td>
      <td>${escapeHtml(wt.name)}</td>
      <td>${escapeHtml(wt.description || '—')}</td>
      <td><span class="badge ${wt.is_active ? 'badge-success' : 'badge-inactive'}">${wt.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn-sm btn-edit" onclick="editWeddingType(${wt.id})">Edit</button>
        <button class="btn-sm btn-delete" onclick="confirmDeleteWeddingType(${wt.id}, '${escapeHtml(wt.name)}')">Delete</button>
      </td>
    `;
    elements.weddingTypeTableBody.appendChild(row);
  });
}

async function handleWeddingTypeSubmit(e) {
  e.preventDefault();
  clearAlert(elements.weddingTypeFormAlert);

  const payload = {
    name: elements.weddingTypeName.value.trim(),
    description: elements.weddingTypeDescription.value.trim() || null,
    is_active: elements.weddingTypeIsActive.checked
  };

  if (!payload.name) {
    showAlert(elements.weddingTypeFormAlert, 'error', 'Name is required.');
    return;
  }

  try {
    const id = elements.weddingTypeId.value;
    const url = id ? `${API_BASE}/api/admin/data/wedding-types/${id}` : `${API_BASE}/api/admin/data/wedding-types`;
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.weddingTypeFormAlert, 'error', data.error || 'Failed to save wedding type.');
      return;
    }

    showAlert(elements.weddingTypeFormAlert, 'success', data.message || 'Wedding type saved successfully.');
    await loadWeddingTypes();
    populateWeddingTypeFilters();
    resetForm('weddingType');
  } catch (error) {
    console.error('Save wedding type failed:', error);
    showAlert(elements.weddingTypeFormAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

window.editWeddingType = function(id) {
  const wt = state.weddingTypes.find(w => w.id === id);
  if (!wt) return;

  elements.weddingTypeId.value = wt.id;
  elements.weddingTypeName.value = wt.name;
  elements.weddingTypeDescription.value = wt.description || '';
  elements.weddingTypeIsActive.checked = wt.is_active;
  elements.weddingTypeFormTitle.textContent = 'Edit Wedding Type';
  
  elements.weddingTypeForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.confirmDeleteWeddingType = async function(id, name) {
  elements.selectedRecord = { type: 'weddingType', id, name };
  elements.deleteConfirmMessage.textContent = `Are you sure you want to delete wedding type "${name}"? This action cannot be undone.`;
  elements.deleteConfirmModal.style.display = 'block';
  elements.deleteConfirmBtn.onclick = () => deleteWeddingType(id);
};

async function deleteWeddingType(id) {
  hideDeleteModal();
  clearAlert(elements.listAlert);
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/data/wedding-types/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.listAlert, 'error', data.error || 'Failed to delete wedding type.');
      return;
    }

    showAlert(elements.listAlert, 'success', data.message || 'Wedding type deleted successfully.');
    await loadWeddingTypes();
    populateWeddingTypeFilters();
  } catch (error) {
    console.error('Delete wedding type failed:', error);
    showAlert(elements.listAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

// ============================================================================
// CULTURAL COLORS
// ============================================================================

async function loadCulturalColors() {
  clearAlert(elements.listAlert);
  try {
    const filter = elements.filterSelects.culturalColor.value;
    const url = filter 
      ? `${API_BASE}/api/admin/data/cultural-colors?wedding_type=${encodeURIComponent(filter)}`
      : `${API_BASE}/api/admin/data/cultural-colors`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.culturalColors = data.cultural_colors || [];
    renderCulturalColors();
  } catch (error) {
    console.error('Failed to load cultural colors:', error);
    showAlert(elements.listAlert, 'error', 'Failed to load cultural colors. Please try again later.');
  }
}

function renderCulturalColors() {
  elements.culturalColorTableBody.innerHTML = '';

  if (!state.culturalColors.length) {
    elements.culturalColorTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No cultural colors found.</td></tr>';
    return;
  }

  state.culturalColors.forEach(cc => {
    const rgbParts = cc.rgb.split(',').map(s => s.trim());
    const previewStyle = rgbParts.length === 3 
      ? `background-color: rgb(${rgbParts.join(',')});` 
      : '';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(cc.wedding_type)}</td>
      <td>${escapeHtml(cc.colour_name)}</td>
      <td>${escapeHtml(cc.rgb)}</td>
      <td><span class="color-swatch" style="${previewStyle}"></span></td>
      <td>${escapeHtml(cc.cultural_significance || '—')}</td>
      <td>
        <button class="btn-sm btn-edit" onclick="editCulturalColor('${escapeHtml(cc.wedding_type)}', '${escapeHtml(cc.colour_name)}')">Edit</button>
        <button class="btn-sm btn-delete" onclick="confirmDeleteCulturalColor('${escapeHtml(cc.wedding_type)}', '${escapeHtml(cc.colour_name)}')">Delete</button>
      </td>
    `;
    elements.culturalColorTableBody.appendChild(row);
  });
}

async function handleCulturalColorSubmit(e) {
  e.preventDefault();
  clearAlert(elements.culturalColorFormAlert);

  const payload = {
    wedding_type: elements.culturalColorWeddingType.value.trim(),
    colour_name: elements.culturalColorName.value.trim(),
    rgb: elements.culturalColorRgb.value.trim(),
    cultural_significance: elements.culturalColorSignificance.value.trim() || null
  };

  if (!payload.wedding_type || !payload.colour_name || !payload.rgb) {
    showAlert(elements.culturalColorFormAlert, 'error', 'Wedding type, color name, and RGB value are required.');
    return;
  }

  // Check if editing (has old values)
  const oldWeddingType = elements.culturalColorOldWeddingType.value;
  const oldColourName = elements.culturalColorOldColourName.value;
  if (oldWeddingType && oldColourName) {
    payload.old_wedding_type = oldWeddingType;
    payload.old_colour_name = oldColourName;
  }

  try {
    const url = `${API_BASE}/api/admin/data/cultural-colors`;
    const method = oldWeddingType && oldColourName ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.culturalColorFormAlert, 'error', data.error || 'Failed to save cultural color.');
      return;
    }

    showAlert(elements.culturalColorFormAlert, 'success', data.message || 'Cultural color saved successfully.');
    await loadCulturalColors();
    await loadColorRules(); // Reload to update bride color options
    resetForm('culturalColor');
  } catch (error) {
    console.error('Save cultural color failed:', error);
    showAlert(elements.culturalColorFormAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

window.editCulturalColor = function(weddingType, colourName) {
  const cc = state.culturalColors.find(c => 
    c.wedding_type === weddingType && c.colour_name === colourName
  );
  if (!cc) return;

  elements.culturalColorOldWeddingType.value = cc.wedding_type;
  elements.culturalColorOldColourName.value = cc.colour_name;
  elements.culturalColorWeddingType.value = cc.wedding_type;
  elements.culturalColorName.value = cc.colour_name;
  elements.culturalColorRgb.value = cc.rgb;
  elements.culturalColorSignificance.value = cc.cultural_significance || '';
  elements.culturalColorFormTitle.textContent = 'Edit Cultural Color';
  updateColorPreview();
  
  elements.culturalColorForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

function updateColorPreview() {
  const rgbValue = elements.culturalColorRgb.value.trim();
  const preview = elements.culturalColorPreview;
  
  if (!rgbValue) {
    preview.style.backgroundColor = '#f0f0f0';
    return;
  }
  
  // Try to parse RGB
  let rgbParts = [];
  
  // Check for hex format
  if (rgbValue.startsWith('#')) {
    const hex = rgbValue.substring(1);
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      rgbParts = [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16)
      ];
    }
  } else if (rgbValue.startsWith('rgb(')) {
    const match = rgbValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      rgbParts = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
  } else {
    const parts = rgbValue.split(',').map(s => s.trim());
    if (parts.length === 3) {
      rgbParts = parts.map(p => parseInt(p));
    }
  }
  
  if (rgbParts.length === 3 && rgbParts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    preview.style.backgroundColor = `rgb(${rgbParts.join(',')})`;
  } else {
    preview.style.backgroundColor = '#f0f0f0';
  }
}

window.confirmDeleteCulturalColor = async function(weddingType, colourName) {
  elements.selectedRecord = { type: 'culturalColor', weddingType, colourName };
  elements.deleteConfirmMessage.textContent = `Are you sure you want to delete cultural color "${colourName}" for "${weddingType}"? This action cannot be undone.`;
  elements.deleteConfirmModal.style.display = 'block';
  elements.deleteConfirmBtn.onclick = () => deleteCulturalColor(weddingType, colourName);
};

async function deleteCulturalColor(weddingType, colourName) {
  hideDeleteModal();
  clearAlert(elements.listAlert);
  
  try {
    const url = `${API_BASE}/api/admin/data/cultural-colors?wedding_type=${encodeURIComponent(weddingType)}&colour_name=${encodeURIComponent(colourName)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.listAlert, 'error', data.error || 'Failed to delete cultural color.');
      return;
    }

    showAlert(elements.listAlert, 'success', data.message || 'Cultural color deleted successfully.');
    await loadCulturalColors();
    await loadColorRules(); // Reload to update bride color options
  } catch (error) {
    console.error('Delete cultural color failed:', error);
    showAlert(elements.listAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

// ============================================================================
// COLOR RULES
// ============================================================================

async function loadColorRules() {
  clearAlert(elements.listAlert);
  try {
    const filter = elements.filterSelects.colorRule.value;
    const url = filter 
      ? `${API_BASE}/api/admin/data/color-rules?wedding_type=${encodeURIComponent(filter)}`
      : `${API_BASE}/api/admin/data/color-rules`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.colorRules = data.color_rules || [];
    renderColorRules();
  } catch (error) {
    console.error('Failed to load color rules:', error);
    showAlert(elements.listAlert, 'error', 'Failed to load color rules. Please try again later.');
  }
}

function renderColorRules() {
  elements.colorRuleTableBody.innerHTML = '';

  if (!state.colorRules.length) {
    elements.colorRuleTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No color rules found.</td></tr>';
    return;
  }

  state.colorRules.forEach(cr => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(cr.wedding_type)}</td>
      <td>${escapeHtml(cr.bride_colour)}</td>
      <td>${escapeHtml(cr.groom_colour)}</td>
      <td>${escapeHtml(cr.bridesmaids_colour)}</td>
      <td>${escapeHtml(cr.best_men_colour)}</td>
      <td>${escapeHtml(cr.flower_deco_colour)}</td>
      <td>${escapeHtml(cr.hall_decor_colour)}</td>
      <td>
        <button class="btn-sm btn-edit" onclick="editColorRule('${escapeHtml(cr.wedding_type)}', '${escapeHtml(cr.bride_colour)}')">Edit</button>
        <button class="btn-sm btn-delete" onclick="confirmDeleteColorRule('${escapeHtml(cr.wedding_type)}', '${escapeHtml(cr.bride_colour)}')">Delete</button>
      </td>
    `;
    elements.colorRuleTableBody.appendChild(row);
  });
}

async function loadBrideColorOptions() {
  const weddingType = elements.colorRuleWeddingType.value;
  elements.colorRuleBrideColour.innerHTML = '<option value="">Select Bride Color</option>';
  
  if (!weddingType) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/data/cultural-colors?wedding_type=${encodeURIComponent(weddingType)}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) return;

    const data = await response.json();
    const colors = data.cultural_colors || [];
    colors.forEach(color => {
      const option = document.createElement('option');
      option.value = color.colour_name;
      option.textContent = color.colour_name;
      elements.colorRuleBrideColour.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load bride color options:', error);
  }
}

async function handleColorRuleSubmit(e) {
  e.preventDefault();
  clearAlert(elements.colorRuleFormAlert);

  const payload = {
    wedding_type: elements.colorRuleWeddingType.value.trim(),
    bride_colour: elements.colorRuleBrideColour.value.trim(),
    groom_colour: elements.colorRuleGroomColour.value.trim(),
    bridesmaids_colour: elements.colorRuleBridesmaidsColour.value.trim(),
    best_men_colour: elements.colorRuleBestMenColour.value.trim(),
    flower_deco_colour: elements.colorRuleFlowerDecoColour.value.trim(),
    hall_decor_colour: elements.colorRuleHallDecorColour.value.trim()
  };

  if (!payload.wedding_type || !payload.bride_colour || !payload.groom_colour || 
      !payload.bridesmaids_colour || !payload.best_men_colour || 
      !payload.flower_deco_colour || !payload.hall_decor_colour) {
    showAlert(elements.colorRuleFormAlert, 'error', 'All fields are required.');
    return;
  }

  // Check if editing
  const oldWeddingType = elements.colorRuleOldWeddingType.value;
  const oldBrideColour = elements.colorRuleOldBrideColour.value;
  if (oldWeddingType && oldBrideColour) {
    payload.old_wedding_type = oldWeddingType;
    payload.old_bride_colour = oldBrideColour;
  }

  try {
    const url = `${API_BASE}/api/admin/data/color-rules`;
    const method = oldWeddingType && oldBrideColour ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.colorRuleFormAlert, 'error', data.error || 'Failed to save color rule.');
      return;
    }

    showAlert(elements.colorRuleFormAlert, 'success', data.message || 'Color rule saved successfully.');
    await loadColorRules();
    resetForm('colorRule');
  } catch (error) {
    console.error('Save color rule failed:', error);
    showAlert(elements.colorRuleFormAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

window.editColorRule = function(weddingType, brideColour) {
  const cr = state.colorRules.find(c => 
    c.wedding_type === weddingType && c.bride_colour === brideColour
  );
  if (!cr) return;

  elements.colorRuleOldWeddingType.value = cr.wedding_type;
  elements.colorRuleOldBrideColour.value = cr.bride_colour;
  elements.colorRuleWeddingType.value = cr.wedding_type;
  elements.colorRuleBrideColour.value = cr.bride_colour;
  elements.colorRuleGroomColour.value = cr.groom_colour;
  elements.colorRuleBridesmaidsColour.value = cr.bridesmaids_colour;
  elements.colorRuleBestMenColour.value = cr.best_men_colour;
  elements.colorRuleFlowerDecoColour.value = cr.flower_deco_colour;
  elements.colorRuleHallDecorColour.value = cr.hall_decor_colour;
  elements.colorRuleFormTitle.textContent = 'Edit Color Rule';
  
  loadBrideColorOptions();
  // Set bride color after options load
  setTimeout(() => {
    elements.colorRuleBrideColour.value = cr.bride_colour;
  }, 100);
  
  elements.colorRuleForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.confirmDeleteColorRule = async function(weddingType, brideColour) {
  elements.selectedRecord = { type: 'colorRule', weddingType, brideColour };
  elements.deleteConfirmMessage.textContent = `Are you sure you want to delete color rule for "${weddingType}" with bride color "${brideColour}"? This action cannot be undone.`;
  elements.deleteConfirmModal.style.display = 'block';
  elements.deleteConfirmBtn.onclick = () => deleteColorRule(weddingType, brideColour);
};

async function deleteColorRule(weddingType, brideColour) {
  hideDeleteModal();
  clearAlert(elements.listAlert);
  
  try {
    const url = `${API_BASE}/api/admin/data/color-rules?wedding_type=${encodeURIComponent(weddingType)}&bride_colour=${encodeURIComponent(brideColour)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.listAlert, 'error', data.error || 'Failed to delete color rule.');
      return;
    }

    showAlert(elements.listAlert, 'success', data.message || 'Color rule deleted successfully.');
    await loadColorRules();
  } catch (error) {
    console.error('Delete color rule failed:', error);
    showAlert(elements.listAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

// ============================================================================
// FOOD & LOCATIONS
// ============================================================================

async function loadFoodLocations() {
  clearAlert(elements.listAlert);
  try {
    const filter = elements.filterSelects.foodLocation.value;
    const url = filter 
      ? `${API_BASE}/api/admin/data/food-locations?wedding_type=${encodeURIComponent(filter)}`
      : `${API_BASE}/api/admin/data/food-locations`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.foodLocations = data.food_locations || [];
    renderFoodLocations();
  } catch (error) {
    console.error('Failed to load food locations:', error);
    showAlert(elements.listAlert, 'error', 'Failed to load food & locations. Please try again later.');
  }
}

function renderFoodLocations() {
  elements.foodLocationTableBody.innerHTML = '';

  if (!state.foodLocations.length) {
    elements.foodLocationTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No food & locations found.</td></tr>';
    return;
  }

  state.foodLocations.forEach(fl => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(fl.wedding_type)}</td>
      <td class="text-truncate" title="${escapeHtml(fl.food_menu)}">${truncateText(fl.food_menu, 50)}</td>
      <td class="text-truncate" title="${escapeHtml(fl.drinks)}">${truncateText(fl.drinks, 50)}</td>
      <td class="text-truncate" title="${escapeHtml(fl.pre_shoot_locations)}">${truncateText(fl.pre_shoot_locations, 50)}</td>
      <td>
        <button class="btn-sm btn-edit" onclick="editFoodLocation('${escapeHtml(fl.wedding_type)}')">Edit</button>
        <button class="btn-sm btn-delete" onclick="confirmDeleteFoodLocation('${escapeHtml(fl.wedding_type)}')">Delete</button>
      </td>
    `;
    elements.foodLocationTableBody.appendChild(row);
  });
}

async function handleFoodLocationSubmit(e) {
  e.preventDefault();
  clearAlert(elements.foodLocationFormAlert);

  const payload = {
    wedding_type: elements.foodLocationWeddingType.value.trim(),
    food_menu: elements.foodLocationFoodMenu.value.trim(),
    drinks: elements.foodLocationDrinks.value.trim(),
    pre_shoot_locations: elements.foodLocationPreShootLocations.value.trim()
  };

  if (!payload.wedding_type || !payload.food_menu || !payload.drinks || !payload.pre_shoot_locations) {
    showAlert(elements.foodLocationFormAlert, 'error', 'All fields are required.');
    return;
  }

  const oldWeddingType = elements.foodLocationOldWeddingType.value;
  if (oldWeddingType) {
    payload.old_wedding_type = oldWeddingType;
  }

  try {
    const url = `${API_BASE}/api/admin/data/food-locations`;
    const method = oldWeddingType ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.foodLocationFormAlert, 'error', data.error || 'Failed to save food & location.');
      return;
    }

    showAlert(elements.foodLocationFormAlert, 'success', data.message || 'Food & location saved successfully.');
    await loadFoodLocations();
    resetForm('foodLocation');
  } catch (error) {
    console.error('Save food location failed:', error);
    showAlert(elements.foodLocationFormAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

window.editFoodLocation = function(weddingType) {
  const fl = state.foodLocations.find(f => f.wedding_type === weddingType);
  if (!fl) return;

  elements.foodLocationOldWeddingType.value = fl.wedding_type;
  elements.foodLocationWeddingType.value = fl.wedding_type;
  elements.foodLocationFoodMenu.value = fl.food_menu;
  elements.foodLocationDrinks.value = fl.drinks;
  elements.foodLocationPreShootLocations.value = fl.pre_shoot_locations;
  elements.foodLocationFormTitle.textContent = 'Edit Food & Location';
  
  elements.foodLocationForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.confirmDeleteFoodLocation = async function(weddingType) {
  elements.selectedRecord = { type: 'foodLocation', weddingType };
  elements.deleteConfirmMessage.textContent = `Are you sure you want to delete food & location for "${weddingType}"? This action cannot be undone.`;
  elements.deleteConfirmModal.style.display = 'block';
  elements.deleteConfirmBtn.onclick = () => deleteFoodLocation(weddingType);
};

async function deleteFoodLocation(weddingType) {
  hideDeleteModal();
  clearAlert(elements.listAlert);
  
  try {
    const url = `${API_BASE}/api/admin/data/food-locations?wedding_type=${encodeURIComponent(weddingType)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.listAlert, 'error', data.error || 'Failed to delete food & location.');
      return;
    }

    showAlert(elements.listAlert, 'success', data.message || 'Food & location deleted successfully.');
    await loadFoodLocations();
  } catch (error) {
    console.error('Delete food location failed:', error);
    showAlert(elements.listAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

// ============================================================================
// RESTRICTED COLOURS
// ============================================================================

async function loadRestrictedColours() {
  clearAlert(elements.listAlert);
  try {
    const filter = elements.filterSelects.restrictedColour.value;
    const url = filter 
      ? `${API_BASE}/api/admin/data/restricted-colours?wedding_type=${encodeURIComponent(filter)}`
      : `${API_BASE}/api/admin/data/restricted-colours`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.restrictedColours = data.restricted_colours || [];
    renderRestrictedColours();
  } catch (error) {
    console.error('Failed to load restricted colours:', error);
    showAlert(elements.listAlert, 'error', 'Failed to load restricted colours. Please try again later.');
  }
}

function renderRestrictedColours() {
  elements.restrictedColourTableBody.innerHTML = '';

  if (!state.restrictedColours.length) {
    elements.restrictedColourTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No restricted colours found.</td></tr>';
    return;
  }

  state.restrictedColours.forEach(rc => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(rc.wedding_type)}</td>
      <td>${escapeHtml(rc.restricted_colour)}</td>
      <td>
        <button class="btn-sm btn-edit" onclick="editRestrictedColour('${escapeHtml(rc.wedding_type)}', '${escapeHtml(rc.restricted_colour)}')">Edit</button>
        <button class="btn-sm btn-delete" onclick="confirmDeleteRestrictedColour('${escapeHtml(rc.wedding_type)}', '${escapeHtml(rc.restricted_colour)}')">Delete</button>
      </td>
    `;
    elements.restrictedColourTableBody.appendChild(row);
  });
}

async function handleRestrictedColourSubmit(e) {
  e.preventDefault();
  clearAlert(elements.restrictedColourFormAlert);

  const payload = {
    wedding_type: elements.restrictedColourWeddingType.value.trim(),
    restricted_colour: elements.restrictedColourName.value.trim()
  };

  if (!payload.wedding_type || !payload.restricted_colour) {
    showAlert(elements.restrictedColourFormAlert, 'error', 'Wedding type and restricted colour are required.');
    return;
  }

  try {
    const url = `${API_BASE}/api/admin/data/restricted-colours`;
    const method = 'POST';

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.restrictedColourFormAlert, 'error', data.error || 'Failed to save restricted colour.');
      return;
    }

    showAlert(elements.restrictedColourFormAlert, 'success', data.message || 'Restricted colour saved successfully.');
    await loadRestrictedColours();
    resetForm('restrictedColour');
  } catch (error) {
    console.error('Save restricted colour failed:', error);
    showAlert(elements.restrictedColourFormAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

window.editRestrictedColour = function(weddingType, restrictedColour) {
  elements.restrictedColourWeddingType.value = weddingType;
  elements.restrictedColourName.value = restrictedColour;
  elements.restrictedColourFormTitle.textContent = 'Edit Restricted Colour';
  
  elements.restrictedColourForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.confirmDeleteRestrictedColour = async function(weddingType, restrictedColour) {
  elements.selectedRecord = { type: 'restrictedColour', weddingType, restrictedColour };
  elements.deleteConfirmMessage.textContent = `Are you sure you want to delete restricted colour "${restrictedColour}" for "${weddingType}"? This action cannot be undone.`;
  elements.deleteConfirmModal.style.display = 'block';
  elements.deleteConfirmBtn.onclick = () => deleteRestrictedColour(weddingType, restrictedColour);
};

async function deleteRestrictedColour(weddingType, restrictedColour) {
  hideDeleteModal();
  clearAlert(elements.listAlert);
  
  try {
    const url = `${API_BASE}/api/admin/data/restricted-colours?wedding_type=${encodeURIComponent(weddingType)}&restricted_colour=${encodeURIComponent(restrictedColour)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(elements.listAlert, 'error', data.error || 'Failed to delete restricted colour.');
      return;
    }

    showAlert(elements.listAlert, 'success', data.message || 'Restricted colour deleted successfully.');
    await loadRestrictedColours();
  } catch (error) {
    console.error('Delete restricted colour failed:', error);
    showAlert(elements.listAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function populateWeddingTypeFilters() {
  const selects = [
    elements.culturalColorWeddingType,
    elements.colorRuleWeddingType,
    elements.foodLocationWeddingType,
    elements.restrictedColourWeddingType,
    elements.filterSelects.culturalColor,
    elements.filterSelects.colorRule,
    elements.filterSelects.foodLocation,
    elements.filterSelects.restrictedColour
  ];

  selects.forEach(select => {
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Wedding Type</option>';
    
    state.weddingTypes
      .filter(wt => wt.is_active)
      .forEach(wt => {
        const option = document.createElement('option');
        option.value = wt.name;
        option.textContent = wt.name;
        select.appendChild(option);
      });
    
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function resetForm(formType) {
  const form = elements.forms[formType];
  if (!form) return;

  form.reset();
  
  // Clear hidden fields
  if (formType === 'weddingType') {
    elements.weddingTypeId.value = '';
    elements.weddingTypeFormTitle.textContent = 'Create New Wedding Type';
    clearAlert(elements.weddingTypeFormAlert);
  } else if (formType === 'culturalColor') {
    elements.culturalColorOldWeddingType.value = '';
    elements.culturalColorOldColourName.value = '';
    elements.culturalColorFormTitle.textContent = 'Create New Cultural Color';
    elements.culturalColorPreview.style.backgroundColor = '#f0f0f0';
    clearAlert(elements.culturalColorFormAlert);
  } else if (formType === 'colorRule') {
    elements.colorRuleOldWeddingType.value = '';
    elements.colorRuleOldBrideColour.value = '';
    elements.colorRuleFormTitle.textContent = 'Create New Color Rule';
    elements.colorRuleBrideColour.innerHTML = '<option value="">Select Bride Color</option>';
    clearAlert(elements.colorRuleFormAlert);
  } else if (formType === 'foodLocation') {
    elements.foodLocationOldWeddingType.value = '';
    elements.foodLocationFormTitle.textContent = 'Create New Food & Location';
    clearAlert(elements.foodLocationFormAlert);
  } else if (formType === 'restrictedColour') {
    elements.restrictedColourFormTitle.textContent = 'Create New Restricted Colour';
    clearAlert(elements.restrictedColourFormAlert);
  }
}

function showDeleteModal() {
  elements.deleteConfirmModal.style.display = 'block';
}

function hideDeleteModal() {
  elements.deleteConfirmModal.style.display = 'none';
  elements.selectedRecord = null;
}

function showAlert(element, type, message) {
  if (!element) return;
  element.hidden = false;
  element.textContent = message;
  element.classList.remove('success', 'error');
  element.classList.add(type);
}

function clearAlert(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
  element.classList.remove('success', 'error');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (!text) return '—';
  if (text.length <= maxLength) return escapeHtml(text);
  return escapeHtml(text.substring(0, maxLength)) + '...';
}

