"""
Budget management API routes.
"""

from datetime import datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from extensions import db
from models.project import Project
from models.budget_item import BudgetItem


budget_bp = Blueprint('budget', __name__, url_prefix='/api/budget')


def _user_can_access_project(project: Project) -> bool:
    """Return True if the current user can access the provided project."""
    if project is None:
        return False
    if current_user.is_admin():
        return True
    if current_user.is_coordinator():
        # Coordinators are not assigned to projects directly; they only see projects with tasks assigned to them
        from models.checklist_task import ChecklistTask
        has_assigned_tasks = ChecklistTask.query.filter_by(
            project_id=project.id,
            assigned_to=current_user.id
        ).first() is not None
        return has_assigned_tasks
    # Planners can access projects they are assigned to or created
    return project.created_by == current_user.id or project.assigned_to == current_user.id


def _parse_amount(value, field_name: str) -> Decimal:
    """Parse and validate monetary amounts."""
    if value is None:
        raise ValueError(f"'{field_name}' is required.")
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise ValueError(f"'{field_name}' must be a valid number.")
    if amount < 0:
        raise ValueError(f"'{field_name}' cannot be negative.")
    return amount.quantize(Decimal('0.01'))


def _parse_expense_date(raw_value):
    """Parse an incoming expense date string (YYYY-MM-DD)."""
    if not raw_value:
        return None
    if isinstance(raw_value, datetime):
        return raw_value.date()
    try:
        return datetime.strptime(raw_value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")


@budget_bp.route('/projects/<int:project_id>/items', methods=['GET'])
@login_required
def list_budget_items(project_id):
    """Return all budget items for a project the current user can access."""
    project = Project.query.get_or_404(project_id)
    if not _user_can_access_project(project):
        return jsonify({'error': 'Access denied'}), 403

    items = (
        BudgetItem.query
        .filter_by(project_id=project_id)
        # MySQL doesn't support NULLS LAST; rely on default ordering without it
        .order_by(BudgetItem.expense_date.desc(), BudgetItem.updated_at.desc())
        .all()
    )

    total_planned = sum((item.planned_amount or 0) for item in items)
    total_actual = sum((item.actual_amount or 0) for item in items)

    return jsonify({
        'project': project.to_dict(),
        'items': [item.to_dict() for item in items],
        'totals': {
            'planned': float(total_planned or 0),
            'actual': float(total_actual or 0),
            'variance': float((total_planned or 0) - (total_actual or 0))
        }
    }), 200


@budget_bp.route('/projects/<int:project_id>/items', methods=['POST'])
@login_required
def create_budget_item(project_id):
    """Create a new budget item under a project."""
    project = Project.query.get_or_404(project_id)
    if not _user_can_access_project(project):
        return jsonify({'error': 'Access denied'}), 403
    
    # Coordinators cannot create budget items (read-only access)
    if current_user.is_coordinator():
        return jsonify({'error': 'Coordinators cannot create budget items'}), 403

    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400

    data = request.get_json() or {}
    category = (data.get('category') or '').strip()

    if not category:
        return jsonify({'error': "'category' is required."}), 400

    try:
        planned_amount = _parse_amount(data.get('planned_amount'), 'planned_amount')
        actual_amount = _parse_amount(data.get('actual_amount'), 'actual_amount')
        expense_date = _parse_expense_date(data.get('expense_date'))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    item = BudgetItem(
        project_id=project_id,
        category=category,
        planned_amount=planned_amount,
        actual_amount=actual_amount,
        expense_date=expense_date,
        vendor=(data.get('vendor') or '').strip() or None,
        notes=(data.get('notes') or '').strip() or None,
        created_by=current_user.id
    )

    db.session.add(item)
    try:
        db.session.commit()
    except Exception as exc:  # pylint: disable=broad-except
        db.session.rollback()
        return jsonify({'error': 'Failed to create budget item', 'details': str(exc)}), 500

    return jsonify({'message': 'Budget item created', 'item': item.to_dict()}), 201


@budget_bp.route('/items/<int:item_id>', methods=['PUT', 'PATCH'])
@login_required
def update_budget_item(item_id):
    """Update an existing budget item."""
    item = BudgetItem.query.get_or_404(item_id)
    if not _user_can_access_project(item.project):
        return jsonify({'error': 'Access denied'}), 403
    
    # Coordinators cannot update budget items (read-only access)
    if current_user.is_coordinator():
        return jsonify({'error': 'Coordinators cannot update budget items'}), 403

    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400

    data = request.get_json() or {}

    if 'category' in data:
        category = (data.get('category') or '').strip()
        if not category:
            return jsonify({'error': "'category' cannot be empty."}), 400
        item.category = category

    if 'planned_amount' in data:
        try:
            item.planned_amount = _parse_amount(data.get('planned_amount'), 'planned_amount')
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

    if 'actual_amount' in data:
        try:
            item.actual_amount = _parse_amount(data.get('actual_amount'), 'actual_amount')
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

    if 'expense_date' in data:
        try:
            item.expense_date = _parse_expense_date(data.get('expense_date'))
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

    if 'vendor' in data:
        item.vendor = (data.get('vendor') or '').strip() or None

    if 'notes' in data:
        item.notes = (data.get('notes') or '').strip() or None

    item.updated_at = datetime.utcnow()

    try:
        db.session.commit()
    except Exception as exc:  # pylint: disable=broad-except
        db.session.rollback()
        return jsonify({'error': 'Failed to update budget item', 'details': str(exc)}), 500

    return jsonify({'message': 'Budget item updated', 'item': item.to_dict()}), 200


@budget_bp.route('/items/<int:item_id>', methods=['DELETE'])
@login_required
def delete_budget_item(item_id):
    """Delete a budget item."""
    item = BudgetItem.query.get_or_404(item_id)
    if not _user_can_access_project(item.project):
        return jsonify({'error': 'Access denied'}), 403
    
    # Coordinators cannot delete budget items (read-only access)
    if current_user.is_coordinator():
        return jsonify({'error': 'Coordinators cannot delete budget items'}), 403

    try:
        db.session.delete(item)
        db.session.commit()
    except Exception as exc:  # pylint: disable=broad-except
        db.session.rollback()
        return jsonify({'error': 'Failed to delete budget item', 'details': str(exc)}), 500

    return jsonify({'message': 'Budget item deleted'}), 200

