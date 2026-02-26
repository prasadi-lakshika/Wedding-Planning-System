# Rule-Based Wedding Theme Recommendation & Planning System

A full-stack wedding planning system with a **rule-based, decision-tree-driven theme recommendation engine** as its core research innovation.

Developed as a **Final Year Research Project** for the BSc (Hons) Software Engineering degree.

---
## Overview

This system addresses a key challenge in wedding planning: **selecting cohesive, culturally appropriate themes for weddings** specially for Sri Lanka.  

The main research contribution is a **rule-based theme suggestion engine** that predicts complete wedding theme recommendations, including attire, decorations, food/drinks, and pre-shoot locations, based on **wedding type** and **bride's dress colour**.  

All rules are stored in a **MySQL database**, and the system uses a **decision tree algorithm** with **Euclidean distance matching** for unknown or closest colour values.  

The platform integrates this AI-powered engine into a complete **wedding planning management system** with secure, role-based access for Admins and Planners.

---

## Core Features

### Rule-Based Theme Recommendation Engine (Research Innovation)
- **Inputs:** Wedding type, Bride's dress colour
- **Outputs:** 
  - Groom outfit colour
  - Bridesmaids dresses colour
  - Bestmen outfits colour
  - Flower decoration colour
  - Hall decoration colour
  - Food & drinks suggestions
  - Pre-shoot locations
- **Logic:** 
  - Rules stored in MySQL database (colour rules, cultural restrictions, menu, location rules)
  - Decision tree algorithm selects suggestions based on input
  - Euclidean distance theory matches unknown or nearest colours
  - Deterministic, explainable, and transparent recommendations
- **Public Access:** Guests can try suggestions without authentication
- **Authenticated Access:** Admin/Planner can save, manage, and apply recommendations

---

### Admin Capabilities
- Theme suggestion engine access
- User management
- Profile management
- Data management
- Project and client management
- Budget tracking
- Event scheduling
- Checklist management

### Planner Capabilities
- Theme suggestion engine access
- Project and client management
- Budget tracking
- Event scheduling
- Checklist management

### Public Access
- Explore the theme suggestion engine without login
- Immediate suggestions without saving data

---

## Screenshots

---

### Public Access – Theme Suggestions
Guests can try the theme suggestion engine without logging in.

![Theme Suggestions Public 1](frontend/assets/images/screenshots/theme-suggestion-public-1.png)
![Theme Suggestions Public 2](frontend/assets/images/screenshots/theme-suggestion-public-2.png)

---

### Authentication / Login
Users (Admin or Planner) log in to access role-based features.

![Login Page](frontend/assets/images/screenshots/login.png)

---

### Home Pages

#### Admin Home
![Admin Home](frontend/assets/images/screenshots/admin-home.png)

#### Planner Home
![Planner Home](frontend/assets/images/screenshots/planner-home.png)

---

### Dashboards

#### Admin Dashboard
![Admin Dashboard](frontend/assets/images/screenshots/admin-dashboard.png)

#### Planner Dashboard
![Planner Dashboard](frontend/assets/images/screenshots/planner-dashboard.png)

---

### Authenticated Theme Suggestions
Logged-in users (Admin/Planner) can access full theme suggestions with save options.

![Theme Suggestions Authenticated 1](frontend/assets/images/screenshots/theme-suggestion-auth-1.png)
![Theme Suggestions Authenticated 2](frontend/assets/images/screenshots/theme-suggestion-auth-2.png)

---

### Core Features / Tools

#### Checklist Management
![Checklist](frontend/assets/images/screenshots/checklist.png)

#### Budget Manager
![Budget Manager](frontend/assets/images/screenshots/budget-manager.png)

#### Client & Project Management
![Client & Project Management](frontend/assets/images/screenshots/client-project-management.png)

#### Event Calendar
![Event Calendar](frontend/assets/images/screenshots/event-calendar.png)

#### Admin Data Management
![Data Management](frontend/assets/images/screenshots/data-management.png)

#### User Management
![User Management](frontend/assets/images/screenshots/user-management.png)


## System Architecture

- **Backend:** Python Flask, Flask-Login, Flask-CORS, SQLAlchemy, MySQL 8.0+  
- **Frontend:** HTML5, CSS3, JavaScript, responsive design  
- **Key Modules:** Auth, Dashboard, Projects, Checklist, Budget, Calendar, Client Management, Admin Data Management

---

## User Flow

1. **Public Users:**  
   - System opens to the theme suggestion page
   - Enter wedding type and bride's dress colour
   - Receive complete theme recommendations instantly
   - Optional "Get Started" button to navigate to login page

2. **Authenticated Users:**  
   - Login as Admin or Planner
   - Admin → full system access, including user/data management
   - Planner → planning tools only
   - Navigation dynamically adjusts based on role
   - Can save theme suggestions and manage projects

---

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

---

## License

This project is for educational and research purposes.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs in the backend console
3. Check browser developer tools for frontend issues

---

**Happy Wedding Planning!** 

