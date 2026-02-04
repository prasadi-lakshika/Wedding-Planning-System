"""
Admin Data Management Routes for Wedding Planning System.

Provides CRUD API endpoints for administrators to manage:
- Wedding Types
- Cultural Colors
- Color Rules
- Food & Locations
- Restricted Colours
"""

from functools import wraps
import re

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import and_
from werkzeug.exceptions import NotFound

from extensions import db
from models.wedding_planning import (
    WeddingType, CulturalColors, ColorRules, FoodLocations, RestrictedColours
)

admin_data_bp = Blueprint('admin_data', __name__, url_prefix='/api/admin/data')


def _admin_required(fn):
    """Decorator to ensure the current user is an authenticated admin."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Login required'}), 401
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _validate_rgb(rgb_string):
    """
    Validate RGB format.
    Accepts: "255,255,255" or "#FFFFFF" or "rgb(255,255,255)"
    Returns: tuple (is_valid, normalized_rgb, error_message)
    """
    if not rgb_string or not isinstance(rgb_string, str):
        return False, None, "RGB value is required"
    
    rgb_string = rgb_string.strip()
    
    # Check for hex format (#FFFFFF or FFFFFF)
    if rgb_string.startswith('#'):
        rgb_string = rgb_string[1:]
    
    if re.match(r'^[0-9A-Fa-f]{6}$', rgb_string):
        # Convert hex to RGB format
        r = int(rgb_string[0:2], 16)
        g = int(rgb_string[2:4], 16)
        b = int(rgb_string[4:6], 16)
        return True, f"{r},{g},{b}", None
    
    # Check for rgb(r, g, b) format
    rgb_match = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', rgb_string)
    if rgb_match:
        r, g, b = rgb_match.groups()
        r, g, b = int(r), int(g), int(b)
        if 0 <= r <= 255 and 0 <= g <= 255 and 0 <= b <= 255:
            return True, f"{r},{g},{b}", None
        return False, None, "RGB values must be between 0 and 255"
    
    # Check for "r,g,b" format
    parts = rgb_string.split(',')
    if len(parts) == 3:
        try:
            r, g, b = int(parts[0].strip()), int(parts[1].strip()), int(parts[2].strip())
            if 0 <= r <= 255 and 0 <= g <= 255 and 0 <= b <= 255:
                return True, f"{r},{g},{b}", None
            return False, None, "RGB values must be between 0 and 255"
        except ValueError:
            return False, None, "RGB values must be integers"
    
    return False, None, "Invalid RGB format. Use '255,255,255', '#FFFFFF', or 'rgb(255,255,255)'"


# ============================================================================
# WEDDING TYPES ENDPOINTS
# ============================================================================

@admin_data_bp.route('/wedding-types', methods=['GET'])
@login_required
@_admin_required
def list_wedding_types():
    """Get all wedding types."""
    try:
        wedding_types = WeddingType.query.order_by(WeddingType.name).all()
        return jsonify({
            'wedding_types': [wt.to_dict() for wt in wedding_types]
        }), 200
    except Exception as e:
        print(f"Error listing wedding types: {e}")
        return jsonify({'error': 'Failed to retrieve wedding types', 'details': str(e)}), 500


@admin_data_bp.route('/wedding-types', methods=['POST'])
@login_required
@_admin_required
def create_wedding_type():
    """Create a new wedding type."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        name = (data.get('name') or '').strip()
        description = (data.get('description') or '').strip() or None
        is_active = data.get('is_active', True)
        
        if not name:
            return jsonify({'error': 'Wedding type name is required'}), 400
        
        # Check for duplicates
        existing = WeddingType.query.filter_by(name=name).first()
        if existing:
            return jsonify({'error': f'Wedding type "{name}" already exists'}), 409
        
        wedding_type = WeddingType(
            name=name,
            description=description,
            is_active=is_active
        )
        
        db.session.add(wedding_type)
        db.session.commit()
        
        return jsonify({
            'message': 'Wedding type created successfully',
            'wedding_type': wedding_type.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating wedding type: {e}")
        return jsonify({'error': 'Failed to create wedding type', 'details': str(e)}), 500


@admin_data_bp.route('/wedding-types/<int:wedding_type_id>', methods=['PUT'])
@login_required
@_admin_required
def update_wedding_type(wedding_type_id):
    """Update a wedding type."""
    try:
        wedding_type = WeddingType.query.get_or_404(wedding_type_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        name = (data.get('name') or '').strip()
        description = (data.get('description') or '').strip() or None
        is_active = data.get('is_active', wedding_type.is_active)
        
        if not name:
            return jsonify({'error': 'Wedding type name is required'}), 400
        
        # Check for duplicates (excluding current record)
        existing = WeddingType.query.filter(
            WeddingType.name == name,
            WeddingType.id != wedding_type_id
        ).first()
        if existing:
            return jsonify({'error': f'Wedding type "{name}" already exists'}), 409
        
        wedding_type.name = name
        wedding_type.description = description
        wedding_type.is_active = is_active
        
        db.session.commit()
        
        return jsonify({
            'message': 'Wedding type updated successfully',
            'wedding_type': wedding_type.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating wedding type: {e}")
        return jsonify({'error': 'Failed to update wedding type', 'details': str(e)}), 500


@admin_data_bp.route('/wedding-types/<int:wedding_type_id>', methods=['DELETE'])
@login_required
@_admin_required
def delete_wedding_type(wedding_type_id):
    """Delete a wedding type (with relationship checks)."""
    try:
        wedding_type = WeddingType.query.get_or_404(wedding_type_id)
        
        # Check for related records
        cultural_colors_count = CulturalColors.query.filter_by(wedding_type=wedding_type.name).count()
        color_rules_count = ColorRules.query.filter_by(wedding_type=wedding_type.name).count()
        food_locations_count = FoodLocations.query.filter_by(wedding_type=wedding_type.name).count()
        restricted_colours_count = RestrictedColours.query.filter_by(wedding_type=wedding_type.name).count()
        
        total_references = cultural_colors_count + color_rules_count + food_locations_count + restricted_colours_count
        
        if total_references > 0:
            references = []
            if cultural_colors_count > 0:
                references.append(f"{cultural_colors_count} Cultural Color(s)")
            if color_rules_count > 0:
                references.append(f"{color_rules_count} Color Rule(s)")
            if food_locations_count > 0:
                references.append(f"{food_locations_count} Food & Location(s)")
            if restricted_colours_count > 0:
                references.append(f"{restricted_colours_count} Restricted Colour(s)")
            
            return jsonify({
                'error': f'Cannot delete wedding type "{wedding_type.name}" because it is used in: {", ".join(references)}. Please delete related records first.'
            }), 409
        
        db.session.delete(wedding_type)
        db.session.commit()
        
        return jsonify({'message': 'Wedding type deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting wedding type: {e}")
        return jsonify({'error': 'Failed to delete wedding type', 'details': str(e)}), 500


# ============================================================================
# CULTURAL COLORS ENDPOINTS
# ============================================================================

@admin_data_bp.route('/cultural-colors', methods=['GET'])
@login_required
@_admin_required
def list_cultural_colors():
    """Get all cultural colors, optionally filtered by wedding type."""
    try:
        wedding_type = request.args.get('wedding_type')
        
        query = CulturalColors.query
        if wedding_type:
            query = query.filter_by(wedding_type=wedding_type)
        
        cultural_colors = query.order_by(
            CulturalColors.wedding_type,
            CulturalColors.colour_name
        ).all()
        
        return jsonify({
            'cultural_colors': [cc.to_dict() for cc in cultural_colors]
        }), 200
    except Exception as e:
        print(f"Error listing cultural colors: {e}")
        return jsonify({'error': 'Failed to retrieve cultural colors', 'details': str(e)}), 500


@admin_data_bp.route('/cultural-colors', methods=['POST'])
@login_required
@_admin_required
def create_cultural_color():
    """Create a new cultural color."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        wedding_type = (data.get('wedding_type') or '').strip()
        colour_name = (data.get('colour_name') or '').strip()
        rgb = data.get('rgb', '').strip()
        cultural_significance = (data.get('cultural_significance') or '').strip() or None
        
        if not wedding_type:
            return jsonify({'error': 'Wedding type is required'}), 400
        if not colour_name:
            return jsonify({'error': 'Color name is required'}), 400
        if not rgb:
            return jsonify({'error': 'RGB value is required'}), 400
        
        # Validate and normalize RGB
        is_valid, normalized_rgb, error_msg = _validate_rgb(rgb)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Check if wedding type exists
        wedding_type_obj = WeddingType.query.filter_by(name=wedding_type).first()
        if not wedding_type_obj:
            return jsonify({'error': f'Wedding type "{wedding_type}" does not exist'}), 400
        
        # Check for duplicates
        existing = CulturalColors.query.filter_by(
            wedding_type=wedding_type,
            colour_name=colour_name
        ).first()
        if existing:
            return jsonify({
                'error': f'Cultural color "{colour_name}" for "{wedding_type}" already exists'
            }), 409
        
        cultural_color = CulturalColors(
            wedding_type=wedding_type,
            colour_name=colour_name,
            rgb=normalized_rgb,
            cultural_significance=cultural_significance
        )
        
        db.session.add(cultural_color)
        db.session.commit()
        
        return jsonify({
            'message': 'Cultural color created successfully',
            'cultural_color': cultural_color.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating cultural color: {e}")
        return jsonify({'error': 'Failed to create cultural color', 'details': str(e)}), 500


@admin_data_bp.route('/cultural-colors', methods=['PUT'])
@login_required
@_admin_required
def update_cultural_color():
    """Update a cultural color (composite key requires both wedding_type and colour_name)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        wedding_type = (data.get('wedding_type') or '').strip()
        colour_name = (data.get('colour_name') or '').strip()
        old_wedding_type = (data.get('old_wedding_type') or wedding_type).strip()
        old_colour_name = (data.get('old_colour_name') or colour_name).strip()
        rgb = data.get('rgb', '').strip()
        cultural_significance = (data.get('cultural_significance') or '').strip() or None
        
        if not wedding_type:
            return jsonify({'error': 'Wedding type is required'}), 400
        if not colour_name:
            return jsonify({'error': 'Color name is required'}), 400
        if not rgb:
            return jsonify({'error': 'RGB value is required'}), 400
        
        # Validate and normalize RGB
        is_valid, normalized_rgb, error_msg = _validate_rgb(rgb)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Find existing record
        cultural_color = CulturalColors.query.filter_by(
            wedding_type=old_wedding_type,
            colour_name=old_colour_name
        ).first()
        
        if not cultural_color:
            return jsonify({'error': 'Cultural color not found'}), 404
        
        # Check if wedding type exists (if changed)
        if wedding_type != old_wedding_type or colour_name != old_colour_name:
            wedding_type_obj = WeddingType.query.filter_by(name=wedding_type).first()
            if not wedding_type_obj:
                return jsonify({'error': f'Wedding type "{wedding_type}" does not exist'}), 400
            
            # Check for duplicates (if key changed)
            existing = CulturalColors.query.filter_by(
                wedding_type=wedding_type,
                colour_name=colour_name
            ).first()
            if existing:
                return jsonify({
                    'error': f'Cultural color "{colour_name}" for "{wedding_type}" already exists'
                }), 409
        
        # Update record (delete old and create new if composite key changed)
        if wedding_type != old_wedding_type or colour_name != old_colour_name:
            # Check if used in color_rules
            color_rules_count = ColorRules.query.filter_by(
                wedding_type=old_wedding_type,
                bride_colour=old_colour_name
            ).count()
            
            if color_rules_count > 0:
                return jsonify({
                    'error': f'Cannot update because this color is used in {color_rules_count} Color Rule(s). Please delete related records first.'
                }), 409
            
            # Delete old and create new
            db.session.delete(cultural_color)
            db.session.flush()
            
            cultural_color = CulturalColors(
                wedding_type=wedding_type,
                colour_name=colour_name,
                rgb=normalized_rgb,
                cultural_significance=cultural_significance
            )
            db.session.add(cultural_color)
        else:
            # Just update fields
            cultural_color.rgb = normalized_rgb
            cultural_color.cultural_significance = cultural_significance
        
        db.session.commit()
        
        return jsonify({
            'message': 'Cultural color updated successfully',
            'cultural_color': cultural_color.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating cultural color: {e}")
        return jsonify({'error': 'Failed to update cultural color', 'details': str(e)}), 500


@admin_data_bp.route('/cultural-colors', methods=['DELETE'])
@login_required
@_admin_required
def delete_cultural_color():
    """Delete a cultural color (composite key requires both wedding_type and colour_name)."""
    try:
        wedding_type = request.args.get('wedding_type')
        colour_name = request.args.get('colour_name')
        
        if not wedding_type or not colour_name:
            return jsonify({'error': 'Both wedding_type and colour_name are required'}), 400
        
        cultural_color = CulturalColors.query.filter_by(
            wedding_type=wedding_type,
            colour_name=colour_name
        ).first_or_404()
        
        # Check for related records in color_rules
        color_rules_count = ColorRules.query.filter_by(
            wedding_type=wedding_type,
            bride_colour=colour_name
        ).count()
        
        if color_rules_count > 0:
            return jsonify({
                'error': f'Cannot delete because this color is used in {color_rules_count} Color Rule(s). Please delete related records first.'
            }), 409
        
        db.session.delete(cultural_color)
        db.session.commit()
        
        return jsonify({'message': 'Cultural color deleted successfully'}), 200
        
    except NotFound:
        return jsonify({'error': 'Cultural color not found'}), 404
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting cultural color: {e}")
        return jsonify({'error': 'Failed to delete cultural color', 'details': str(e)}), 500


# ============================================================================
# COLOR RULES ENDPOINTS
# ============================================================================

@admin_data_bp.route('/color-rules', methods=['GET'])
@login_required
@_admin_required
def list_color_rules():
    """Get all color rules, optionally filtered by wedding type."""
    try:
        wedding_type = request.args.get('wedding_type')
        
        query = ColorRules.query
        if wedding_type:
            query = query.filter_by(wedding_type=wedding_type)
        
        color_rules = query.order_by(
            ColorRules.wedding_type,
            ColorRules.bride_colour
        ).all()
        
        return jsonify({
            'color_rules': [cr.to_dict() for cr in color_rules]
        }), 200
    except Exception as e:
        print(f"Error listing color rules: {e}")
        return jsonify({'error': 'Failed to retrieve color rules', 'details': str(e)}), 500


@admin_data_bp.route('/color-rules', methods=['POST'])
@login_required
@_admin_required
def create_color_rule():
    """Create a new color rule."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        wedding_type = (data.get('wedding_type') or '').strip()
        bride_colour = (data.get('bride_colour') or '').strip()
        groom_colour = (data.get('groom_colour') or '').strip()
        bridesmaids_colour = (data.get('bridesmaids_colour') or '').strip()
        best_men_colour = (data.get('best_men_colour') or '').strip()
        flower_deco_colour = (data.get('flower_deco_colour') or '').strip()
        hall_decor_colour = (data.get('hall_decor_colour') or '').strip()
        
        if not wedding_type:
            return jsonify({'error': 'Wedding type is required'}), 400
        if not bride_colour:
            return jsonify({'error': 'Bride color is required'}), 400
        if not all([groom_colour, bridesmaids_colour, best_men_colour, flower_deco_colour, hall_decor_colour]):
            return jsonify({'error': 'All color fields are required'}), 400
        
        # Check if wedding type exists
        wedding_type_obj = WeddingType.query.filter_by(name=wedding_type).first()
        if not wedding_type_obj:
            return jsonify({'error': f'Wedding type "{wedding_type}" does not exist'}), 400
        
        # Check if bride color exists in cultural colors
        cultural_color = CulturalColors.query.filter_by(
            wedding_type=wedding_type,
            colour_name=bride_colour
        ).first()
        if not cultural_color:
            return jsonify({
                'error': f'Bride color "{bride_colour}" does not exist for wedding type "{wedding_type}" in Cultural Colors'
            }), 400
        
        # Check for duplicates
        existing = ColorRules.query.filter_by(
            wedding_type=wedding_type,
            bride_colour=bride_colour
        ).first()
        if existing:
            return jsonify({
                'error': f'Color rule for "{wedding_type}" with bride color "{bride_colour}" already exists'
            }), 409
        
        color_rule = ColorRules(
            wedding_type=wedding_type,
            bride_colour=bride_colour,
            groom_colour=groom_colour,
            bridesmaids_colour=bridesmaids_colour,
            best_men_colour=best_men_colour,
            flower_deco_colour=flower_deco_colour,
            hall_decor_colour=hall_decor_colour
        )
        
        db.session.add(color_rule)
        db.session.commit()
        
        return jsonify({
            'message': 'Color rule created successfully',
            'color_rule': color_rule.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating color rule: {e}")
        return jsonify({'error': 'Failed to create color rule', 'details': str(e)}), 500


@admin_data_bp.route('/color-rules', methods=['PUT'])
@login_required
@_admin_required
def update_color_rule():
    """Update a color rule (composite key requires both wedding_type and bride_colour)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        wedding_type = (data.get('wedding_type') or '').strip()
        bride_colour = (data.get('bride_colour') or '').strip()
        old_wedding_type = (data.get('old_wedding_type') or wedding_type).strip()
        old_bride_colour = (data.get('old_bride_colour') or bride_colour).strip()
        groom_colour = (data.get('groom_colour') or '').strip()
        bridesmaids_colour = (data.get('bridesmaids_colour') or '').strip()
        best_men_colour = (data.get('best_men_colour') or '').strip()
        flower_deco_colour = (data.get('flower_deco_colour') or '').strip()
        hall_decor_colour = (data.get('hall_decor_colour') or '').strip()
        
        if not wedding_type:
            return jsonify({'error': 'Wedding type is required'}), 400
        if not bride_colour:
            return jsonify({'error': 'Bride color is required'}), 400
        if not all([groom_colour, bridesmaids_colour, best_men_colour, flower_deco_colour, hall_decor_colour]):
            return jsonify({'error': 'All color fields are required'}), 400
        
        # Find existing record
        color_rule = ColorRules.query.filter_by(
            wedding_type=old_wedding_type,
            bride_colour=old_bride_colour
        ).first()
        
        if not color_rule:
            return jsonify({'error': 'Color rule not found'}), 404
        
        # Check if wedding type exists (if changed)
        if wedding_type != old_wedding_type:
            wedding_type_obj = WeddingType.query.filter_by(name=wedding_type).first()
            if not wedding_type_obj:
                return jsonify({'error': f'Wedding type "{wedding_type}" does not exist'}), 400
        
        # Check if bride color exists in cultural colors (if changed)
        if wedding_type != old_wedding_type or bride_colour != old_bride_colour:
            cultural_color = CulturalColors.query.filter_by(
                wedding_type=wedding_type,
                colour_name=bride_colour
            ).first()
            if not cultural_color:
                return jsonify({
                    'error': f'Bride color "{bride_colour}" does not exist for wedding type "{wedding_type}" in Cultural Colors'
                }), 400
            
            # Check for duplicates (if key changed)
            existing = ColorRules.query.filter_by(
                wedding_type=wedding_type,
                bride_colour=bride_colour
            ).first()
            if existing:
                return jsonify({
                    'error': f'Color rule for "{wedding_type}" with bride color "{bride_colour}" already exists'
                }), 409
        
        # Update record (delete old and create new if composite key changed)
        if wedding_type != old_wedding_type or bride_colour != old_bride_colour:
            db.session.delete(color_rule)
            db.session.flush()
            
            color_rule = ColorRules(
                wedding_type=wedding_type,
                bride_colour=bride_colour,
                groom_colour=groom_colour,
                bridesmaids_colour=bridesmaids_colour,
                best_men_colour=best_men_colour,
                flower_deco_colour=flower_deco_colour,
                hall_decor_colour=hall_decor_colour
            )
            db.session.add(color_rule)
        else:
            # Just update fields
            color_rule.groom_colour = groom_colour
            color_rule.bridesmaids_colour = bridesmaids_colour
            color_rule.best_men_colour = best_men_colour
            color_rule.flower_deco_colour = flower_deco_colour
            color_rule.hall_decor_colour = hall_decor_colour
        
        db.session.commit()
        
        return jsonify({
            'message': 'Color rule updated successfully',
            'color_rule': color_rule.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating color rule: {e}")
        return jsonify({'error': 'Failed to update color rule', 'details': str(e)}), 500


@admin_data_bp.route('/color-rules', methods=['DELETE'])
@login_required
@_admin_required
def delete_color_rule():
    """Delete a color rule (composite key requires both wedding_type and bride_colour)."""
    try:
        wedding_type = request.args.get('wedding_type')
        bride_colour = request.args.get('bride_colour')
        
        if not wedding_type or not bride_colour:
            return jsonify({'error': 'Both wedding_type and bride_colour are required'}), 400
        
        color_rule = ColorRules.query.filter_by(
            wedding_type=wedding_type,
            bride_colour=bride_colour
        ).first_or_404()
        
        db.session.delete(color_rule)
        db.session.commit()
        
        return jsonify({'message': 'Color rule deleted successfully'}), 200
        
    except NotFound:
        return jsonify({'error': 'Color rule not found'}), 404
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting color rule: {e}")
        return jsonify({'error': 'Failed to delete color rule', 'details': str(e)}), 500


# ============================================================================
# FOOD & LOCATIONS ENDPOINTS
# ============================================================================

@admin_data_bp.route('/food-locations', methods=['GET'])
@login_required
@_admin_required
def list_food_locations():
    """Get all food & locations, optionally filtered by wedding type."""
    try:
        wedding_type = request.args.get('wedding_type')
        
        query = FoodLocations.query
        if wedding_type:
            query = query.filter_by(wedding_type=wedding_type)
        
        food_locations = query.order_by(FoodLocations.wedding_type).all()
        
        return jsonify({
            'food_locations': [fl.to_dict() for fl in food_locations]
        }), 200
    except Exception as e:
        print(f"Error listing food locations: {e}")
        return jsonify({'error': 'Failed to retrieve food & locations', 'details': str(e)}), 500


@admin_data_bp.route('/food-locations', methods=['POST'])
@login_required
@_admin_required
def create_food_location():
    """Create a new food & location entry."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        wedding_type = (data.get('wedding_type') or '').strip()
        food_menu = (data.get('food_menu') or '').strip()
        drinks = (data.get('drinks') or '').strip()
        pre_shoot_locations = (data.get('pre_shoot_locations') or '').strip()
        
        if not wedding_type:
            return jsonify({'error': 'Wedding type is required'}), 400
        if not food_menu:
            return jsonify({'error': 'Food menu is required'}), 400
        if not drinks:
            return jsonify({'error': 'Drinks is required'}), 400
        if not pre_shoot_locations:
            return jsonify({'error': 'Pre-shoot locations is required'}), 400
        
        # Check if wedding type exists
        wedding_type_obj = WeddingType.query.filter_by(name=wedding_type).first()
        if not wedding_type_obj:
            return jsonify({'error': f'Wedding type "{wedding_type}" does not exist'}), 400
        
        # Check for duplicates
        existing = FoodLocations.query.filter_by(wedding_type=wedding_type).first()
        if existing:
            return jsonify({
                'error': f'Food & locations for "{wedding_type}" already exists'
            }), 409
        
        food_location = FoodLocations(
            wedding_type=wedding_type,
            food_menu=food_menu,
            drinks=drinks,
            pre_shoot_locations=pre_shoot_locations
        )
        
        db.session.add(food_location)
        db.session.commit()
        
        return jsonify({
            'message': 'Food & location created successfully',
            'food_location': food_location.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating food location: {e}")
        return jsonify({'error': 'Failed to create food & location', 'details': str(e)}), 500


@admin_data_bp.route('/food-locations', methods=['PUT'])
@login_required
@_admin_required
def update_food_location():
    """Update a food & location entry."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        wedding_type = (data.get('wedding_type') or '').strip()
        old_wedding_type = (data.get('old_wedding_type') or wedding_type).strip()
        food_menu = (data.get('food_menu') or '').strip()
        drinks = (data.get('drinks') or '').strip()
        pre_shoot_locations = (data.get('pre_shoot_locations') or '').strip()
        
        if not wedding_type:
            return jsonify({'error': 'Wedding type is required'}), 400
        if not food_menu:
            return jsonify({'error': 'Food menu is required'}), 400
        if not drinks:
            return jsonify({'error': 'Drinks is required'}), 400
        if not pre_shoot_locations:
            return jsonify({'error': 'Pre-shoot locations is required'}), 400
        
        # Find existing record
        food_location = FoodLocations.query.filter_by(wedding_type=old_wedding_type).first()
        
        if not food_location:
            return jsonify({'error': 'Food & location not found'}), 404
        
        # Check if wedding type exists (if changed)
        if wedding_type != old_wedding_type:
            wedding_type_obj = WeddingType.query.filter_by(name=wedding_type).first()
            if not wedding_type_obj:
                return jsonify({'error': f'Wedding type "{wedding_type}" does not exist'}), 400
            
            # Check for duplicates (if key changed)
            existing = FoodLocations.query.filter_by(wedding_type=wedding_type).first()
            if existing:
                return jsonify({
                    'error': f'Food & locations for "{wedding_type}" already exists'
                }), 409
        
        # Update record (delete old and create new if key changed)
        if wedding_type != old_wedding_type:
            db.session.delete(food_location)
            db.session.flush()
            
            food_location = FoodLocations(
                wedding_type=wedding_type,
                food_menu=food_menu,
                drinks=drinks,
                pre_shoot_locations=pre_shoot_locations
            )
            db.session.add(food_location)
        else:
            # Just update fields
            food_location.food_menu = food_menu
            food_location.drinks = drinks
            food_location.pre_shoot_locations = pre_shoot_locations
        
        db.session.commit()
        
        return jsonify({
            'message': 'Food & location updated successfully',
            'food_location': food_location.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating food location: {e}")
        return jsonify({'error': 'Failed to update food & location', 'details': str(e)}), 500


@admin_data_bp.route('/food-locations', methods=['DELETE'])
@login_required
@_admin_required
def delete_food_location():
    """Delete a food & location entry."""
    try:
        wedding_type = request.args.get('wedding_type')
        
        if not wedding_type:
            return jsonify({'error': 'wedding_type is required'}), 400
        
        food_location = FoodLocations.query.filter_by(wedding_type=wedding_type).first_or_404()
        
        db.session.delete(food_location)
        db.session.commit()
        
        return jsonify({'message': 'Food & location deleted successfully'}), 200
        
    except NotFound:
        return jsonify({'error': 'Food & location not found'}), 404
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting food location: {e}")
        return jsonify({'error': 'Failed to delete food & location', 'details': str(e)}), 500


# ============================================================================
# RESTRICTED COLOURS ENDPOINTS
# ============================================================================

@admin_data_bp.route('/restricted-colours', methods=['GET'])
@login_required
@_admin_required
def list_restricted_colours():
    """Get all restricted colours, optionally filtered by wedding type."""
    try:
        wedding_type = request.args.get('wedding_type')
        
        query = RestrictedColours.query
        if wedding_type:
            query = query.filter_by(wedding_type=wedding_type)
        
        restricted_colours = query.order_by(
            RestrictedColours.wedding_type,
            RestrictedColours.restricted_colour
        ).all()
        
        return jsonify({
            'restricted_colours': [rc.to_dict() for rc in restricted_colours]
        }), 200
    except Exception as e:
        print(f"Error listing restricted colours: {e}")
        return jsonify({'error': 'Failed to retrieve restricted colours', 'details': str(e)}), 500


@admin_data_bp.route('/restricted-colours', methods=['POST'])
@login_required
@_admin_required
def create_restricted_colour():
    """Create a new restricted colour."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        wedding_type = (data.get('wedding_type') or '').strip()
        restricted_colour = (data.get('restricted_colour') or '').strip()
        
        if not wedding_type:
            return jsonify({'error': 'Wedding type is required'}), 400
        if not restricted_colour:
            return jsonify({'error': 'Restricted colour is required'}), 400
        
        # Check if wedding type exists
        wedding_type_obj = WeddingType.query.filter_by(name=wedding_type).first()
        if not wedding_type_obj:
            return jsonify({'error': f'Wedding type "{wedding_type}" does not exist'}), 400
        
        # Check for duplicates
        existing = RestrictedColours.query.filter_by(
            wedding_type=wedding_type,
            restricted_colour=restricted_colour
        ).first()
        if existing:
            return jsonify({
                'error': f'Restricted colour "{restricted_colour}" for "{wedding_type}" already exists'
            }), 409
        
        restricted_colour_obj = RestrictedColours(
            wedding_type=wedding_type,
            restricted_colour=restricted_colour
        )
        
        db.session.add(restricted_colour_obj)
        db.session.commit()
        
        return jsonify({
            'message': 'Restricted colour created successfully',
            'restricted_colour': restricted_colour_obj.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating restricted colour: {e}")
        return jsonify({'error': 'Failed to create restricted colour', 'details': str(e)}), 500


@admin_data_bp.route('/restricted-colours', methods=['DELETE'])
@login_required
@_admin_required
def delete_restricted_colour():
    """Delete a restricted colour (composite key requires both wedding_type and restricted_colour)."""
    try:
        wedding_type = request.args.get('wedding_type')
        restricted_colour = request.args.get('restricted_colour')
        
        if not wedding_type or not restricted_colour:
            return jsonify({'error': 'Both wedding_type and restricted_colour are required'}), 400
        
        restricted_colour_obj = RestrictedColours.query.filter_by(
            wedding_type=wedding_type,
            restricted_colour=restricted_colour
        ).first_or_404()
        
        db.session.delete(restricted_colour_obj)
        db.session.commit()
        
        return jsonify({'message': 'Restricted colour deleted successfully'}), 200
        
    except NotFound:
        return jsonify({'error': 'Restricted colour not found'}), 404
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting restricted colour: {e}")
        return jsonify({'error': 'Failed to delete restricted colour', 'details': str(e)}), 500

