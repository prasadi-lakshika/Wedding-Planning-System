const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const auth = await verifyAdminAccess();
    if (!auth) {
      return;
    }

    sharedNavigation.handlePageNavigation('admin', 'true');
    attachEventListeners();
    await loadProfile();
  } catch (error) {
    console.error('Profile initialization error:', error);
    showAlert(businessAlert, 'error', 'Failed to load profile data. Please refresh and try again.');
  }
});

const businessAlert = document.getElementById('businessAlert');
const adminAlert = document.getElementById('adminAlert');
const passwordAlert = document.getElementById('passwordAlert');

const businessForm = document.getElementById('businessForm');
const adminForm = document.getElementById('adminForm');
const passwordForm = document.getElementById('passwordForm');
const businessCancelBtn = document.getElementById('businessCancelBtn');
const adminCancelBtn = document.getElementById('adminCancelBtn');

const companyFields = {
  company_name: document.getElementById('companyName'),
  company_email: document.getElementById('companyEmail'),
  company_phone: document.getElementById('companyPhone'),
  company_address: document.getElementById('companyAddress'),
  company_description: document.getElementById('companyDescription')
};

const adminFields = {
  name: document.getElementById('adminName'),
  username: document.getElementById('adminUsername'),
  email: document.getElementById('adminEmail'),
  phone_number: document.getElementById('adminPhone'),
  address: document.getElementById('adminAddress')
};

const timestampLabel = document.getElementById('profileUpdatedAt');

async function verifyAdminAccess() {
  try {
    const response = await fetch(`${API_BASE}/auth/check-auth`, {
      method: 'GET',
      credentials: 'include'
    });

    if (response.status !== 200) {
      redirectToHome('Please log in as an administrator to access Profile.');
      return false;
    }

    const data = await response.json();
    if (!data.authenticated || !data.user || data.user.role !== 'admin') {
      redirectToHome('Access denied. Admin privileges required.');
      return false;
    }

    // Keep local storage aligned for shared navigation
    localStorage.setItem('userRole', data.user.role);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', data.user.name || data.user.username || '');
    localStorage.setItem('userEmail', data.user.email || '');

    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    redirectToHome('Session expired. Please log in again.');
    return false;
  }
}

function redirectToHome(message) {
  alert(message);
  window.location.href = 'index.html';
}

function attachEventListeners() {
  businessForm.addEventListener('submit', handleBusinessSubmit);
  adminForm.addEventListener('submit', handleAdminSubmit);
  businessCancelBtn.addEventListener('click', async () => {
    await loadProfile();
    showAlert(businessAlert, 'success', 'Business changes discarded.');
  });
  adminCancelBtn.addEventListener('click', async () => {
    await loadProfile();
    showAlert(adminAlert, 'success', 'Administrator changes discarded.');
  });
  passwordForm.addEventListener('submit', handlePasswordSubmit);
}

async function loadProfile() {
  clearAlert(businessAlert);
  clearAlert(adminAlert);
  const response = await fetch(`${API_BASE}/api/admin/profile`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Profile fetch failed with status ${response.status}`);
  }

  const data = await response.json();
  populateProfileForm(data);
}

function populateProfileForm(data) {
  const { admin = {}, company = {}, metadata = {} } = data;

  Object.entries(companyFields).forEach(([key, element]) => {
    element.value = company[key] || '';
  });

  Object.entries(adminFields).forEach(([key, element]) => {
    element.value = admin[key] || '';
  });

  if (metadata.updated_at) {
    const updatedDate = new Date(metadata.updated_at);
    if (!Number.isNaN(updatedDate.getTime())) {
      timestampLabel.textContent = `Last updated: ${updatedDate.toLocaleString()}`;
      timestampLabel.hidden = false;
    } else {
      timestampLabel.hidden = true;
    }
  } else {
    timestampLabel.hidden = true;
  }
}

async function handleBusinessSubmit(event) {
  event.preventDefault();
  clearAlert(businessAlert);

  const payload = {
    company: collectValues(companyFields)
  };

  try {
    const response = await fetch(`${API_BASE}/api/admin/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.error || 'Failed to update business information.';
      showAlert(businessAlert, 'error', message);
      return;
    }

    showAlert(businessAlert, 'success', data.message || 'Business information updated.');
    if (data.profile) {
      populateProfileForm({
        admin: {
          name: data.profile.name,
          username: data.profile.username,
          email: data.profile.email,
          phone_number: data.profile.phone_number,
          address: data.profile.address
        },
        company: {
          company_name: data.profile.company_name,
          company_email: data.profile.company_email,
          company_phone: data.profile.company_phone,
          company_address: data.profile.company_address,
          company_description: data.profile.company_description
        },
        metadata: {
          updated_at: data.profile.updated_at
        }
      });
    }
  } catch (error) {
    console.error('Business update failed:', error);
    showAlert(businessAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

async function handleAdminSubmit(event) {
  event.preventDefault();
  clearAlert(adminAlert);

  const payload = {
    admin: collectValues(adminFields)
  };

  try {
    const response = await fetch(`${API_BASE}/api/admin/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.error || 'Failed to update administrator details.';
      showAlert(adminAlert, 'error', message);
      return;
    }

    showAlert(adminAlert, 'success', data.message || 'Administrator information updated.');
    if (data.profile) {
      populateProfileForm({
        admin: {
          name: data.profile.name,
          username: data.profile.username,
          email: data.profile.email,
          phone_number: data.profile.phone_number,
          address: data.profile.address
        },
        company: {
          company_name: data.profile.company_name,
          company_email: data.profile.company_email,
          company_phone: data.profile.company_phone,
          company_address: data.profile.company_address,
          company_description: data.profile.company_description
        },
        metadata: {
          updated_at: data.profile.updated_at
        }
      });
    }
  } catch (error) {
    console.error('Administrator update failed:', error);
    showAlert(adminAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  clearAlert(passwordAlert);

  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  try {
    const response = await fetch(`${API_BASE}/api/admin/profile/password`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.error || 'Failed to update password.';
      showAlert(passwordAlert, 'error', message);
      return;
    }

    showAlert(passwordAlert, 'success', data.message || 'Password updated successfully.');
    passwordForm.reset();
  } catch (error) {
    console.error('Password update failed:', error);
    showAlert(passwordAlert, 'error', 'An unexpected error occurred. Please try again.');
  }
}

function collectValues(mapping) {
  return Object.entries(mapping).reduce((acc, [key, element]) => {
    acc[key] = element.value.trim();
    return acc;
  }, {});
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

