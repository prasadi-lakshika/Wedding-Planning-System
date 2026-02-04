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
  const comparisonModal = document.getElementById('comparisonModal');
  const comparisonModalBG = document.getElementById('comparisonModalBG');
  const closeComparisonModal = document.getElementById('closeComparisonModal');
  const suggestion1Select = document.getElementById('suggestion1Select');
  const suggestion2Select = document.getElementById('suggestion2Select');
  const compareSelectedBtn = document.getElementById('compareSelectedBtn');
  const comparisonContent = document.getElementById('comparisonContent');

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
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      // Only load projects if user is authenticated and not a coordinator
      const userRole = localStorage.getItem('userRole');
      if (isLoggedIn && userRole !== 'coordinator') {
      // Load projects from database (original simple approach)
      console.log('Step 1: Loading projects from database...');
      await loadProjectsFromDatabase();
      
      console.log('Projects loaded count:', projects.length);
      if (projects.length === 0) {
        console.warn('No projects available after loading');
      }
      
      // Load selected project if any
        console.log('Step 2: Checking for saved project selection...');
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
      } else {
        if (isLoggedIn && userRole === 'coordinator') {
          console.log('Coordinator user - skipping project loading and project selection');
        } else {
          console.log('Public user - skipping project loading');
        }
        // Hide project select for public users and coordinators (handled in HTML)
      }
      
      // Load wedding types from API (works for both authenticated and public users)
      console.log('Step 3: Loading wedding types...');
      await loadWeddingTypes();
      
      // Show/hide save button based on authentication status and role
      if (saveBtn) {
        const userRole = localStorage.getItem('userRole');
        // Show for authenticated users except coordinators
        if (isLoggedIn && userRole !== 'coordinator') {
          saveBtn.style.display = 'flex'; // Show for authenticated users (matches CSS class)
        } else {
          saveBtn.style.display = 'none'; // Hide for public users and coordinators
        }
      }
      
      // Set up event listeners
      console.log('Step 4: Setting up event listeners...');
      setupEventListeners();
      
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
    
    if (!isLoggedIn || isLoggedIn !== 'true') {
      console.log('User not logged in - skipping project loading');
      projectSelect.innerHTML = '<option value="">No project selected (optional)</option>';
      // Don't show error for public users - projects are optional
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
        option.textContent = wt.name; // Removed color count display
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
    
    // Comparison modal controls
    if (closeComparisonModal) {
      closeComparisonModal.addEventListener('click', hideComparisonModal);
    }
    if (comparisonModalBG) {
      comparisonModalBG.addEventListener('click', hideComparisonModal);
    }
    if (compareSelectedBtn) {
      compareSelectedBtn.addEventListener('click', performComparison);
    }
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
      
      // Show save button for authenticated users after suggestions are generated (except coordinators)
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      if (isLoggedIn && userRole !== 'coordinator' && saveBtn) {
        saveBtn.style.display = 'flex'; // Matches CSS class .btn-secondary
      } else if (saveBtn) {
        saveBtn.style.display = 'none'; // Hide for coordinators
      }
      
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
      // Check if user is authenticated
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (!isLoggedIn) {
        showError('Please log in to save suggestions to a project.');
        return;
      }
      
      // Coordinators cannot save suggestions
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'coordinator') {
        showError('Coordinators cannot save theme suggestions.');
        return;
      }
      
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
    
    // Populate suggestion dropdowns
    populateSuggestionDropdowns();
    
    // Show comparison modal
    showComparisonModal();
  }
  
  function populateSuggestionDropdowns() {
    if (!suggestion1Select || !suggestion2Select) return;
    
    // Clear existing options
    suggestion1Select.innerHTML = '<option value="">-- Select suggestion --</option>';
    suggestion2Select.innerHTML = '<option value="">-- Select suggestion --</option>';
    
    // Add suggestions to dropdowns
    suggestionHistory.forEach((suggestion, index) => {
      const date = new Date(suggestion.timestamp).toLocaleDateString();
      const time = new Date(suggestion.timestamp).toLocaleTimeString();
      const label = `${suggestion.weddingType} - ${suggestion.brideColor} (${date} ${time})`;
      
      const option1 = document.createElement('option');
      option1.value = index;
      option1.textContent = label;
      suggestion1Select.appendChild(option1);
      
      const option2 = document.createElement('option');
      option2.value = index;
      option2.textContent = label;
      suggestion2Select.appendChild(option2);
    });
    
    // Set default selections (latest vs previous)
    if (suggestionHistory.length >= 1) {
      suggestion1Select.value = 0; // Latest
    }
    if (suggestionHistory.length >= 2) {
      suggestion2Select.value = 1; // Previous
    }
  }
  
  function showComparisonModal() {
    if (comparisonModal && comparisonModalBG) {
      comparisonModal.style.display = 'block';
      comparisonModalBG.style.display = 'block';
      comparisonModalBG.classList.add('show');
      comparisonModal.classList.add('show');
    }
  }
  
  function hideComparisonModal() {
    if (comparisonModal && comparisonModalBG) {
      comparisonModal.style.display = 'none';
      comparisonModalBG.style.display = 'none';
      comparisonModalBG.classList.remove('show');
      comparisonModal.classList.remove('show');
      comparisonContent.style.display = 'none';
    }
  }
  
  function performComparison() {
    const index1 = parseInt(suggestion1Select.value);
    const index2 = parseInt(suggestion2Select.value);
    
    if (isNaN(index1) || isNaN(index2)) {
      showError('Please select both suggestions to compare.');
      return;
    }
    
    if (index1 === index2) {
      showError('Please select two different suggestions to compare.');
      return;
    }
    
    const suggestion1 = suggestionHistory[index1];
    const suggestion2 = suggestionHistory[index2];
    
    if (!suggestion1 || !suggestion2) {
      showError('Selected suggestions not found.');
      return;
    }
    
    // Display comparison
    displayComparison(suggestion1, suggestion2, index1, index2);
  }
  
  function displayComparison(suggestion1, suggestion2, index1, index2) {
    // Show comparison content
    comparisonContent.style.display = 'block';
    
    // Set titles and metadata
    const date1 = new Date(suggestion1.timestamp).toLocaleString();
    const date2 = new Date(suggestion2.timestamp).toLocaleString();
    
    document.getElementById('suggestion1Title').textContent = 'Suggestion 1';
    document.getElementById('suggestion1Meta').innerHTML = `
      <small><strong>Date:</strong> ${date1}</small><br>
      <small><strong>Wedding Type:</strong> ${suggestion1.weddingType}</small><br>
      <small><strong>Bride Color:</strong> ${suggestion1.brideColor}</small>
    `;
    
    document.getElementById('suggestion2Title').textContent = 'Suggestion 2';
    document.getElementById('suggestion2Meta').innerHTML = `
      <small><strong>Date:</strong> ${date2}</small><br>
      <small><strong>Wedding Type:</strong> ${suggestion2.weddingType}</small><br>
      <small><strong>Bride Color:</strong> ${suggestion2.brideColor}</small>
    `;
    
    // Display color palettes comparison
    const content1 = generateComparisonContent(suggestion1, suggestion2, true);
    const content2 = generateComparisonContent(suggestion2, suggestion1, false);
    
    document.getElementById('suggestion1Content').innerHTML = content1;
    document.getElementById('suggestion2Content').innerHTML = content2;
    
    // Scroll to comparison content
    comparisonContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  function generateComparisonContent(suggestion, otherSuggestion, isFirst) {
    const data = suggestion.suggestions;
    const otherData = otherSuggestion.suggestions;
    
    // Helper to check if values are different
    const isDifferent = (val1, val2) => {
      if (!val1 && !val2) return false;
      return String(val1 || '').trim().toLowerCase() !== String(val2 || '').trim().toLowerCase();
    };
    
    // Generate color palette comparison
    const colorFields = [
      { key: 'bride_colour_mapped', label: 'Bride' },
      { key: 'groom_colour', label: 'Groom' },
      { key: 'bridesmaids_colour', label: 'Bridesmaids' },
      { key: 'best_men_colour', label: 'Best Men' },
      { key: 'flower_deco_colour', label: 'Flower Decor' },
      { key: 'hall_decor_colour', label: 'Hall Decor' }
    ];
    
    let colorPaletteHtml = '<div class="comparison-section"><h5>Color Palette</h5><div class="color-grid">';
    
    colorFields.forEach(field => {
      const value = data[field.key] || 'N/A';
      const otherValue = otherData[field.key] || 'N/A';
      const different = isDifferent(value, otherValue);
      const diffClass = different ? 'different' : '';
      
      // Get color hex from color details if available
      const colorDetails = data.color_details || {};
      const fieldColorDetails = colorDetails[field.key] || {};
      const hexColor = fieldColorDetails.hex || '#cccccc';
      
          colorPaletteHtml += `
        <div class="comparison-color-card ${diffClass}">
          <div class="color-swatch-small" style="background-color: ${hexColor};"></div>
          <div class="color-info-small">
            <strong>${field.label}:</strong>
            <span>${value}</span>
            ${different ? '<span class="diff-indicator" title="This color differs from the other suggestion">⚠ Different</span>' : ''}
          </div>
        </div>
      `;
    });
    
    colorPaletteHtml += '</div></div>';
    
    // Generate food menu comparison
    const foodMenu1 = data.food_menu || 'N/A';
    const foodMenu2 = otherData.food_menu || 'N/A';
    const foodDifferent = isDifferent(foodMenu1, foodMenu2);
    const foodDiffClass = foodDifferent ? 'different' : '';
    
    const foodHtml = `
      <div class="comparison-section ${foodDiffClass}">
        <h5>Food Menu ${foodDifferent ? '<span class="diff-indicator" title="This content differs from the other suggestion">⚠ Different</span>' : ''}</h5>
        <div class="comparison-text-content">
          <p>${foodMenu1}</p>
        </div>
      </div>
    `;
    
    // Generate drinks comparison
    const drinks1 = data.drinks || 'N/A';
    const drinks2 = otherData.drinks || 'N/A';
    const drinksDifferent = isDifferent(drinks1, drinks2);
    const drinksDiffClass = drinksDifferent ? 'different' : '';
    
    const drinksHtml = `
      <div class="comparison-section ${drinksDiffClass}">
        <h5>Drinks ${drinksDifferent ? '<span class="diff-indicator" title="This content differs from the other suggestion">⚠ Different</span>' : ''}</h5>
        <div class="comparison-text-content">
          <p>${drinks1}</p>
        </div>
      </div>
    `;
    
    // Generate locations comparison
    const locations1 = data.pre_shoot_locations || 'N/A';
    const locations2 = otherData.pre_shoot_locations || 'N/A';
    const locationsDifferent = isDifferent(locations1, locations2);
    const locationsDiffClass = locationsDifferent ? 'different' : '';
    
    const locationsHtml = `
      <div class="comparison-section ${locationsDiffClass}">
        <h5>Pre-Shoot Locations ${locationsDifferent ? '<span class="diff-indicator" title="This content differs from the other suggestion">⚠ Different</span>' : ''}</h5>
        <div class="comparison-text-content">
          <p>${locations1}</p>
        </div>
      </div>
    `;
    
    // Generate confidence score comparison
    const confidence1 = (data.suggestion_confidence || 0) * 100;
    const confidence2 = (otherData.suggestion_confidence || 0) * 100;
    const confidenceDifferent = Math.abs(confidence1 - confidence2) > 5; // More than 5% difference
    const confidenceDiffClass = confidenceDifferent ? 'different' : '';
    
    const confidenceHtml = `
      <div class="comparison-section ${confidenceDiffClass}">
        <h5>Confidence Score ${confidenceDifferent ? '<span class="diff-indicator" title="This score differs from the other suggestion">⚠ Different</span>' : ''}</h5>
        <div class="comparison-text-content">
          <div class="confidence-display">
            <strong>${confidence1.toFixed(1)}%</strong>
            ${confidenceDifferent ? `<small class="diff-amount" title="Difference from the other suggestion">(${(confidence1 - confidence2).toFixed(1)}% ${confidence1 > confidence2 ? 'higher' : 'lower'})</small>` : ''}
          </div>
        </div>
      </div>
    `;
    
    return colorPaletteHtml + foodHtml + drinksHtml + locationsHtml + confidenceHtml;
  }

  function exportSuggestions() {
    if (suggestionHistory.length === 0) {
      showError('No suggestions to export.');
      return;
    }
    
    try {
      // Check if jsPDF is available
      if (typeof window.jspdf === 'undefined') {
        showError('PDF library not loaded. Please refresh the page.');
        return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Helper function to add a new page if needed
      const checkNewPage = (requiredHeight) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };
      
      // Helper function to add text with word wrapping
      const addText = (text, x, y, maxWidth, fontSize = 10, style = 'normal') => {
        doc.setFontSize(fontSize);
        if (style === 'bold') {
          doc.setFont(undefined, 'bold');
        } else {
          doc.setFont(undefined, 'normal');
        }
        
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * (fontSize * 0.35) + 2; // Return height used
      };
      
      // Helper function to add a colored box (for color swatches)
      const addColorBox = (x, y, width, height, color) => {
        try {
          // Ensure color is a valid hex string
          let hex = color.replace('#', '').trim();
          
          // Handle 3-digit hex colors (e.g., #fff)
          if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
          }
          
          // Ensure we have a valid 6-digit hex color
          if (hex.length !== 6) {
            hex = 'cccccc'; // Default to gray if invalid
          }
          
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          
          // Validate RGB values (0-255)
          const validR = isNaN(r) ? 204 : Math.max(0, Math.min(255, r));
          const validG = isNaN(g) ? 204 : Math.max(0, Math.min(255, g));
          const validB = isNaN(b) ? 204 : Math.max(0, Math.min(255, b));
          
          doc.setFillColor(validR, validG, validB);
          doc.rect(x, y - height, width, height, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, y - height, width, height, 'S');
        } catch (error) {
          console.error('Error adding color box:', error, 'Color:', color);
          // Fallback to gray if error
          doc.setFillColor(204, 204, 204);
          doc.rect(x, y - height, width, height, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, y - height, width, height, 'S');
        }
      };
      
      // Helper function to convert RGB to hex
      const rgbToHex = (r, g, b) => {
        const toHex = (n) => {
          const hex = Math.round(n).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
      };
      
      // Title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(63, 58, 52); // Dark brown
      doc.text('Wedding Theme Suggestions Report', margin, yPosition);
      yPosition += 12;
      
      // Date
      const exportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${exportDate}`, margin, yPosition);
      yPosition += 8;
      
      doc.setTextColor(0, 0, 0); // Reset to black
      
      // Loop through each suggestion
      suggestionHistory.forEach((suggestion, index) => {
        checkNewPage(50); // Reserve space for a suggestion
        
        // Suggestion header
        const suggestionNum = suggestionHistory.length - index; // Show in reverse order (newest first)
        yPosition += 10;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(212, 175, 55); // Gold
        doc.text(`Suggestion ${suggestionNum}`, margin, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Date and time
        const suggestionDate = new Date(suggestion.timestamp).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        doc.text(`Date: ${suggestionDate}`, margin, yPosition);
        yPosition += 6;
        
        // Wedding type
        doc.text(`Wedding Type: ${suggestion.weddingType}`, margin, yPosition);
        yPosition += 6;
        
        // Bride color
        doc.text(`Bride Color: ${suggestion.brideColor}`, margin, yPosition);
        yPosition += 8;
        
        const data = suggestion.suggestions;
        
        // Color Palette Section
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(63, 58, 52);
        doc.text('Color Palette', margin, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const colorFields = [
          { key: 'bride_colour_mapped', label: 'Bride', colorDetailsKey: 'bride_colour' },
          { key: 'groom_colour', label: 'Groom', colorDetailsKey: 'groom_colour' },
          { key: 'bridesmaids_colour', label: 'Bridesmaids', colorDetailsKey: 'bridesmaids_colour' },
          { key: 'best_men_colour', label: 'Best Men', colorDetailsKey: 'best_men_colour' },
          { key: 'flower_deco_colour', label: 'Flower Decor', colorDetailsKey: 'flower_deco_colour' },
          { key: 'hall_decor_colour', label: 'Hall Decor', colorDetailsKey: 'hall_decor_colour' }
        ];
        
        const colorDetails = data.color_details || {};
        let colorX = margin;
        const colorBoxSize = 12;
        const colorSpacing = 45;
        
        // Helper function to convert RGB to hex (moved outside forEach for accessibility)
        const rgbToHex = (r, g, b) => {
          const toHex = (n) => {
            const hex = Math.round(n).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          };
          return '#' + toHex(r) + toHex(g) + toHex(b);
        };
        
        colorFields.forEach((field, fieldIndex) => {
          checkNewPage(20);
          
          const value = data[field.key] || 'N/A';
          
          // Try to get hex color from color_details
          // First try the colorDetailsKey, then try the field key directly
          let hexColor = '#cccccc'; // Default gray
          
          if (field.key === 'bride_colour_mapped') {
            // Special handling for bride color - use original bride color if available
            // suggestion.brideColor is the original hex color from the color picker
            const originalBrideColor = suggestion.brideColor;
            if (originalBrideColor && originalBrideColor.startsWith('#')) {
              hexColor = originalBrideColor;
            } else {
              // Try to get from color_details using 'bride_colour' key
              const brideColorDetails = colorDetails['bride_colour'] || colorDetails['bride_colour_mapped'] || {};
              if (brideColorDetails.hex) {
                hexColor = brideColorDetails.hex;
              } else if (brideColorDetails.rgb) {
                // Convert RGB to hex if only RGB is available
                try {
                  const rgbValues = brideColorDetails.rgb.split(',').map(v => parseInt(v.trim()));
                  if (rgbValues.length === 3 && !rgbValues.some(isNaN)) {
                    hexColor = rgbToHex(rgbValues[0], rgbValues[1], rgbValues[2]);
                  }
                } catch (e) {
                  console.error('Error converting RGB to hex:', e);
                }
              }
            }
          } else {
            // For other colors, get from color_details
            const fieldColorDetails = colorDetails[field.colorDetailsKey] || colorDetails[field.key] || {};
            if (fieldColorDetails.hex) {
              hexColor = fieldColorDetails.hex;
            } else if (fieldColorDetails.rgb) {
              // Convert RGB to hex if only RGB is available
              try {
                const rgbValues = fieldColorDetails.rgb.split(',').map(v => parseInt(v.trim()));
                if (rgbValues.length === 3 && !rgbValues.some(isNaN)) {
                  hexColor = rgbToHex(rgbValues[0], rgbValues[1], rgbValues[2]);
                }
              } catch (e) {
                console.error('Error converting RGB to hex:', e);
              }
            }
          }
          
          // Ensure hex color is valid
          if (!hexColor || !hexColor.startsWith('#')) {
            hexColor = '#cccccc'; // Fallback to gray
          }
          
          // Color swatch
          addColorBox(colorX, yPosition + 5, colorBoxSize, colorBoxSize, hexColor);
          
          // Label and value
          doc.text(`${field.label}:`, colorX + colorBoxSize + 3, yPosition);
          doc.setFont(undefined, 'normal');
          const valueLines = doc.splitTextToSize(value, colorSpacing - colorBoxSize - 10);
          doc.text(valueLines, colorX + colorBoxSize + 3, yPosition + 5);
          
          // Move to next column or new row
          if ((fieldIndex + 1) % 2 === 0) {
            yPosition += 18;
            colorX = margin;
          } else {
            colorX = margin + colorSpacing * 2;
          }
          
          if ((fieldIndex + 1) % 2 === 0 && fieldIndex < colorFields.length - 1) {
            yPosition += 3;
          }
        });
        
        // Reset x position and move to next section
        colorX = margin;
        if (colorFields.length % 2 !== 0) {
          yPosition += 18;
        }
        yPosition += 10;
        
        // Food Menu
        checkNewPage(30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Food Menu', margin, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const foodMenu = data.food_menu || 'N/A';
        const foodMenuLines = doc.splitTextToSize(foodMenu, contentWidth);
        doc.text(foodMenuLines, margin, yPosition);
        yPosition += (foodMenuLines.length * 5) + 5;
        
        // Drinks
        checkNewPage(30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Drinks', margin, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const drinks = data.drinks || 'N/A';
        const drinksLines = doc.splitTextToSize(drinks, contentWidth);
        doc.text(drinksLines, margin, yPosition);
        yPosition += (drinksLines.length * 5) + 5;
        
        // Pre-Shoot Locations
        checkNewPage(30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Pre-Shoot Locations', margin, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const locations = data.pre_shoot_locations || 'N/A';
        const locationsLines = doc.splitTextToSize(locations, contentWidth);
        doc.text(locationsLines, margin, yPosition);
        yPosition += (locationsLines.length * 5) + 5;
        
        // Confidence Score
        if (data.suggestion_confidence !== undefined) {
          checkNewPage(15);
          const confidence = (data.suggestion_confidence * 100).toFixed(1);
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(`Confidence Score: ${confidence}%`, margin, yPosition);
          yPosition += 7;
        }
        
        // Cultural Significance (if available)
        if (data.cultural_significance) {
          checkNewPage(20);
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text('Cultural Significance', margin, yPosition);
          yPosition += 7;
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          const significanceLines = doc.splitTextToSize(data.cultural_significance, contentWidth);
          doc.text(significanceLines, margin, yPosition);
          yPosition += (significanceLines.length * 5) + 5;
        }
        
        // Add separator line before next suggestion
        if (index < suggestionHistory.length - 1) {
          checkNewPage(15);
          yPosition += 5;
          doc.setDrawColor(212, 175, 55);
          doc.setLineWidth(0.5);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
        }
      });
      
      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin - 20,
          pageHeight - 10
        );
      }
      
      // Save PDF
      const fileName = `wedding-suggestions-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    
      showSuccess('Suggestions exported to PDF successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('Failed to generate PDF. Please try again.');
    }
  }

  function shareSuggestions() {
    if (suggestionHistory.length === 0) {
      showError('No suggestions to share.');
      return;
    }
    
    const latest = suggestionHistory[0];
    const data = latest.suggestions || {};
    
    // Build detailed share text with suggestion information
    let shareText = `🎉 Wedding Theme Suggestions\n\n`;
    shareText += `Wedding Type: ${latest.weddingType}\n`;
    shareText += `Bride Color: ${latest.brideColor}\n\n`;
    
    // Add color palette
    if (data.bride_colour_mapped || data.groom_colour) {
      shareText += `Color Palette:\n`;
      if (data.bride_colour_mapped) shareText += `• Bride: ${data.bride_colour_mapped}\n`;
      if (data.groom_colour) shareText += `• Groom: ${data.groom_colour}\n`;
      if (data.bridesmaids_colour) shareText += `• Bridesmaids: ${data.bridesmaids_colour}\n`;
      if (data.best_men_colour) shareText += `• Best Men: ${data.best_men_colour}\n`;
      if (data.flower_deco_colour) shareText += `• Flower Decor: ${data.flower_deco_colour}\n`;
      if (data.hall_decor_colour) shareText += `• Hall Decor: ${data.hall_decor_colour}\n`;
      shareText += `\n`;
    }
    
    // Add confidence score if available
    if (data.suggestion_confidence !== undefined) {
      const confidence = (data.suggestion_confidence * 100).toFixed(1);
      shareText += `Confidence Score: ${confidence}%\n\n`;
    }
    
    shareText += `Generated by Wedding Planning System`;
    
    // Don't include URL since localhost URLs don't work for sharing
    // If you have a public URL in production, you can add it here
    
    // Try Web Share API first (mobile devices)
    if (navigator.share) {
      navigator.share({
        title: 'Wedding Theme Suggestions',
        text: shareText
        // Removed url parameter - localhost URLs don't work for sharing
      }).then(() => {
        // Share was successful
        showSuccess('Suggestions shared successfully!');
      }).catch((error) => {
        // User cancelled or share failed - fall back to clipboard
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fall through to clipboard fallback
          copyToClipboard(shareText);
        } else {
          // User cancelled - don't show error
          console.log('Share cancelled by user');
        }
      });
    } else {
      // Web Share API not available - use clipboard
      copyToClipboard(shareText);
    }
    
    // Helper function to copy to clipboard
    function copyToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showSuccess('Share text copied to clipboard! You can paste it anywhere to share.');
        }).catch((error) => {
          console.error('Clipboard write failed:', error);
          // Fallback: use older method
          fallbackCopyToClipboard(text);
        });
      } else {
        // Clipboard API not available - use fallback
        fallbackCopyToClipboard(text);
      }
    }
    
    // Fallback method for older browsers
    function fallbackCopyToClipboard(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          showSuccess('Share text copied to clipboard! You can paste it anywhere to share.');
        } else {
          showError('Failed to copy to clipboard. Please copy manually: ' + text);
        }
      } catch (err) {
        console.error('Fallback copy failed:', err);
        showError('Failed to copy to clipboard. Please copy manually: ' + text);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }

  function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
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