# 🔍 Diagnosing Project Loading Issue

## ✅ Your Table Structure is CORRECT!

Your table structure matches exactly what's expected. The issue is **NOT** in the table structure.

## 🔍 Diagnostic Steps

### Step 1: Run Diagnostic Script
```bash
cd backend
python test_projects_query.py
```

This will check:
- If projects exist in database
- If queries work correctly
- If data serialization works
- If foreign keys are valid

### Step 2: Check Backend Console

When you load the theme suggestions page, check your backend console. You should see:

```
Getting projects for user: 1, Role: admin
Admin user - Found X total projects
Returning X projects
Project 1: ID=1, Bride=Jane, Groom=John
```

**If you see errors:**
- Note the exact error message
- Check the traceback

### Step 3: Check Browser Console

Open browser console (F12) and look for:
- Network tab: Check the request to `/api/projects/theme-suggestions`
- Console tab: Look for error messages or logs

**Look for:**
- Response status code (should be 200)
- Response body structure
- Any error messages

### Step 4: Common Issues Checklist

#### ❌ Issue 1: No Projects in Database
**Check:**
```sql
SELECT COUNT(*) FROM projects;
```

**Solution:**
- Create projects via Client Management page, OR
- Insert test data via SQL

#### ❌ Issue 2: User Has No Access to Projects

**For Planner Users:**
Projects must have `assigned_to = user.id` OR `created_by = user.id`

**Check:**
```sql
-- Check logged-in user's ID (check backend console or localStorage)
SELECT id, name, role FROM users;

-- Check projects for that user
SELECT * FROM projects 
WHERE assigned_to = 2 OR created_by = 2;  -- Replace 2 with user ID
```

**Solution:**
- Update projects to assign them to the logged-in user, OR
- Login as admin (admin sees all projects)

#### ❌ Issue 3: Foreign Key Constraint

**Check:**
```sql
-- Check if created_by and assigned_to reference valid users
SELECT p.id, p.created_by, p.assigned_to, 
       u1.id as created_by_exists, u2.id as assigned_to_exists
FROM projects p
LEFT JOIN users u1 ON p.created_by = u1.id
LEFT JOIN users u2 ON p.assigned_to = u2.id
WHERE u1.id IS NULL OR u2.id IS NULL;
```

**Solution:**
- Update `created_by` and `assigned_to` to reference valid user IDs

#### ❌ Issue 4: Authentication Issue

**Check:**
- Are you logged in? (Check localStorage `isLoggedIn`)
- Session expired? (Check for 401 errors)
- Backend shows user ID and role?

**Solution:**
- Log out and log back in
- Check session cookie is being sent (credentials: 'include')

#### ❌ Issue 5: Date Serialization Issue

**Check:**
- Are `wedding_date` values valid DATE format?
- The `to_theme_dict()` method calls `.isoformat()` on dates

**Test:**
```bash
cd backend
python test_projects_query.py
```

#### ❌ Issue 6: CORS or Network Issue

**Check:**
- Backend running on `http://localhost:5000`?
- Frontend making request to correct URL?
- CORS headers configured?

**Solution:**
- Check backend is running
- Check browser Network tab for failed requests

## 🧪 Quick Test Queries

### Test 1: Do Projects Exist?
```sql
SELECT COUNT(*) as total_projects FROM projects;
```

### Test 2: Can User Access Projects? (Replace 1 with user ID)
```sql
-- For admin user (ID = 1):
SELECT COUNT(*) FROM projects;

-- For planner user (ID = 2):
SELECT COUNT(*) FROM projects 
WHERE assigned_to = 2 OR created_by = 2;
```

### Test 3: Check Project Data Structure
```sql
SELECT 
    id,
    bride_name,
    groom_name,
    wedding_date,
    wedding_type,
    bride_color,
    status,
    created_by,
    assigned_to
FROM projects
LIMIT 3;
```

### Test 4: Check Foreign Keys
```sql
SELECT 
    p.id,
    p.bride_name,
    p.created_by,
    p.assigned_to,
    u1.name as creator,
    u2.name as assignee
FROM projects p
LEFT JOIN users u1 ON p.created_by = u1.id
LEFT JOIN users u2 ON p.assigned_to = u2.id
LIMIT 5;
```

## 📋 What to Do Next

1. **Run the diagnostic script** first: `python test_projects_query.py`
2. **Check backend console** when loading theme suggestions page
3. **Check browser console** for errors
4. **Share the results** from the diagnostic script

The diagnostic script will tell you exactly what's wrong!

