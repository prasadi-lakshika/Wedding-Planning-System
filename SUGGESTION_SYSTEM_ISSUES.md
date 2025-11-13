# Theme Suggestion System - Issues Identified

## Problem Summary
The system always returns suggestions for red color and Kandyan/Tamil wedding type regardless of user input.

## Root Causes Identified

### 1. Wedding Type Name Mismatch
**Issue**: Frontend sends wedding type names that don't exactly match database entries.
- Database has: "Tamil Hindu Wedding", "Tamil Christian Wedding (Church Ceremony)"
- Frontend might send: "Tamil Wedding"
- Result: No match found, system falls back to default

**Location**: 
- Frontend: `frontend/assets/js/theme_suggestions.js` - uses `wt.name` from API
- Backend: `backend/services/wedding_service.py` - `find_closest_cultural_color_by_rgb()` uses exact match

### 2. Color Mapping Returns 'default'
**Issue**: When wedding type is not found, `find_closest_cultural_color_by_rgb()` returns 'default'.
- 'default' is not a valid color name in the database
- Decision tree can't match 'default' color
- System falls back to first available prediction

**Location**: 
- `backend/services/wedding_service.py` line 155: `return 'default'`
- `backend/services/decision_tree_service.py` line 384, 390, 393: returns 'default'

### 3. Decision Tree Structure Problem
**Issue**: Tree is built with only 2 levels:
```
IF wedding_type == 'Kandyan Sinhala Wedding':
  IF bride_colour == 'cream':
    → prediction for cream
  ELSE:
    → prediction for red (first/most common)
ELSE:
  IF bride_colour == 'cream':
    → prediction for cream  
  ELSE:
    → prediction for first available (usually red/Tamil)
```

**Problem**: 
- Only splits on 'cream' color specifically
- All other colors fall into ELSE branches
- Missing wedding types fall into ELSE branch
- Returns first prediction instead of matching input

**Location**: 
- `backend/services/decision_tree_service.py` - `_build_tree_recursive()`
- Tree building algorithm doesn't create proper splits for all combinations

### 4. No Proper Fallback Mechanism
**Issue**: When tree traversal fails to find a match:
- Returns empty dict `{}` or first available prediction
- Doesn't query database directly for closest match
- Doesn't validate if wedding type/color combination exists

**Location**: 
- `backend/services/decision_tree_service.py` - `_traverse_tree()` line 444: `return {}`
- `predict()` method doesn't handle empty predictions

## Solution Approach

### Fix 1: Case-Insensitive Wedding Type Matching
- Make wedding type matching case-insensitive
- Handle partial matches (e.g., "Tamil Wedding" → "Tamil Hindu Wedding")
- Add wedding type normalization

### Fix 2: Proper Color Mapping Fallback
- When wedding type not found, don't return 'default'
- Find closest matching wedding type
- Map color to valid color for that wedding type
- Never return 'default' as a color name

### Fix 3: Fix Decision Tree Building
- Ensure tree creates proper splits for all wedding type + color combinations
- Handle case where no good split is found
- Build tree with all available data points

### Fix 4: Add Database Fallback
- When tree traversal returns empty, query database directly
- Use case-insensitive matching
- Return closest match if exact match not found
- Provide proper error if no data exists

## Files to Modify

1. `backend/services/wedding_service.py`
   - `find_closest_cultural_color_by_rgb()` - add case-insensitive matching
   - `process_hex_color()` - better error handling
   - `validate_and_map_bride_color()` - case-insensitive matching

2. `backend/services/decision_tree_service.py`
   - `_map_unknown_color()` - don't return 'default', find closest match
   - `_traverse_tree()` - add database fallback when traversal fails
   - `predict()` - handle empty predictions better
   - `_build_tree_recursive()` - ensure proper tree structure

3. `backend/app.py`
   - Add validation and normalization of wedding type before processing

## Testing Required

1. Test with exact wedding type names from database
2. Test with case variations (e.g., "KANDYAN SINHALA WEDDING")
3. Test with non-existent wedding types
4. Test with various colors (hex and names)
5. Test with colors that don't exist for wedding type
6. Verify suggestions match input wedding type and color

