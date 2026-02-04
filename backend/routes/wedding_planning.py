"""
Wedding Planning Routes for Decision Tree System.

This module provides API endpoints for wedding planning suggestions using
a decision tree algorithm with database-driven rules including:
- Wedding suggestions based on type and bride's color
- Available wedding types and colors
- Decision tree management
"""

from flask import Blueprint, request, jsonify

from services.wedding_service import (
    get_available_wedding_types,
    get_available_colors_for_wedding_type,
    get_enhanced_color_details,
    get_cultural_significance,
    calculate_suggestion_confidence
)
from services.decision_tree_service import (
    get_wedding_suggestions_with_decision_tree,
    rebuild_decision_tree
)

# Create blueprint for wedding planning routes
wedding_bp = Blueprint('wedding', __name__, url_prefix='/api/wedding')


@wedding_bp.route('/suggest', methods=['POST'])
def suggest_wedding_details():
    """
    Provide wedding suggestions based on wedding type and bride's color.
    Enhanced version with detailed color information and confidence scores.
    
    Expected JSON input:
    {
        "wedding_type": "Kandyan Sinhala Wedding",
        "bride_colour": "red"
    }
    
    Returns:
    {
        "bride_colour_mapped": "red",
        "groom_colour": "Maroon",
        "bridesmaids_colour": "Coral red",
        "best_men_colour": "Maroon",
        "flower_deco_colour": "Red and white",
        "hall_decor_colour": "Red and gold",
        "food_menu": "Appetizers: Cutlets...",
        "drinks": "Hot: Ceylon tea...",
        "pre_shoot_locations": "Sigiriya...",
        "color_details": {...},
        "cultural_significance": "...",
        "suggestion_confidence": 0.95,
        "prediction_metadata": {...}
    }
    """
    try:
        # Validate request content type
        if not request.is_json:
            return jsonify({
                'error': 'Content-Type must be application/json'
            }), 400
        
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({
                'error': 'Request body is required'
            }), 400
        
        wedding_type = data.get('wedding_type')
        bride_colour = data.get('bride_colour')
        
        # Check for missing required fields
        missing_fields = []
        if not wedding_type:
            missing_fields.append('wedding_type')
        if not bride_colour:
            missing_fields.append('bride_colour')
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate data types
        if not isinstance(wedding_type, str) or not isinstance(bride_colour, str):
            return jsonify({
                'error': 'wedding_type and bride_colour must be strings'
            }), 400
        
        # Clean input data
        wedding_type = wedding_type.strip()
        bride_colour = bride_colour.strip().lower()
        
        # Validate non-empty strings
        if not wedding_type or not bride_colour:
            return jsonify({
                'error': 'wedding_type and bride_colour cannot be empty'
            }), 400
        
        # Get wedding suggestions using decision tree algorithm
        try:
            suggestions = get_wedding_suggestions_with_decision_tree(wedding_type, bride_colour)
            
            return jsonify(suggestions), 200
            
        except ValueError as ve:
            # Wedding type not found
            return jsonify({
                'error': f'Wedding type not found: {wedding_type}',
                'message': str(ve)
            }), 404
            
        except KeyError as ke:
            # Color rules not found
            return jsonify({
                'error': f'No suggestions available for the given combination',
                'message': str(ke)
            }), 404
    
    except Exception as e:
        # Internal server error
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing your request'
        }), 500


@wedding_bp.route('/wedding-types', methods=['GET'])
def get_wedding_types():
    """
    Get list of all available wedding types with enhanced information.
    This endpoint is public and doesn't require authentication.
    
    Returns:
    {
        "wedding_types": [
            {
                "name": "Kandyan Sinhala Wedding",
                "description": "Traditional Sinhala wedding from the Kandyan region",
                "available_colors": 11,
                "has_restrictions": true
            },
            ...
        ]
    }
    """
    try:
        wedding_types = get_available_wedding_types()
        
        if not wedding_types:
            return jsonify({
                'wedding_types': [],
                'message': 'No wedding types found in database'
            }), 200
        
        # Get wedding types from wedding_types table with details
        from models.wedding_planning import WeddingType, RestrictedColours
        from extensions import db
        from services.wedding_service import get_wedding_type_details
        
        # Enhance wedding types with additional information
        enhanced_types = []
        for wt_name in wedding_types:
            try:
                # Get wedding type details from wedding_types table
                wt_details = get_wedding_type_details(wt_name)
                
                # Get description from wedding_types table or use default
                description = wt_details.get('description') if wt_details else f"Traditional {wt_name.lower()} ceremony"
                
                # Count available colors
                color_count = len(get_available_colors_for_wedding_type(wt_name))
                
                # Check if this wedding type has restrictions
                # Query the restricted_colours table to see if this wedding type has any restrictions
                has_restrictions = RestrictedColours.query.filter(
                    db.func.lower(RestrictedColours.wedding_type) == wt_name.lower()
                ).first() is not None
                
                enhanced_types.append({
                    'name': wt_name,
                    'description': description,
                    'available_colors': color_count,
                    'has_restrictions': has_restrictions
                })
            except Exception as e:
                print(f"Error enhancing wedding type {wt_name}: {e}")
                # If there's an error with a specific wedding type, add it without enhancement
                enhanced_types.append({
                    'name': wt_name,
                    'description': f"Traditional {wt_name.lower()} ceremony",
                    'available_colors': 0,
                    'has_restrictions': False
                })
        
        return jsonify({
            'wedding_types': enhanced_types,
            'total': len(enhanced_types)
        }), 200
        
    except Exception as e:
        print(f"Error in get_wedding_types: {e}")
        return jsonify({
            'error': 'Failed to retrieve wedding types',
            'message': str(e),
            'wedding_types': []
        }), 500


@wedding_bp.route('/colors/<wedding_type>', methods=['GET'])
def get_colors_for_wedding_type(wedding_type):
    """
    Get all available colors for a specific wedding type.
    
    Args:
        wedding_type (str): Wedding type to get colors for
    
    Returns:
    {
        "wedding_type": "Kandyan Sinhala Wedding",
        "colors": [
            {
                "colour_name": "red",
                "rgb": "255,0,0",
                "cultural_significance": "Prosperity and good fortune",
                "is_restricted": false
            },
            ...
        ]
    }
    """
    try:
        # Validate wedding type parameter
        if not wedding_type or not wedding_type.strip():
            return jsonify({
                'error': 'Wedding type parameter is required'
            }), 400
        
        wedding_type = wedding_type.strip()
        
        # Get colors for the wedding type
        colors = get_available_colors_for_wedding_type(wedding_type)
        
        if not colors:
            return jsonify({
                'error': f'No colors found for wedding type: {wedding_type}'
            }), 404
        
        return jsonify({
            'wedding_type': wedding_type,
            'colors': colors
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to retrieve colors for wedding type'
        }), 500


@wedding_bp.route('/decision-tree/rebuild', methods=['POST'])
def rebuild_tree():
    """
    Rebuild the decision tree from current database state.
    Useful when database rules are updated.
    
    Returns:
    {
        "status": "success",
        "message": "Decision tree rebuilt successfully"
    }
    """
    try:
        tree = rebuild_decision_tree()
        return jsonify({
            'status': 'success',
            'message': 'Decision tree rebuilt successfully',
            'tree_built': tree.root is not None
        }), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to rebuild decision tree',
            'message': str(e)
        }), 500


@wedding_bp.route('/decision-tree/info', methods=['GET'])
def get_tree_info():
    """
    Get information about the current decision tree.
    
    Returns:
    {
        "tree_built": true,
        "algorithm": "decision_tree",
        "data_source": "mysql_database"
    }
    """
    try:
        from services.decision_tree_service import wedding_decision_tree
        
        return jsonify({
            'tree_built': wedding_decision_tree.root is not None,
            'algorithm': 'decision_tree',
            'data_source': 'mysql_database',
            'features': ['wedding_type', 'bride_colour'],
            'uses_euclidean_distance': True,
            'handles_restrictions': True
        }), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to get tree info',
            'message': str(e)
        }), 500


@wedding_bp.route('/health', methods=['GET'])
def wedding_health_check():
    """
    Health check endpoint for wedding planning service.
    
    Returns:
    {
        "status": "healthy",
        "service": "wedding_planning",
        "message": "Wedding planning service is running"
    }
    """
    return jsonify({
        'status': 'healthy',
        'service': 'wedding_planning',
        'algorithm': 'decision_tree',
        'data_source': 'mysql_database',
        'message': 'Wedding planning service with decision tree is running'
    }), 200