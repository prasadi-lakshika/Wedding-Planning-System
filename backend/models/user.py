"""
User Model for Wedding Planning System.

This module defines the User model with authentication capabilities
and role-based access control for the wedding planning system.
"""

from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


class User(UserMixin, db.Model):
    """
    User model for authentication and authorization.
    
    Supports two roles: 'admin' and 'planner' with different access levels.
    Includes secure password hashing and session management.
    """
    
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}

    # Primary key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Authentication fields
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    
    # Profile fields
    name = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    role = db.Column(db.Enum('admin', 'planner'), nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        nullable=False
    )

    def set_password(self, password):
        """
        Hash and set user password.
        
        Args:
            password (str): Plain text password to hash and store
        """
        self.password = generate_password_hash(password)

    def check_password(self, password):
        """
        Verify password against stored hash.
        
        Args:
            password (str): Plain text password to verify
            
        Returns:
            bool: True if password matches, False otherwise
        """
        return check_password_hash(self.password, password)

    def get_id(self):
        """
        Get user ID as string for Flask-Login.
        
        Returns:
            str: User ID as string
        """
        return str(self.id)
    
    def is_admin(self):
        """
        Check if user has admin role.
        
        Returns:
            bool: True if user is admin, False otherwise
        """
        return self.role == 'admin'
    
    def is_planner(self):
        """
        Check if user has planner role.
        
        Returns:
            bool: True if user is planner, False otherwise
        """
        return self.role == 'planner'
    
    def to_dict(self):
        """
        Convert user object to dictionary.
        
        Returns:
            dict: User data as dictionary (excluding password)
        """
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'name': self.name,
            'phone_number': self.phone_number,
            'address': self.address,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
    def __repr__(self):
        """String representation of User object."""
        return f'<User {self.username} ({self.role})>'
