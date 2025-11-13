"""
Authentication Routes for Wedding Planning System.

This module handles user authentication including:
- User login and logout
- User registration
- Profile management
- Authentication status checking
"""

import re
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from models.user import User
from extensions import db

# Create authentication blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint.
    
    Expected JSON:
    {
        "email": "user@example.com",
        "password": "password123"
    }
    
    Returns:
        JSON: Login status and user information
    """
    try:
        # Validate request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing login data"}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Validate required fields
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Validate email format
        if not _is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Authenticate user
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401
            
        if not user.check_password(password):
            return jsonify({"error": "Invalid email or password"}), 401

        # Login successful
        login_user(user, remember=True)
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({"error": "Login failed. Please try again."}), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    User registration endpoint.
    
    Expected JSON:
    {
        "email": "user@example.com",
        "username": "username",
        "password": "password123",
        "name": "Full Name",
        "role": "planner"  // optional, defaults to "planner"
    }
    
    Returns:
        JSON: Registration status and user information
    """
    try:
        # Validate request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing registration data"}), 400

        # Extract and validate fields
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        role = data.get('role', 'planner')

        # Validate required fields
        if not all([email, username, password, name]):
            return jsonify({"error": "All fields are required"}), 400

        # Validate field formats and constraints
        validation_error = _validate_registration_data(email, username, password, role)
        if validation_error:
            return jsonify({"error": validation_error}), 400

        # Check for existing users
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 409

        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already taken"}), 409

        # Create new user
        new_user = User(
            email=email,
            username=username,
            name=name,
            role=role
        )
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "message": "Registration successful",
            "user": new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Registration failed. Please try again."}), 500


@auth_bp.route('/logout', methods=['POST', 'GET'])
@login_required
def logout():
    """
    User logout endpoint.
    
    Returns:
        JSON: Logout status
    """
    try:
        logout_user()
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Logout failed"}), 500


@auth_bp.route('/profile', methods=['GET'])
@login_required
def profile():
    """
    Get current user profile.
    
    Returns:
        JSON: Current user information
    """
    try:
        return jsonify(current_user.to_dict()), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch profile"}), 500


@auth_bp.route('/check-auth', methods=['GET'])
def check_auth():
    """
    Check authentication status.
    
    Returns:
        JSON: Authentication status and user info if authenticated
    """
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "user": current_user.to_dict()
        }), 200
    else:
        return jsonify({"authenticated": False}), 401


def _is_valid_email(email):
    """
    Validate email format.
    
    Args:
        email (str): Email address to validate
        
    Returns:
        bool: True if valid email format, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    return re.match(pattern, email) is not None


def _validate_registration_data(email, username, password, role):
    """
    Validate registration data.
    
    Args:
        email (str): Email address
        username (str): Username
        password (str): Password
        role (str): User role
        
    Returns:
        str: Error message if validation fails, None if valid
    """
    # Email validation
    if not _is_valid_email(email):
        return "Invalid email format"
    
    # Username validation
    if len(username) < 3:
        return "Username must be at least 3 characters long"
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return "Username can only contain letters, numbers, and underscores"
    
    # Password validation
    if len(password) < 6:
        return "Password must be at least 6 characters long"
    
    # Role validation
    if role not in ['admin', 'planner']:
        return "Invalid role. Must be 'admin' or 'planner'"
    
    return None
