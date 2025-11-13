# Migration Plan: Update Code to Use New `restricted_colours` Table

## Overview
Update all code references from the old `restricted_colours` column (removed from `cultural_colors` table) to the new `restricted_colours` table.

## Steps

### Step 1: Create RestrictedColours Model
**File**: `backend/models/wedding_planning.py`
- Add new `RestrictedColours` model class
- Table name: `restricted_colours`
- Columns:
  - `wedding_type` (String(50), primary key)
  - `restricted_colour` (String(20), primary key)
- Composite primary key: (wedding_type, restricted_colour)
- Add `to_dict()` method
- Add `__repr__()` method

### Step 2: Create Helper Function
**File**: `backend/services/wedding_service.py`
- Create function: `is_color_restricted_for_wedding_type(wedding_type: str, color_name: str) -> bool`
- Query the new `RestrictedColours` table
- Return True if color is restricted for that wedding type, False otherwise
- Use case-insensitive matching

### Step 3: Update wedding_service.py
**File**: `backend/services/wedding_service.py`

**Locations to update:**
1. **Line ~86** - `find_closest_valid_color()` function
   - Replace: `if color.restricted_colours and target_color.lower() in color.restricted_colours.lower():`
   - With: `if is_color_restricted_for_wedding_type(wedding_type, color.colour_name):`

2. **Line ~237-238** - `validate_and_map_bride_color()` function
   - Replace: Check `cultural_color.restricted_colours`
   - With: Call `is_color_restricted_for_wedding_type(wedding_type, bride_color.lower())`

3. **Line ~424-425** - `is_color_restricted()` function
   - Replace: Query `cultural_color.restricted_colours`
   - With: Call `is_color_restricted_for_wedding_type(wedding_type, color_name)`

4. **Any other references** to `restricted_colours` column

### Step 4: Update decision_tree_service.py
**File**: `backend/services/decision_tree_service.py`

**Locations to update:**
1. **Line ~116-117** - `build_tree_from_database()` function
   - Replace: Check `cultural_color.restricted_colours`
   - With: Import and use `is_color_restricted_for_wedding_type()` from wedding_service

2. **Line ~606** - `_map_unknown_color()` function
   - Replace: Check `cultural_color.restricted_colours`
   - With: Call `is_color_restricted_for_wedding_type()`

3. **Line ~648** - `_map_unknown_color()` function (in Euclidean distance loop)
   - Replace: Check `color.restricted_colours`
   - With: Call `is_color_restricted_for_wedding_type()`

### Step 5: Update routes/wedding_planning.py
**File**: `backend/routes/wedding_planning.py`

**Locations to update:**
1. **Line ~170** - `get_wedding_types()` function
   - Replace: Check `color.get('restricted_colours')`
   - With: Query `RestrictedColours` table to check if wedding type has any restrictions
   - Or: Use `is_color_restricted_for_wedding_type()` to check if any colors are restricted

### Step 6: Update get_available_colors_for_wedding_type()
**File**: `backend/services/wedding_service.py`

**Function**: `get_available_colors_for_wedding_type()`
- Remove any references to `restricted_colours` in the returned dictionary
- Filter out restricted colors using `is_color_restricted_for_wedding_type()`
- Don't include `is_restricted` or `restricted_colours` in the returned data

### Step 7: Testing
- Test that restricted colors are correctly identified
- Test that non-restricted colors work normally
- Test that color suggestions exclude restricted colors
- Test that wedding type listing shows correct restriction status

## Implementation Order

1. ✅ Create RestrictedColours model
2. ✅ Create helper function `is_color_restricted_for_wedding_type()`
3. ✅ Update wedding_service.py (all functions)
4. ✅ Update decision_tree_service.py
5. ✅ Update routes/wedding_planning.py
6. ✅ Test all changes

## Expected Behavior After Migration

- When a user selects a restricted color (e.g., "black" for "Kandyan Sinhala Wedding"), the system should:
  1. Detect that it's restricted
  2. Find the closest non-restricted color
  3. Use that color for suggestions
  
- The `restricted_colours` table should be the single source of truth for color restrictions
- No code should reference the old `restricted_colours` column

## Files to Modify

1. `backend/models/wedding_planning.py` - Add RestrictedColours model
2. `backend/services/wedding_service.py` - Update all restriction checks
3. `backend/services/decision_tree_service.py` - Update restriction checks
4. `backend/routes/wedding_planning.py` - Update restriction checks

## Files That May Need Updates (But Not Critical)

1. `backend/extract_restricted_colours.py` - This is just a utility script, can be updated later or removed

