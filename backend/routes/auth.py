"""
Authentication Routes for Wedding Planning System.

This module handles user authentication including:
- User login and logout
- User registration
- Profile management
- Authentication status checking
- Password reset functionality
"""

import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, url_for
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Message

from models.user import User
from models.password_reset_token import PasswordResetToken
from extensions import db, mail

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


@auth_bp.route('/profile/password', methods=['PUT', 'POST'])
@login_required
def change_password():
    """
    Change password for the current user (planner, coordinator, or admin).
    
    Expected JSON:
    {
        "current_password": "oldpassword",
        "new_password": "newpassword",
        "confirm_password": "newpassword"  # Optional, will use new_password if not provided
    }
    
    Returns:
        JSON: Success or error message
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        current_password = data.get('current_password') or data.get('currentPassword')
        new_password = data.get('new_password') or data.get('newPassword')
        confirm_password = data.get('confirm_password') or data.get('confirmPassword') or data.get('confirmNewPassword')

        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400

        # If confirm_password not provided, use new_password
        if not confirm_password:
            confirm_password = new_password

        # Verify current password
        if not current_user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 403

        # Verify new passwords match
        if new_password != confirm_password:
            return jsonify({'error': 'New password and confirmation do not match'}), 400

        # Validate password length
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400

        # Update password
        current_user.set_password(new_password)
        db.session.commit()
        
        return jsonify({
            'message': 'Password updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to update password',
            'message': str(e)
        }), 500


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
    if role not in ['admin', 'planner', 'coordinator']:
        return "Invalid role. Must be 'admin', 'planner', or 'coordinator'"
    
    return None

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Request password reset via email.
    
    Expected JSON:
    {
        "email": "user@example.com"
    }
    
    Returns:
        JSON: Success message (always returns success to prevent email enumeration)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Email is required"}), 400

        email = data.get('email', '').strip().lower()

        # Validate email format
        if not email:
            return jsonify({"error": "Email is required"}), 400

        if not _is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Find user by email
        user = User.query.filter_by(email=email).first()

        # Always return success message to prevent email enumeration
        # Don't reveal whether email exists or not
        success_message = {
            "message": "If an account exists with this email, a password reset link has been sent."
        }

        if user:
            # Check rate limiting (max 3 requests per hour per email)
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            recent_requests = PasswordResetToken.query.filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.created_at >= one_hour_ago
            ).count()

            if recent_requests >= current_app.config.get('PASSWORD_RESET_RATE_LIMIT_PER_HOUR', 3):
                # Rate limit exceeded, but still return success message
                return jsonify(success_message), 200

            # Invalidate any existing unused tokens for this user
            PasswordResetToken.query.filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False
            ).delete()

            # Create new reset token
            expiration_hours = current_app.config.get('PASSWORD_RESET_TOKEN_EXPIRATION_HOURS', 1)
            reset_token = PasswordResetToken.create_token(user.id, expiration_hours)
            db.session.add(reset_token)
            db.session.commit()

            # Send password reset email
            try:
                _send_password_reset_email(user, reset_token.token)
            except Exception as email_error:
                # Log error but don't reveal it to user
                print(f"Error sending password reset email: {email_error}")
                # Still return success to prevent email enumeration

        return jsonify(success_message), 200

    except Exception as e:
        print(f"Error in forgot_password: {e}")
        return jsonify({
            "message": "If an account exists with this email, a password reset link has been sent."
        }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Reset password using a valid reset token.
    
    Expected JSON:
    {
        "token": "ABC123XYZ...",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123"
    }
    
    Returns:
        JSON: Success or error message
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request data is required"}), 400

        token = data.get('token', '').strip()
        new_password = data.get('new_password', '')
        confirm_password = data.get('confirm_password', '')

        # Validate required fields
        if not token:
            return jsonify({"error": "Reset token is required"}), 400

        if not new_password or not confirm_password:
            return jsonify({"error": "New password and confirmation are required"}), 400

        # Validate passwords match
        if new_password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400

        # Validate password requirements
        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400

        # Find token
        reset_token = PasswordResetToken.query.filter_by(token=token).first()

        if not reset_token:
            return jsonify({"error": "Invalid or expired reset token"}), 400

        # Check if token is valid (not used and not expired)
        if not reset_token.is_valid():
            return jsonify({"error": "Invalid or expired reset token"}), 400

        # Get user
        user = User.query.get(reset_token.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Update password
        user.set_password(new_password)
        
        # Mark token as used
        reset_token.mark_as_used()

        # Commit changes
        db.session.commit()

        return jsonify({
            "message": "Password reset successful. You can now log in with your new password."
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in reset_password: {e}")
        return jsonify({"error": "Failed to reset password. Please try again."}), 500


@auth_bp.route('/verify-reset-token', methods=['GET'])
def verify_reset_token():
    """
    Verify if a reset token is valid.
    
    Query Parameters:
        token: The reset token to verify
    
    Returns:
        JSON: Token validity status
    """
    try:
        token = request.args.get('token', '').strip()

        if not token:
            return jsonify({"error": "Token is required"}), 400

        reset_token = PasswordResetToken.query.filter_by(token=token).first()

        if not reset_token:
            return jsonify({
                "valid": False,
                "message": "Invalid token"
            }), 200

        if not reset_token.is_valid():
            return jsonify({
                "valid": False,
                "message": "Token has expired or has already been used"
            }), 200

        return jsonify({
            "valid": True,
            "message": "Token is valid"
        }), 200

    except Exception as e:
        print(f"Error in verify_reset_token: {e}")
        return jsonify({"error": "Failed to verify token"}), 500


def _send_password_reset_email(user, token):
    """
    Send password reset email to user.
    
    Args:
        user (User): User object
        token (str): Reset token
    """
    try:
        # Get base URL from config or use default
        base_url = current_app.config.get('BASE_URL', 'http://localhost:8000')
        reset_url = f"{base_url}/reset-password.html?token={token}"

        # Create email message
        subject = "Password Reset Request - Wedding Planning System"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #d4af37;">Password Reset Request</h2>
                <p>Hello {user.name or user.username},</p>
                <p>You have requested to reset your password for your Wedding Planning System account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #d4af37; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_url}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request
        
        Hello {user.name or user.username},
        
        You have requested to reset your password for your Wedding Planning System account.
        
        Click the following link to reset your password:
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
        """

        msg = Message(
            subject=subject,
            recipients=[user.email],
            html=html_body,
            body=text_body
        )

        mail.send(msg)
        print(f"Password reset email sent to {user.email}")

    except Exception as e:
        print(f"Error sending password reset email: {e}")
        raise

