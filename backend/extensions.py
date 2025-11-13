"""
Flask Extensions for Wedding Planning System.

This module initializes and configures Flask extensions used throughout
the application including database, authentication, and CORS handling.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS

# Database extension
db = SQLAlchemy()

# Authentication extension
login_manager = LoginManager()

# CORS extension for cross-origin requests
cors = CORS()
