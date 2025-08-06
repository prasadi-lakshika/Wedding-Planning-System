let budget = JSON.parse(localStorage.getItem('budget')) || [];
let projects = JSON.parse(localStorage.getItem('weddingProjects')) || [];

const projectSelect = document.getElementById('projectSelect');
const categoryInput = document.getElementById('category');
const plannedInput = document.getElementById('planned');
const actualInput = document.getElementById('actual');
const budgetList = document.getElementById('budgetList');
const generateReportBtn = document.getElementById('generateReportBtn');

let selectedProjectIndex = null;

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

// Filter budget items by selected project
function getFilteredBudget() {
  if (selectedProjectIndex === null || selectedProjectIndex === '') return [];
  return budget.filter(b => b.projectIndex == selectedProjectIndex);
}

// Render budget table
function renderBudget() {
  let totalPlan = 0, totalActual = 0;
  let html = `<table><tr><th>Category</th><th>Planned</th><th>Actual</th><th>Progress</th><th></th></tr>`;

  const filteredBudget = getFilteredBudget();

  filteredBudget.forEach((b, idx) => {
    const percent = Math.min(100, b.actual / b.planned * 100).toFixed(1);
    const alert = percent >= 80 ? " (⚠ 80%+ Used)" : "";
    html += `
      <tr>
        <td>${b.category}</td>
        <td>Rs.${b.planned}</td>
        <td>Rs.${b.actual}</td>
        <td>
          <div style="background:#ececec;width:100px;height:14px;border-radius:7px;display:inline-block;overflow:hidden;vertical-align:middle;">
            <div style="background: #d4af37; width:${percent}%;height:100%;"></div>
          </div>
          ${percent}%${alert}
        </td>
        <td><button onclick="del(${idx})">Delete</button></td>
      </tr>
    `;
    totalPlan += Number(b.planned);
    totalActual += Number(b.actual);
  });
  html += `</table>
    <br><strong>Total Planned:</strong> Rs.${totalPlan}<br>
         <strong>Total Actual:</strong> Rs.${totalActual}`;
  budgetList.innerHTML = html;
}

// Delete budget item
window.del = idx => {
  const filteredBudget = getFilteredBudget();
  const itemToDelete = filteredBudget[idx];
  const globalIndex = budget.findIndex(b => b === itemToDelete);
  if (globalIndex > -1) {
    budget.splice(globalIndex, 1);
    localStorage.setItem('budget', JSON.stringify(budget));
    renderBudget();
  }
};

// Add/update budget item form submit
document.getElementById('budgetForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const category = categoryInput.value.trim();
  const planned = parseFloat(plannedInput.value);
  const actual = parseFloat(actualInput.value);
  const projectIndex = projectSelect.value;

  if (!category || planned <= 0 || actual < 0 || projectIndex === '') {
    alert('Please fill all fields correctly.');
    return;
  }

  // Check if item exists for this project and category
  const existingIndex = budget.findIndex(b => b.projectIndex == projectIndex && b.category.toLowerCase() === category.toLowerCase());
  if (existingIndex > -1) {
    budget[existingIndex] = { category, planned, actual, projectIndex };
  } else {
    budget.push({ category, planned, actual, projectIndex });
  }

  localStorage.setItem('budget', JSON.stringify(budget));
  renderBudget();
  this.reset();
  projectSelect.value = projectIndex; // keep project selected
});

// Handle project selection change
projectSelect.addEventListener('change', () => {
  selectedProjectIndex = projectSelect.value;
  renderBudget();
});

// Generate PDF expense report
generateReportBtn.addEventListener('click', () => {
  const filteredBudget = getFilteredBudget();
  if (filteredBudget.length === 0) {
    alert('No budget data available to generate report.');
    return;
  }

  // Use jsPDF to generate PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Expense Report', 14, 22);

  const tableColumn = ["Category", "Planned Amount (Rs.)", "Actual Amount (Rs.)", "Difference (Rs.)"];
  const tableRows = [];

  filteredBudget.forEach(b => {
    const diff = b.planned - b.actual;
    const row = [
      b.category,
      b.planned.toFixed(2),
      b.actual.toFixed(2),
      diff.toFixed(2)
    ];
    tableRows.push(row);
  });

  // AutoTable plugin can be used if available, else simple table
  if (doc.autoTable) {
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });
  } else {
    // Simple table fallback
    let y = 30;
    doc.setFontSize(12);
    doc.text(tableColumn.join(' | '), 14, y);
    y += 10;
    tableRows.forEach(row => {
      doc.text(row.join(' | '), 14, y);
      y += 10;
    });
  }

  doc.save('expense_report.pdf');
});

// Initialize
populateProjects();
renderBudget();
