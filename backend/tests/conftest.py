"""
Pytest configuration and fixtures for Wedding Planning System tests.

This module provides shared fixtures for:
- Flask application instance
- Test client
- Database setup and teardown
- Test users (admin, planner, coordinator)
"""
import pytest
from flask import Flask
from flask_login import FlaskLoginClient

from app import create_app
from config import TestingConfig
from extensions import db, login_manager
from models.user import User
from models.project import Project
from models.company import Company
from models.budget_item import BudgetItem
from models.checklist_task import ChecklistTask
from models.theme_suggestion import ThemeSuggestion
from models.wedding_planning import (
    WeddingType, CulturalColors, ColorRules, FoodLocations, 
    RestrictedColours
)
from models.password_reset_token import PasswordResetToken


@pytest.fixture(scope='session')
def app():
    """
    Create Flask application instance for testing.
    Uses TestingConfig which uses an in-memory SQLite database.
    """
    app = create_app()
    app.config.from_object(TestingConfig)
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    # Use test client with login support
    app.test_client_class = FlaskLoginClient
    
    # Create all tables
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """
    Create test client for making requests.
    """
    with app.test_client() as client:
        yield client


@pytest.fixture(scope='function')
def db_session(app):
    """
    Database session fixture.
    Creates a fresh database for each test and cleans up after.
    """
    with app.app_context():
        # Drop all tables and recreate for clean state
        db.drop_all()
        db.create_all()
        yield db
        db.session.rollback()
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def admin_user(db_session):
    """
    Create a test admin user.
    """
    user = User(
        username='admin_test',
        email='admin@test.com',
        name='Admin User',
        role='admin'
    )
    user.set_password('admin123')
    db_session.session.add(user)
    db_session.session.commit()
    return user


@pytest.fixture(scope='function')
def planner_user(db_session):
    """
    Create a test planner user.
    """
    user = User(
        username='planner_test',
        email='planner@test.com',
        name='Planner User',
        role='planner'
    )
    user.set_password('planner123')
    db_session.session.add(user)
    db_session.session.commit()
    return user


@pytest.fixture(scope='function')
def coordinator_user(db_session):
    """
    Create a test coordinator user.
    """
    user = User(
        username='coordinator_test',
        email='coordinator@test.com',
        name='Coordinator User',
        role='coordinator'
    )
    user.set_password('coordinator123')
    db_session.session.add(user)
    db_session.session.commit()
    return user


@pytest.fixture(scope='function')
def sample_project(db_session, planner_user):
    """
    Create a sample project for testing.
    """
    project = Project(
        bride_name='Jane Doe',
        groom_name='John Doe',
        wedding_date='2024-12-25',
        wedding_type='Traditional',
        assigned_to=planner_user.id,
        created_by=planner_user.id
    )
    db_session.session.add(project)
    db_session.session.commit()
    return project


@pytest.fixture(scope='function')
def sample_company(db_session):
    """
    Create a sample company for testing.
    """
    company = Company(
        name='Test Wedding Company',
        email='company@test.com',
        phone='1234567890',
        address='123 Test Street',
        description='Test company description'
    )
    db_session.session.add(company)
    db_session.session.commit()
    return company


@pytest.fixture(scope='function')
def authenticated_admin_client(client, admin_user):
    """
    Create an authenticated test client with admin user logged in.
    """
    with client:
        # Login the admin user
        response = client.post('/auth/login', json={
            'email': admin_user.email,
            'password': 'admin123'
        })
        assert response.status_code == 200
        yield client


@pytest.fixture(scope='function')
def authenticated_planner_client(client, planner_user):
    """
    Create an authenticated test client with planner user logged in.
    """
    with client:
        response = client.post('/auth/login', json={
            'email': planner_user.email,
            'password': 'planner123'
        })
        assert response.status_code == 200
        yield client


@pytest.fixture(scope='function')
def authenticated_coordinator_client(client, coordinator_user):
    """
    Create an authenticated test client with coordinator user logged in.
    """
    with client:
        response = client.post('/auth/login', json={
            'email': coordinator_user.email,
            'password': 'coordinator123'
        })
        assert response.status_code == 200
        yield client

