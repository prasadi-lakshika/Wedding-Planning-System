# 🔧 Database Connection Troubleshooting Guide

## ❌ **Current Error:**
```
(pymysql.err.OperationalError) (1045, "Access denied for user 'root'@'localhost' (using password: YES)")
```

This means the MySQL password is incorrect or MySQL is not configured properly.

---

## 🚀 **Quick Fix Steps:**

### **Step 1: Configure Database Connection**
```bash
# Run the database configuration helper
python configure_database.py
```

This will:
- Test your MySQL connection
- Update the config file with correct credentials
- Create the database if needed

### **Step 2: Manual Database Setup (Alternative)**

#### **Option A: No Password (Most Common)**
Edit `backend/config.py` and change:
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost/weddingplanningsystem'
```

#### **Option B: With Password**
Edit `backend/config.py` and change:
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:YOUR_PASSWORD@localhost/weddingplanningsystem'
```

### **Step 3: Create Database in MySQL**
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create the database
CREATE DATABASE weddingplanningsystem;

-- Verify it was created
SHOW DATABASES;
```

### **Step 4: Test the Setup**
```bash
# Run the fixed setup script
python setup_complete_system_fixed.py
```

---

## 🔍 **Common MySQL Issues & Solutions:**

### **Issue 1: MySQL Not Running**
**Solution:**
```bash
# Windows (if installed as service)
net start mysql

# Or start MySQL service from Services.msc
```

### **Issue 2: Wrong Password**
**Solution:**
1. Reset MySQL root password
2. Or create a new MySQL user:
```sql
CREATE USER 'weddinguser'@'localhost' IDENTIFIED BY 'weddingpass';
GRANT ALL PRIVILEGES ON weddingplanningsystem.* TO 'weddinguser'@'localhost';
FLUSH PRIVILEGES;
```

### **Issue 3: Database Doesn't Exist**
**Solution:**
```sql
CREATE DATABASE weddingplanningsystem;
```

### **Issue 4: Permission Denied**
**Solution:**
```sql
-- Grant privileges to root user
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

---

## 📋 **Complete Setup Process:**

### **1. Stop Current Backend (Ctrl+C)**
If the backend is running, stop it first.

### **2. Configure Database**
```bash
python configure_database.py
```

### **3. Setup Database**
```bash
python setup_complete_system_fixed.py
```

### **4. Start Backend**
```bash
python start_backend.py
```

### **5. Start Frontend (New Terminal)**
```bash
python start_frontend.py
```

---

## 🎯 **Expected Results:**

### **Successful Database Connection:**
```
✅ Database connection successful!
✅ Database 'weddingplanningsystem' is ready
✅ Updated config.py with new database connection
```

### **Successful Setup:**
```
✅ Complete system setup completed successfully!
📊 Database Summary:
   - Users: 2 (admin, planner)
   - Color Mappings: 19 entries
   - Cultural Colors: 110 entries
   - Color Rules: 110 entries
   - Food & Locations: 10 entries
```

### **Successful Backend Start:**
```
✅ Database tables ready!
🚀 Starting backend server...
📍 Backend will run on: http://localhost:5000
```

---

## 🆘 **Still Having Issues?**

### **Check MySQL Status:**
```bash
# Check if MySQL is running
mysqladmin -u root -p status
```

### **Test Connection Manually:**
```bash
# Test MySQL connection
mysql -u root -p
```

### **Check Config File:**
Open `backend/config.py` and verify the `SQLALCHEMY_DATABASE_URI` line.

### **Reset Everything:**
```bash
# Clear database and start fresh
python reset_database.py
python setup_complete_system_fixed.py
```

---

**Try running `python configure_database.py` first - it should solve your connection issue!** 🎉
