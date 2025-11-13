const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async () => {
  const authorized = await ensureAdminAccess();
  if (!authorized) {
    return;
  }

  sharedNavigation.handlePageNavigation('admin', 'true');
  attachEventListeners();
  await loadUsers();
});

const userForm = document.getElementById('userForm');
const formTitle = document.getElementById('formTitle');
const formAlert = document.getElementById('formAlert');
const listAlert = document.getElementById('listAlert');
const resetFormBtn = document.getElementById('resetFormBtn');
const cancelBtn = document.getElementById('userCancelBtn');
const tbody = document.getElementById('userListBody');

function attachEventListeners() {
  userForm.addEventListener('submit', handleSubmit);
  resetFormBtn.addEventListener('click', resetForm);
  cancelBtn.addEventListener('click', resetForm);
}

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

    // Keep localStorage synced for navigation links
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

async function loadUsers() {
  clearAlert(listAlert);
  try {
    const response = await fetch(`${API_BASE}/api/admin/users`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    renderUsers(data.users || []);
  } catch (error) {
    console.error('Failed to load users:', error);
    showAlert(listAlert, 'error', 'Unable to load users. Please try again later.');
  }
}

function renderUsers(users) {
  tbody.innerHTML = '';

  if (!users.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No users found.';
    cell.style.textAlign = 'center';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.name || '—'}</td>
      <td>${user.email}</td>
      <td>${user.phone_number || '—'}</td>
      <td>${user.role}</td>
      <td>${formatDateTime(user.updated_at)}</td>
      <td>
        <div class="user-actions">
          <button class="edit-btn" data-id="${user.id}">Edit</button>
          <button class="delete-btn" data-id="${user.id}">Delete</button>
        </div>
      </td>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => populateForm(user));
    row.querySelector('.delete-btn').addEventListener('click', () => confirmDelete(user));
    tbody.appendChild(row);
  });
}

function populateForm(user) {
  formTitle.textContent = 'Edit User';
  userForm.userId.value = user.id;
  userForm.userName.value = user.name || '';
  userForm.userEmail.value = user.email;
  userForm.userPhone.value = user.phone_number || '';
  userForm.userRole.value = user.role;
  userForm.userPassword.value = '';
  userForm.userConfirmPassword.value = '';

  // When editing, password is optional
  userForm.userPassword.removeAttribute('required');
  userForm.userConfirmPassword.removeAttribute('required');

  clearAlert(formAlert);
}

function resetForm() {
  formTitle.textContent = 'Create New User';
  userForm.reset();
  userForm.userId.value = '';
  userForm.userPassword.setAttribute('required', 'required');
  userForm.userConfirmPassword.setAttribute('required', 'required');
  clearAlert(formAlert);
}

async function handleSubmit(event) {
  event.preventDefault();
  clearAlert(formAlert);

  const payload = collectFormData();
  const userId = userForm.userId.value;

  const validationError = validatePayload(payload, Boolean(userId));
  if (validationError) {
    showAlert(formAlert, 'error', validationError);
    return;
  }

  try {
    const url = userId ? `${API_BASE}/api/admin/users/${userId}` : `${API_BASE}/api/admin/users`;
    const method = userId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(formAlert, 'error', data.error || 'Failed to save user.');
      return;
    }

    showAlert(formAlert, 'success', data.message || 'User saved successfully.');
    await loadUsers();
    resetForm();
  } catch (error) {
    console.error('Save user request failed:', error);
    showAlert(formAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

function collectFormData() {
  return {
    name: userForm.userName.value.trim(),
    email: userForm.userEmail.value.trim(),
    phone_number: userForm.userPhone.value.trim(),
    role: userForm.userRole.value,
    password: userForm.userPassword.value,
    confirm_password: userForm.userConfirmPassword.value
  };
}

function validatePayload(data, isEdit) {
  if (!data.name) {
    return 'Name is required.';
  }
  if (!data.email) {
    return 'Email is required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'Invalid email format.';
  }
  if (!data.role) {
    return 'Role is required.';
  }
  const passwordProvided = data.password || data.confirm_password;
  if (!isEdit || passwordProvided) {
    if (!data.password || data.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (data.password !== data.confirm_password) {
      return 'Password and confirm password do not match.';
    }
  }
  return null;
}

function confirmDelete(user) {
  if (!confirm(`Delete user "${user.email}"?`)) {
    return;
  }
  deleteUser(user.id);
}

async function deleteUser(userId) {
  clearAlert(listAlert);
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      showAlert(listAlert, 'error', data.error || 'Failed to delete user.');
      return;
    }

    showAlert(listAlert, 'success', data.message || 'User deleted successfully.');
    await loadUsers();
  } catch (error) {
    console.error('Delete user failed:', error);
    showAlert(listAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

function showAlert(element, type, message) {
  element.hidden = false;
  element.textContent = message;
  element.classList.remove('success', 'error');
  element.classList.add(type);
}

function clearAlert(element) {
  element.hidden = true;
  element.textContent = '';
  element.classList.remove('success', 'error');
}

function formatDateTime(isoString) {
  if (!isoString) {
    return '—';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString();
}


