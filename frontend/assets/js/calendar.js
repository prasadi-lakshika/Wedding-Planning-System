// Calendar Management for Wedding Planning System
(() => {
  const API_BASE = 'http://localhost:5000';
  const STORAGE_KEY = 'calendar:lastView';

  const state = {
    user: null,
    isAdmin: false,
    projects: [],
    tasks: [], // Store tasks for calendar display
    events: [],
    currentDate: new Date(),
    currentView: 'month', // month, week, day, list
    selectedEvent: null,
    isLoading: false,
    filters: {
      projectId: '',
      eventType: '',
      timeRange: 'month'
    }
  };

  const elements = {
    calendarView: document.getElementById('calendarView'),
    upcomingList: document.getElementById('upcomingList'),
    message: document.getElementById('calendarMessage'),
    addEventBtn: document.getElementById('addEventBtn'),
    prevBtn: document.getElementById('prevBtn'),
    todayBtn: document.getElementById('todayBtn'),
    nextBtn: document.getElementById('nextBtn'),
    viewToggle: document.querySelectorAll('.view-toggle button'),
    projectFilter: document.getElementById('projectFilter'),
    typeFilter: document.getElementById('typeFilter'),
    rangeFilter: document.getElementById('rangeFilter'),
    eventModal: document.getElementById('eventModal'),
    eventModalTitle: document.getElementById('eventModalTitle'),
    eventForm: document.getElementById('eventForm'),
    eventId: document.getElementById('eventId'),
    eventTitle: document.getElementById('eventTitle'),
    eventProject: document.getElementById('eventProject'),
    eventType: document.getElementById('eventType'),
    eventStart: document.getElementById('eventStart'),
    eventEnd: document.getElementById('eventEnd'),
    eventLocation: document.getElementById('eventLocation'),
    eventDescription: document.getElementById('eventDescription'),
    closeEventModal: document.getElementById('closeEventModal'),
    cancelEventBtn: document.getElementById('cancelEventBtn'),
    deleteEventBtn: document.getElementById('deleteEventBtn'),
    modalBG: document.getElementById('modalBG')
  };

  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch((error) => {
      console.error('Calendar initialization failed:', error);
      showMessage('error', 'Failed to load calendar. Please refresh and try again.');
    });
  });

  async function initialize() {
    await ensureAuthenticated();
    // Load projects first, then tasks, then events (so project wedding dates and tasks can be converted to events)
    await loadProjects();
    await loadTasks(); // Load tasks with due dates for calendar display
    await loadEvents(); // This will generate events from project wedding dates and tasks
    populateProjectFilters();
    setupEventListeners();
    renderCalendar();
    renderUpcomingEvents();
  }

  async function ensureAuthenticated() {
    try {
      const response = await fetch(`${API_BASE}/auth/check-auth`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Authentication required');
      }
      const data = await response.json();
      state.user = data.user;
      state.isAdmin = data.user.role === 'admin';
    } catch (error) {
      showMessage('error', 'Please log in to use the calendar.');
      disableCalendar();
      throw error;
    }
  }

  function disableCalendar() {
    elements.calendarView.innerHTML = '<div class="empty-state">Please log in to use the calendar.</div>';
    elements.addEventBtn.disabled = true;
  }

  async function loadProjects() {
    try {
      const response = await fetch(`${API_BASE}/api/projects/`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      const data = await response.json();
      state.projects = Array.isArray(data.projects) ? data.projects : [];
    } catch (error) {
      console.error('Failed to load projects:', error);
      state.projects = [];
    }
  }

  async function loadTasks() {
    try {
      // Load tasks from all accessible projects
      const allTasks = [];
      for (const project of state.projects) {
        try {
          const response = await fetch(`${API_BASE}/api/projects/${project.id}/tasks`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            if (data.tasks && Array.isArray(data.tasks)) {
              // Add project_id to each task if not present
              const tasksWithProject = data.tasks.map(task => ({
                ...task,
                project_id: task.project_id || project.id
              }));
              allTasks.push(...tasksWithProject);
            }
          }
        } catch (err) {
          // Skip projects that fail to load tasks
          console.warn(`Failed to load tasks for project ${project.id}:`, err);
        }
      }
      state.tasks = allTasks;
    } catch (error) {
      console.error('Failed to load tasks:', error);
      state.tasks = [];
    }
  }

  async function loadEvents() {
    try {
      state.isLoading = true;
      
      // Load manual events from backend or localStorage
      let manualEvents = [];
      const storedEvents = localStorage.getItem('calendar_events');
      if (storedEvents) {
        manualEvents = JSON.parse(storedEvents);
      } else {
        // Try to fetch from backend (will fail gracefully if not implemented)
        try {
          const response = await fetch(`${API_BASE}/api/calendar/events`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            manualEvents = Array.isArray(data.events) ? data.events : [];
          }
        } catch (err) {
          // Backend not ready, continue with empty array
        }
      }
      
      // Generate events from project wedding dates
      const projectEvents = generateProjectWeddingEvents();
      
      // Generate events from tasks with due dates
      const taskEvents = generateTaskEvents();
      
      // Combine manual events, project wedding events, and task events
      // Use a Map to track IDs to avoid duplicates
      const eventMap = new Map();
      
      // Add manual events first
      manualEvents.forEach(event => {
        eventMap.set(event.id, event);
      });
      
      // Add project wedding events (with special IDs to avoid conflicts)
      projectEvents.forEach(event => {
        eventMap.set(`project-${event.project_id}`, event);
      });
      
      // Add task events (with special IDs to avoid conflicts)
      taskEvents.forEach(event => {
        eventMap.set(`task-${event.task_id}`, event);
      });
      
      state.events = Array.from(eventMap.values());
      
      // Apply filters
      applyFilters();
    } catch (error) {
      console.error('Failed to load events:', error);
      state.events = [];
    } finally {
      state.isLoading = false;
    }
  }
  
  function generateProjectWeddingEvents() {
    const projectEvents = [];
    
    state.projects.forEach(project => {
      if (project.wedding_date) {
        try {
          // Parse wedding date (expected format: YYYY-MM-DD)
          const weddingDate = new Date(project.wedding_date);
          
          // Skip if date is invalid
          if (isNaN(weddingDate.getTime())) {
            return;
          }
          
          // Set time to 10:00 AM for wedding ceremony
          weddingDate.setHours(10, 0, 0, 0);
          
          // Create end date (5 hours later for typical wedding)
          const endDate = new Date(weddingDate);
          endDate.setHours(15, 0, 0, 0);
          
          const brideName = project.bride_name || 'Bride';
          const groomName = project.groom_name || 'Groom';
          const projectStatus = project.status || 'planning';
          const eventTitle = `Wedding: ${brideName} & ${groomName}`;
          
          const event = {
            id: `project-${project.id}`, // Special ID to identify project-based events
            project_id: project.id,
            title: eventTitle,
            event_type: 'wedding',
            start_datetime: weddingDate.toISOString(),
            end_datetime: endDate.toISOString(),
            location: null, // Can be added if project has venue info
            description: `Wedding ceremony for ${brideName} & ${groomName}. Wedding Type: ${project.wedding_type || 'Not specified'}`,
            created_by: project.created_by,
            is_project_wedding: true, // Flag to identify project-based events
            project_status: projectStatus // Include project status
          };
          
          projectEvents.push(event);
        } catch (error) {
          console.error(`Error creating event for project ${project.id}:`, error);
        }
      }
    });
    
    return projectEvents;
  }

  function generateTaskEvents() {
    const taskEvents = [];
    
    state.tasks.forEach(task => {
      if (task.due_date && task.status !== 'completed') {
        try {
          // Parse due date (expected format: YYYY-MM-DD)
          const dueDate = new Date(task.due_date);
          
          // Skip if date is invalid
          if (isNaN(dueDate.getTime())) {
            return;
          }
          
          // Set time to 9:00 AM for task deadline
          dueDate.setHours(9, 0, 0, 0);
          
          // Create end date (1 hour later)
          const endDate = new Date(dueDate);
          endDate.setHours(10, 0, 0, 0);
          
          const taskTitle = task.title || 'Untitled Task';
          const taskStatus = task.status || 'pending';
          const project = state.projects.find(p => p.id === task.project_id);
          const projectName = project ? `${project.bride_name || 'Bride'} & ${project.groom_name || 'Groom'}` : 'Project';
          const eventTitle = `Task: ${taskTitle}`;
          
          const event = {
            id: `task-${task.id}`, // Special ID to identify task-based events
            task_id: task.id,
            project_id: task.project_id,
            title: eventTitle,
            event_type: 'deadline',
            start_datetime: dueDate.toISOString(),
            end_datetime: endDate.toISOString(),
            location: null,
            description: `Task for ${projectName}. Status: ${formatTaskStatus(taskStatus)}. ${task.description || ''}`,
            created_by: task.created_by,
            is_task_deadline: true, // Flag to identify task-based events
            task_status: taskStatus, // Include task status
            assigned_to: task.assigned_to
          };
          
          taskEvents.push(event);
        } catch (error) {
          console.error(`Error creating event for task ${task.id}:`, error);
        }
      }
    });
    
    return taskEvents;
  }

  function formatTaskStatus(status) {
    const statusMap = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed'
    };
    return statusMap[status] || status;
  }

  function formatProjectStatus(status) {
    const statusMap = {
      'planning': 'Planning',
      'confirmed': 'Confirmed',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  async function saveEvent(event) {
    try {
      // TODO: Replace with actual backend API when implemented
      // For now, use localStorage as fallback
      const eventId = event.id || Date.now();
      const eventToSave = { ...event, id: eventId };
      
      // Try to save to backend first (will fail gracefully if not implemented)
      try {
        const method = event.id ? 'PUT' : 'POST';
        const url = event.id 
          ? `${API_BASE}/api/calendar/events/${event.id}`
          : `${API_BASE}/api/calendar/events`;
        
        const response = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventToSave),
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.event || eventToSave;
        }
      } catch (err) {
        // Backend not ready, continue with localStorage
      }
      
      // Fallback to localStorage
      let events = state.events.filter(e => e.id !== eventId);
      events.push(eventToSave);
      state.events = events;
      localStorage.setItem('calendar_events', JSON.stringify(events));
      
      return eventToSave;
    } catch (error) {
      throw new Error('Failed to save event: ' + error.message);
    }
  }

  async function deleteEvent(eventId) {
    try {
      // TODO: Replace with actual backend API when implemented
      try {
        const response = await fetch(`${API_BASE}/api/calendar/events/${eventId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.ok) {
          state.events = state.events.filter(e => e.id !== eventId);
          return;
        }
      } catch (err) {
        // Backend not ready, continue with localStorage
      }
      
      // Fallback to localStorage
      state.events = state.events.filter(e => e.id !== eventId);
      localStorage.setItem('calendar_events', JSON.stringify(state.events));
    } catch (error) {
      throw new Error('Failed to delete event: ' + error.message);
    }
  }

  function applyFilters() {
    let filtered = [...state.events];
    
    if (state.filters.projectId) {
      filtered = filtered.filter(e => e.project_id === parseInt(state.filters.projectId));
    }
    
    if (state.filters.eventType) {
      filtered = filtered.filter(e => e.event_type === state.filters.eventType);
    }
    
    if (state.filters.timeRange === 'week') {
      const weekStart = getWeekStart(state.currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      filtered = filtered.filter(e => {
        const eventDate = new Date(e.start_datetime);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });
    } else if (state.filters.timeRange === 'month') {
      const monthStart = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
      const monthEnd = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0);
      filtered = filtered.filter(e => {
        const eventDate = new Date(e.start_datetime);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });
    }
    
    state.filteredEvents = filtered;
  }

  function populateProjectFilters() {
    elements.eventProject.innerHTML = '<option value="">No Project (Internal Event)</option>';
    elements.projectFilter.innerHTML = '<option value="">All Projects</option>';
    
    state.projects.forEach((project) => {
      const label = `${project.bride_name || 'Bride'} & ${project.groom_name || 'Groom'}`;
      const option1 = new Option(label, project.id);
      const option2 = new Option(label, project.id);
      elements.eventProject.appendChild(option1);
      elements.projectFilter.appendChild(option2);
    });
  }

  function setupEventListeners() {
    elements.addEventBtn.addEventListener('click', () => openEventModal());
    elements.prevBtn.addEventListener('click', () => navigateCalendar(-1));
    elements.todayBtn.addEventListener('click', () => goToToday());
    elements.nextBtn.addEventListener('click', () => navigateCalendar(1));
    elements.closeEventModal.addEventListener('click', () => closeEventModal());
    elements.cancelEventBtn.addEventListener('click', () => closeEventModal());
    elements.deleteEventBtn.addEventListener('click', () => handleDeleteEvent());
    elements.modalBG.addEventListener('click', () => closeEventModal());
    
    elements.viewToggle.forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    
    elements.projectFilter.addEventListener('change', (e) => {
      state.filters.projectId = e.target.value;
      applyFilters();
      renderCalendar();
      renderUpcomingEvents();
    });
    
    elements.typeFilter.addEventListener('change', (e) => {
      state.filters.eventType = e.target.value;
      applyFilters();
      renderCalendar();
      renderUpcomingEvents();
    });
    
    elements.rangeFilter.addEventListener('change', (e) => {
      state.filters.timeRange = e.target.value;
      applyFilters();
      renderCalendar();
      renderUpcomingEvents();
    });
    
    elements.eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
      handleSaveEvent();
    });
  }

  function navigateCalendar(direction) {
    const newDate = new Date(state.currentDate);
    if (state.currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (state.currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (state.currentView === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    }
    state.currentDate = newDate;
    renderCalendar();
  }

  function goToToday() {
    state.currentDate = new Date();
    renderCalendar();
  }

  function switchView(view) {
    state.currentView = view;
    elements.viewToggle.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    localStorage.setItem(STORAGE_KEY, view);
    renderCalendar();
  }

  function renderCalendar() {
    applyFilters();
    const events = state.filteredEvents || state.events;
    
    if (state.currentView === 'month') {
      elements.calendarView.innerHTML = renderMonthView(events);
    } else if (state.currentView === 'week') {
      elements.calendarView.innerHTML = renderWeekView(events);
    } else if (state.currentView === 'day') {
      elements.calendarView.innerHTML = renderDayView(events);
    } else if (state.currentView === 'list') {
      elements.calendarView.innerHTML = renderListView(events);
    }
    
    // Attach event listeners for rendered elements
    attachCalendarEventListeners();
  }

  function renderMonthView(events) {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = `<h2 style="margin-bottom: 16px; color: #3f3a34;">${firstDay.toLocaleString('default', { month: 'long' })} ${year}</h2>`;
    html += '<table class="calendar-month-view" style="width: 100%; table-layout: fixed;"><thead><tr>';
    html += '<th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>';
    html += '</tr></thead><tbody>';
    
    let currentDate = new Date(startDate);
    for (let week = 0; week < 6; week++) {
      html += '<tr>';
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = events.filter(e => {
          const eventDate = new Date(e.start_datetime).toISOString().split('T')[0];
          return eventDate === dateStr;
        });
        
        const isToday = currentDate.getTime() === today.getTime();
        const isCurrentMonth = currentDate.getMonth() === month;
        const classes = [
          isToday ? 'today' : '',
          !isCurrentMonth ? 'other-month' : ''
        ].filter(Boolean).join(' ');
        
        html += `<td class="${classes}" data-date="${dateStr}">`;
        html += `<div class="day-number">${currentDate.getDate()}</div>`;
        if (dayEvents.length > 0) {
          html += '<div class="day-events">';
          dayEvents.slice(0, 3).forEach(event => {
            // Truncate long event titles to prevent column stretching
            const eventTitle = escapeHtml(event.title);
            const truncatedTitle = eventTitle.length > 18 ? eventTitle.substring(0, 18) + '...' : eventTitle;
            
            // Get status badge if available
            let statusBadge = '';
            if (event.is_project_wedding && event.project_status) {
              const statusClass = event.project_status.replace('_', '-');
              const statusLabel = formatProjectStatus(event.project_status);
              statusBadge = `<span class="status-badge project-status ${statusClass}" title="Project Status: ${statusLabel}">${statusLabel.charAt(0)}</span>`;
            } else if (event.is_task_deadline && event.task_status) {
              const statusClass = event.task_status.replace('_', '-');
              const statusLabel = formatTaskStatus(event.task_status);
              statusBadge = `<span class="status-badge task-status ${statusClass}" title="Task Status: ${statusLabel}">${statusLabel.charAt(0)}</span>`;
            }
            
            html += `<div class="event-item" data-event-id="${event.id}" data-event-type="${event.event_type}" title="${escapeHtml(event.title)}${event.is_project_wedding && event.project_status ? ' - Status: ' + formatProjectStatus(event.project_status) : ''}${event.is_task_deadline && event.task_status ? ' - Status: ' + formatTaskStatus(event.task_status) : ''}">
              <span class="event-dot ${event.event_type}"></span>
              ${statusBadge}
              <span class="event-title">${truncatedTitle}</span>
            </div>`;
          });
          if (dayEvents.length > 3) {
            html += `<div class="event-item">+${dayEvents.length - 3} more</div>`;
          }
          html += '</div>';
        }
        html += '</td>';
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      html += '</tr>';
    }
    
    html += '</tbody></table>';
    return html;
  }

  function renderWeekView(events) {
    const weekStart = getWeekStart(state.currentDate);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      weekDays.push(day);
    }
    
    let html = `<h2 style="margin-bottom: 16px; color: #3f3a34;">Week of ${weekStart.toLocaleDateString()}</h2>`;
    html += '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px;">';
    
    weekDays.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.start_datetime).toISOString().split('T')[0];
        return eventDate === dateStr;
      });
      
      html += `<div style="border: 1px solid #ece6cd; border-radius: 8px; padding: 12px; background: #fff;">`;
      html += `<div style="font-weight: 600; margin-bottom: 12px; color: #3f3a34;">${day.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}</div>`;
      if (dayEvents.length > 0) {
        dayEvents.forEach(event => {
          html += `<div class="event-item" data-event-id="${event.id}" style="margin-bottom: 8px;">
            <span class="event-dot ${event.event_type}"></span>
            ${escapeHtml(event.title)}
          </div>`;
        });
      } else {
        html += '<div style="color: #9ca3af; font-size: 0.85rem;">No events</div>';
      }
      html += '</div>';
    });
    
    html += '</div>';
    return html;
  }

  function renderDayView(events) {
    const date = state.currentDate;
    const dateStr = date.toISOString().split('T')[0];
    const dayEvents = events.filter(e => {
      const eventDate = new Date(e.start_datetime).toISOString().split('T')[0];
      return eventDate === dateStr;
    }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    
    let html = `<h2 style="margin-bottom: 16px; color: #3f3a34;">${date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>`;
    
    if (dayEvents.length > 0) {
      html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
      dayEvents.forEach(event => {
        const startTime = new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const endTime = new Date(event.end_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        html += `<div class="upcoming-item" data-event-id="${event.id}" style="cursor: pointer;">
          <div class="upcoming-date">${startTime}</div>
          <div class="upcoming-content">
            <div class="upcoming-title">${escapeHtml(event.title)}</div>
            <div class="upcoming-meta">${startTime} - ${endTime}${event.location ? ` • ${escapeHtml(event.location)}` : ''}</div>
          </div>
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">No events scheduled for this day.</div>';
    }
    
    return html;
  }

  function renderListView(events) {
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    
    let html = '<h2 style="margin-bottom: 16px; color: #3f3a34;">All Events</h2>';
    
    if (sortedEvents.length > 0) {
      html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
      sortedEvents.forEach(event => {
        const eventDate = new Date(event.start_datetime);
        const dateStr = eventDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        html += `<div class="upcoming-item" data-event-id="${event.id}" style="cursor: pointer;">
          <div class="upcoming-date">${dateStr}</div>
          <div class="upcoming-content">
            <div class="upcoming-title">${escapeHtml(event.title)}</div>
            <div class="upcoming-meta">${timeStr}${event.location ? ` • ${escapeHtml(event.location)}` : ''}</div>
          </div>
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">No events found.</div>';
    }
    
  return html;
}

  function renderUpcomingEvents() {
    const upcoming = [...state.events]
      .filter(e => new Date(e.start_datetime) >= new Date())
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5);
    
    if (upcoming.length === 0) {
      elements.upcomingList.innerHTML = '<div class="empty-state">No upcoming events.</div>';
      return;
    }
    
    let html = '';
    upcoming.forEach(event => {
      const eventDate = new Date(event.start_datetime);
      const dateStr = eventDate.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      
      // Get status indicator for upcoming events
      let statusIndicator = '';
      if (event.is_project_wedding && event.project_status) {
        const statusLabel = formatProjectStatus(event.project_status);
        statusIndicator = ` • Status: ${statusLabel}`;
      } else if (event.is_task_deadline && event.task_status) {
        const statusLabel = formatTaskStatus(event.task_status);
        statusIndicator = ` • Status: ${statusLabel}`;
      }
      
      html += `<div class="upcoming-item" data-event-id="${event.id}" style="cursor: pointer;">
        <div class="upcoming-date">${dateStr}</div>
        <div class="upcoming-content">
          <div class="upcoming-title">${escapeHtml(event.title)}</div>
          <div class="upcoming-meta">${timeStr}${statusIndicator}${event.location ? ` • ${escapeHtml(event.location)}` : ''}</div>
        </div>
      </div>`;
    });
    
    elements.upcomingList.innerHTML = html;
    attachUpcomingEventListeners();
  }

  function attachCalendarEventListeners() {
    // Attach click listeners to calendar cells
    document.querySelectorAll('.calendar-month-view td[data-date]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.event-item')) return;
        const date = cell.dataset.date;
        openEventModal(null, date);
      });
    });
    
    // Attach click listeners to event items
    document.querySelectorAll('.event-item[data-event-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventId = item.dataset.eventId; // Keep as string to support "project-X" IDs
        const event = state.events.find(e => String(e.id) === String(eventId));
        if (event) openEventModal(event);
      });
    });
  }

  function attachUpcomingEventListeners() {
    document.querySelectorAll('.upcoming-item[data-event-id]').forEach(item => {
      item.addEventListener('click', () => {
        const eventId = item.dataset.eventId; // Keep as string to support "project-X" IDs
        const event = state.events.find(e => String(e.id) === String(eventId));
        if (event) openEventModal(event);
      });
    });
  }

  function openEventModal(event = null, defaultDate = null) {
    state.selectedEvent = event;
    
    if (event) {
      // Check if this is a project-based wedding event
      const isProjectWedding = event.is_project_wedding || String(event.id).startsWith('project-');
      
      if (isProjectWedding) {
        // For project wedding events, make them read-only
        const statusText = event.project_status ? `\n\nProject Status: ${formatProjectStatus(event.project_status)}` : '';
        elements.eventModalTitle.textContent = 'Wedding Date (From Project)';
        elements.eventId.value = event.id;
        elements.eventTitle.value = event.title || '';
        elements.eventTitle.readOnly = true;
        elements.eventTitle.style.backgroundColor = '#f5f5f5';
        elements.eventProject.value = event.project_id || '';
        elements.eventProject.disabled = true;
        elements.eventProject.style.backgroundColor = '#f5f5f5';
        elements.eventType.value = event.event_type || 'wedding';
        elements.eventType.disabled = true;
        elements.eventType.style.backgroundColor = '#f5f5f5';
        elements.eventStart.value = formatDateTimeLocal(event.start_datetime);
        elements.eventStart.readOnly = true;
        elements.eventStart.style.backgroundColor = '#f5f5f5';
        elements.eventEnd.value = formatDateTimeLocal(event.end_datetime);
        elements.eventEnd.readOnly = true;
        elements.eventEnd.style.backgroundColor = '#f5f5f5';
        elements.eventLocation.value = event.location || '';
        elements.eventLocation.readOnly = true;
        elements.eventLocation.style.backgroundColor = '#f5f5f5';
        elements.eventDescription.value = (event.description || '') + statusText;
        elements.eventDescription.readOnly = true;
        elements.eventDescription.style.backgroundColor = '#f5f5f5';
        elements.deleteEventBtn.style.display = 'none';
        const submitBtn = elements.eventForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.style.display = 'none';
      } else if (event.is_task_deadline || String(event.id).startsWith('task-')) {
        // For task deadline events, make them read-only
        const statusText = event.task_status ? `\n\nTask Status: ${formatTaskStatus(event.task_status)}` : '';
        elements.eventModalTitle.textContent = 'Task Deadline (From Checklist)';
        elements.eventId.value = event.id;
        elements.eventTitle.value = event.title || '';
        elements.eventTitle.readOnly = true;
        elements.eventTitle.style.backgroundColor = '#f5f5f5';
        elements.eventProject.value = event.project_id || '';
        elements.eventProject.disabled = true;
        elements.eventProject.style.backgroundColor = '#f5f5f5';
        elements.eventType.value = event.event_type || 'deadline';
        elements.eventType.disabled = true;
        elements.eventType.style.backgroundColor = '#f5f5f5';
        elements.eventStart.value = formatDateTimeLocal(event.start_datetime);
        elements.eventStart.readOnly = true;
        elements.eventStart.style.backgroundColor = '#f5f5f5';
        elements.eventEnd.value = formatDateTimeLocal(event.end_datetime);
        elements.eventEnd.readOnly = true;
        elements.eventEnd.style.backgroundColor = '#f5f5f5';
        elements.eventLocation.value = event.location || '';
        elements.eventLocation.readOnly = true;
        elements.eventLocation.style.backgroundColor = '#f5f5f5';
        elements.eventDescription.value = (event.description || '') + statusText;
        elements.eventDescription.readOnly = true;
        elements.eventDescription.style.backgroundColor = '#f5f5f5';
        elements.deleteEventBtn.style.display = 'none';
        const submitBtn = elements.eventForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.style.display = 'none';
      } else {
        // Regular event - fully editable
        elements.eventModalTitle.textContent = 'Edit Event';
        elements.eventId.value = event.id;
        elements.eventTitle.value = event.title || '';
        elements.eventTitle.readOnly = false;
        elements.eventTitle.style.backgroundColor = '';
        elements.eventProject.value = event.project_id || '';
        elements.eventProject.disabled = false;
        elements.eventProject.style.backgroundColor = '';
        elements.eventType.value = event.event_type || 'meeting';
        elements.eventType.disabled = false;
        elements.eventType.style.backgroundColor = '';
        elements.eventStart.value = formatDateTimeLocal(event.start_datetime);
        elements.eventStart.readOnly = false;
        elements.eventStart.style.backgroundColor = '';
        elements.eventEnd.value = formatDateTimeLocal(event.end_datetime);
        elements.eventEnd.readOnly = false;
        elements.eventEnd.style.backgroundColor = '';
        elements.eventLocation.value = event.location || '';
        elements.eventLocation.readOnly = false;
        elements.eventLocation.style.backgroundColor = '';
        elements.eventDescription.value = event.description || '';
        elements.eventDescription.readOnly = false;
        elements.eventDescription.style.backgroundColor = '';
        elements.deleteEventBtn.style.display = 'inline-block';
        const submitBtn = elements.eventForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.style.display = '';
      }
    } else {
      elements.eventModalTitle.textContent = 'Add Event';
      elements.eventId.value = '';
      elements.eventForm.reset();
      // Reset all readonly and disabled states
      [elements.eventTitle, elements.eventStart, elements.eventEnd, elements.eventLocation, elements.eventDescription].forEach(el => {
        if (el) {
          el.readOnly = false;
          el.style.backgroundColor = '';
        }
      });
      if (elements.eventProject) {
        elements.eventProject.disabled = false;
        elements.eventProject.style.backgroundColor = '';
      }
      if (elements.eventType) {
        elements.eventType.disabled = false;
        elements.eventType.style.backgroundColor = '';
      }
      if (defaultDate) {
        const date = new Date(defaultDate);
        date.setHours(9, 0, 0, 0);
        elements.eventStart.value = formatDateTimeLocal(date.toISOString());
        const endDate = new Date(date);
        endDate.setHours(10, 0, 0, 0);
        elements.eventEnd.value = formatDateTimeLocal(endDate.toISOString());
      }
      elements.deleteEventBtn.style.display = 'none';
      const submitBtn = elements.eventForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.style.display = '';
    }
    
    elements.eventModal.classList.add('show');
    elements.modalBG.classList.add('show');
  }

  function closeEventModal() {
    elements.eventModal.classList.remove('show');
    elements.modalBG.classList.remove('show');
    state.selectedEvent = null;
    elements.eventForm.reset();
  }

  async function handleSaveEvent() {
    // Prevent editing project-based wedding events
    if (state.selectedEvent && (state.selectedEvent.is_project_wedding || state.selectedEvent.id.toString().startsWith('project-'))) {
      showMessage('error', 'Cannot edit project wedding dates. These are automatically generated from projects. Update the project\'s wedding date instead.');
      return;
    }
    
    const title = elements.eventTitle.value.trim();
    const projectId = elements.eventProject.value;
    const eventType = elements.eventType.value;
    const start = elements.eventStart.value;
    const end = elements.eventEnd.value;
    const location = elements.eventLocation.value.trim();
    const description = elements.eventDescription.value.trim();
    
    if (!title || !start || !end) {
      showMessage('error', 'Please fill in all required fields.');
      return;
    }
    
    if (new Date(end) <= new Date(start)) {
      showMessage('error', 'End time must be after start time.');
      return;
    }
    
    try {
      const eventData = {
        title,
        project_id: projectId ? parseInt(projectId) : null,
        event_type: eventType,
        start_datetime: new Date(start).toISOString(),
        end_datetime: new Date(end).toISOString(),
        location: location || null,
        description: description || null,
        created_by: state.user.id
      };
      
      if (state.selectedEvent) {
        eventData.id = state.selectedEvent.id;
      }
      
      await saveEvent(eventData);
      // Reload projects and tasks to refresh project wedding events and task events
      await loadProjects();
      await loadTasks();
      await loadEvents(); // Reload to refresh project wedding events and task events too
      renderCalendar();
      renderUpcomingEvents();
      closeEventModal();
      showMessage('success', `Event ${state.selectedEvent ? 'updated' : 'created'} successfully.`);
    } catch (error) {
      showMessage('error', error.message || 'Failed to save event.');
    }
  }

  async function handleDeleteEvent() {
    if (!state.selectedEvent) return;
    
    // Prevent deletion of project-based wedding events (they come from projects)
    if (state.selectedEvent.is_project_wedding || String(state.selectedEvent.id).startsWith('project-')) {
      showMessage('error', 'Cannot delete project wedding dates. These are automatically generated from projects.');
      return;
    }
    
    // Prevent deletion of task-based deadline events (they come from tasks)
    if (state.selectedEvent.is_task_deadline || String(state.selectedEvent.id).startsWith('task-')) {
      showMessage('error', 'Cannot delete task deadlines. These are automatically generated from tasks.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await deleteEvent(state.selectedEvent.id);
      await loadEvents();
      renderCalendar();
      renderUpcomingEvents();
      closeEventModal();
      showMessage('success', 'Event deleted successfully.');
    } catch (error) {
      showMessage('error', error.message || 'Failed to delete event.');
    }
  }

  function showMessage(type, text) {
    elements.message.textContent = text;
    elements.message.className = `message ${type} show`;
    setTimeout(() => {
      elements.message.classList.remove('show');
    }, 5000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDateTimeLocal(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function getWeekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Restore last view from localStorage
  const savedView = localStorage.getItem(STORAGE_KEY);
  if (savedView && ['month', 'week', 'day', 'list'].includes(savedView)) {
    state.currentView = savedView;
  }
})();
