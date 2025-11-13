# 🔧 Troubleshooting Guide

## Why Can't I Run This Project?

Here are the most common issues and how to fix them:

## 🚨 **Issue 1: Duplicate Event Listeners (FIXED)**
- **Problem**: You had duplicate login form event listeners causing conflicts
- **Solution**: ✅ Fixed - Removed duplicate from `index.html`

## 🚨 **Issue 2: Backend Not Running**
- **Problem**: Frontend can't connect to backend
- **Solution**: Start the backend server first

```bash
cd backend
python app.py
```

## 🚨 **Issue 3: Database Not Set Up**
- **Problem**: No users exist, login fails
- **Solution**: Initialize the database

```bash
cd backend
python init_db.py
```

## 🚨 **Issue 4: Dependencies Not Installed**
- **Problem**: Python errors about missing modules
- **Solution**: Install required packages

```bash
cd backend
pip install -r requirements.txt
```

## 🚨 **Issue 5: MySQL Not Running**
- **Problem**: Database connection errors
- **Solution**: Start MySQL service

**Windows:**
```bash
net start mysql
```

**macOS/Linux:**
```bash
sudo service mysql start
# or
sudo systemctl start mysql
```

## 🚨 **Issue 6: Wrong Database Credentials**
- **Problem**: Can't connect to database
- **Solution**: Update `backend/config.py`

```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://YOUR_USERNAME:YOUR_PASSWORD@localhost/weddingplanningsystem'
```

## 🚨 **Issue 7: Port Already in Use**
- **Problem**: "Address already in use" error
- **Solution**: Change port or kill existing process

**Option 1: Change port in `app.py`**
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Change to 5001
```

**Option 2: Kill existing process**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

## 🚨 **Issue 8: CORS Errors**
- **Problem**: Browser shows CORS errors
- **Solution**: Ensure Flask-CORS is installed and configured

```bash
pip install Flask-CORS
```

## 🚨 **Issue 9: Frontend Not Loading**
- **Problem**: HTML files show as plain text
- **Solution**: Use a local server

```bash
cd frontend
python -m http.server 8000
# Then open http://localhost:8000
```

## 🚨 **Issue 10: Python Version Issues**
- **Problem**: "SyntaxError" or import errors
- **Solution**: Use Python 3.8+

```bash
python --version
# Should show 3.8 or higher
```

## 🔍 **Step-by-Step Debugging**

### **Step 1: Check Backend Status**
```bash
cd backend
python test_backend.py
```

### **Step 2: Check Database Connection**
```bash
cd backend
python init_db.py
```

### **Step 3: Start Backend**
```bash
cd backend
python app.py
```

### **Step 4: Test Frontend**
Open `frontend/index.html` in browser and check console for errors

## 📋 **Complete Setup Checklist**

- [ ] MySQL is running
- [ ] Database `weddingplanningsystem` exists
- [ ] Database credentials are correct in `config.py`
- [ ] Python dependencies are installed
- [ ] Database is initialized with `python init_db.py`
- [ ] Backend is running on port 5000
- [ ] Frontend is served from a web server
- [ ] No duplicate event listeners in HTML files

## 🆘 **Still Having Issues?**

1. **Check the console output** when running backend
2. **Check browser developer tools** for frontend errors
3. **Verify all files exist** in the correct locations
4. **Check file permissions** (especially on Linux/macOS)

## 🎯 **Quick Test Commands**

```bash
# Test backend
cd backend
python test_backend.py

# Test database
python init_db.py

# Start backend
python app.py

# In another terminal, test frontend
cd frontend
python -m http.server 8000
```

## 📞 **Common Error Messages & Solutions**

| Error Message | Solution |
|---------------|----------|
| `ModuleNotFoundError: No module named 'flask'` | Run `pip install -r requirements.txt` |
| `Can't connect to MySQL server` | Start MySQL service |
| `Access denied for user` | Check database credentials in `config.py` |
| `Address already in use` | Change port or kill existing process |
| `CORS error` | Ensure Flask-CORS is installed |
| `Login form not working` | Check for duplicate event listeners |

---

**Need more help?** Check the console output and browser developer tools for specific error messages!

