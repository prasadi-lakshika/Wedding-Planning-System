# 🎉 Wedding Planning System - Complete Startup Guide

## ✅ System Status: WORKING!

Your Wedding Planning System is now **FULLY FUNCTIONAL**! All errors have been fixed and the system is ready to run.

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend Server
```bash
cd backend
python app.py
```
**Expected Output:**
```
* Serving Flask app 'app'
* Debug mode: on
* Running on http://127.0.0.1:5000
✅ Database tables ready!
```

### Step 2: Open Frontend
Open your web browser and go to:
```
http://localhost:8000
```
Or open the `frontend/index.html` file directly in your browser.

### Step 3: Test the System
1. **Login** with default credentials:
   - Admin: `admin@wedding.com` / `admin123`
   - Planner: `planner@wedding.com` / `planner123`

2. **Test Theme Suggestions**:
   - Go to Theme Suggestions page
   - Select a project
   - Choose wedding type: "Tamil Wedding"
   - Enter color: `#FF7F7F` (coral red)
   - Click "Get Suggestions"

## 🔧 Detailed Setup Instructions

### Prerequisites
- ✅ Python 3.8+ installed
- ✅ MySQL server running
- ✅ Virtual environment activated (if using one)

### Backend Setup
1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up database:**
   ```bash
   python setup_database.py
   python setup_wedding_data.py
   ```

4. **Start backend server:**
   ```bash
   python app.py
   ```

### Frontend Setup
1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Open in browser:**
   - Option 1: Use a local server (recommended)
     ```bash
     python -m http.server 8000
     ```
     Then visit: `http://localhost:8000`
   
   - Option 2: Open `index.html` directly in browser

## 🎯 Key Features Working

### ✅ Backend API Endpoints
- `GET /health` - Health check
- `POST /suggest` - Wedding suggestions with hex color support
- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /auth/profile` - User profile

### ✅ Frontend Pages
- **Dashboard** - Overview and statistics
- **Client Management** - Manage wedding projects
- **Theme Suggestions** - AI-powered wedding suggestions
- **Budget Planning** - Budget management
- **Calendar** - Event scheduling
- **Checklist** - Task management

### ✅ Advanced Features
- **Hex Color Processing** - Converts `#FF7F7F` to closest cultural color
- **Project ID Support** - Each project has unique ID (WED001, WED002, etc.)
- **Database-Driven** - All data comes from MySQL database
- **Decision Tree Algorithm** - AI-powered suggestions
- **Role-Based Access** - Admin and Planner roles

## 🧪 Test the Complete Flow

### Example Test Case
1. **Create Project:**
   - Go to Client Management
   - Add new project with ID: `WED001`
   - Bride: Sarah, Groom: John
   - Date: 2024-12-25
   - Type: Tamil Wedding

2. **Get Suggestions:**
   - Go to Theme Suggestions
   - Select project WED001
   - Wedding Type: Tamil Wedding
   - Bride Color: `#FF7F7F`
   - Click "Get Suggestions"

3. **Expected Result:**
   ```json
   {
     "project_id": "WED001",
     "bride_colour_mapped": "coral red",
     "groom_colour": "navy blue",
     "bridesmaids_colour": "blush pink",
     "best_men_colour": "charcoal gray",
     "flower_deco_colour": "ivory white",
     "hall_decor_colour": "gold accents",
     "food_menu": "Traditional Tamil feast...",
     "drinks": "Fresh fruit juices...",
     "pre_shoot_locations": "Temple grounds..."
   }
   ```

## 🔍 Troubleshooting

### Backend Issues
- **Port 5000 in use:** Change port in `app.py` line 279
- **Database connection error:** Check MySQL is running and credentials in `config.py`
- **Import errors:** Make sure you're in the `backend` directory

### Frontend Issues
- **CORS errors:** Backend is configured for `localhost:8000`
- **API not responding:** Check backend is running on port 5000
- **Static files not loading:** Use a local server instead of opening HTML directly

### Common Solutions
1. **Restart backend:** `Ctrl+C` then `python app.py`
2. **Clear browser cache:** Hard refresh with `Ctrl+F5`
3. **Check console:** Open browser dev tools for error messages

## 📊 System Architecture

```
Frontend (HTML/CSS/JS) ←→ Backend (Flask/Python) ←→ Database (MySQL)
     ↓                           ↓                        ↓
- Client Management         - API Endpoints         - User Data
- Theme Suggestions         - Authentication        - Wedding Rules
- Budget Planning           - Decision Tree         - Color Mappings
- Calendar                  - Hex Color Processing  - Cultural Colors
```

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Backend shows "Database tables ready!"
- ✅ Frontend loads without console errors
- ✅ Login works with default credentials
- ✅ Theme suggestions return JSON data
- ✅ Hex colors like `#FF7F7F` are processed correctly

## 🆘 Need Help?

If you encounter any issues:
1. Check the console output for error messages
2. Verify MySQL is running
3. Ensure all dependencies are installed
4. Try restarting both backend and frontend

**Your Wedding Planning System is now ready to use! 🎊**
