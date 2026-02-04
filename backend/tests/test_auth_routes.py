"""
Test suite for Authentication Routes.

Tests cover:
- User login (success, failure)
- User registration (success, validation errors)
- User logout
- Profile retrieval
- Password change
- Password reset flow
"""
import pytest
import json
from datetime import datetime, timedelta

from models.user import User
from models.password_reset_token import PasswordResetToken


class TestLogin:
    """Test login endpoint."""
    
    def test_login_success(self, client, planner_user):
        """Test successful login with valid credentials."""
        response = client.post('/auth/login', json={
            'email': 'planner@test.com',
            'password': 'planner123'
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert data['user']['email'] == 'planner@test.com'
        assert data['user']['role'] == 'planner'
        assert 'id' in data['user']
    
    def test_login_invalid_email(self, client):
        """Test login with invalid email."""
        response = client.post('/auth/login', json={
            'email': 'nonexistent@test.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Invalid email or password'
    
    def test_login_invalid_password(self, client, planner_user):
        """Test login with invalid password."""
        response = client.post('/auth/login', json={
            'email': 'planner@test.com',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Invalid email or password'
    
    def test_login_missing_data(self, client):
        """Test login with missing email or password."""
        # Missing email
        response = client.post('/auth/login', json={
            'password': 'password123'
        })
        assert response.status_code == 400
        
        # Missing password
        response = client.post('/auth/login', json={
            'email': 'test@test.com'
        })
        assert response.status_code == 400
    
    def test_login_empty_request(self, client):
        """Test login with empty request body."""
        response = client.post('/auth/login', json={})
        assert response.status_code == 400


class TestRegister:
    """Test registration endpoint."""
    
    def test_register_success_admin(self, client, db_session):
        """Test successful registration of admin user."""
        response = client.post('/auth/register', json={
            'email': 'newadmin@test.com',
            'username': 'newadmin',
            'password': 'password123',
            'role': 'admin',
            'name': 'New Admin'
        })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert data['user']['email'] == 'newadmin@test.com'
        assert data['user']['role'] == 'admin'
        
        # Verify user exists in database
        user = User.query.filter_by(email='newadmin@test.com').first()
        assert user is not None
        assert user.role == 'admin'
    
    def test_register_success_planner(self, client, db_session):
        """Test successful registration of planner user."""
        response = client.post('/auth/register', json={
            'email': 'newplanner@test.com',
            'username': 'newplanner',
            'password': 'password123',
            'role': 'planner',
            'name': 'New Planner'
        })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
    
    def test_register_duplicate_email(self, client, planner_user):
        """Test registration with duplicate email."""
        response = client.post('/auth/register', json={
            'email': 'planner@test.com',  # Already exists
            'username': 'different_username',
            'password': 'password123',
            'role': 'planner',
            'name': 'New User'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'email' in data['error'].lower() or 'already' in data['error'].lower()
    
    def test_register_duplicate_username(self, client, planner_user):
        """Test registration with duplicate username."""
        response = client.post('/auth/register', json={
            'email': 'different@test.com',
            'username': 'planner_test',  # Already exists
            'password': 'password123',
            'role': 'planner',
            'name': 'New User'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'username' in data['error'].lower() or 'already' in data['error'].lower()
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email format."""
        response = client.post('/auth/register', json={
            'email': 'invalid-email',
            'username': 'testuser',
            'password': 'password123',
            'role': 'planner',
            'name': 'Test User'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'email' in data['error'].lower()
    
    def test_register_invalid_role(self, client):
        """Test registration with invalid role."""
        response = client.post('/auth/register', json={
            'email': 'test@test.com',
            'username': 'testuser',
            'password': 'password123',
            'role': 'invalid_role',
            'name': 'Test User'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'role' in data['error'].lower()
    
    def test_register_short_password(self, client):
        """Test registration with password shorter than 6 characters."""
        response = client.post('/auth/register', json={
            'email': 'test@test.com',
            'username': 'testuser',
            'password': '12345',  # Less than 6 characters
            'role': 'planner',
            'name': 'Test User'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'password' in data['error'].lower() or 'length' in data['error'].lower()
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields."""
        # Missing email
        response = client.post('/auth/register', json={
            'username': 'testuser',
            'password': 'password123',
            'role': 'planner'
        })
        assert response.status_code == 400
        
        # Missing username
        response = client.post('/auth/register', json={
            'email': 'test@test.com',
            'password': 'password123',
            'role': 'planner'
        })
        assert response.status_code == 400
        
        # Missing password
        response = client.post('/auth/register', json={
            'email': 'test@test.com',
            'username': 'testuser',
            'role': 'planner'
        })
        assert response.status_code == 400
        
        # Missing role
        response = client.post('/auth/register', json={
            'email': 'test@test.com',
            'username': 'testuser',
            'password': 'password123'
        })
        assert response.status_code == 400


class TestLogout:
    """Test logout endpoint."""
    
    def test_logout_success(self, authenticated_planner_client):
        """Test successful logout."""
        client = authenticated_planner_client
        response = client.post('/auth/logout')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'message' in data
    
    def test_logout_get_method(self, authenticated_planner_client):
        """Test logout with GET method."""
        client = authenticated_planner_client
        response = client.get('/auth/logout')
        
        assert response.status_code == 200


class TestProfile:
    """Test profile endpoint."""
    
    def test_get_profile_success(self, authenticated_planner_client, planner_user):
        """Test successful profile retrieval."""
        client = authenticated_planner_client
        response = client.get('/auth/profile')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['email'] == planner_user.email
        assert data['username'] == planner_user.username
        assert data['role'] == planner_user.role
        assert 'id' in data
    
    def test_get_profile_unauthenticated(self, client):
        """Test profile retrieval without authentication."""
        response = client.get('/auth/profile')
        assert response.status_code == 401 or response.status_code == 302  # Redirect or unauthorized


class TestChangePassword:
    """Test password change endpoint."""
    
    def test_change_password_success(self, authenticated_planner_client, planner_user):
        """Test successful password change."""
        client = authenticated_planner_client
        
        response = client.put('/auth/profile/password', json={
            'current_password': 'planner123',
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        
        # Verify password was changed
        user = User.query.get(planner_user.id)
        assert user.check_password('newpassword123')
        assert not user.check_password('planner123')
    
    def test_change_password_wrong_current(self, authenticated_planner_client):
        """Test password change with wrong current password."""
        client = authenticated_planner_client
        
        response = client.put('/auth/profile/password', json={
            'current_password': 'wrongpassword',
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        })
        
        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'password' in data['error'].lower()
    
    def test_change_password_mismatch(self, authenticated_planner_client):
        """Test password change with mismatched new passwords."""
        client = authenticated_planner_client
        
        response = client.put('/auth/profile/password', json={
            'current_password': 'planner123',
            'new_password': 'newpassword123',
            'confirm_password': 'differentpassword'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'match' in data['error'].lower()
    
    def test_change_password_short(self, authenticated_planner_client):
        """Test password change with short new password."""
        client = authenticated_planner_client
        
        response = client.put('/auth/profile/password', json={
            'current_password': 'planner123',
            'new_password': '12345',  # Less than 6 characters
            'confirm_password': '12345'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'length' in data['error'].lower() or '6' in data['error']


class TestPasswordReset:
    """Test password reset endpoints."""
    
    def test_forgot_password_success(self, client, planner_user):
        """Test successful password reset request."""
        response = client.post('/auth/forgot-password', json={
            'email': 'planner@test.com'
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        
        # Verify token was created
        token = PasswordResetToken.query.filter_by(user_id=planner_user.id).first()
        assert token is not None
        assert token.is_valid()
    
    def test_forgot_password_invalid_email(self, client):
        """Test password reset request with invalid email."""
        response = client.post('/auth/forgot-password', json={
            'email': 'nonexistent@test.com'
        })
        
        # Should still return 200 to prevent email enumeration
        assert response.status_code == 200
    
    def test_verify_reset_token_valid(self, client, planner_user, db_session):
        """Test verifying a valid reset token."""
        # Create a token
        token_obj = PasswordResetToken.create_token(planner_user.id)
        db_session.session.add(token_obj)
        db_session.session.commit()
        
        response = client.get(f'/auth/verify-reset-token?token={token_obj.token}')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['valid'] is True
    
    def test_verify_reset_token_invalid(self, client):
        """Test verifying an invalid reset token."""
        response = client.get('/auth/verify-reset-token?token=invalid_token')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['valid'] is False
    
    def test_reset_password_success(self, client, planner_user, db_session):
        """Test successful password reset."""
        # Create a token
        token_obj = PasswordResetToken.create_token(planner_user.id)
        db_session.session.add(token_obj)
        db_session.session.commit()
        
        response = client.post('/auth/reset-password', json={
            'token': token_obj.token,
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        
        # Verify password was changed
        user = User.query.get(planner_user.id)
        assert user.check_password('newpassword123')
        
        # Verify token was marked as used
        token_obj = PasswordResetToken.query.get(token_obj.id)
        assert token_obj.used is True
    
    def test_reset_password_invalid_token(self, client):
        """Test password reset with invalid token."""
        response = client.post('/auth/reset-password', json={
            'token': 'invalid_token',
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'token' in data['error'].lower() or 'invalid' in data['error'].lower()
    
    def test_reset_password_mismatch(self, client, planner_user, db_session):
        """Test password reset with mismatched passwords."""
        # Create a token
        token_obj = PasswordResetToken.create_token(planner_user.id)
        db_session.session.add(token_obj)
        db_session.session.commit()
        
        response = client.post('/auth/reset-password', json={
            'token': token_obj.token,
            'new_password': 'newpassword123',
            'confirm_password': 'differentpassword'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'match' in data['error'].lower()


class TestCheckAuth:
    """Test authentication check endpoint."""
    
    def test_check_auth_authenticated(self, authenticated_planner_client, planner_user):
        """Test check auth when authenticated."""
        client = authenticated_planner_client
        response = client.get('/auth/check-auth')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['authenticated'] is True
        assert data['user']['email'] == planner_user.email
    
    def test_check_auth_unauthenticated(self, client):
        """Test check auth when not authenticated."""
        response = client.get('/auth/check-auth')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['authenticated'] is False

