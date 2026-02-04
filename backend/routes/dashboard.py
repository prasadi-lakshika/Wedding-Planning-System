"""
Dashboard Routes for Wedding Planning System.

This module provides API endpoints for dashboard statistics including:
- Aggregated statistics (pending tasks, total budget, active clients, upcoming events)
- Role-based access control for statistics
"""

from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_, or_

from models.project import Project
from models.checklist_task import ChecklistTask
from models.budget_item import BudgetItem
from extensions import db

# Create blueprint for dashboard routes
dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


def _get_accessible_projects_query():
    """Get base query for projects accessible to current user."""
    if current_user.is_admin():
        return Project.query
    elif current_user.is_coordinator():
        # Coordinators are not assigned to projects directly; they only see projects with tasks assigned to them
        from models.checklist_task import ChecklistTask
        project_ids_with_tasks = db.session.query(ChecklistTask.project_id).filter_by(
            assigned_to=current_user.id
        ).distinct().subquery()
        return Project.query.filter(
            Project.id.in_(db.session.query(project_ids_with_tasks))
        )
    else:
        # Planners can see projects they are assigned to or created
        return Project.query.filter(
            or_(
                Project.assigned_to == current_user.id,
                Project.created_by == current_user.id
            )
        )


@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    """
    Get aggregated dashboard statistics for the current user.
    
    Returns:
        JSON: Dashboard statistics including:
        - pending_tasks: Count of non-completed tasks
        - total_budget: Sum of actual amounts from budget items
        - active_clients: Count of projects with active status
        - upcoming_events: Count of upcoming calendar events (placeholder: 0)
        - ongoing_projects: List of ongoing projects
    """
    try:
        # Get base query for accessible projects
        accessible_projects_query = _get_accessible_projects_query()
        accessible_projects = accessible_projects_query.all()
        accessible_project_ids = [p.id for p in accessible_projects]
        
        # Initialize stats
        stats = {
            'pending_tasks': 0,
            'total_budget': 0.0,
            'active_clients': 0,
            'upcoming_events': 0,  # Placeholder until calendar events are implemented
            'ongoing_projects': []
        }
        
        if not accessible_project_ids:
            # No projects accessible, return empty stats
            return jsonify({
                'stats': stats,
                'message': 'No projects found for this user'
            }), 200
        
        # 1. Calculate Pending Tasks Count
        # Count tasks that are not completed across all accessible projects
        try:
            task_query = ChecklistTask.query.filter(
                and_(
                    ChecklistTask.project_id.in_(accessible_project_ids),
                    ChecklistTask.status != 'completed'
                )
            )
            # Coordinators can only see tasks assigned to them
            if current_user.is_coordinator():
                task_query = task_query.filter_by(assigned_to=current_user.id)
            pending_tasks_count = task_query.count()
            stats['pending_tasks'] = pending_tasks_count
        except Exception as e:
            # Table might not exist, return 0
            print(f"Error counting pending tasks: {e}")
            stats['pending_tasks'] = 0
        
        # 2. Calculate Total Budget
        # Sum actual_amount from budget_items for all accessible projects
        try:
            total_budget_result = (
                db.session.query(func.sum(BudgetItem.actual_amount))
                .filter(BudgetItem.project_id.in_(accessible_project_ids))
                .scalar()
            )
            stats['total_budget'] = float(total_budget_result) if total_budget_result else 0.0
        except Exception as e:
            # Table might not exist, return 0
            print(f"Error calculating total budget: {e}")
            stats['total_budget'] = 0.0
        
        # 3. Calculate Active Clients Count
        # Count projects with status that indicates active (not completed or cancelled)
        active_statuses = ['planning', 'confirmed', 'in_progress']
        try:
            active_clients_count = (
                accessible_projects_query
                .filter(Project.status.in_(active_statuses))
                .count()
            )
            stats['active_clients'] = active_clients_count
        except Exception as e:
            print(f"Error counting active clients: {e}")
            stats['active_clients'] = 0
        
        # 4. Upcoming Events (Placeholder - calendar events not implemented yet)
        # TODO: Implement when calendar events table is created
        stats['upcoming_events'] = 0
        
        # 5. Get Ongoing Projects List
        # Get projects with active status for the ongoing projects list
        try:
            ongoing_projects = (
                accessible_projects_query
                .filter(Project.status.in_(active_statuses))
                .order_by(Project.created_at.desc())
                .limit(10)  # Limit to 10 most recent
                .all()
            )
            
            stats['ongoing_projects'] = [
                {
                    'id': project.id,
                    'bride_name': project.bride_name,
                    'groom_name': project.groom_name,
                    'status': project.status,
                    'wedding_date': project.wedding_date.isoformat() if project.wedding_date else None,
                    'created_at': project.created_at.isoformat() if project.created_at else None
                }
                for project in ongoing_projects
            ]
        except Exception as e:
            print(f"Error fetching ongoing projects: {e}")
            stats['ongoing_projects'] = []
        
        return jsonify({
            'stats': stats,
            'success': True
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in get_dashboard_stats: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': 'Failed to retrieve dashboard statistics',
            'message': str(e),
            'stats': {
                'pending_tasks': 0,
                'total_budget': 0.0,
                'active_clients': 0,
                'upcoming_events': 0,
                'ongoing_projects': []
            }
        }), 500

