"""
Configuration settings for Wedding Planning System.

This module contains all configuration settings including:
- Database configuration
- Security settings
- Session management
- Authentication settings
"""

import os


class Config:
    """
    Main configuration class for the Wedding Planning System.
    
    All configuration values can be overridden by environment variables
    for different deployment environments (development, testing, production).
    """
    
    # Security Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'wedding123!super$ecret'
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get('DATABASE_URL') or
        'mysql+pymysql://root:My%40P24@localhost/weddingplanningsystem'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Session Configuration
    SESSION_TYPE = 'filesystem'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour in seconds
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Authentication Configuration
    LOGIN_VIEW = 'auth.login'
    LOGIN_MESSAGE = 'Please log in to access this page.'
    LOGIN_MESSAGE_CATEGORY = 'info'
    
    # CORS Configuration
    CORS_ORIGINS = [
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Application Configuration
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    TESTING = False
    
    # Wedding Planning System Specific Settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload
    DECISION_TREE_MAX_DEPTH = 10
    COLOR_MAPPING_CACHE_TIMEOUT = 3600  # 1 hour
    
    # Email Configuration (for password reset)
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME') or 'prasadilakshika01@gmail.com'
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD') or 'tscp twin ccdx smbf'
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'prasadilakshika01@gmail.com'
    
    # Base URL for password reset links
    BASE_URL = os.environ.get('BASE_URL') or 'http://localhost:8000'
    
    # Password Reset Configuration
    PASSWORD_RESET_TOKEN_EXPIRATION_HOURS = 1  # Token expires in 1 hour
    PASSWORD_RESET_RATE_LIMIT_PER_HOUR = 3  # Max 3 requests per email per hour


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    
    def __init__(self):
        super().__init__()
        self.SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
        
        if not self.SQLALCHEMY_DATABASE_URI:
            raise ValueError("DATABASE_URL environment variable must be set for production")


# Configuration dictionary for easy access
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
