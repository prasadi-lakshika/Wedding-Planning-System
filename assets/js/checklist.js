let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let projects = JSON.parse(localStorage.getItem('weddingProjects')) || [];
let planners = JSON.parse(localStorage.getItem('weddingPlanners')) || [];

const list = document.getElementById('taskList');
const progressPercent = document.getElementById('progressPercent');
const projectSelect = document.getElementById('projectSelect');
const assigneeSelect = document.getElementById('assigneeSelect');
const statusSelect = document.getElementById('statusSelect');
const taskInput = document.getElementById('taskInput');
const addTaskForm = document.getElementById('addTaskForm');

let selectedProjectIndex = null;
let editTaskIndex = null;

// Populate project selector
function populateProjects() {
  projectSelect.innerHTML = '<option value="">Select a project</option>';
  projects.forEach((project, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${project.brideName} & ${project.groomName} (${project.weddingDate})`;
    projectSelect.appendChild(option);
  });
}

// Populate assignee selector with planners
function populateAssignees() {
  assigneeSelect.innerHTML = '<option value="">Select assignee</option>';
  planners.filter(p => p.role === 'planner').forEach(planner => {
    const option = document.createElement('option');
    option.value = planner.email;
    option.textContent = planner.name || planner.email;
    assigneeSelect.appendChild(option);
  });
}

// Filter tasks by selected project
function getFilteredTasks() {
  if (selectedProjectIndex === null || selectedProjectIndex === '') return [];
  return tasks.filter(t => t.projectIndex == selectedProjectIndex);
}

// Render tasks list
function renderTasks() {
  list.innerHTML = '';
  const filteredTasks = getFilteredTasks();
  filteredTasks.forEach((t, idx) => {
    const globalIndex = tasks.findIndex(task => task === t);
    list.innerHTML += `
      <li>
        <input type="checkbox" ${t.status === 'completed' ? 'checked' : ''} onchange="toggleStatus(${globalIndex}, this.checked)">
        <span class="${t.status === 'completed' ? 'completed' : ''}">
          ${t.text} <em style="font-size:0.9em; color:#555;">(Assigned to: ${getAssigneeName(t.assignee)})</em> - <strong>Status:</strong> ${formatStatus(t.status)}
        </span>
        <button onclick="editTask(${globalIndex})">Edit</button>
        <button onclick="removeTask(${globalIndex})">Delete</button>
      </li>
    `;
  });
  updateProgress();
}

// Get assignee display name
function getAssigneeName(email) {
  const planner = planners.find(p => p.email === email);
  return planner ? (planner.name || planner.email) : 'Unassigned';
}

// Format status for display
function formatStatus(status) {
  switch(status) {
    case 'pending': return 'Pending';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    default: return status;
  }
}

// Update progress percentage
function updateProgress() {
  const filteredTasks = getFilteredTasks();
  if (filteredTasks.length === 0) {
    progressPercent.textContent = '0%';
    return;
  }
  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
  const percent = Math.round((completedCount / filteredTasks.length) * 100);
  progressPercent.textContent = percent + '%';
}

// Toggle task status via checkbox
window.toggleStatus = (index, checked) => {
  tasks[index].status = checked ? 'completed' : 'pending';
  saveTasks();
  renderTasks();
};

// Remove task
window.removeTask = (index) => {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
};

// Edit task
window.editTask = (index) => {
  const task = tasks[index];
  selectedProjectIndex = task.projectIndex;
  projectSelect.value = selectedProjectIndex;
  taskInput.value = task.text;
  assigneeSelect.value = task.assignee;
  statusSelect.value = task.status;
  editTaskIndex = index;
};

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Add or update task form submit
addTaskForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const taskText = taskInput.value.trim();
  const assignee = assigneeSelect.value;
  const status = statusSelect.value;
  const projectIndex = projectSelect.value;

  if (!taskText || !assignee || !status || projectIndex === '') {
    alert('Please fill all fields.');
    return;
  }

  if (editTaskIndex !== null) {
    // Update existing task
    tasks[editTaskIndex] = { text: taskText, assignee, status, projectIndex };
    editTaskIndex = null;
  } else {
    // Add new task
    tasks.push({ text: taskText, assignee, status, projectIndex });
  }

  saveTasks();
  renderTasks();
  addTaskForm.reset();
  projectSelect.value = projectIndex; // keep project selected
});

// Handle project selection change
projectSelect.addEventListener('change', () => {
  selectedProjectIndex = projectSelect.value;
  renderTasks();
});

// Real-time update notification using storage event
window.addEventListener('storage', (event) => {
  if (event.key === 'tasks') {
    tasks = JSON.parse(event.newValue) || [];
    renderTasks();
  }
});

// Initialize
populateProjects();
populateAssignees();
renderTasks();
