// Enhanced Theme Suggestions JavaScript with Authentication Fix
// Version: 2.0 - Project field is now optional
// Updated: Project selection is no longer required for theme suggestions
document.addEventListener('DOMContentLoaded', () => {
  const themeForm = document.getElementById('themeForm');
  const projectSelect = document.getElementById('projectSelect');
  const weddingTypeSelect = document.getElementById('weddingType');
  const weddingTypeInfo = document.getElementById('weddingTypeInfo');
  const brideColorInput = document.getElementById('brideColor');
  const brideColorText = document.getElementById('brideColorText');
  const colorPreview = document.getElementById('colorPreview');
  const colorInfo = document.getElementById('colorInfo');
  const suggestionsResult = document.getElementById('suggestionsResult');
  const menuSuggestions = document.getElementById('menuSuggestions');
  const venueSuggestions = document.getElementById('venueSuggestions');
  const saveBtn = document.getElementById('saveSuggestionsBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const suggestionManagement = document.getElementById('suggestionManagement');

  // State management
  let projects = [];
  let selectedProjectId = null;
  let weddingTypes = [];
  let availableColors = [];
  let suggestionHistory = JSON.parse(localStorage.getItem('suggestionHistory')) || [];
  let latestSuggestionResult = null;

  // Initialize the page
  initializePage();

  async function initializePage() {
    console.log('=== INITIALIZING THEME SUGGESTIONS PAGE ===');
    console.log('localStorage.isLoggedIn:', localStorage.getItem('isLoggedIn'));
    console.log('localStorage.userEmail:', localStorage.getItem('userEmail'));
    console.log('localStorage.userRole:', localStorage.getItem('userRole'));
    
    try {
      // Load projects from database (original simple approach)
      console.log('Step 1: Loading projects from database...');
      await loadProjectsFromDatabase();
      
      console.log('Projects loaded count:', projects.length);
      if (projects.length === 0) {
        console.warn('No projects available after loading');
      }
      
      // Load wedding types from API
      console.log('Step 2: Loading wedding types...');
      await loadWeddingTypes();
      
      // Set up event listeners
      console.log('Step 3: Setting up event listeners...');
      setupEventListeners();
      
      // Load selected project if any
      console.log('Step 4: Checking for saved project selection...');
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId && projects.length > 0) {
        console.log('Found saved project ID:', savedProjectId);
        // Convert string to integer for consistent comparison
        const projectIdInt = parseInt(savedProjectId, 10);
        if (!isNaN(projectIdInt)) {
          const project = projects.find(p => p.id === projectIdInt);
          console.log('Looking for project with ID:', projectIdInt);
          console.log('Available project IDs:', projects.map(p => p.id));
          if (project) {
            console.log('Found saved project:', project);
            projectSelect.value = project.id.toString();
            await loadProjectDetails(project.id);
          } else {
            console.warn('Saved project ID not found in loaded projects');
          }
        } else {
          console.warn('Invalid saved project ID:', savedProjectId);
        }
      } else {
        console.log('No saved project or no projects available');
      }
      
      console.log('=== PAGE INITIALIZATION COMPLETE ===');
      
    } catch (error) {
      console.error('=== INITIALIZATION ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      showError('Failed to initialize page. Please refresh and try again.');
    }
  }

  async function verifyAuthenticationStatus() {
    console.log('Verifying authentication status...');
    
    try {
      // First check localStorage
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (!isLoggedIn || isLoggedIn !== 'true') {
        return { isAuthenticated: false, error: 'Not logged in according to localStorage' };
      }

      // Verify with backend
      const response = await fetch('http://localhost:5000/auth/check-auth', {
        method: 'GET',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Auth check response status:', response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        console.log('Auth check successful:', data);
        
        // Update localStorage with current session data
        if (data.user) {
          localStorage.setItem('userRole', data.user.role || 'planner');
          localStorage.setItem('userName', data.user.name || '');
          localStorage.setItem('userEmail', data.user.email || '');
          localStorage.setItem('userUsername', data.user.username || '');
          localStorage.setItem('isLoggedIn', 'true');
        }
        
        return { isAuthenticated: true, user: data.user };
      } else if (response.status === 401) {
        // Session expired, clear localStorage
        clearAuthenticationData();
        return { 
          isAuthenticated: false, 
          error: 'Session expired. Please log in again.' 
        };
      } else {
        return { 
          isAuthenticated: false, 
          error: `Auth check failed with status ${response.status}` 
        };
      }
      
    } catch (error) {
      console.error('Auth verification error:', error);
      return { 
        isAuthenticated: false, 
        error: `Auth verification failed: ${error.message}` 
      };
    }
  }

  function clearAuthenticationData() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userUsername');
    localStorage.removeItem('isLoggedIn');
  }

  function handleAuthenticationError(error) {
    projectSelect.innerHTML = '<option value="">Authentication failed</option>';
    showError(`Authentication error: ${error}. Please log in again.`);
    
    // Show login button
    const loginBtn = document.getElementById('openLogin');
    if (loginBtn) {
      loginBtn.style.display = 'block';
    }
    
    // Hide logout link
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
      logoutLink.style.display = 'none';
    }
  }

  async function loadProjectsFromDatabase() {
    console.log('Loading projects from database...');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    console.log('isLoggedIn value:', isLoggedIn, 'type:', typeof isLoggedIn);
    
    if (!isLoggedIn) {
      console.error('User not logged in - localStorage.isLoggedIn is:', isLoggedIn);
      projectSelect.innerHTML = '<option value="">Please log in first</option>';
      showError('Please log in to access projects.');
      return;
    }
    
    try {
      const userEmail = localStorage.getItem('userEmail');
      const userRole = localStorage.getItem('userRole');
      
      if (!userEmail) {
        throw new Error('User session expired. Please log in again.');
      }
      
      console.log('User logged in as:', userEmail, 'Role:', userRole);
      
      // Load projects from database using session authentication
      const response = await fetch('http://localhost:5000/api/projects/theme-suggestions', {
        method: 'GET',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view projects.');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      latestSuggestionResult = data;
      console.log('Projects data received:', data);
      console.log('Data type:', typeof data);
      console.log('Data.projects:', data.projects);
      console.log('Is array?', Array.isArray(data.projects));
      
      if (!data.projects || !Array.isArray(data.projects)) {
        console.error('Invalid projects data:', data);
        console.error('Data structure:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response format from server');
      }
      
      projects = data.projects;
      console.log(`Projects loaded: ${projects.length} projects`);
      console.log('Projects details:', projects.map(p => ({ id: p.id, bride_name: p.bride_name, groom_name: p.groom_name })));
      
      // Populate project dropdown
      projectSelect.innerHTML = '<option value="">Select a project (optional)</option>';
      
      // Check if projects array is empty
      if (projects.length === 0) {
        console.warn('No projects found for current user');
        // Allow form to work without projects since project selection is now optional
        console.log('No projects available. Theme suggestions can still be generated without selecting a project.');
        return;
      }
      projects.forEach(project => {
        console.log('Adding project to dropdown:', project);
        // Validate project has required fields
        if (!project.id) {
          console.error('Project missing ID:', project);
          return;
        }
        if (!project.bride_name || !project.groom_name) {
          console.error('Project missing names:', project);
          return;
        }
        
        const option = document.createElement('option');
        // Ensure value is string for HTML select element
        option.value = project.id.toString();
        const weddingDate = project.wedding_date || 'Date TBD';
        option.textContent = `${project.bride_name} & ${project.groom_name} (${weddingDate})`;
        projectSelect.appendChild(option);
        console.log('Added option:', option.value, option.textContent);
      });

      console.log(`Successfully loaded ${projects.length} projects from database`);
      
    } catch (error) {
      console.error('Error loading projects:', error);
      
      // Show appropriate error message
      let errorMessage = 'Failed to load projects. ';
      if (error.message.includes('Session expired')) {
        errorMessage += 'Please log out and log in again.';
      } else if (error.message.includes('Access denied')) {
        errorMessage += 'You do not have permission to view projects.';
      } else if (error.message.includes('Server error')) {
        errorMessage += 'Server is not responding. Please check if the backend is running.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      projectSelect.innerHTML = '<option value="">Error loading projects</option>';
      showError(errorMessage);
    }
  }

  async function loadWeddingTypes() {
    try {
      weddingTypeSelect.innerHTML = '<option value="">Loading wedding types...</option>';
      
      const response = await fetch('http://localhost:5000/api/wedding/wedding-types');
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        // Try to parse error as JSON
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
        } catch (parseError) {
          throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
        }
      }
      
      const data = await response.json();
      console.log('Wedding types response:', data);
      
      if (!data.wedding_types || !Array.isArray(data.wedding_types)) {
        throw new Error('Invalid response format from server');
      }
      
      weddingTypes = data.wedding_types;
      
      // Populate wedding type dropdown
      weddingTypeSelect.innerHTML = '<option value="">Select wedding type...</option>';
      weddingTypes.forEach(wt => {
        const option = document.createElement('option');
        option.value = wt.name;
        option.textContent = `${wt.name} (${wt.available_colors} colors)`;
        option.dataset.description = wt.description;
        option.dataset.hasRestrictions = wt.has_restrictions;
        weddingTypeSelect.appendChild(option);
      });
      
      console.log(`Loaded ${weddingTypes.length} wedding types`);
      
    } catch (error) {
      console.error('Error loading wedding types:', error);
      weddingTypeSelect.innerHTML = '<option value="">Error loading wedding types</option>';
      
      // Show detailed error message
      const errorMessage = error.message || 'Unknown error occurred';
      showError(`Failed to load wedding types: ${errorMessage}. Please check if the backend server is running on http://localhost:5000`);
    }
  }

  function setupEventListeners() {
    // Project selection - OPTIONAL field
    // Users can submit the form without selecting a project
    projectSelect.addEventListener('change', async () => {
      const value = projectSelect.value;
      console.log('Project selection changed:', value);
      if (value !== '' && value !== null) {
        // Convert string to integer for consistent comparison
        selectedProjectId = parseInt(value, 10);
        console.log('Project selected:', selectedProjectId);
        await loadProjectDetails(selectedProjectId);
        localStorage.setItem('selectedProjectId', selectedProjectId.toString());
      } else {
        selectedProjectId = null;
        console.log('No project selected - this is allowed');
        localStorage.removeItem('selectedProjectId');
      }
    });

    // Wedding type selection
    weddingTypeSelect.addEventListener('change', async () => {
      const selectedOption = weddingTypeSelect.options[weddingTypeSelect.selectedIndex];
      if (selectedOption.value) {
        showWeddingTypeInfo(selectedOption);
        await loadAvailableColors(selectedOption.value);
      } else {
        hideWeddingTypeInfo();
        hideColorInfo();
      }
    });

    // Color inputs
    brideColorInput.addEventListener('input', updateColorPreview);
    brideColorText.addEventListener('input', updateColorFromText);

    // Form submission
    themeForm.addEventListener('submit', handleFormSubmission);

    // Save button
    saveBtn.addEventListener('click', saveSuggestions);

    // Management buttons
    document.getElementById('compareSuggestionsBtn').addEventListener('click', compareSuggestions);
    document.getElementById('exportSuggestionsBtn').addEventListener('click', exportSuggestions);
    document.getElementById('shareSuggestionsBtn').addEventListener('click', shareSuggestions);
  }

  function showWeddingTypeInfo(option) {
    const description = option.dataset.description;
    const hasRestrictions = option.dataset.hasRestrictions === 'true';
    
    weddingTypeInfo.innerHTML = `
      <small>${description}</small>
      ${hasRestrictions ? '<br><small style="color: #ff6b6b;">Some colors may be restricted for this wedding type</small>' : ''}
    `;
    weddingTypeInfo.style.display = 'block';
  }

  function hideWeddingTypeInfo() {
    weddingTypeInfo.style.display = 'none';
  }

  async function loadAvailableColors(weddingType) {
    try {
      const response = await fetch(`http://localhost:5000/api/wedding/colors/${encodeURIComponent(weddingType)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      availableColors = data.colors;
      
      showColorInfo();
      
    } catch (error) {
      console.error('Error loading colors:', error);
      hideColorInfo();
    }
  }

  function showColorInfo() {
    const colorCount = availableColors.length;
    const restrictedCount = availableColors.filter(c => c.restricted_colours).length;
    
    colorInfo.innerHTML = `
      <small>Available colors: ${colorCount}</small>
      ${restrictedCount > 0 ? `<br><small style="color: #ff6b6b;">Restricted colors: ${restrictedCount}</small>` : ''}
    `;
    colorInfo.style.display = 'block';
  }

  function hideColorInfo() {
    colorInfo.style.display = 'none';
  }

  function updateColorPreview() {
    const color = brideColorInput.value;
    colorPreview.style.backgroundColor = color;
    brideColorText.value = '';
  }

  function updateColorFromText() {
    const colorName = brideColorText.value.toLowerCase();
    const color = availableColors.find(c => c.colour_name.toLowerCase().includes(colorName));
    
    if (color && color.rgb) {
      const hex = rgbToHex(color.rgb);
      if (hex) {
        brideColorInput.value = hex;
        colorPreview.style.backgroundColor = hex;
      }
    }
  }

  function rgbToHex(rgb) {
    try {
      const [r, g, b] = rgb.split(',').map(x => parseInt(x.trim()));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return null;
    }
  }

  async function handleFormSubmission(e) {
    e.preventDefault();
    
    console.log('=== FORM SUBMISSION STARTED ===');
    const weddingType = weddingTypeSelect.value;
    const brideColor = brideColorInput.value;
    const projectIdValue = projectSelect.value;
    
    console.log('Wedding Type:', weddingType);
    console.log('Bride Color:', brideColor);
    console.log('Project ID Value:', projectIdValue);
    
    // Project is now optional - allow empty/null values
    const projectId = (projectIdValue && projectIdValue !== '' && projectIdValue !== null) 
      ? parseInt(projectIdValue, 10) 
      : null;
    
    console.log('Parsed Project ID:', projectId);
    console.log('Project is optional - proceeding with or without project');
    
    if (!weddingType) {
      showError('Please select a wedding type.');
      return;
    }
    
    if (!brideColor) {
      showError('Please select or enter a bride color.');
      return;
    }
    
    console.log('All validations passed. Calling API with projectId:', projectId);
    await generateSuggestionsFromAPI(weddingType, brideColor, projectId);
  }

  async function generateSuggestionsFromAPI(weddingType, brideColor, projectId) {
    console.log('=== GENERATING SUGGESTIONS ===');
    console.log('Parameters - Wedding Type:', weddingType, 'Bride Color:', brideColor, 'Project ID:', projectId);
    
    // Show loading indicator
    showLoading(true);
    hideResults();
    
    try {
      // Prepare request body - project_id is optional
      const requestBody = {
        wedding_type: weddingType,
        bride_colour: brideColor
      };
      
      // Only include project_id if a project is selected
      if (projectId !== null && projectId !== undefined && projectId !== '') {
        console.log('Project ID provided:', projectId, 'Type:', typeof projectId);
        // Ensure projectId is an integer for consistent comparison
        const projectIdInt = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
        const project = projects.find(p => p.id === projectIdInt);
        if (project) {
          requestBody.project_id = project.id;
          console.log('Project found, including project_id in request:', project.id);
        } else {
          console.warn('Project not found with ID:', projectIdInt, 'Continuing without project...');
        }
      } else {
        console.log('No project ID provided - proceeding without project (this is allowed)');
      }
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('http://localhost:5000/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Debug: Log restriction message
      console.log('=== API RESPONSE ===');
      console.log('Restriction message:', data.restriction_message);
      console.log('Original bride colour:', data.original_bride_colour);
      console.log('Full response data:', data);
      
      // Store in suggestion history
      suggestionHistory.unshift({
        timestamp: new Date().toISOString(),
        projectId: projectId,
        weddingType: weddingType,
        brideColor: brideColor,
        suggestions: data
      });
      
      // Keep only last 10 suggestions
      if (suggestionHistory.length > 10) {
        suggestionHistory = suggestionHistory.slice(0, 10);
      }
      
      localStorage.setItem('suggestionHistory', JSON.stringify(suggestionHistory));
      
      // Display enhanced suggestions
      displayEnhancedSuggestions(data);
      
      // Show management options
      suggestionManagement.style.display = 'block';
      
    } catch (error) {
      console.error('Error getting suggestions:', error);
      showError(`Failed to get suggestions: ${error.message}`);
    } finally {
      showLoading(false);
    }
  }

  function displayEnhancedSuggestions(data) {
    const confidence = data.suggestion_confidence || 0;
    const confidencePercent = Math.round(confidence * 100);
    const confidenceColor = confidence > 0.8 ? '#28a745' : confidence > 0.6 ? '#ffc107' : '#dc3545';
    
    // Check if there's a restriction message
    const restrictionMessage = data.restriction_message;
    console.log('=== DISPLAY SUGGESTIONS ===');
    console.log('Restriction message from data:', restrictionMessage);
    console.log('Type of restriction message:', typeof restrictionMessage);
    console.log('Is restriction message truthy?', !!restrictionMessage);
    
    // Build restriction alert HTML if message exists
    let restrictionAlert = '';
    if (restrictionMessage) {
      console.log('Building restriction alert HTML with message:', restrictionMessage);
      restrictionAlert = `
      <div class="restriction-alert" style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin-bottom: 20px; color: #856404; display: block !important; visibility: visible !important;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 24px; line-height: 1.2;">⚠️</span>
          <div style="flex: 1;">
            <strong style="display: block; margin-bottom: 8px; font-size: 16px; color: #856404;">Color Restriction Notice</strong>
            <p style="margin: 0; line-height: 1.6; font-size: 14px; color: #856404;">${restrictionMessage}</p>
          </div>
        </div>
      </div>
      `;
      console.log('Restriction alert HTML created:', restrictionAlert.substring(0, 100) + '...');
    } else {
      console.log('No restriction message - skipping alert');
    }

    // Build the main HTML content
    const mainContent = `
      <div class="suggestions-header">
        <h3>Wedding Theme Suggestions</h3>
        <div class="confidence-indicator">
          <span class="confidence-label">Confidence:</span>
          <span class="confidence-value" style="color: ${confidenceColor}">${confidencePercent}%</span>
        </div>
      </div>
      
      ${restrictionAlert}
      
      <div class="color-palette-section">
        <h4>Color Palette</h4>
        <div class="color-grid">
          ${generateColorCard('Bride', data.bride_colour_mapped, data.color_details?.bride_colour)}
          ${generateColorCard('Groom', data.groom_colour, data.color_details?.groom_colour)}
          ${generateColorCard('Bridesmaids', data.bridesmaids_colour, data.color_details?.bridesmaids_colour)}
          ${generateColorCard('Best Men', data.best_men_colour, data.color_details?.best_men_colour)}
          ${generateColorCard('Flower Decor', data.flower_deco_colour, data.color_details?.flower_deco_colour)}
          ${generateColorCard('Hall Decor', data.hall_decor_colour, data.color_details?.hall_decor_colour)}
        </div>
      </div>
      
      ${data.cultural_significance ? `
        <div class="cultural-significance">
          <h4>Cultural Significance</h4>
          <p>${data.cultural_significance}</p>
      </div>
      ` : ''}
    `;
    
    // Set the innerHTML with the main content (including restriction alert if present)
    console.log('Setting suggestionsResult.innerHTML with restriction alert');
    suggestionsResult.innerHTML = mainContent;

    menuSuggestions.innerHTML = `
      <h3>Menu Recommendations</h3>
      <div class="suggestion-card">
        <div class="suggestion-content">
        <p>${data.food_menu || 'Menu recommendations will be provided based on your wedding type.'}</p>
        </div>
      </div>
    `;

    venueSuggestions.innerHTML = `
      <h3>Venue & Location Suggestions</h3>
      <div class="suggestion-card">
        <div class="suggestion-content">
          <h5>Pre-shoot Locations:</h5>
        <p>${data.pre_shoot_locations || 'Location suggestions will be provided based on your wedding type.'}</p>
          <h5>Drinks:</h5>
        <p>${data.drinks || 'Drink recommendations will be provided based on your wedding type.'}</p>
        </div>
      </div>
    `;
  }

  function generateColorCard(label, colorName, colorDetails) {
    const defaultHex = colorDetails?.hex || '#cccccc';
    const defaultRgb = colorDetails?.rgb || '204,204,204';
    const isRestricted = colorDetails?.is_restricted || false;

    const swatches = Array.isArray(colorDetails?.swatches) && colorDetails.swatches.length > 0
      ? colorDetails.swatches
      : [{
          name: colorName,
          hex: defaultHex,
          rgb: colorDetails?.rgb || null
        }];

    const wrapperClass = `color-swatch-wrapper ${swatches.length > 1 ? 'multi' : 'single'}`;

    const swatchHtml = swatches.map((swatch, index) => {
      const swatchHex = swatch.hex || defaultHex;
      const swatchName = swatch.name || `Color ${index + 1}`;
      const title = swatchHex ? `${swatchName} (${swatchHex})` : swatchName;
      return `
        <div class="color-swatch${swatches.length > 1 ? ' color-swatch-split' : ''}"
             style="background-color: ${swatchHex}"
             title="${title}">
        </div>
      `;
    }).join('');

    const hexLines = swatches.length > 1
      ? swatches.map(swatch => `<small>${swatch.name || 'Color'}: ${swatch.hex || 'N/A'}</small>`).join('')
      : `<small>${defaultHex}</small>`;

    const rgbLines = swatches.length > 1
      ? swatches.map(swatch => `<small>${swatch.name || 'Color'}: ${swatch.rgb ? `RGB(${swatch.rgb})` : 'RGB(N/A)'}</small>`).join('')
      : `<small>${colorDetails?.rgb ? `RGB(${colorDetails.rgb})` : `RGB(${defaultRgb})`}</small>`;
    
    return `
      <div class="color-card ${isRestricted ? 'restricted' : ''}">
        <div class="${wrapperClass}">
          ${swatchHtml}
        </div>
        <div class="color-info">
          <div class="color-name">${label}</div>
          <div class="color-value">${colorName || 'N/A'}</div>
          <div class="color-codes">
            ${hexLines}
            ${rgbLines}
          </div>
          ${isRestricted ? '<div class="restricted-badge">Restricted</div>' : ''}
        </div>
      </div>
    `;
  }

  async function loadProjectDetails(projectId) {
    // Only load project details if a valid project ID is provided
    if (!projectId || projectId === '' || projectId === null) {
      hideResults();
      return;
    }
    
    // Ensure projectId is an integer for consistent comparison
    const projectIdInt = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
    const project = projects.find(p => p.id === projectIdInt);
    if (!project) {
      console.error('Project not found with ID:', projectIdInt, 'Available projects:', projects.map(p => p.id));
      return;
    }
    
    weddingTypeSelect.value = project.wedding_type || '';
    brideColorInput.value = project.bride_color || '#e5c100';
    updateColorPreview();
    
  }

  async function saveSuggestionsToDatabase(projectId, weddingType, brideColor, suggestions) {
    try {
      if (!suggestions || typeof suggestions !== 'object') {
        showError('No suggestions available to save.');
        return;
      }
      // Ensure projectId is an integer for the API call
      const projectIdInt = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
      const response = await fetch(`http://localhost:5000/api/projects/${projectIdInt}/theme-suggestions`, {
        method: 'POST',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wedding_type: weddingType,
          bride_color: brideColor,
          suggestions: suggestions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Suggestions saved to database:', data.message);
      showSuccess('Suggestions saved to database!');
      
    } catch (error) {
      console.error('Error saving suggestions to database:', error);
      showError('Failed to save suggestions to database. They are saved locally.');
    }
  }

  async function saveSuggestions() {
    try {
      const projectValue = projectSelect.value;
      if (!projectValue) {
        showError('Please select a project before saving suggestions.');
        return;
      }

      const projectIdInt = parseInt(projectValue, 10);
      if (Number.isNaN(projectIdInt)) {
        showError('Please select a valid project before saving suggestions.');
        return;
      }

      const project = projects.find(p => p.id === projectIdInt);
      if (!project) {
        showError('Selected project not found.');
        return;
      }

      selectedProjectId = projectIdInt;

      if (!latestSuggestionResult) {
        showError('Please generate suggestions before saving.');
        return;
      }

      await saveSuggestionsToDatabase(projectIdInt, weddingTypeSelect.value, brideColorInput.value, latestSuggestionResult);
      
    } catch (error) {
      console.error('Error saving project:', error);
      showError(`Failed to save project: ${error.message}`);
    }
  }

  function compareSuggestions() {
    if (suggestionHistory.length < 2) {
      showError('Need at least 2 suggestions to compare.');
      return;
    }
    
    // Create comparison modal or page
    const latest = suggestionHistory[0];
    const previous = suggestionHistory[1];
    
    // Implementation for comparison view
    showSuccess('Comparison feature coming soon!');
  }

  function exportSuggestions() {
    if (suggestionHistory.length === 0) {
      showError('No suggestions to export.');
      return;
    }
    
    const dataStr = JSON.stringify(suggestionHistory, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `wedding-suggestions-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showSuccess('Suggestions exported successfully!');
  }

  function shareSuggestions() {
    if (suggestionHistory.length === 0) {
      showError('No suggestions to share.');
      return;
    }
    
    const latest = suggestionHistory[0];
    const shareText = `Check out my wedding theme suggestions for ${latest.weddingType}! Generated by Wedding Planning System.`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Wedding Theme Suggestions',
        text: shareText,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        showSuccess('Share text copied to clipboard!');
      });
    }
  }

  function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }

  function hideResults() {
    suggestionsResult.innerHTML = '';
    menuSuggestions.innerHTML = '';
    venueSuggestions.innerHTML = '';
    suggestionManagement.style.display = 'none';
  }

  function showError(message) {
    // Create or update error message
    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'errorMessage';
      errorDiv.className = 'error-message';
      themeForm.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  function showSuccess(message) {
    // Create or update success message
    let successDiv = document.getElementById('successMessage');
    if (!successDiv) {
      successDiv = document.createElement('div');
      successDiv.id = 'successMessage';
      successDiv.className = 'success-message';
      themeForm.appendChild(successDiv);
    }
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  }
});