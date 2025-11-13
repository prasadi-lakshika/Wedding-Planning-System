# 🔧 Wedding Types Loading Error - Troubleshooting Guide

## **Error Message:**
"Failed to load wedding types. Please check your connection."

## **Quick Fix Steps:**

### **Step 1: Check Backend Server**
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

### **Step 2: Test API Endpoint**
```bash
# Run the API test script
python test_api.py
```

### **Step 3: Check Database**
```bash
# Make sure database has wedding types data
cd backend
python -c "
from app import create_app
from extensions import db
from models.wedding_planning import CulturalColors

app = create_app()
with app.app_context():
    wedding_types = db.session.query(CulturalColors.wedding_type).distinct().all()
    print(f'Found {len(wedding_types)} wedding types in database:')
    for wt in wedding_types:
        print(f'  - {wt[0]}')
"
```

### **Step 4: Check Browser Console**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Refresh the theme suggestions page
4. Look for error messages

## **Common Issues & Solutions:**

### **Issue 1: Backend Not Running**
**Error:** `ConnectionError: Failed to fetch`
**Solution:** Start the backend server
```bash
cd backend
python app.py
```

### **Issue 2: Database Empty**
**Error:** `No wedding types found in database`
**Solution:** Run database population
```bash
python populate_database_direct.py
```

### **Issue 3: CORS Error**
**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`
**Solution:** Check CORS configuration in `backend/app.py`

### **Issue 4: Port Conflict**
**Error:** `Address already in use`
**Solution:** Kill existing process or use different port
```bash
# Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### **Issue 5: Database Connection**
**Error:** `Database connection failed`
**Solution:** Check database credentials in `backend/config.py`

## **Manual Testing:**

### **Test 1: Backend Health**
```bash
curl http://localhost:5000/health
```

### **Test 2: Wedding Types API**
```bash
curl http://localhost:5000/api/wedding/wedding-types
```

### **Test 3: Direct Suggest**
```bash
curl -X POST http://localhost:5000/suggest \
  -H "Content-Type: application/json" \
  -d '{"project_id":"WED001","wedding_type":"Kandyan Sinhala Wedding","bride_colour":"#FF7F7F"}'
```

## **Debug Information:**

### **Check Backend Logs**
Look for errors in the backend console when loading the page.

### **Check Network Tab**
1. Open Developer Tools
2. Go to Network tab
3. Refresh page
4. Look for failed requests to `/api/wedding/wedding-types`

### **Check Database Content**
```sql
-- Connect to MySQL
mysql -u root -p weddingplanningsystem

-- Check wedding types
SELECT DISTINCT wedding_type FROM cultural_colors;

-- Check colors
SELECT COUNT(*) FROM cultural_colors;
```

## **Complete Reset (If Needed):**

### **Step 1: Reset Database**
```bash
cd backend
python -c "
from app import create_app
from extensions import db

app = create_app()
with app.app_context():
    db.drop_all()
    db.create_all()
    print('Database reset complete')
"
```

### **Step 2: Populate Database**
```bash
python populate_database_direct.py
```

### **Step 3: Test Again**
```bash
python test_api.py
```

## **Still Having Issues?**

1. **Check Python Version:** `python --version` (should be 3.8+)
2. **Check Dependencies:** `pip list | grep -E "(flask|pymysql|sqlalchemy)"`
3. **Check MySQL:** `mysql --version`
4. **Check Ports:** `netstat -an | findstr :5000`

## **Contact Support:**
If none of these solutions work, please provide:
- Backend console output
- Browser console errors
- Database content check results
- Operating system details
