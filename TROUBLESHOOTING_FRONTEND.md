# 🔧 Frontend Projects Loading Error - Troubleshooting Guide

## **Error Message:**
"Failed to load projects. Please check your connection and login status."

## **Quick Diagnostic Steps:**

### **Step 1: Check Backend Status**
```bash
# Make sure backend is running
cd backend
python app.py
```

**Expected Output:**
```
✅ Database tables ready!
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### **Step 2: Test API Directly**
```bash
# Run the debug script
python debug_projects.py
```

**Expected Output:**
```
✅ Backend is running
✅ Login successful
✅ Projects endpoint working with session
   Found 1 projects
```

### **Step 3: Test Frontend**
1. Open `debug_frontend.html` in your browser
2. Check the browser console (F12 → Console tab)
3. Look for any error messages

### **Step 4: Check Browser Console**
1. Go to `http://localhost:8000/theme_suggestions.html`
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for error messages

## **Common Issues & Solutions:**

### **Issue 1: CORS Error**
**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`
**Solution:** Check CORS configuration in `backend/app.py`

### **Issue 2: Session Not Working**
**Error:** `401 Unauthorized`
**Solution:** Make sure you're logged in first

### **Issue 3: Backend Not Running**
**Error:** `Failed to fetch` or `Connection refused`
**Solution:** Start the backend server

### **Issue 4: Database Connection**
**Error:** `500 Internal Server Error`
**Solution:** Check database connection and table structure

## **Manual Testing Steps:**

### **Test 1: Backend Health**
```bash
curl http://localhost:5000/health
```

### **Test 2: Login**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wedding.com","password":"admin123"}'
```

### **Test 3: Projects API (with session)**
```bash
# First login to get session cookie
curl -c cookies.txt -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wedding.com","password":"admin123"}'

# Then test projects API with session
curl -b cookies.txt http://localhost:5000/api/projects/theme-suggestions
```

## **Frontend Debug Information:**

### **Check Network Tab**
1. Open Developer Tools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for failed requests to `/api/projects/theme-suggestions`

### **Check Console Logs**
Look for these debug messages:
- `🚀 Initializing theme suggestions page...`
- `📋 Loading projects from database...`
- `📡 Response status: 200`
- `📊 Projects data received: {...}`

### **Check Application Tab**
1. Go to Application tab in Developer Tools
2. Check Local Storage for login status
3. Check Cookies for session information

## **Complete Reset (If Needed):**

### **Step 1: Clear Browser Data**
1. Open Developer Tools (F12)
2. Go to Application tab
3. Clear Local Storage
4. Clear Cookies
5. Refresh page

### **Step 2: Restart Backend**
```bash
# Kill existing backend process
# Then restart
cd backend
python app.py
```

### **Step 3: Test Again**
1. Go to `http://localhost:8000`
2. Log in again
3. Navigate to Theme Suggestions

## **Still Having Issues?**

1. **Check Python Version:** `python --version` (should be 3.8+)
2. **Check Dependencies:** `pip list | grep -E "(flask|pymysql|sqlalchemy)"`
3. **Check MySQL:** `mysql --version`
4. **Check Ports:** `netstat -an | findstr :5000`

## **Contact Support:**
If none of these solutions work, please provide:
- Backend console output
- Browser console errors
- Network tab failed requests
- Operating system details
