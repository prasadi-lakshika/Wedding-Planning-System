# Wedding Planning System - Quick Start Guide

## 🚀 **QUICK START (Your Method)**

### **Step 1: Initial Setup (Run Once)**
```bash
# Go to project root directory
cd "D:\Top up\Final Project_Research\Final Research Project\Wedding Planning System final"

# Run the complete setup script
python setup_system.py
```

### **Step 2: Start Backend Server (Terminal 1)**
```bash
# Go to project root directory
cd "D:\Top up\Final Project_Research\Final Research Project\Wedding Planning System final"

# Activate virtual environment
.venv\Scripts\activate

# Go to backend directory
cd backend

# Start backend server
python app.py
```

### **Step 3: Start Frontend Server (Terminal 2)**
```bash
# Go to project root directory
cd "D:\Top up\Final Project_Research\Final Research Project\Wedding Planning System final"

# Activate virtual environment
.venv\Scripts\activate

# Go to frontend directory
cd frontend

# Start frontend server
python -m http.server 8000
```

### **Step 4: Access Your System**
- **Frontend**: Open http://localhost:8000 in your browser
- **Backend**: Running on http://localhost:5000

### **Step 5: Login**
- **Admin**: admin@wedding.com / admin123
- **Planner**: planner@wedding.com / planner123

---

## 🔧 **Alternative: Using Startup Scripts**

### **Setup (Run Once)**
```bash
python setup_system.py
```

### **Start Backend**
```bash
python start_backend.py
```

### **Start Frontend**
```bash
python start_frontend.py
```

---

## ⚠️ **Prerequisites**

1. **MySQL Server**: Must be running
2. **Database**: Create database `weddingplanningsystem` in MySQL
3. **Python 3.8+**: Required for the system
4. **Two Terminals**: Backend and frontend run separately

---

## 🗄️ **Database Setup**

### **Create MySQL Database**
```sql
CREATE DATABASE weddingplanningsystem;
```

### **Update Database Password**
Edit `backend/config.py` and update the password:
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:YOUR_PASSWORD@localhost/weddingplanningsystem'
```

---

## 🐛 **Troubleshooting**

### **Port Already in Use**
- Backend (5000): Change port in `backend/app.py`
- Frontend (8000): Use different port: `python -m http.server 8001`

### **Database Connection Error**
- Check MySQL is running
- Verify database exists
- Check password in `backend/config.py`

### **Virtual Environment Issues**
- Delete `.venv` folder and run `python setup_system.py` again

---

## 📁 **Project Structure**
```
Wedding Planning System final/
├── .venv/                    # Virtual environment
├── backend/                  # Backend Flask application
│   ├── app.py               # Main Flask app
│   ├── config.py            # Configuration
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   └── services/            # Business logic
├── frontend/                # Frontend HTML/CSS/JS
│   ├── index.html           # Main page
│   ├── dashboard.html       # Dashboard
│   └── assets/              # CSS, JS, images
├── setup_system.py          # Complete setup script
├── start_backend.py         # Backend startup script
└── start_frontend.py        # Frontend startup script
```

---

## 🎯 **Features Available**

- **User Authentication**: Login/logout with role-based access
- **Dashboard**: Project overview and statistics
- **Theme Suggestions**: AI-powered wedding theme recommendations
- **Client Management**: Manage wedding projects and clients
- **Budget Planning**: Track wedding expenses
- **Event Calendar**: Schedule wedding events
- **Checklist Management**: Track planning tasks

---

**Happy Wedding Planning!** 🎉💒
