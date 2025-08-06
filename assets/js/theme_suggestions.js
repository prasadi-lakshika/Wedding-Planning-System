
document.addEventListener('DOMContentLoaded', () => {
  const themeForm = document.getElementById('themeForm');
  const projectSelect = document.getElementById('projectSelect');
  const weddingTypeSelect = document.getElementById('weddingType');
  const brideColorInput = document.getElementById('brideColor');
  const selectedColorPreview = document.getElementById('selectedColorPreview');
  const suggestionsResult = document.getElementById('suggestionsResult');
  const menuSuggestions = document.getElementById('menuSuggestions');
  const venueSuggestions = document.getElementById('venueSuggestions');
  const saveBtn = document.getElementById('saveSuggestionsBtn');

  // Load projects from localStorage and populate project selector
  let projects = JSON.parse(localStorage.getItem('weddingProjects')) || [];
  projects.forEach((project, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${project.brideName} & ${project.groomName} (${project.weddingDate})`;
    projectSelect.appendChild(option);
  });

  // Load selected project details if any
  let selectedIndex = localStorage.getItem('selectedProjectIndex');
  if (selectedIndex !== null && projects[selectedIndex]) {
    projectSelect.value = selectedIndex;
    loadProjectDetails(selectedIndex);
  }

  projectSelect.addEventListener('change', () => {
    selectedIndex = projectSelect.value;
    if (selectedIndex !== '') {
      loadProjectDetails(selectedIndex);
      localStorage.setItem('selectedProjectIndex', selectedIndex);
    }
  });

  themeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const weddingType = weddingTypeSelect.value.toLowerCase();
    const brideColor = brideColorInput.value;
    generateSuggestions(weddingType, brideColor);
  });

  saveBtn.addEventListener('click', () => {
    if (selectedIndex === '' || selectedIndex === null) {
      alert('Please select a project to save suggestions.');
      return;
    }
    const project = projects[selectedIndex];
    project.weddingType = weddingTypeSelect.value;
    project.brideColor = brideColorInput.value;
    project.suggestions = {
      groom: document.querySelector('#suggestionsResult li:nth-child(1) span').style.backgroundColor,
      bridesmaids: document.querySelector('#suggestionsResult li:nth-child(2) span').style.backgroundColor,
      flowers: document.querySelector('#suggestionsResult li:nth-child(3) span').style.backgroundColor,
      hall: document.querySelector('#suggestionsResult li:nth-child(4) span').style.backgroundColor,
      menu: menuSuggestions.textContent,
      venue: venueSuggestions.textContent
    };
    projects[selectedIndex] = project;
    localStorage.setItem('weddingProjects', JSON.stringify(projects));
    alert('Suggestions saved successfully.');
  });

  function loadProjectDetails(index) {
    const project = projects[index];
    weddingTypeSelect.value = project.weddingType ? project.weddingType.toLowerCase() : '';
    brideColorInput.value = project.brideColor || '#e5c100';
    generateSuggestions(weddingTypeSelect.value, brideColorInput.value);
  }

  let themeRules = {};

  fetch('assets/data/theme_rules.json')
    .then(response => response.json())
    .then(data => {
      themeRules = data;
      // Load initial suggestions if project selected
      let selectedIndex = localStorage.getItem('selectedProjectIndex');
      if (selectedIndex !== null && projects[selectedIndex]) {
        loadProjectDetails(selectedIndex);
      }
    })
    .catch(error => {
      console.error('Error loading theme rules:', error);
    });

  function generateSuggestions(type, color) {
    type = type.toLowerCase();
    let suggestions = {};
    let menu = '';
    let venue = '';

    if (themeRules[type]) {
      suggestions = themeRules[type].colors;
      menu = themeRules[type].menu;
      venue = themeRules[type].venue;
    } else {
      suggestions = themeRules['default'].colors;
      suggestions.groom = color;
      menu = themeRules['default'].menu;
      venue = themeRules['default'].venue;
    }

    suggestionsResult.innerHTML =
      `<h3>Suggestions</h3>
       <ul>
        <li>Groom: <span style="background:${suggestions.groom};padding:0 14px;border-radius:4px;">${suggestions.groom}</span></li>
        <li>Bridesmaids: <span style="background:${suggestions.bridesmaids};padding:0 14px;border-radius:4px;">${suggestions.bridesmaids}</span></li>
        <li>Flowers: <span style="background:${suggestions.flowers};padding:0 14px;border-radius:4px;">${suggestions.flowers}</span></li>
        <li>Hall Decor: <span style="background:${suggestions.hall};padding:0 14px;border-radius:4px;">${suggestions.hall}</span></li>
       </ul>`;

    menuSuggestions.innerHTML =
      `<h3>Menu Recommendations</h3><p>${menu}</p>`;

    venueSuggestions.innerHTML =
      `<h3>Venue Suggestions</h3><p>${venue}</p>`;
  }
});
