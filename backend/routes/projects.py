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
from extensions import db

# Create blueprint for project routes
projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


VALID_PROJECT_STATUSES = {'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'}


@projects_bp.route('/', methods=['GET'])
@login_required
def get_projects():
    """
    Get all projects accessible to the current user.
    
    Returns:
        JSON: List of projects with user access control
    """
    try:
        # Admin can see all projects, planners see only assigned/created projects
        if current_user.is_admin():
            projects = Project.query.order_by(Project.created_at.desc()).all()
        else:
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
        else:
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
    Retrieve planner users that can be assigned to projects.
    """
    try:
        planners = User.query.filter_by(role='planner').order_by(User.name.asc(), User.username.asc()).all()
        planner_list = [{
            'id': planner.id,
            'name': planner.name or planner.username,
            'email': planner.email,
            'username': planner.username
        } for planner in planners]
        
        return jsonify({
            'planners': planner_list,
            'total': len(planner_list)
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
            
            assigned_user = User.query.filter_by(id=assigned_to_id, role='planner').first()
            if not assigned_user:
                return jsonify({'error': 'Assigned planner not found'}), 404
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
        if not current_user.is_admin() and project.assigned_to != current_user.id and project.created_by != current_user.id:
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
        if not current_user.is_admin() and project.assigned_to != current_user.id and project.created_by != current_user.id:
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
        if not current_user.is_admin() and project.assigned_to != current_user.id and project.created_by != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
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


