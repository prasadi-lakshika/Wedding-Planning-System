# Wedding Planning System

A comprehensive wedding planning management system with role-based access control for administrators and wedding planners.

## Features

- **User Authentication**: Secure login/logout system
- **Role-Based Access**: Admin and Planner roles with different permissions
- **Dashboard**: Overview of projects and tasks
- **Theme Suggestions**: Wedding theme recommendations
- **Checklist Management**: Task tracking and completion
- **Budget Management**: Financial planning and tracking
- **Calendar**: Event scheduling and management
- **Client Management**: Customer relationship management
- **Responsive Design**: Works on desktop and mobile devices

## System Requirements

- Python 3.8+
- MySQL 8.0+
- Modern web browser

## Installation & Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv env

# Activate virtual environment
# On Windows:
env\Scripts\activate
# On macOS/Linux:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Setup

1. **Create MySQL Database**:
   ```sql
   CREATE DATABASE weddingplanningsystem;
   ```

2. **Update Database Configuration**:
   Edit `backend/config.py` and update the database connection string:
   ```python
   SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://username:password@localhost/weddingplanningsystem'
   ```

3. **Initialize Database**:
   ```bash
   cd backend
   python init_db.py
   ```

### 3. Start Backend Server

```bash
cd backend
python app.py
```

The backend will run on `http://localhost:5000`

### 4. Frontend Setup

1. **Open Frontend**: Navigate to the `frontend` folder
2. **Open in Browser**: Open `index.html` in your web browser
3. **Alternative**: Use a local server (e.g., Python's `http.server`):
   ```bash
   cd frontend
   python -m http.server 8000
   ```

## Default Login Credentials

After running the database initialization script, you can use these default accounts:

### Admin Account
- **Email**: admin@wedding.com
- **Password**: admin123
- **Access**: Full system access, admin dashboard

### Planner Account
- **Email**: planner@wedding.com
- **Password**: planner123
- **Access**: Wedding planning tools and client management

⚠️ **Important**: Change these default passwords after first login!

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `GET /auth/check-auth` - Check authentication status

### Health Check
- `GET /health` - Backend health status

## Project Structure

```
Wedding Planning System/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── config.py           # Configuration settings
│   ├── extensions.py       # Flask extensions
│   ├── init_db.py          # Database initialization
│   ├── requirements.txt    # Python dependencies
│   ├── models/
│   │   └── user.py        # User model
│   └── routes/
│       └── auth.py        # Authentication routes
├── frontend/
│   ├── index.html         # Main page
│   ├── dashboard.html     # Dashboard
│   ├── admin_dashboard.html # Admin dashboard
│   ├── assets/
│   │   ├── css/           # Stylesheets
│   │   ├── js/            # JavaScript files
│   │   ├── images/        # Images
│   │   └── data/          # Data files
│   └── [other HTML files] # Feature pages
└── README.md              # This file
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify MySQL is running
   - Check database credentials in `config.py`
   - Ensure database exists

2. **Login Not Working**:
   - Check backend server is running
   - Verify database tables are created
   - Check browser console for errors

3. **CORS Errors**:
   - Ensure Flask-CORS is installed
   - Check backend CORS configuration

4. **Port Already in Use**:
   - Change port in `app.py`
   - Kill existing processes using the port

### Debug Mode

The backend runs in debug mode by default. Check the console for detailed error messages and debugging information.

## Security Notes

- Change default passwords immediately
- Use strong, unique passwords
- Keep dependencies updated
- Consider using environment variables for sensitive data
- Implement proper session management in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and research purposes.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs in the backend console
3. Check browser developer tools for frontend issues

---

**Happy Wedding Planning!** 🎉💒

