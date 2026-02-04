"""
Password Reset Token Model for Wedding Planning System.

This module defines the PasswordResetToken model for managing
password reset requests with secure tokens and expiration.
"""

from datetime import datetime, timedelta
from extensions import db


class PasswordResetToken(db.Model):
    """
    Password reset token model for secure password recovery.
    
    Stores reset tokens with expiration times and tracks usage
    to ensure one-time use and prevent abuse.
    """
    
    __tablename__ = 'password_reset_tokens'
    __table_args__ = {'extend_existing': True}

    # Primary key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign key to users table
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Token string (unique, indexed for fast lookup)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    
    # Expiration timestamp
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    
    # Track if token has been used
    used = db.Column(db.Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationship to User
    user = db.relationship('User', backref=db.backref('password_reset_tokens', lazy='dynamic'))

    @staticmethod
    def create_token(user_id, expiration_hours=1):
        """
        Create a new password reset token for a user.
        
        Args:
            user_id (int): ID of the user requesting password reset
            expiration_hours (int): Number of hours until token expires (default: 1)
            
        Returns:
            PasswordResetToken: The created token object
        """
        import secrets
        
        # Generate secure random token
        token = secrets.token_urlsafe(32)
        
        # Calculate expiration time
        expires_at = datetime.utcnow() + timedelta(hours=expiration_hours)
        
        # Create token record
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            used=False
        )
        
        return reset_token

    def is_valid(self):
        """
        Check if token is valid (not used and not expired).
        
        Returns:
            bool: True if token is valid, False otherwise
        """
        if self.used:
            return False
        
        if datetime.utcnow() > self.expires_at:
            return False
        
        return True

    def mark_as_used(self):
        """
        Mark token as used to prevent reuse.
        """
        self.used = True
        db.session.commit()

    @staticmethod
    def cleanup_expired_tokens():
        """
        Delete expired tokens from database.
        This can be called periodically to clean up old tokens.
        """
        try:
            expired_count = PasswordResetToken.query.filter(
                PasswordResetToken.expires_at < datetime.utcnow()
            ).delete()
            db.session.commit()
            return expired_count
        except Exception:
            db.session.rollback()
            return 0

    def __repr__(self):
        """String representation of PasswordResetToken object."""
        return f'<PasswordResetToken {self.id} User {self.user_id} Expires {self.expires_at}>'

