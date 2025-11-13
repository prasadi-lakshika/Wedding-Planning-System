# 🚀 **Complete Wedding Planning System Startup Guide**

## 🎯 **What This Guide Does:**
- ✅ **Fixes all identified issues**
- ✅ **Provides clean database setup**
- ✅ **Ensures proper login functionality**
- ✅ **Gives you a working system**

## 📋 **Prerequisites:**
- [ ] Python 3.8+ installed
- [ ] MySQL 8.0+ installed and running
- [ ] Virtual environment ready

## 🔧 **Step-by-Step Setup:**

### **Step 1: Start MySQL**
```bash
# Windows (Run as Administrator)
net start mysql

# macOS/Linux
sudo service mysql start
```

### **Step 2: Create Database**
```sql
CREATE DATABASE weddingplanningsystem;
```

### **Step 3: Update Database Credentials**
Edit `backend/config.py` with your MySQL credentials:
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://YOUR_USERNAME:YOUR_PASSWORD@localhost/weddingplanningsystem'
```

### **Step 4: Activate Virtual Environment**
```bash
cd backend
env\Scripts\activate  # Windows
# OR
source env/bin/activate  # macOS/Linux
```

### **Step 5: Install Dependencies**
```bash
pip install -r requirements.txt
```

### **Step 6: Setup Database (Clean)**
```bash
python setup_database.py
```

**Expected Output:**
```
🚀 Setting up Wedding Planning System Database...
🗑️  Dropping existing tables...
✅ Tables dropped successfully
🏗️  Creating new tables...
✅ Tables created successfully
👤 Creating default admin user...
✅ Admin user created
👤 Creating default planner user...
✅ Planner user created
💾 Changes committed to database

🎉 Database setup completed successfully!

📋 Default login credentials:
   Admin: admin@wedding.com / admin123
   Planner: planner@wedding.com / planner123
```

### **Step 7: Start Backend**
```bash
python app.py
```

**Expected Output:**
```
✅ Database tables ready!
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### **Step 8: Start Frontend (New Terminal)**
Open a **new terminal** and activate virtual environment:
```bash
cd "D:\Top up\Final Project_Research\Final Research Project\Wedding Planning System final\backend"
env\Scripts\activate
cd ..\frontend
python -m http.server 8000
```

### **Step 9: Open in Browser**
Go to: `http://localhost:8000`

## 🔑 **Login Credentials:**
- **Admin**: `admin@wedding.com` / `admin123`
- **Planner**: `planner@wedding.com` / `planner123`

## 🎯 **Quick Commands (Copy & Paste):**

```bash
# 1. Activate virtual environment
cd backend
env\Scripts\activate

# 2. Setup database
python setup_database.py

# 3. Start backend
python app.py

# 4. Start frontend (new terminal)
cd frontend
cd ..\backend
env\Scripts\activate
cd ..\frontend
python -m http.server 8000
```

## 🧪 **Test Your System:**

### **Test Backend:**
```bash
cd backend
python test_backend.py
```

### **Test Login:**
1. Open `http://localhost:8000`
2. Click "Sign In / Log In"
3. Use credentials above
4. Should redirect to dashboard

## 🎉 **What You Should See:**

1. ✅ **Backend running** on port 5000
2. ✅ **Frontend accessible** at `http://localhost:8000`
3. ✅ **Login modal** appears when clicking login button
4. ✅ **Successful login** with default credentials
5. ✅ **Role-based navigation** (Admin/Planner)

## 🚨 **Troubleshooting:**

### **Issue: "ModuleNotFoundError"**
```bash
pip install -r requirements.txt
```

### **Issue: "Can't connect to MySQL"**
```bash
net start mysql  # Windows
```

### **Issue: "Access denied for user"**
Update database credentials in `backend/config.py`

### **Issue: "Port already in use"**
Change port in `backend/app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

## 📱 **System Features:**

- ✅ **User Authentication** (Login/Logout)
- ✅ **Role-Based Access** (Admin/Planner)
- ✅ **Secure Password Hashing**
- ✅ **Session Management**
- ✅ **Responsive Design**
- ✅ **Modal Login System**

## 🎯 **Success Indicators:**

- ✅ Database setup completes without errors
- ✅ Backend starts on port 5000
- ✅ Frontend accessible on port 8000
- ✅ Login modal works
- ✅ Can login with default credentials
- ✅ Navigation updates based on role

## 🆘 **Need Help?**

1. **Check console output** for specific errors
2. **Verify MySQL is running**
3. **Check database credentials**
4. **Ensure virtual environment is active**

---

**Your Wedding Planning System is now completely fixed and ready to use!** 🎉

Follow these steps exactly and you'll have a fully functional system with working login process.
