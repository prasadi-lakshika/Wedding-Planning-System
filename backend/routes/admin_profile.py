"""
Admin Profile Routes for Wedding Planning System.

Provides APIs for administrators to manage business and account details,
including optional password updates.
"""

from functools import wraps
import re

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import OperationalError

from extensions import db
from models.user import User
from models.company import Company

admin_profile_bp = Blueprint('admin_profile', __name__, url_prefix='/api/admin')


def _admin_required(fn):
    """Decorator to ensure the current user is an authenticated admin."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Login required'}), 401
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)

    return wrapper


@admin_profile_bp.route('/profile', methods=['GET'])
@login_required
@_admin_required
def get_admin_profile():
    """Return the admin's business and personal profile information."""
    user_dict = current_user.to_dict()
    try:
        company = Company.query.first()
    except OperationalError as exc:
        print(f"Company table access failed: {exc}")
        company = None
    return jsonify({
        'admin': {
            'name': user_dict.get('name'),
            'username': user_dict.get('username'),
            'email': user_dict.get('email'),
            'phone_number': user_dict.get('phone_number'),
            'address': user_dict.get('address'),
        },
        'company': {
            'company_name': company.name if company else None,
            'company_email': company.email if company else None,
            'company_phone': company.phone if company else None,
            'company_address': company.address if company else None,
            'company_description': company.description if company else None,
        },
        'metadata': {
            'updated_at': user_dict.get('updated_at'),
            'created_at': user_dict.get('created_at')
        }
    }), 200


@admin_profile_bp.route('/profile', methods=['PUT'])
@login_required
@_admin_required
def update_admin_profile():
    """Update the admin business and personal profile."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    admin_data = data.get('admin', {})
    company_data = data.get('company', {})

    # Validate email if provided
    admin_email = (admin_data.get('email') or '').strip()
    company_email = (company_data.get('company_email') or '').strip()

    if admin_email and not _is_valid_email(admin_email):
        return jsonify({'error': 'Invalid admin email format'}), 400
    if company_email and not _is_valid_email(company_email):
        return jsonify({'error': 'Invalid company email format'}), 400

    # Update admin fields
    if 'name' in admin_data:
        current_user.name = (admin_data.get('name') or '').strip() or None

    if 'phone_number' in admin_data:
        current_user.phone_number = (admin_data.get('phone_number') or '').strip() or None

    if 'address' in admin_data:
        current_user.address = (admin_data.get('address') or '').strip() or None

    if admin_email:
        # Check for duplicate email if changed
        if admin_email != current_user.email:
            if User.query.filter(User.email == admin_email, User.id != current_user.id).first():
                return jsonify({'error': 'Email already in use'}), 409
        current_user.email = admin_email

    if 'username' in admin_data:
        new_username = (admin_data.get('username') or '').strip()
        if new_username and new_username != current_user.username:
            if len(new_username) < 3:
                return jsonify({'error': 'Username must be at least 3 characters long'}), 400
            if not re.match(r'^[a-zA-Z0-9_]+$', new_username):
                return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400
            if User.query.filter(User.username == new_username, User.id != current_user.id).first():
                return jsonify({'error': 'Username already in use'}), 409
            current_user.username = new_username

    # Update company fields
    if any(key in company_data for key in ['company_name', 'company_email', 'company_phone', 'company_address', 'company_description']):
        try:
            company = Company.query.first()
        except OperationalError as exc:
            print(f"Company table access failed: {exc}")
            company = None

        if company is None:
            company = Company()
            try:
                db.session.add(company)
            except OperationalError as exc:
                db.session.rollback()
                return jsonify({'error': 'Company table not available', 'details': str(exc)}), 500

        company.name = (company_data.get('company_name') or '').strip() or None
        company.email = company_email or None
        company.phone = (company_data.get('company_phone') or '').strip() or None
        company.address = (company_data.get('company_address') or '').strip() or None
        company.description = (company_data.get('company_description') or '').strip() or None

    try:
        db.session.commit()
        company = Company.query.first()
        profile = current_user.to_dict()
        profile.update({
            'company_name': company.name if company else None,
            'company_email': company.email if company else None,
            'company_phone': company.phone if company else None,
            'company_address': company.address if company else None,
            'company_description': company.description if company else None,
        })
        return jsonify({
            'message': 'Profile updated successfully',
            'profile': profile
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile', 'details': str(exc)}), 500


@admin_profile_bp.route('/profile/password', methods=['PUT'])
@login_required
@_admin_required
def update_admin_password():
    """Allow admin to change their password."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    if not all([current_password, new_password, confirm_password]):
        return jsonify({'error': 'Current password, new password, and confirmation are required'}), 400

    if not current_user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 403

    if new_password != confirm_password:
        return jsonify({'error': 'New password and confirmation do not match'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long'}), 400

    try:
        current_user.set_password(new_password)
        db.session.commit()
        return jsonify({'message': 'Password updated successfully'}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'error': 'Failed to update password', 'details': str(exc)}), 500


def _is_valid_email(email: str) -> bool:
    """Simple email validation."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def _generate_username_from_email(email: str) -> str:
    """Generate a unique username based on the email prefix."""
    base = email.split('@')[0]
    # Keep alphanumeric and underscores, fallback to 'user'
    base = re.sub(r'[^a-zA-Z0-9_]', '', base) or 'user'
    base = base[:20]

    candidate = base
    counter = 1
    while User.query.filter_by(username=candidate).first():
        candidate = f"{base}{counter}"
        counter += 1
    return candidate


@admin_profile_bp.route('/users', methods=['GET'])
@login_required
@_admin_required
def list_users():
    """Return all users for management."""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [user.to_dict() for user in users]}), 200


@admin_profile_bp.route('/users', methods=['POST'])
@login_required
@_admin_required
def create_user():
    """Create a new user account."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone_number = (data.get('phone_number') or '').strip() or None
    role = (data.get('role') or '').strip().lower()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''

    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if not email or not _is_valid_email(email):
        return jsonify({'error': 'Valid email is required'}), 400
    if role not in ('admin', 'planner'):
        return jsonify({'error': "Role must be either 'admin' or 'planner'"}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    if password != confirm_password:
        return jsonify({'error': 'Password and confirm password do not match'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already in use'}), 409

    username = _generate_username_from_email(email)

    user = User(
        email=email,
        username=username,
        name=name,
        phone_number=phone_number,
        role=role
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'error': 'Failed to create user', 'details': str(exc)}), 500


@admin_profile_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
@_admin_required
def update_user(user_id):
    """Update user information."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone_number = (data.get('phone_number') or '').strip() or None
    role = (data.get('role') or '').strip().lower()

    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if not email or not _is_valid_email(email):
        return jsonify({'error': 'Valid email is required'}), 400
    if role not in ('admin', 'planner'):
        return jsonify({'error': "Role must be either 'admin' or 'planner'"}), 400

    if email != user.email and User.query.filter(User.email == email, User.id != user_id).first():
        return jsonify({'error': 'Email already in use'}), 409

    user.name = name
    user.email = email
    user.phone_number = phone_number
    user.role = role

    new_password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''
    if new_password or confirm_password:
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        if new_password != confirm_password:
            return jsonify({'error': 'Password and confirm password do not match'}), 400
        user.set_password(new_password)

    try:
        db.session.commit()
        return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user', 'details': str(exc)}), 500


@admin_profile_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
@_admin_required
def delete_user(user_id):
    """Delete a user account."""
    if user_id == current_user.id:
        return jsonify({'error': 'You cannot delete your own account'}), 400

    user = User.query.get_or_404(user_id)

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete user', 'details': str(exc)}), 500


