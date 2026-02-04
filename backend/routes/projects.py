"""
Projects Routes for Wedding Planning System.

This module provides API endpoints for managing wedding projects including:
- Creating and updating projects
- Retrieving project lists
- Managing project assignments
- Integration with theme suggestions
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, date

from models.project import Project
from models.user import User
from models.theme_suggestion import ThemeSuggestion
from models.checklist_task import ChecklistTask
from extensions import db

# Create blueprint for project routes
projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


VALID_PROJECT_STATUSES = {'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'}
VALID_TASK_STATUSES = {'pending', 'in_progress', 'completed'}


def _user_can_access_project(project):
    """Return True if the current user can access the provided project."""
    if current_user.is_admin():
        return True
    if current_user.is_coordinator():
        # Coordinators are not assigned to projects directly; they only see projects with tasks assigned to them
        has_assigned_tasks = ChecklistTask.query.filter_by(
            project_id=project.id,
            assigned_to=current_user.id
        ).first() is not None
        return has_assigned_tasks
    # Planners can access projects they are assigned to or created
    return project.assigned_to == current_user.id or project.created_by == current_user.id


def _planner_can_modify_project(project):
    """Check whether a planner has write access to the project."""
    if current_user.is_admin():
        return True
    if current_user.is_coordinator():
        # Coordinators cannot modify projects
        return False
    return (
        current_user.is_planner()
        and (project.assigned_to == current_user.id or project.created_by == current_user.id)
    )


def _parse_due_date(raw_value):
    """Parse due date in YYYY-MM-DD format."""
    if not raw_value:
        return None
    if isinstance(raw_value, date):
        return raw_value
    try:
        return datetime.strptime(raw_value, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        raise ValueError('Invalid due_date format. Use YYYY-MM-DD')


@projects_bp.route('/', methods=['GET'])
@login_required
def get_projects():
    """
    Get all projects accessible to the current user.
    
    Returns:
        JSON: List of projects with user access control
    """
    try:
        # Admin can see all projects, planners see assigned/created projects, coordinators see assigned or projects with tasks assigned to them
        if current_user.is_admin():
            projects = Project.query.order_by(Project.created_at.desc()).all()
        elif current_user.is_coordinator():
            # Coordinators are not assigned to projects directly; they only see projects with tasks assigned to them
            project_ids_with_tasks = db.session.query(ChecklistTask.project_id).filter_by(
                assigned_to=current_user.id
            ).distinct().subquery()
            projects = Project.query.filter(
                Project.id.in_(db.session.query(project_ids_with_tasks))
            ).order_by(Project.created_at.desc()).all()
        else:
            # Planners can see projects they are assigned to or created
            projects = Project.query.filter(
                (Project.assigned_to == current_user.id) |
                (Project.created_by == current_user.id)
            ).order_by(Project.created_at.desc()).all()
        
        user_ids = set()
        for project in projects:
            if project.assigned_to:
                user_ids.add(project.assigned_to)
            if project.created_by:
                user_ids.add(project.created_by)
        
        user_map = {}
        if user_ids:
            users = User.query.filter(User.id.in_(user_ids)).all()
            user_map = {user.id: user for user in users}
        
        project_payload = []
        for project in projects:
            project_dict = project.to_dict()
            
            assigned_user = user_map.get(project.assigned_to)
            project_dict['assigned_to_name'] = (
                assigned_user.name or assigned_user.username
                if assigned_user else None
            )
            project_dict['assigned_to_email'] = assigned_user.email if assigned_user else None
            
            created_user = user_map.get(project.created_by)
            project_dict['created_by_name'] = (
                created_user.name or created_user.username
                if created_user else None
            )
            project_dict['created_by_email'] = created_user.email if created_user else None
            
            project_payload.append(project_dict)
        
        return jsonify({
            'projects': project_payload,
            'total': len(project_payload)
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve projects',
            'message': str(e)
        }), 500


@projects_bp.route('/theme-suggestions', methods=['GET'])
@login_required
def get_projects_for_theme_suggestions():
    """
    Get projects formatted for theme suggestions dropdown.
    
    Returns:
        JSON: List of projects formatted for theme suggestions
    """
    try:
        print(f"Getting projects for user: {current_user.id}, Role: {current_user.role}")
        
        # Get projects accessible to current user
        if current_user.is_admin():
            projects = Project.query.order_by(Project.created_at.desc()).all()
            print(f"Admin user - Found {len(projects)} total projects")
        elif current_user.is_coordinator():
            # Coordinators are not assigned to projects directly; they only see projects with tasks assigned to them
            project_ids_with_tasks = db.session.query(ChecklistTask.project_id).filter_by(
                assigned_to=current_user.id
            ).distinct().subquery()
            projects = Project.query.filter(
                Project.id.in_(db.session.query(project_ids_with_tasks))
            ).order_by(Project.created_at.desc()).all()
            print(f"Coordinator user - Found {len(projects)} projects with assigned tasks (coordinator: {current_user.id})")
        else:
            # Planners can see projects they are assigned to or created
            projects = Project.query.filter(
                (Project.assigned_to == current_user.id) | 
                (Project.created_by == current_user.id)
            ).order_by(Project.created_at.desc()).all()
            print(f"Planner user - Found {len(projects)} projects (assigned: {current_user.id}, created: {current_user.id})")
        
        # Convert projects to dictionary format
        projects_list = [project.to_theme_dict() for project in projects]
        
        print(f"Returning {len(projects_list)} projects")
        for i, proj in enumerate(projects_list[:3]):  # Log first 3 projects
            print(f"Project {i+1}: ID={proj.get('id')}, Bride={proj.get('bride_name')}, Groom={proj.get('groom_name')}")
        
        return jsonify({
            'projects': projects_list
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in get_projects_for_theme_suggestions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': 'Failed to retrieve projects for theme suggestions',
            'message': str(e)
        }), 500


@projects_bp.route('/assignees', methods=['GET'])
@login_required
def get_project_assignees():
    """
    Retrieve users that can be assigned to projects (planners and coordinators).
    """
    try:
        # Get both planners and coordinators (for project and task assignment)
        users = User.query.filter(
            User.role.in_(['planner', 'coordinator'])
        ).order_by(User.role.asc(), User.name.asc(), User.username.asc()).all()
        
        user_list = [{
            'id': user.id,
            'name': user.name or user.username,
            'email': user.email,
            'username': user.username,
            'role': user.role
        } for user in users]
        
        return jsonify({
            'planners': user_list,  # Keep key as 'planners' for backward compatibility
            'total': len(user_list)
        }), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve planner list',
            'message': str(e)
        }), 500


@projects_bp.route('/', methods=['POST'])
@login_required
def create_project():
    """
    Create a new wedding project.
    
    Expected JSON:
    {
        "bride_name": "Jane Doe",
        "groom_name": "John Smith",
        "contact_number": "0771234567",
        "contact_email": "jane@example.com",
        "wedding_date": "2025-06-15",
        "wedding_type": "Kandyan Sinhala Wedding",
        "bride_color": "#FF7F7F",
        "budget": 50000.00,
        "notes": "Outdoor wedding preferred"
    }
    
    Returns:
        JSON: Created project information
    """
    try:
        if not current_user.is_admin():
            return jsonify({'error': 'Only administrators can create projects'}), 403

        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Validate required fields
        required_fields = ['bride_name', 'groom_name', 'contact_number', 'contact_email', 'wedding_date']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate wedding date
        try:
            wedding_date = datetime.strptime(data['wedding_date'], '%Y-%m-%d').date()
            if wedding_date < date.today():
                return jsonify({'error': 'Wedding date cannot be in the past'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid wedding date format. Use YYYY-MM-DD'}), 400
        
        # Check for duplicate contact email
        existing_project = Project.query.filter_by(contact_email=data['contact_email']).first()
        if existing_project:
            return jsonify({'error': 'A project with this email already exists'}), 409
        
        # Determine assignee (planner)
        assigned_to_id = data.get('assigned_to')
        assigned_user = None
        if assigned_to_id is not None and assigned_to_id != '':
            try:
                assigned_to_id = int(assigned_to_id)
            except (TypeError, ValueError):
                return jsonify({'error': 'Invalid assigned_to value'}), 400
            
            # Projects can only be assigned to planners (not coordinators - coordinators are assigned to tasks)
            assigned_user = User.query.filter(
                User.id == assigned_to_id,
                User.role == 'planner'
            ).first()
            if not assigned_user:
                return jsonify({'error': 'Assigned user not found. Only planners can be assigned to projects. Coordinators are assigned to tasks within projects.'}), 404
        else:
            assigned_to_id = None
        
        # Validate status if provided
        status_value = data.get('status', 'planning')
        if status_value:
            status_value = status_value.strip().lower()
            if status_value not in VALID_PROJECT_STATUSES:
                return jsonify({'error': f'Invalid status value. Must be one of {", ".join(sorted(VALID_PROJECT_STATUSES))}'}), 400
        else:
            status_value = 'planning'
        
        # Create new project
        project = Project(
            company_id=data.get('company_id'),
            bride_name=data['bride_name'].strip(),
            groom_name=data['groom_name'].strip(),
            contact_number=data['contact_number'].strip(),
            contact_email=data['contact_email'].strip().lower(),
            wedding_date=wedding_date,
            wedding_type=data.get('wedding_type', '').strip() or None,
            bride_color=data.get('bride_color', '').strip() or None,
            budget=data.get('budget'),
            notes=(data.get('notes') or '').strip() or None,
            created_by=current_user.id,
            assigned_to=assigned_to_id,
            status=status_value
        )
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'message': 'Project created successfully',
            'project': project.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to create project',
            'message': str(e)
        }), 500


@projects_bp.route('/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    """
    Get a specific project by ID.
    
    Args:
        project_id (int): Project ID
    
    Returns:
        JSON: Project information
    """
    try:
        project = Project.query.get_or_404(project_id)
        
        # Check access permissions
        if not _user_can_access_project(project):
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({'project': project.to_dict()}), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve project',
            'message': str(e)
        }), 500


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@login_required
def update_project(project_id):
    """
    Update a specific project.
    
    Args:
        project_id (int): Project ID
    
    Returns:
        JSON: Updated project information
    """
    try:
        project = Project.query.get_or_404(project_id)
        
        # Check access permissions
        if not _planner_can_modify_project(project):
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Restrict planners to limited fields
        if current_user.is_planner():
            allowed_fields = {'status', 'notes'}
            disallowed = {field for field in data.keys() if field not in allowed_fields}
            if disallowed:
                return jsonify({
                    'error': 'Planners are not allowed to update these fields',
                    'fields': sorted(disallowed)
                }), 403
        
        # Update fields
        if current_user.is_admin():
            if 'bride_name' in data:
                project.bride_name = data['bride_name'].strip()
            if 'groom_name' in data:
                project.groom_name = data['groom_name'].strip()
            if 'contact_number' in data:
                project.contact_number = data['contact_number'].strip()
            if 'contact_email' in data:
                project.contact_email = data['contact_email'].strip().lower()
            if 'wedding_date' in data:
                try:
                    project.wedding_date = datetime.strptime(data['wedding_date'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'error': 'Invalid wedding date format. Use YYYY-MM-DD'}), 400
            if 'wedding_type' in data:
                project.wedding_type = data['wedding_type'].strip() or None
            if 'bride_color' in data:
                project.bride_color = data['bride_color'].strip() or None
            if 'budget' in data:
                project.budget = data['budget']
            if 'assigned_to' in data:
                assigned_to_value = data['assigned_to']
                if assigned_to_value in (None, '', 'null'):
                    project.assigned_to = None
                else:
                    try:
                        assigned_to_id = int(assigned_to_value)
                    except (TypeError, ValueError):
                        return jsonify({'error': 'Invalid assigned_to value'}), 400
                    assigned_user = User.query.filter_by(id=assigned_to_id, role='planner').first()
                    if not assigned_user:
                        return jsonify({'error': 'Assigned planner not found'}), 404
                    project.assigned_to = assigned_to_id
        
        if 'notes' in data:
            project.notes = (data['notes'] or '').strip() or None
        
        if 'status' in data:
            new_status = (data['status'] or '').strip().lower()
            if new_status not in VALID_PROJECT_STATUSES:
                return jsonify({'error': f'Invalid status value. Must be one of {", ".join(sorted(VALID_PROJECT_STATUSES))}'}), 400
            
            if current_user.is_admin() or (current_user.is_planner() and project.assigned_to == current_user.id):
                project.status = new_status
            else:
                return jsonify({'error': 'Access denied to update project status'}), 403
        
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Project updated successfully',
            'project': project.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to update project',
            'message': str(e)
        }), 500


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    """
    Delete a specific project.
    
    Args:
        project_id (int): Project ID
    
    Returns:
        JSON: Deletion confirmation
    """
    try:
        project = Project.query.get_or_404(project_id)
        
        # Only admin can delete projects
        if not current_user.is_admin():
            return jsonify({'error': 'Only administrators can delete projects'}), 403
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({'message': 'Project deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to delete project',
            'message': str(e)
        }), 500


@projects_bp.route('/<int:project_id>/tasks', methods=['GET'])
@login_required
def list_project_tasks(project_id):
    """Return checklist tasks for a project the user can access."""
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        if not _user_can_access_project(project):
            return jsonify({'error': 'Access denied to this project'}), 403

        try:
            # Use joinedload to eagerly load relationships and avoid N+1 queries
            from sqlalchemy.orm import joinedload
            base_query = (
                ChecklistTask.query
                .options(joinedload(ChecklistTask.assignee))
                .options(joinedload(ChecklistTask.creator))
                .filter_by(project_id=project_id)
            )
            
            # Coordinators can only see tasks assigned to them
            if current_user.is_coordinator():
                # MySQL doesn't support NULLS LAST in ORDER BY; order by fields directly
                tasks = (
                    base_query.filter_by(assigned_to=current_user.id)
                    .order_by(
                        ChecklistTask.due_date.asc(),
                        ChecklistTask.status.asc(),
                        ChecklistTask.created_at.asc(),
                    )
                    .all()
                )
            else:
                # Admin and Planner can see all tasks in the project
                tasks = (
                    base_query.order_by(
                        ChecklistTask.due_date.asc(),
                        ChecklistTask.status.asc(),
                        ChecklistTask.created_at.asc(),
                    ).all()
                )
        except Exception as db_error:
            # Database error - table might not exist or schema mismatch
            import traceback
            error_trace = traceback.format_exc()
            error_msg = str(db_error)
            print(f"Database error retrieving tasks for project {project_id}:")
            print(f"Error: {error_msg}")
            print(f"Traceback:\n{error_trace}")
            
            # Check if it's a table doesn't exist error
            if 'doesn\'t exist' in error_msg.lower() or 'no such table' in error_msg.lower() or 'table' in error_msg.lower() and 'not found' in error_msg.lower():
                return jsonify({
                    'error': 'Table not found',
                    'message': 'checklist_tasks table does not exist. Please restart the backend server to create it.'
                }), 500
            
            return jsonify({
                'error': 'Database error',
                'message': f'Unable to retrieve tasks: {error_msg}',
                'detail': 'Please check the backend console for more details.'
            }), 500

        summary = {
            'total': len(tasks),
            'completed': sum(1 for task in tasks if task.status == 'completed'),
            'in_progress': sum(1 for task in tasks if task.status == 'in_progress'),
            'pending': sum(1 for task in tasks if task.status == 'pending'),
        }
        summary['completion_rate'] = (
            round((summary['completed'] / summary['total']) * 100, 2)
            if summary['total'] else 0.0
        )

        # Serialize tasks with error handling
        tasks_data = []
        for task in tasks:
            try:
                tasks_data.append(task.to_dict())
            except Exception as serialization_error:
                import traceback
                print(f"Error serializing task {task.id}: {serialization_error}")
                print(traceback.format_exc())
                # Include task with minimal data if serialization fails
                tasks_data.append({
                    'id': task.id,
                    'project_id': task.project_id,
                    'title': getattr(task, 'title', 'Unknown Task'),
                    'description': None,
                    'status': getattr(task, 'status', 'pending'),
                    'due_date': None,
                    'assigned_to': getattr(task, 'assigned_to', None),
                    'assigned_to_name': None,
                    'assigned_to_email': None,
                    'created_by': getattr(task, 'created_by', None),
                    'created_at': None,
                    'updated_at': None,
                })

        return jsonify({
            'tasks': tasks_data,
            'summary': summary
        }), 200

    except Exception as exc:
        import traceback
        error_trace = traceback.format_exc()
        error_msg = str(exc)
        print(f"Error retrieving checklist tasks for project {project_id}:")
        print(f"Error: {error_msg}")
        print(f"Traceback:\n{error_trace}")
        return jsonify({
            'error': 'Failed to retrieve checklist tasks',
            'message': str(exc)
        }), 500


@projects_bp.route('/<int:project_id>/tasks', methods=['POST'])
@login_required
def create_project_task(project_id):
    """Create a new checklist task for the given project."""
    try:
        project = Project.query.get_or_404(project_id)
        if not _planner_can_modify_project(project):
            return jsonify({'error': 'Access denied'}), 403

        data = request.get_json() or {}
        title = (data.get('title') or '').strip()
        description = (data.get('description') or '').strip() or None
        status = (data.get('status') or 'pending').strip().lower()
        due_date_raw = data.get('due_date')
        assigned_to_raw = data.get('assigned_to')

        if not title:
            return jsonify({'error': 'Task title is required'}), 400
        if status not in VALID_TASK_STATUSES:
            return jsonify({
                'error': f"Invalid status. Must be one of {', '.join(sorted(VALID_TASK_STATUSES))}"
            }), 400

        try:
            due_date = _parse_due_date(due_date_raw)
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

        assigned_user = None
        if assigned_to_raw not in (None, '', 'null'):
            try:
                assigned_id = int(assigned_to_raw)
            except (TypeError, ValueError):
                return jsonify({'error': 'assigned_to must be a valid user id'}), 400
            assigned_user = User.query.get(assigned_id)
            if not assigned_user:
                return jsonify({'error': 'Assigned user not found'}), 404
            if assigned_user.role not in ('planner', 'admin', 'coordinator'):
                return jsonify({'error': 'Tasks can only be assigned to planner, admin, or coordinator users'}), 400
            # Planners can assign tasks to themselves or coordinators
            if current_user.is_planner() and assigned_user.id != current_user.id and assigned_user.role != 'coordinator':
                return jsonify({'error': 'Planners can only assign tasks to themselves or coordinators'}), 403

        task = ChecklistTask(
            project_id=project_id,
            title=title,
            description=description,
            status=status,
            due_date=due_date,
            assigned_to=assigned_user.id if assigned_user else None,
            created_by=current_user.id
        )

        db.session.add(task)
        db.session.commit()
        
        # Refresh to load relationships
        db.session.refresh(task)
        from sqlalchemy.orm import joinedload
        task = ChecklistTask.query.options(
            joinedload(ChecklistTask.assignee),
            joinedload(ChecklistTask.creator)
        ).get(task.id)

        return jsonify({
            'message': 'Task created successfully',
            'task': task.to_dict()
        }), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to create task',
            'message': str(exc)
        }), 500


@projects_bp.route('/<int:project_id>/tasks/<int:task_id>', methods=['PUT', 'PATCH'])
@login_required
def update_project_task(project_id, task_id):
    """Update an existing checklist task."""
    try:
        project = Project.query.get_or_404(project_id)
        
        # Check project access
        if not _user_can_access_project(project):
            return jsonify({'error': 'Access denied'}), 403

        task = ChecklistTask.query.filter_by(id=task_id, project_id=project_id).first_or_404()
        
        # Coordinators can only update tasks assigned to them
        if current_user.is_coordinator():
            if task.assigned_to != current_user.id:
                return jsonify({'error': 'Coordinators can only update tasks assigned to them'}), 403
            # Coordinators can only update status, description, and due_date (not title or assigned_to)
            allowed_fields = {'status', 'description', 'due_date'}
            disallowed = {field for field in (request.get_json() or {}).keys() if field not in allowed_fields}
            if disallowed:
                return jsonify({
                    'error': 'Coordinators are not allowed to update these fields',
                    'fields': sorted(disallowed)
                }), 403
        elif not _planner_can_modify_project(project):
            # For planners/admins, check if they can modify the project
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json() or {}

        if 'title' in data:
            title = (data.get('title') or '').strip()
            if not title:
                return jsonify({'error': 'Task title cannot be empty'}), 400
            task.title = title

        if 'description' in data:
            task.description = (data.get('description') or '').strip() or None

        if 'status' in data:
            status = (data.get('status') or '').strip().lower()
            if status not in VALID_TASK_STATUSES:
                return jsonify({
                    'error': f"Invalid status. Must be one of {', '.join(sorted(VALID_TASK_STATUSES))}"
                }), 400
            task.status = status

        if 'due_date' in data:
            try:
                task.due_date = _parse_due_date(data.get('due_date'))
            except ValueError as exc:
                return jsonify({'error': str(exc)}), 400

        if 'assigned_to' in data:
            assigned_to_raw = data.get('assigned_to')
            if assigned_to_raw in (None, '', 'null'):
                task.assigned_to = None
            else:
                try:
                    assigned_id = int(assigned_to_raw)
                except (TypeError, ValueError):
                    return jsonify({'error': 'assigned_to must be a valid user id'}), 400
                assigned_user = User.query.get(assigned_id)
                if not assigned_user:
                    return jsonify({'error': 'Assigned user not found'}), 404
                if assigned_user.role not in ('planner', 'admin', 'coordinator'):
                    return jsonify({'error': 'Tasks can only be assigned to planner, admin, or coordinator users'}), 400
                # Planners can assign tasks to themselves or coordinators
                if current_user.is_planner() and assigned_user.id != current_user.id and assigned_user.role != 'coordinator':
                    return jsonify({'error': 'Planners can only assign tasks to themselves or coordinators'}), 403
                task.assigned_to = assigned_user.id

        db.session.commit()
        
        # Refresh to load relationships
        db.session.refresh(task)
        from sqlalchemy.orm import joinedload
        task = ChecklistTask.query.options(
            joinedload(ChecklistTask.assignee),
            joinedload(ChecklistTask.creator)
        ).get(task.id)
        
        return jsonify({
            'message': 'Task updated successfully',
            'task': task.to_dict()
        }), 200

    except Exception as exc:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to update task',
            'message': str(exc)
        }), 500


@projects_bp.route('/<int:project_id>/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_project_task(project_id, task_id):
    """Delete a checklist task."""
    try:
        project = Project.query.get_or_404(project_id)
        if not _planner_can_modify_project(project):
            return jsonify({'error': 'Access denied'}), 403

        task = ChecklistTask.query.filter_by(id=task_id, project_id=project_id).first_or_404()

        # Coordinators cannot delete tasks
        if current_user.is_coordinator():
            return jsonify({'error': 'Coordinators cannot delete tasks'}), 403

        if current_user.is_planner() and task.created_by not in (None, current_user.id) and task.assigned_to != current_user.id:
            return jsonify({'error': 'Planners can only delete their own or assigned tasks'}), 403

        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'}), 200

    except Exception as exc:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to delete task',
            'message': str(exc)
        }), 500


@projects_bp.route('/<int:project_id>/theme-suggestions', methods=['POST'])
@login_required
def save_theme_suggestions(project_id):
    """
    Save theme suggestions for a specific project.
    
    Args:
        project_id (int): Project ID
    
    Expected JSON:
    {
        "wedding_type": "Kandyan Sinhala Wedding",
        "bride_color": "#FF7F7F",
        "suggestions": {
            "groom_colour": "Maroon",
            "bridesmaids_colour": "Coral red",
            ...
        }
    }
    
    Returns:
        JSON: Updated project information
    """
    try:
        project = Project.query.get_or_404(project_id)
        
        # Check access permissions
        if not _user_can_access_project(project):
            return jsonify({'error': 'Access denied'}), 403
        
        # Coordinators cannot save suggestions
        if current_user.is_coordinator():
            return jsonify({'error': 'Coordinators cannot save theme suggestions'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Update project with theme information
        if 'wedding_type' in data:
            project.wedding_type = data['wedding_type'].strip()
        if 'bride_color' in data:
            project.bride_color = data['bride_color'].strip()
        
        suggestions = data.get('suggestions')
        if not suggestions or not isinstance(suggestions, dict):
            return jsonify({'error': 'Suggestions payload is required'}), 400

        theme_suggestion = ThemeSuggestion.query.filter_by(project_id=project_id).first()
        if theme_suggestion is None:
            theme_suggestion = ThemeSuggestion(project_id=project_id)
            db.session.add(theme_suggestion)

        theme_suggestion.wedding_type = (suggestions.get('wedding_type') or data.get('wedding_type') or project.wedding_type or '').strip()
        theme_suggestion.bride_colour = (suggestions.get('bride_colour_mapped') or data.get('bride_color') or project.bride_color or '').strip()
        theme_suggestion.groom_colour = suggestions.get('groom_colour')
        theme_suggestion.bridesmaids_colour = suggestions.get('bridesmaids_colour')
        theme_suggestion.best_men_colour = suggestions.get('best_men_colour')
        theme_suggestion.flower_deco_colour = suggestions.get('flower_deco_colour')
        theme_suggestion.hall_decor_colour = suggestions.get('hall_decor_colour')
        theme_suggestion.food_menu = suggestions.get('food_menu')
        theme_suggestion.drinks = suggestions.get('drinks')
        theme_suggestion.pre_shoot_locations = suggestions.get('pre_shoot_locations')

        project.updated_at = datetime.utcnow()

        db.session.commit()
        
        return jsonify({
            'message': 'Theme suggestions saved successfully',
            'project': project.to_dict(),
            'theme_suggestion': theme_suggestion.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to save theme suggestions',
            'message': str(e)
        }), 500


