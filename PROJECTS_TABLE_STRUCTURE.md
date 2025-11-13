# Projects Table Structure and Query

## 📊 **Correct Projects Table Structure (MySQL)**

```sql
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NULL,
  `bride_name` VARCHAR(100) NOT NULL,
  `groom_name` VARCHAR(100) NOT NULL,
  `contact_number` VARCHAR(20) NOT NULL,
  `contact_email` VARCHAR(255) NOT NULL,
  `wedding_date` DATE NOT NULL,
  `wedding_type` VARCHAR(50) NULL,
  `bride_color` VARCHAR(50) NULL,
  `status` ENUM('planning', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'planning',
  `budget` FLOAT DEFAULT 0.0,
  `notes` TEXT NULL,
  `created_by` INT NOT NULL,
  `assigned_to` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_assigned_to` (`assigned_to`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🔍 **Correct Query for Theme Suggestions**

### **Backend Query (Python/SQLAlchemy)**

The query used in `backend/routes/projects.py`:

```python
@projects_bp.route('/theme-suggestions', methods=['GET'])
@login_required
def get_projects_for_theme_suggestions():
    try:
        # Get projects accessible to current user
        if current_user.is_admin():
            projects = Project.query.order_by(Project.created_at.desc()).all()
        else:
            projects = Project.query.filter(
                (Project.assigned_to == current_user.id) | 
                (Project.created_by == current_user.id)
            ).order_by(Project.created_at.desc()).all()
        
        # Convert projects to dictionary format
        projects_list = [project.to_theme_dict() for project in projects]
        
        return jsonify({
            'projects': projects_list
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in get_projects_for_theme_suggestions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': 'Failed to retrieve projects for theme suggestions',
            'message': str(e)
        }), 500
```

### **Equivalent SQL Query**

For **Admin User**:
```sql
SELECT 
    id, 
    company_id, 
    bride_name, 
    groom_name, 
    wedding_date, 
    wedding_type, 
    bride_color, 
    status
FROM projects
ORDER BY created_at DESC;
```

For **Planner User**:
```sql
SELECT 
    id, 
    company_id, 
    bride_name, 
    groom_name, 
    wedding_date, 
    wedding_type, 
    bride_color, 
    status
FROM projects
WHERE assigned_to = ? OR created_by = ?
ORDER BY created_at DESC;
```

## 📋 **Expected Response Format**

```json
{
  "projects": [
    {
      "id": 1,
      "company_id": null,
      "bride_name": "Jane Doe",
      "groom_name": "John Smith",
      "wedding_date": "2025-06-15",
      "wedding_type": "Kandyan Sinhala Wedding",
      "bride_color": "#FF7F7F",
      "status": "planning"
    },
    {
      "id": 2,
      "company_id": null,
      "bride_name": "Sarah Johnson",
      "groom_name": "Michael Brown",
      "wedding_date": "2025-07-20",
      "wedding_type": "Tamil Wedding",
      "bride_color": "#FF0000",
      "status": "confirmed"
    }
  ]
}
```

## ✅ **Verification Steps**

### **1. Check if table exists:**
```sql
SHOW TABLES LIKE 'projects';
```

### **2. Check table structure:**
```sql
DESCRIBE projects;
```

### **3. Check if projects exist:**
```sql
SELECT COUNT(*) FROM projects;
```

### **4. Check projects with user association:**
```sql
SELECT 
    p.id, 
    p.bride_name, 
    p.groom_name, 
    p.created_by, 
    p.assigned_to,
    u1.name as created_by_name,
    u2.name as assigned_to_name
FROM projects p
LEFT JOIN users u1 ON p.created_by = u1.id
LEFT JOIN users u2 ON p.assigned_to = u2.id
ORDER BY p.created_at DESC;
```

## 🔧 **Troubleshooting**

### **If table doesn't exist:**
Run the SQL CREATE TABLE statement above.

### **If projects exist but not loading:**
1. Check if `users` table exists (foreign key dependency)
2. Check if `created_by` and `assigned_to` values reference valid user IDs
3. Verify user authentication is working

### **If getting empty array:**
- For admin: Check if any projects exist in the table
- For planner: Check if projects have `assigned_to = user.id` OR `created_by = user.id`

## 📝 **Sample Data for Testing**

```sql
INSERT INTO projects (
    bride_name, 
    groom_name, 
    contact_number, 
    contact_email, 
    wedding_date, 
    wedding_type, 
    bride_color, 
    status, 
    created_by, 
    assigned_to
) VALUES
(
    'Jane Doe',
    'John Smith',
    '0771234567',
    'jane@example.com',
    '2025-06-15',
    'Kandyan Sinhala Wedding',
    '#FF7F7F',
    'planning',
    1,  -- created_by user ID
    1   -- assigned_to user ID
),
(
    'Sarah Johnson',
    'Michael Brown',
    '0777654321',
    'sarah@example.com',
    '2025-07-20',
    'Tamil Wedding',
    '#FF0000',
    'confirmed',
    2,  -- created_by user ID
    2   -- assigned_to user ID
);
```

