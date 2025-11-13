"""
Projects Model for Wedding Planning System.

This module defines the Project model for storing wedding project information
including client details, wedding specifications, and theme suggestions.
"""

from datetime import datetime
from extensions import db


class Project(db.Model):
    """
    Model for storing wedding project information.
    
    This table stores complete wedding project details including client information,
    wedding specifications, and theme suggestions.
    """
    
    __tablename__ = 'projects'
    __table_args__ = {'extend_existing': True}

    # Primary key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Company identification
    company_id = db.Column(db.Integer, nullable=True)
    
    # Client information
    bride_name = db.Column(db.String(100), nullable=False)
    groom_name = db.Column(db.String(100), nullable=False)
    contact_number = db.Column(db.String(20), nullable=False)
    contact_email = db.Column(db.String(255), nullable=False)
    
    # Wedding details
    wedding_date = db.Column(db.Date, nullable=False)
    wedding_type = db.Column(db.String(50), nullable=True)
    bride_color = db.Column(db.String(50), nullable=True)
    
    # Project management
    status = db.Column(db.Enum('planning', 'confirmed', 'in_progress', 'completed', 'cancelled'), 
                      default='planning', nullable=False)
    budget = db.Column(db.Float, default=0.0)
    notes = db.Column(db.Text, nullable=True)
    
    # User association
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        nullable=False
    )

    def to_dict(self):
        """
        Convert project object to dictionary.
        
        Returns:
            dict: Project data as dictionary
        """
        return {
            'id': self.id,
            'company_id': self.company_id,
            'bride_name': self.bride_name,
            'groom_name': self.groom_name,
            'contact_number': self.contact_number,
            'contact_email': self.contact_email,
            'wedding_date': self.wedding_date.isoformat() if self.wedding_date else None,
            'wedding_type': self.wedding_type,
            'bride_color': self.bride_color,
            'status': self.status,
            'budget': float(self.budget) if self.budget else None,
            'notes': self.notes,
            'created_by': self.created_by,
            'assigned_to': self.assigned_to,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def to_theme_dict(self):
        """
        Convert project to dictionary suitable for theme suggestions.
        
        Returns:
            dict: Project data formatted for theme suggestions
        """
        return {
            'id': self.id,
            'company_id': self.company_id,
            'bride_name': self.bride_name,
            'groom_name': self.groom_name,
            'wedding_date': self.wedding_date.isoformat() if self.wedding_date else None,
            'wedding_type': self.wedding_type,
            'bride_color': self.bride_color,
            'status': self.status
        }

    @staticmethod
    def generate_project_id():
        """
        Generate a unique project ID based on the primary key.
        
        Returns:
            str: Unique project ID in format WED001, WED002, etc.
        """
        # Get the highest existing project ID
        last_project = Project.query.order_by(Project.id.desc()).first()
        
        if last_project:
            next_number = last_project.id + 1
        else:
            next_number = 1
        
        return f"WED{next_number:03d}"

    def __repr__(self):
        """String representation of Project object."""
        return f'<Project {self.id}: {self.bride_name} & {self.groom_name}>'
