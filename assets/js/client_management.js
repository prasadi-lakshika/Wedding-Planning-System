document.addEventListener('DOMContentLoaded', () => {
  const clientForm = document.getElementById('clientForm');
  const clientTableBody = document.getElementById('clientTableBody');

  // Load projects from localStorage
  let projects = JSON.parse(localStorage.getItem('weddingProjects')) || [];

  function renderProjects() {
    clientTableBody.innerHTML = '';
    projects.forEach((project, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${project.brideName}</td>
        <td>${project.groomName}</td>
        <td>${project.weddingDate}</td>
        <td>${project.weddingType}</td>
        <td>${project.contactNumber || ''}</td>
        <td>${project.contactEmail || ''}</td>
        <td>
          <button class="edit-btn" data-index="${index}">Edit</button>
          <button class="delete-btn" data-index="${index}">Delete</button>
        </td>
      `;
      clientTableBody.appendChild(tr);
    });
  }

  function saveProjects() {
    localStorage.setItem('weddingProjects', JSON.stringify(projects));
  }

  clientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const brideName = document.getElementById('brideName').value.trim();
    const groomName = document.getElementById('groomName').value.trim();
    const weddingDate = document.getElementById('weddingDate').value;
    const weddingType = document.getElementById('weddingType').value;
    const contactNumber = document.getElementById('contactNumber').value.trim();
    const contactEmail = document.getElementById('contactEmail').value.trim();

    if (!brideName || !groomName || !weddingDate || !weddingType || !contactNumber || !contactEmail) {
      alert('Please fill in all fields.');
      return;
    }

    // Check if editing existing project
    const editIndex = clientForm.getAttribute('data-edit-index');
    if (editIndex !== null) {
      projects[editIndex] = { brideName, groomName, weddingDate, weddingType, contactNumber, contactEmail };
      clientForm.removeAttribute('data-edit-index');
    } else {
      projects.push({ brideName, groomName, weddingDate, weddingType, contactNumber, contactEmail });
    }

    saveProjects();
    renderProjects();
    clientForm.reset();
  });

  clientTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const index = e.target.getAttribute('data-index');
      const project = projects[index];
      document.getElementById('brideName').value = project.brideName;
      document.getElementById('groomName').value = project.groomName;
      document.getElementById('weddingDate').value = project.weddingDate;
      document.getElementById('weddingType').value = project.weddingType;
      document.getElementById('contactNumber').value = project.contactNumber || '';
      document.getElementById('contactEmail').value = project.contactEmail || '';
      clientForm.setAttribute('data-edit-index', index);
    } else if (e.target.classList.contains('delete-btn')) {
      const index = e.target.getAttribute('data-index');
      if (confirm('Are you sure you want to delete this project?')) {
        projects.splice(index, 1);
        saveProjects();
        renderProjects();
      }
    }
  });

  // Save selected project to localStorage for theme suggestions
  clientTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const index = e.target.getAttribute('data-index');
      localStorage.setItem('selectedProjectIndex', index);
    }
  });

  renderProjects();
});
