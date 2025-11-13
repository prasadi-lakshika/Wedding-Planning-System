"""
Wedding Planning Models for Decision Tree System.

This module defines database models for the wedding planning system including:
- Cultural color information and restrictions
- Color combination rules for suggestions
- Food menus and location recommendations
- Color mappings for unknown colors
"""

from extensions import db


class CulturalColors(db.Model):
    """
    Model for storing cultural color information for different wedding types.
    
    This table stores valid colors for each wedding type along with their
    RGB values and cultural significance.
    Note: Color restrictions are now stored in the separate restricted_colours table.
    """
    
    __tablename__ = 'cultural_colors'
    __table_args__ = {'extend_existing': True}

    # Composite primary key
    wedding_type = db.Column(db.String(50), primary_key=True, nullable=False)
    colour_name = db.Column(db.String(20), primary_key=True, nullable=False)
    
    # Color information
    rgb = db.Column(db.String(20), nullable=False)
    cultural_significance = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        """Convert to dictionary representation."""
        return {
            'wedding_type': self.wedding_type,
            'colour_name': self.colour_name,
            'rgb': self.rgb,
            'cultural_significance': self.cultural_significance
        }

    def __repr__(self):
        return f'<CulturalColors {self.wedding_type} - {self.colour_name}>'


class ColorRules(db.Model):
    """
    Model for storing color combination rules for different wedding types.
    
    This table provides color suggestions for various wedding party members
    and decorations based on the bride's chosen color and wedding type.
    """
    
    __tablename__ = 'color_rules'
    __table_args__ = {'extend_existing': True}

    # Composite primary key
    wedding_type = db.Column(db.String(50), primary_key=True, nullable=False)
    bride_colour = db.Column(db.String(20), primary_key=True, nullable=False)
    
    # Color suggestions
    groom_colour = db.Column(db.String(50), nullable=False)
    bridesmaids_colour = db.Column(db.String(50), nullable=False)
    best_men_colour = db.Column(db.String(50), nullable=False)
    flower_deco_colour = db.Column(db.String(50), nullable=False)
    hall_decor_colour = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        """Convert to dictionary representation."""
        return {
            'wedding_type': self.wedding_type,
            'bride_colour': self.bride_colour,
            'groom_colour': self.groom_colour,
            'bridesmaids_colour': self.bridesmaids_colour,
            'best_men_colour': self.best_men_colour,
            'flower_deco_colour': self.flower_deco_colour,
            'hall_decor_colour': self.hall_decor_colour
        }

    def __repr__(self):
        return f'<ColorRules {self.wedding_type} - {self.bride_colour}>'


class FoodLocations(db.Model):
    """
    Model for storing food menu, drinks, and pre-shoot location suggestions.
    
    This table contains comprehensive food, beverage, and location
    recommendations for different types of weddings.
    """
    
    __tablename__ = 'food_locations'
    __table_args__ = {'extend_existing': True}

    # Primary key
    wedding_type = db.Column(db.String(50), primary_key=True, nullable=False)
    
    # Recommendations
    food_menu = db.Column(db.Text, nullable=False)
    drinks = db.Column(db.Text, nullable=False)
    pre_shoot_locations = db.Column(db.Text, nullable=False)

    def to_dict(self):
        """Convert to dictionary representation."""
        return {
            'wedding_type': self.wedding_type,
            'food_menu': self.food_menu,
            'drinks': self.drinks,
            'pre_shoot_locations': self.pre_shoot_locations
        }

    def __repr__(self):
        return f'<FoodLocations {self.wedding_type}>'


class ColorMappings(db.Model):
    """
    Model for storing RGB mappings for unknown color names.
    
    This table maps color names that are not in the main cultural_colors
    table to their RGB values for Euclidean distance calculations.
    """
    
    __tablename__ = 'color_mappings'
    __table_args__ = {'extend_existing': True}

    # Primary key
    color_name = db.Column(db.String(50), primary_key=True, nullable=False)
    
    # Color information
    rgb = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        """Convert to dictionary representation."""
        return {
            'color_name': self.color_name,
            'rgb': self.rgb,
            'description': self.description
        }

    def __repr__(self):
        return f'<ColorMappings {self.color_name}: {self.rgb}>'


class RestrictedColours(db.Model):
    """
    Model for storing restricted colors for different wedding types.
    
    This table stores colors that cannot be used as the bride's dress color
    for specific wedding types. A color is restricted if it appears in this table.
    """
    
    __tablename__ = 'restricted_colours'
    __table_args__ = {'extend_existing': True}

    # Composite primary key
    wedding_type = db.Column(db.String(50), primary_key=True, nullable=False)
    restricted_colour = db.Column(db.String(20), primary_key=True, nullable=False)

    def to_dict(self):
        """Convert to dictionary representation."""
        return {
            'wedding_type': self.wedding_type,
            'restricted_colour': self.restricted_colour
        }

    def __repr__(self):
        return f'<RestrictedColours {self.wedding_type} - {self.restricted_colour}>'