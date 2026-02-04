"""
Wedding Planning Service with Database-Driven Color Logic.

This module provides core wedding planning functionality including:
- Color validation and mapping using database lookups
- Euclidean distance calculations for unknown colors
- Wedding type and color information retrieval
"""

import math
import re
from typing import Dict, List, Optional, Tuple

from models.wedding_planning import (
    CulturalColors,
    ColorRules,
    FoodLocations,
    ColorMappings,
    RestrictedColours,
    WeddingType
)
from extensions import db


def calculate_euclidean_distance(rgb1: str, rgb2: str) -> float:
    """
    Calculate Euclidean distance between two RGB color values.
    
    Args:
        rgb1 (str): First RGB color in format "r,g,b"
        rgb2 (str): Second RGB color in format "r,g,b"
    
    Returns:
        float: Euclidean distance between the two colors
    """
    try:
        # Parse RGB values
        r1, g1, b1 = map(int, rgb1.split(','))
        r2, g2, b2 = map(int, rgb2.split(','))
        
        # Calculate Euclidean distance using the formula: sqrt((r2-r1)² + (g2-g1)² + (b2-b1)²)
        distance = math.sqrt((r2 - r1)**2 + (g2 - g1)**2 + (b2 - b1)**2)
        return distance
    except (ValueError, AttributeError, TypeError):
        return float('inf')  # Return infinity for invalid RGB values


def parse_rgb_from_color_name(color_name: str) -> Optional[str]:
    """
    Parse RGB values from color names using database lookup.
    
    Args:
        color_name (str): Color name to parse
    
    Returns:
        Optional[str]: RGB string if found in database, None otherwise
    """
    if not color_name:
        return None
        
    # Query database for color mapping
    color_mapping = ColorMappings.query.filter_by(color_name=color_name.lower()).first()
    
    return color_mapping.rgb if color_mapping else None


def get_default_color_for_wedding_type(wedding_type: str) -> Optional[str]:
    """
    Retrieve the configured default color for a given wedding type.
    """
    if not wedding_type:
        return None

    default_color = CulturalColors.query.filter(
        db.func.lower(CulturalColors.wedding_type) == wedding_type.lower().strip(),
        db.func.lower(CulturalColors.colour_name) == 'default'
    ).first()

    return default_color.colour_name if default_color else None


def get_default_color_rgb_for_wedding_type(wedding_type: str) -> Optional[str]:
    """
    Retrieve the RGB value for the default color of a given wedding type.
    """
    if not wedding_type:
        return None

    default_color = CulturalColors.query.filter(
        db.func.lower(CulturalColors.wedding_type) == wedding_type.lower().strip(),
        db.func.lower(CulturalColors.colour_name) == 'default'
    ).first()

    return default_color.rgb if default_color else None


def get_rgb_for_known_restricted_color(color_name: str) -> Optional[str]:
    """
    Return RGB values for known restricted colors that may not exist in color mappings.
    """
    if not color_name:
        return None

    restricted_rgb_map = {
        'black': '0,0,0',
        'gray': '128,128,128',
        'grey': '128,128,128',
        'maroon': '128,0,0'
    }

    return restricted_rgb_map.get(color_name.lower().strip())


def find_closest_valid_color(target_color: str, wedding_type: str) -> str:
    """
    Find the closest valid color for a given wedding type using Euclidean distance.
    
    Args:
        target_color (str): Target color name
        wedding_type (str): Wedding type to check valid colors for
    
    Returns:
        str: Closest valid color name
    """
    # Prioritise configured default color
    default_color = get_default_color_for_wedding_type(wedding_type)
    if default_color and not is_color_restricted_for_wedding_type(wedding_type, default_color):
        return default_color

    # Get target RGB from database or known restricted mapping
    target_rgb = parse_rgb_from_color_name(target_color)
    if not target_rgb:
        target_rgb = get_rgb_for_known_restricted_color(target_color)

    if not target_rgb:
        return default_color if default_color else 'default'
    
    # Get all valid colors for this wedding type
    valid_colors = CulturalColors.query.filter_by(wedding_type=wedding_type).all()
    
    if not valid_colors:
        return default_color if default_color else 'default'
    
    # Find closest color by Euclidean distance
    closest_color = 'default'
    min_distance = float('inf')
    
    for color in valid_colors:
        # Skip restricted colors - check if this color is restricted for this wedding type
        if is_color_restricted_for_wedding_type(wedding_type, color.colour_name):
            continue
            
        distance = calculate_euclidean_distance(target_rgb, color.rgb)
        if distance < min_distance:
            min_distance = distance
            closest_color = color.colour_name
    
    if closest_color:
        return closest_color

    return default_color if default_color else 'red'


def hex_to_rgb(hex_color: str) -> List[int]:
    """
    Convert hex color to RGB values.
    
    Args:
        hex_color (str): Hex color in format "#RRGGBB" or "RRGGBB"
    
    Returns:
        List[int]: RGB values as [R, G, B]
    """
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        raise ValueError(f"Invalid hex color format: {hex_color}")
    
    return [int(hex_color[i:i+2], 16) for i in (0, 2, 4)]


def process_hex_color(color_input: str, wedding_type: str) -> Tuple[str, Optional[str]]:
    """
    Process color input (hex or name) and map to valid cultural color.
    
    Args:
        color_input (str): Color input (hex format like "#FF7F7F" or color name)
        wedding_type (str): Wedding type for cultural validation
    
    Returns:
        tuple[str, Optional[str]]: (mapped_color, restriction_message)
            - mapped_color: Mapped cultural color name
            - restriction_message: Message if color was restricted, None otherwise
    """
    if not color_input or not wedding_type:
        default_color = get_default_color_for_wedding_type(wedding_type)
        return (default_color if default_color else 'default', None)
    
    # Check if input is hex color
    if color_input.startswith('#'):
        try:
            input_rgb = hex_to_rgb(color_input)
            
            # First, check if the hex color represents a restricted color by name
            # Convert RGB to a color name that might be restricted (e.g., black = 0,0,0)
            # Check common restricted colors by RGB value
            restricted_color_name = None
            if input_rgb == [0, 0, 0]:  # Black
                restricted_color_name = 'black'
            elif input_rgb == [128, 128, 128]:  # Gray
                restricted_color_name = 'gray'
            elif input_rgb == [128, 0, 0]:  # Maroon (dark red)
                restricted_color_name = 'maroon'
            
            # If we identified a potentially restricted color, check if it's restricted
            if restricted_color_name and is_color_restricted_for_wedding_type(wedding_type, restricted_color_name):
                default_color = get_default_color_for_wedding_type(wedding_type)
                alternative = default_color if default_color else find_closest_cultural_color_by_rgb(input_rgb, wedding_type)
                message = (
                    f"The color '{restricted_color_name}' is traditionally restricted for {wedding_type}. "
                    f"I will suggest the closest alternative color '{alternative}' instead."
                )
                return (alternative, message)
            
            # If not a known restricted color, proceed with normal mapping
            mapped_color = find_closest_cultural_color_by_rgb(input_rgb, wedding_type)
            # Check if the mapped color is restricted
            if is_color_restricted_for_wedding_type(wedding_type, mapped_color):
                default_color = get_default_color_for_wedding_type(wedding_type)
                alternative = default_color if default_color else find_closest_cultural_color_by_rgb(input_rgb, wedding_type)
                message = (
                    f"The color '{mapped_color}' (closest match to your input) is traditionally restricted "
                    f"for {wedding_type}. I will suggest the closest alternative color '{alternative}' instead."
                )
                return (alternative, message)
            return (mapped_color, None)
        except ValueError:
            default_color = get_default_color_for_wedding_type(wedding_type)
            return (default_color if default_color else 'default', None)
    
    # Process as color name
    return validate_and_map_bride_color(wedding_type, color_input)


def find_closest_cultural_color_by_rgb(input_rgb: List[int], wedding_type: str) -> str:
    """
    Find closest cultural color using Euclidean distance for RGB values.
    
    Args:
        input_rgb (List[int]): Input RGB values [R, G, B]
        wedding_type (str): Wedding type to check valid colors for
    
    Returns:
        str: Closest valid cultural color name (never returns 'default')
    """
    from extensions import db
    
    # Try exact match first
    cultural_colors = CulturalColors.query.filter_by(wedding_type=wedding_type).all()
    
    # If no exact match, try case-insensitive search
    if not cultural_colors:
        cultural_colors = CulturalColors.query.filter(
            db.func.lower(CulturalColors.wedding_type) == wedding_type.lower().strip()
        ).all()
    
    # If still no match, find closest wedding type by name similarity
    if not cultural_colors:
        all_wedding_types = db.session.query(CulturalColors.wedding_type).distinct().all()
        # Find wedding type that contains the input (e.g., "Tamil Wedding" -> "Tamil Hindu Wedding")
        for wt_tuple in all_wedding_types:
            wt_db = wt_tuple[0]
            if wedding_type.lower().strip() in wt_db.lower() or wt_db.lower() in wedding_type.lower().strip():
                cultural_colors = CulturalColors.query.filter_by(wedding_type=wt_db).all()
                if cultural_colors:
                    break
    
    # If still no colors found, get first available color from any wedding type as last resort
    if not cultural_colors:
        first_color = CulturalColors.query.first()
        if first_color:
            return first_color.colour_name
        return 'red'  # Absolute last resort
    
    default_color = get_default_color_for_wedding_type(wedding_type)

    closest_color = None
    min_distance = float('inf')
    first_valid_color = None
    
    for color in cultural_colors:
        # Skip restricted colors - they cannot be used as bride's dress color
        if is_color_restricted_for_wedding_type(wedding_type, color.colour_name):
            continue
            
        # Save first valid non-restricted color as fallback
        if first_valid_color is None:
            first_valid_color = color.colour_name
        
        try:
            # Parse RGB values from database
            rgb_str = color.rgb.strip()
            rgb_values = [int(x.strip()) for x in rgb_str.split(',')]
            
            # Calculate Euclidean distance
            distance = calculate_euclidean_distance(
                f"{input_rgb[0]},{input_rgb[1]},{input_rgb[2]}",
                color.rgb
            )
            
            if distance < min_distance:
                min_distance = distance
                closest_color = color.colour_name
                
        except (ValueError, AttributeError):
            continue
    
    # Return closest color, or first valid color, or default/red as last resorts
    if closest_color:
        return closest_color
    if first_valid_color:
        return first_valid_color
    if default_color and not is_color_restricted_for_wedding_type(wedding_type, default_color):
        return default_color
    return 'red'


def validate_and_map_bride_color(wedding_type: str, bride_color: str) -> Tuple[str, Optional[str]]:
    """
    Validate bride's color and map to valid color if needed.
    
    Args:
        wedding_type (str): Type of wedding
        bride_color (str): Bride's chosen color
    
    Returns:
        tuple[str, Optional[str]]: (mapped_color, restriction_message)
            - mapped_color: Valid mapped color name
            - restriction_message: Message if color was restricted, None otherwise
    """
    if not wedding_type or not bride_color:
        default_color = get_default_color_for_wedding_type(wedding_type)
        return (default_color if default_color else 'default', None)
    
    original_color = bride_color.lower()
    
    # First check if the color is restricted (even if it doesn't exist in cultural_colors)
    if is_color_restricted_for_wedding_type(wedding_type, original_color):
        # Color is restricted - use default color for this wedding type
        mapped_color = get_default_color_for_wedding_type(wedding_type) or find_closest_valid_color(bride_color, wedding_type)
        message = (
            f"The color '{bride_color}' is traditionally restricted for {wedding_type}. "
            f"I will suggest the closest alternative color '{mapped_color}' instead."
        )
        return (mapped_color, message)
    
    # Check if the exact color exists and is valid for this wedding type
    cultural_color = CulturalColors.query.filter_by(
        wedding_type=wedding_type,
        colour_name=original_color
    ).first()
    
    if cultural_color:
        # Color exists and is not restricted - use it
        return (original_color, None)
    
    # Color doesn't exist in our database, prefer default color or find closest match
    default_color = get_default_color_for_wedding_type(wedding_type)
    if default_color:
        return (default_color, None)

    mapped_color = find_closest_valid_color(bride_color, wedding_type)
    return (mapped_color, None)


def get_wedding_suggestions(wedding_type: str, bride_color: str) -> Dict:
    """
    Get complete wedding suggestions based on wedding type and bride's color.
    
    Args:
        wedding_type (str): Type of wedding
        bride_color (str): Bride's chosen color
    
    Returns:
        Dict: Complete wedding suggestions including colors, food, drinks, and locations
    
    Raises:
        ValueError: If wedding type is not found
        KeyError: If required data is missing
    """
    # Validate and map bride's color
    mapped_bride_color, _ = validate_and_map_bride_color(wedding_type, bride_color)
    
    # Get color suggestions from database
    color_rule = ColorRules.query.filter_by(
        wedding_type=wedding_type,
        bride_colour=mapped_bride_color
    ).first()
    
    if not color_rule:
        raise KeyError(f"No color rules found for {wedding_type} with bride color {mapped_bride_color}")
    
    # Get food and location suggestions from database
    food_location = FoodLocations.query.filter_by(wedding_type=wedding_type).first()
    
    if not food_location:
        raise ValueError(f"No food and location data found for {wedding_type}")
    
    # Get enhanced color information with RGB values
    color_details = get_enhanced_color_details(wedding_type, color_rule)
    
    # Prepare comprehensive response with enhanced color information
    return {
        'bride_colour_mapped': mapped_bride_color,
        'groom_colour': color_rule.groom_colour,
        'bridesmaids_colour': color_rule.bridesmaids_colour,
        'best_men_colour': color_rule.best_men_colour,
        'flower_deco_colour': color_rule.flower_deco_colour,
        'hall_decor_colour': color_rule.hall_decor_colour,
        'food_menu': food_location.food_menu,
        'drinks': food_location.drinks,
        'pre_shoot_locations': food_location.pre_shoot_locations,
        'color_details': color_details,
        'wedding_type': wedding_type,
        'cultural_significance': get_cultural_significance(wedding_type, mapped_bride_color),
        'suggestion_confidence': calculate_suggestion_confidence(wedding_type, mapped_bride_color)
    }


def get_available_wedding_types() -> List[str]:
    """
    Get list of all available wedding types from wedding_types table.
    
    Returns:
        List[str]: List of available wedding type names (active only)
    """
    # First try to get from wedding_types table
    wedding_types = WeddingType.query.filter_by(is_active=True).all()
    
    if wedding_types:
        # Return names from wedding_types table
        return [wt.name for wt in wedding_types]
    
    # Fallback: if wedding_types table is empty, get from cultural_colors (for migration)
    print("Warning: wedding_types table is empty. Falling back to cultural_colors table.")
    wedding_types_fallback = CulturalColors.query.with_entities(
        CulturalColors.wedding_type
    ).distinct().all()
    
    return [wt[0] for wt in wedding_types_fallback]


def get_wedding_type_details(wedding_type_name: str) -> Optional[Dict]:
    """
    Get detailed information about a wedding type from wedding_types table.
    
    Args:
        wedding_type_name (str): Name of the wedding type
    
    Returns:
        Optional[Dict]: Wedding type details or None if not found
    """
    wedding_type = WeddingType.query.filter(
        db.func.lower(WeddingType.name) == wedding_type_name.lower().strip(),
        WeddingType.is_active == True
    ).first()
    
    if wedding_type:
        return wedding_type.to_dict()
    
    return None


def get_available_colors_for_wedding_type(wedding_type: str) -> List[Dict]:
    """
    Get all available (non-restricted) colors for a specific wedding type with their details.
    Excludes restricted colors that cannot be used as bride's dress color.
    
    Args:
        wedding_type (str): Wedding type to get colors for
    
    Returns:
        List[Dict]: List of color information dictionaries (excluding restricted colors)
    """
    colors = CulturalColors.query.filter_by(wedding_type=wedding_type).all()
    
    # Filter out restricted colors
    available_colors = []
    for color in colors:
        # Skip restricted colors
        if not is_color_restricted_for_wedding_type(wedding_type, color.colour_name):
            available_colors.append(color.to_dict())
    
    return available_colors


def get_enhanced_color_details(wedding_type: str, color_rule) -> Dict:
    """
    Get enhanced color details with RGB values and hex codes.
    
    Args:
        wedding_type (str): Wedding type
        color_rule: ColorRules database object
    
    Returns:
        Dict: Enhanced color details with RGB and hex values
    """
    color_details = {}
    
    # Define color fields to process
    color_fields = [
        'bride_colour', 'groom_colour', 'bridesmaids_colour', 
        'best_men_colour', 'flower_deco_colour', 'hall_decor_colour'
    ]
    
    for field in color_fields:
        color_name = getattr(color_rule, field, '')
        if color_name:
            # Get RGB values from database
            rgb_values = get_rgb_for_color_name(color_name)
            hex_value = rgb_to_hex(rgb_values) if rgb_values else None
            
            color_details[field] = {
                'name': color_name,
                'rgb': rgb_values,
                'hex': hex_value,
                'is_restricted': is_color_restricted(wedding_type, color_name),
                'swatches': build_color_swatches(color_name)
            }
    
    return color_details


FALLBACK_RGB_MAP = {
    'black': '0,0,0',
    'navy': '0,0,128',
    'navy blue': '0,0,128',
    'light green': '144,238,144',
    'light-blue': '173,216,230',
    'light blue': '173,216,230',
    'cream': '255,255,240',
    'ivory': '255,255,240',
    'champagne': '247,231,206',
    'golden': '255,215,0',
    'gold': '255,215,0',
    'rose gold': '183,110,121',
    'teal': '0,128,128',
    'turquoise': '64,224,208',
    'lavender': '230,230,250',
    'burgundy': '128,0,32',
    'beige': '245,245,220',
    'white': '255,255,255',
    'silver': '192,192,192',
    'bronze': '205,127,50',
    'peach': '255,218,185',
    'mint': '152,255,152',
    'sky blue': '135,206,235',
    'baby blue': '137,207,240',
    'coral': '255,127,80',
    'magenta': '255,0,255',
    'aqua': '0,255,255',
    'violet': '238,130,238',
    'plum': '142,69,133',
    'charcoal': '54,69,79',
    'khaki': '195,176,145'
}


def split_color_components(color_name: str) -> List[str]:
    """
    Split a color name into its component parts using common conjunctions.
    Preserves the original casing of each component.
    """
    if not color_name:
        return []

    parts = [
        part.strip() for part in re.split(r'\s*(?:and|/|&|,)\s*', color_name, flags=re.IGNORECASE)
        if part.strip()
    ]

    if not parts:
        stripped = color_name.strip()
        return [stripped] if stripped else []

    return parts


def build_color_swatches(color_name: str) -> List[Dict[str, Optional[str]]]:
    """
    Build a list of color swatches (name, RGB, HEX) for a given color name.
    Handles composite colors by generating swatches for each component color.
    """
    if not color_name:
        return []

    components = split_color_components(color_name)
    swatches: List[Dict[str, Optional[str]]] = []

    for component in components:
        rgb_value = get_rgb_for_color_name(component, _allow_composite=False)
        hex_value = rgb_to_hex(rgb_value) if rgb_value else None
        swatches.append({
            'name': component,
            'rgb': rgb_value,
            'hex': hex_value
        })

    if not swatches:
        rgb_value = get_rgb_for_color_name(color_name)
        hex_value = rgb_to_hex(rgb_value) if rgb_value else None
        swatches.append({
            'name': color_name,
            'rgb': rgb_value,
            'hex': hex_value
        })

    return swatches


def get_rgb_for_color_name(color_name: str, _allow_composite: bool = True) -> Optional[str]:
    """
    Get RGB values for a color name from database.
    
    Args:
        color_name (str): Color name to look up
    
    Returns:
        Optional[str]: RGB string if found, None otherwise
    """
    # Try to find in cultural colors first
    if not color_name:
        return None

    normalized_name = color_name.strip().lower()

    cultural_color = CulturalColors.query.filter(
        db.func.lower(CulturalColors.colour_name) == normalized_name
    ).first()
    if cultural_color:
        return cultural_color.rgb
    
    # Try color mappings
    color_mapping = ColorMappings.query.filter(
        db.func.lower(ColorMappings.color_name) == normalized_name
    ).first()
    if color_mapping:
        return color_mapping.rgb

    # Fallback lookup for common color names not present in database tables
    if normalized_name in FALLBACK_RGB_MAP:
        return FALLBACK_RGB_MAP[normalized_name]

    # Attempt to blend composite colors like "white and green" or "gold/silver"
    if _allow_composite:
        separators = [' and ', '/', '&', ',']
        for separator in separators:
            if separator in normalized_name:
                parts = [part.strip() for part in normalized_name.split(separator) if part.strip()]
                rgb_values = []
                for part in parts:
                    part_rgb = get_rgb_for_color_name(part, _allow_composite=False)
                    if part_rgb:
                        try:
                            rgb_values.append(tuple(map(int, part_rgb.split(','))))
                        except ValueError:
                            continue
                if rgb_values:
                    averaged = tuple(
                        round(sum(component) / len(rgb_values))
                        for component in zip(*rgb_values)
                    )
                    return ','.join(str(value) for value in averaged)
    
    return None


def rgb_to_hex(rgb_string: str) -> Optional[str]:
    """
    Convert RGB string to hex color.
    
    Args:
        rgb_string (str): RGB string in format "r,g,b"
    
    Returns:
        Optional[str]: Hex color string if valid, None otherwise
    """
    if not rgb_string:
        return None
    
    try:
        r, g, b = map(int, rgb_string.split(','))
        return f"#{r:02x}{g:02x}{b:02x}".upper()
    except (ValueError, AttributeError):
        return None


def is_color_restricted_for_wedding_type(wedding_type: str, color_name: str) -> bool:
    """
    Check if a color is restricted (cannot be used) for a specific wedding type.
    A color is restricted if it appears in the restricted_colours table.
    
    Args:
        wedding_type (str): Wedding type to check
        color_name (str): Color name to check
    
    Returns:
        bool: True if color is restricted for this wedding type, False otherwise
    """
    # Query the restricted_colours table
    restricted = RestrictedColours.query.filter(
        db.func.lower(RestrictedColours.wedding_type) == wedding_type.lower().strip(),
        db.func.lower(RestrictedColours.restricted_colour) == color_name.lower().strip()
    ).first()
    
    return restricted is not None


def is_color_restricted(wedding_type: str, color_name: str) -> bool:
    """
    Check if a color is restricted for a specific wedding type.
    (Alias for is_color_restricted_for_wedding_type for backward compatibility)
    
    Args:
        wedding_type (str): Wedding type
        color_name (str): Color name to check
    
    Returns:
        bool: True if color is restricted, False otherwise
    """
    return is_color_restricted_for_wedding_type(wedding_type, color_name)


def get_cultural_significance(wedding_type: str, color_name: str) -> Optional[str]:
    """
    Get cultural significance of a color for a specific wedding type.
    
    Args:
        wedding_type (str): Wedding type
        color_name (str): Color name
    
    Returns:
        Optional[str]: Cultural significance if available, None otherwise
    """
    cultural_color = CulturalColors.query.filter_by(
        wedding_type=wedding_type,
        colour_name=color_name.lower()
    ).first()
    
    return cultural_color.cultural_significance if cultural_color else None


def calculate_suggestion_confidence(wedding_type: str, bride_color: str) -> float:
    """
    Calculate confidence score for the suggestion based on data availability.
    
    Args:
        wedding_type (str): Wedding type
        bride_color (str): Bride's color
    
    Returns:
        float: Confidence score between 0.0 and 1.0
    """
    confidence = 0.0

    if not wedding_type or not bride_color:
        return confidence

    normalized_type = wedding_type.strip()
    normalized_type_lower = normalized_type.lower()
    normalized_color_lower = bride_color.strip().lower()

    # Check if wedding type exists (case-insensitive)
    if CulturalColors.query.filter(
        db.func.lower(CulturalColors.wedding_type) == normalized_type_lower
    ).first():
        confidence += 0.3
    
    # Check if bride color exists for this wedding type
    if CulturalColors.query.filter(
        db.func.lower(CulturalColors.wedding_type) == normalized_type_lower,
        db.func.lower(CulturalColors.colour_name) == normalized_color_lower
    ).first():
        confidence += 0.4
    
    # Check if color rules exist
    if ColorRules.query.filter(
        db.func.lower(ColorRules.wedding_type) == normalized_type_lower,
        db.func.lower(ColorRules.bride_colour) == normalized_color_lower
    ).first():
        confidence += 0.3
    
    return min(confidence, 1.0)