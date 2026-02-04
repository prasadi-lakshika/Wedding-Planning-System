"""
Flask Application for Wedding Planning System.

This module creates and configures the Flask application with:
- Database models and extensions
- Authentication and authorization
- API routes for wedding planning suggestions
- Decision tree-based recommendation system
"""

from flask import Flask, jsonify, request
from flask_login import current_user
from functools import wraps
from sqlalchemy import text
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from config import Config
from extensions import db, login_manager, cors, mail
from routes.auth import auth_bp
from routes.wedding_planning import wedding_bp
from routes.projects import projects_bp
from routes.admin_profile import admin_profile_bp
from routes.admin_data_management import admin_data_bp
from routes.budget import budget_bp
from routes.dashboard import dashboard_bp


def create_app():
    """
    Create and configure Flask application.
    
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    _initialize_extensions(app)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Import models to ensure database tables are created
    _import_models()
    
    # Configure authentication
    _configure_authentication(app)
    
    # Create database tables
    _initialize_database(app)
    
    # Register core routes
    _register_core_routes(app)
    
    # Register API routes
    _register_api_routes(app)

    return app


def _initialize_extensions(app):
    """Initialize Flask extensions."""
    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    cors.init_app(app, resources={
        r"/*": {
            "origins": ["*"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })


def _register_blueprints(app):
    """Register Flask blueprints."""
    app.register_blueprint(auth_bp)
    app.register_blueprint(wedding_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(admin_profile_bp)
    app.register_blueprint(admin_data_bp)
    app.register_blueprint(budget_bp)
    app.register_blueprint(dashboard_bp)


def _import_models():
    """Import models to ensure database tables are created."""
    from models.user import User  # noqa: F401
    from models.project import Project  # noqa: F401
    from models.wedding_planning import (  # noqa: F401
        CulturalColors, ColorRules, FoodLocations, ColorMappings, RestrictedColours
    )
    from models.company import Company  # noqa: F401
    from models.theme_suggestion import ThemeSuggestion  # noqa: F401
    from models.budget_item import BudgetItem  # noqa: F401
    from models.checklist_task import ChecklistTask  # noqa: F401
    from models.password_reset_token import PasswordResetToken  # noqa: F401
    from models.wedding_planning import WeddingType  # noqa: F401


def _configure_authentication(app):
    """Configure Flask-Login authentication."""
    from models.user import User
    
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @app.before_request
    def check_authentication():
        """Global authentication middleware."""
        # Skip auth check for public endpoints
        skip_endpoints = [
            'static', 'auth.login', 'auth.register', 'auth.forgot_password',
            'auth.reset_password', 'auth.verify_reset_token', 'index', 'health', 'test',
            'wedding.suggest_wedding_details', 'wedding.get_wedding_types', 
            'wedding.get_colors_for_wedding_type', 'wedding.wedding_health_check',
            'wedding.rebuild_tree', 'wedding.get_tree_info',
            'suggest_direct'
        ]
        
        # Always allow CORS preflight requests to proceed
        if request.method == 'OPTIONS':
            return
        
        if request.endpoint in skip_endpoints:
            return
        
        # Check if user is authenticated for protected endpoints
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401


def _initialize_database(app):
    """Initialize database tables."""
    with app.app_context():
        try:
            db.create_all()
            _ensure_user_profile_columns()
            _ensure_checklist_tasks_table()
            print("Database tables ready!")
        except Exception as e:
            print(f"Database error: {e}")
            print("Please check your database connection and credentials")


def _ensure_user_profile_columns():
    """Ensure new profile columns exist on the users table."""
    inspector = db.inspect(db.engine)
    try:
        columns = {col['name'] for col in inspector.get_columns('users')}
    except Exception as exc:
        print(f"Warning: Unable to inspect users table for profile columns: {exc}")
        return

    alterations = []
    alterations = []
    if 'phone_number' not in columns:
        alterations.append(('phone_number', 'VARCHAR(30) NULL'))
    if 'address' not in columns:
        alterations.append(('address', 'TEXT NULL'))

    for column_name, column_definition in alterations:
        try:
            db.session.execute(text(
                f"ALTER TABLE users ADD COLUMN {column_name} {column_definition}"
            ))
            print(f"Added missing column '{column_name}' to users table.")
        except Exception as exc:
            if 'Duplicate column name' not in str(exc):
                print(f"Warning: Unable to add column '{column_name}': {exc}")
    if alterations:
        try:
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            print(f"Warning: Unable to commit profile column alterations: {exc}")

    _migrate_company_profile_data(columns)


def _migrate_company_profile_data(user_columns):
    """Move company profile fields from users table to company table and drop old columns."""
    required_columns = {'company_name', 'company_email', 'company_phone', 'company_address', 'company_description'}
    if not required_columns.intersection(user_columns):
        return

    try:
        existing_company = db.session.execute(text("SELECT id FROM company LIMIT 1")).fetchone()
    except Exception as exc:
        print(f"Warning: Unable to inspect company table: {exc}")
        return

    try:
        row = db.session.execute(text("""
            SELECT company_name, company_email, company_phone, company_address, company_description
            FROM users
            WHERE company_name IS NOT NULL
               OR company_email IS NOT NULL
               OR company_phone IS NOT NULL
               OR company_address IS NOT NULL
               OR company_description IS NOT NULL
            ORDER BY id ASC
            LIMIT 1
        """)).fetchone()

        if row and not existing_company:
            db.session.execute(text("""
                INSERT INTO company (name, email, phone, address, description, created_at, updated_at)
                VALUES (:name, :email, :phone, :address, :description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                'name': row.company_name,
                'email': row.company_email,
                'phone': row.company_phone,
                'address': row.company_address,
                'description': row.company_description
            })
            db.session.commit()
            print("Migrated company profile data to company table.")
    except Exception as exc:
        db.session.rollback()
        print(f"Warning: Unable to migrate company profile data: {exc}")

    columns_to_drop = ['company_name', 'company_email', 'company_phone', 'company_address', 'company_description', 'company_id']
    for column in columns_to_drop:
        try:
            db.session.execute(text(f"ALTER TABLE users DROP COLUMN {column}"))
        except Exception as exc:
            if 'check that column/key exists' not in str(exc).lower():
                print(f"Warning: Unable to drop column '{column}': {exc}")
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()


def _ensure_checklist_tasks_table():
    """Ensure checklist_tasks table exists with correct schema."""
    inspector = db.inspect(db.engine)
    try:
        # Check if table exists
        tables = inspector.get_table_names()
        if 'checklist_tasks' not in tables:
            # Table doesn't exist, create it
            from models.checklist_task import ChecklistTask
            ChecklistTask.__table__.create(db.engine)
            print("Created checklist_tasks table.")
            return

        # Table exists, verify columns
        columns = {col['name']: col for col in inspector.get_columns('checklist_tasks')}
        required_columns = {
            'id': {'type': 'INTEGER', 'nullable': False},
            'project_id': {'type': 'INTEGER', 'nullable': False},
            'title': {'type': 'VARCHAR', 'nullable': False},
            'description': {'type': 'TEXT', 'nullable': True},
            'status': {'type': 'ENUM', 'nullable': False},
            'due_date': {'type': 'DATE', 'nullable': True},
            'assigned_to': {'type': 'INTEGER', 'nullable': True},
            'created_by': {'type': 'INTEGER', 'nullable': True},
            'created_at': {'type': 'DATETIME', 'nullable': False},
            'updated_at': {'type': 'DATETIME', 'nullable': False},
        }

        needs_commit = False
        
        # Check for column rename: assignee_id -> assigned_to
        if 'assignee_id' in columns and 'assigned_to' not in columns:
            # Column needs to be renamed from assignee_id to assigned_to
            try:
                db.session.execute(text(
                    "ALTER TABLE checklist_tasks CHANGE COLUMN assignee_id assigned_to INT NULL"
                ))
                print("Renamed column 'assignee_id' to 'assigned_to' in checklist_tasks table.")
                needs_commit = True
            except Exception as exc:
                if 'Duplicate column name' not in str(exc) and 'doesn\'t exist' not in str(exc).lower() and 'unknown column' not in str(exc).lower():
                    print(f"Warning: Unable to rename column 'assignee_id': {exc}")

        # Check if title column needs to be updated to VARCHAR(255)
        if 'title' in columns:
            col_info = columns['title']
            # Check if length is less than 255 (handles both integer and None cases)
            col_length = col_info.get('length', 0)
            if col_length and col_length < 255:
                try:
                    db.session.execute(text(
                        "ALTER TABLE checklist_tasks MODIFY COLUMN title VARCHAR(255) NOT NULL"
                    ))
                    print("Updated 'title' column to VARCHAR(255) in checklist_tasks table.")
                    needs_commit = True
                except Exception as exc:
                    if 'Duplicate column name' not in str(exc):
                        print(f"Warning: Unable to update 'title' column: {exc}")

        if needs_commit:
            try:
                db.session.commit()
                print("Committed checklist_tasks table alterations.")
            except Exception as exc:
                db.session.rollback()
                print(f"Warning: Unable to commit checklist_tasks table alterations: {exc}")

    except Exception as exc:
        print(f"Warning: Unable to inspect or create checklist_tasks table: {exc}")
        # Try to create the table anyway
        try:
            from models.checklist_task import ChecklistTask
            ChecklistTask.__table__.create(db.engine, checkfirst=True)
        except Exception as create_exc:
            print(f"Warning: Unable to create checklist_tasks table: {create_exc}")


def _register_core_routes(app):
    """Register core application routes."""
    
    @app.route("/")
    def index():
        """Home endpoint."""
        return jsonify({
            "message": "Wedding Planning System API",
            "version": "1.0.0",
            "status": "running"
        })

    @app.route("/health")
    def health():
        """Health check endpoint."""
        return jsonify({
            "status": "healthy", 
            "message": "Wedding Planning System is running",
            "algorithm": "decision_tree",
            "data_source": "mysql_database"
        })
    
    @app.route("/test")
    def test():
        """Test endpoint for frontend connection."""
        return jsonify({
            "message": "Frontend can connect to backend!",
            "system": "Wedding Planning System",
            "algorithm": "Decision Tree"
        })
    
    @app.route("/suggest", methods=['POST'])
    def suggest_direct():
        """
        Direct /suggest endpoint for wedding planning suggestions.
        
        Expected JSON input:
        {
            "project_id": "WED001",  # Optional
            "wedding_type": "Tamil Wedding",  # Required
            "bride_colour": "#FF7F7F"  # Required
        }
        
        Returns:
            JSON: Wedding planning suggestions (with project_id if provided)
        """
        from services.decision_tree_service import get_wedding_suggestions_with_decision_tree
        from services.wedding_service import process_hex_color
        
        try:
            # Validate request
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Request body is required'}), 400
            
            # Extract and validate required fields
            project_id = data.get('project_id')
            wedding_type = data.get('wedding_type')
            bride_colour = data.get('bride_colour')
            
            # Check for missing required fields (project_id is optional)
            missing_fields = []
            if not wedding_type:
                missing_fields.append('wedding_type')
            if not bride_colour:
                missing_fields.append('bride_colour')
            
            if missing_fields:
                return jsonify({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }), 400
            
            # Clean input data
            if project_id:
                project_id = str(project_id).strip()
                if not project_id:
                    project_id = None
            else:
                project_id = None
                
            wedding_type = wedding_type.strip()
            bride_colour = bride_colour.strip()
            
            # Validate non-empty strings for required fields
            if not wedding_type or not bride_colour:
                return jsonify({
                    'error': 'wedding_type and bride_colour cannot be empty'
                }), 400
            
            # Normalize wedding type first (before color mapping)
            from services.decision_tree_service import wedding_decision_tree
            if wedding_decision_tree.root is None:
                wedding_decision_tree.build_tree_from_database()
            normalized_wedding_type = wedding_decision_tree._normalize_wedding_type(wedding_type)
            
            # Process hex color using normalized wedding type
            mapped_bride_colour, restriction_message = process_hex_color(bride_colour, normalized_wedding_type)
            
            # Get suggestions using decision tree (with normalized wedding type)
            suggestions = get_wedding_suggestions_with_decision_tree(normalized_wedding_type, mapped_bride_colour)
            
            # Add restriction message if color was restricted
            if restriction_message:
                suggestions['restriction_message'] = restriction_message
                suggestions['original_bride_colour'] = bride_colour
            
            # Add project_id to response if provided
            if project_id:
                suggestions['project_id'] = project_id
            
            return jsonify(suggestions), 200
            
        except ValueError as ve:
            return jsonify({
                'error': f'Wedding type not found: {wedding_type}',
                'message': str(ve)
            }), 404
        except KeyError as ke:
            return jsonify({
                'error': 'No suggestions available for the given combination',
                'message': str(ke)
            }), 404
        except Exception as e:
            return jsonify({
                'error': 'Internal server error',
                'message': str(e)
            }), 500


def _register_api_routes(app):
    """Register secure API routes with authentication."""
    
    def login_required(f):
        """Decorator for login required routes."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Login required'}), 401
            return f(*args, **kwargs)
        return decorated_function

    def admin_required(f):
        """Decorator for admin required routes."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Login required'}), 401
            if current_user.role != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            return f(*args, **kwargs)
        return decorated_function

    def planner_required(f):
        """Decorator for planner required routes."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Login required'}), 401
            if current_user.role != 'planner':
                return jsonify({'error': 'Planner access required'}), 403
            return f(*args, **kwargs)
        return decorated_function

    @app.route("/api/user/profile")
    @login_required
    def get_user_profile():
        """Get current user profile."""
        return jsonify({
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "name": current_user.name,
            "role": current_user.role
        })

    @app.route("/api/admin/users")
    @admin_required
    def get_all_users():
        """Get all users (admin only)."""
        from models.user import User
        users = User.query.all()
        return jsonify([{
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        } for user in users])

    @app.route("/api/planner/dashboard")
    @planner_required
    def get_planner_dashboard():
        """Get planner dashboard data."""
        return jsonify({
            "message": "Planner dashboard data",
            "role": "planner",
            "user": current_user.name
        })

    @app.route("/api/admin/dashboard")
    @admin_required
    def get_admin_dashboard():
        """Get admin dashboard data."""
        return jsonify({
            "message": "Admin dashboard data",
            "role": "admin",
            "user": current_user.name
        })


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
