"""
Decision Tree-based Wedding Planning Service.
Uses decision tree algorithm to make wedding planning suggestions based on database rules.
Enhanced with caching and performance optimizations.
"""

import math
import time
from typing import Dict, List, Tuple, Optional, Any
from models.wedding_planning import CulturalColors, ColorRules, FoodLocations, ColorMappings
from extensions import db
from dataclasses import dataclass
from collections import Counter
from functools import lru_cache


@dataclass
class DecisionNode:
    """
    Represents a node in the decision tree.
    """
    feature: str = None  # Feature to split on (e.g., 'wedding_type', 'bride_colour')
    value: Any = None    # Value to compare against
    prediction: Dict = None  # Final prediction if leaf node
    left: 'DecisionNode' = None   # Left child (condition not met)
    right: 'DecisionNode' = None  # Right child (condition met)
    is_leaf: bool = False


class WeddingDecisionTree:
    """
    Decision Tree for wedding planning suggestions.
    Builds tree from database rules and makes predictions.
    Enhanced with caching and performance optimizations.
    """
    
    def __init__(self):
        self.root = None
        self.last_build_time = None
        self.build_duration = 0
        self._color_mappings_cache = None
        self._training_data_cache = None
    
    @lru_cache(maxsize=1)
    def _load_color_mappings_from_database(self) -> Dict[str, str]:
        """Load color name to RGB mappings from database with caching."""
        if self._color_mappings_cache is not None:
            return self._color_mappings_cache
            
        color_mappings = {}
        mappings = ColorMappings.query.all()
        
        for mapping in mappings:
            color_mappings[mapping.color_name] = mapping.rgb
        
        self._color_mappings_cache = color_mappings
        return color_mappings
    
    def build_tree_from_database(self):
        """
        Build decision tree from database rules with performance tracking.
        Uses wedding planning data to create decision nodes.
        """
        print("[INFO] Building decision tree from database...")
        start_time = time.time()
        
        # Load all data from database
        cultural_colors = CulturalColors.query.all()
        color_rules = ColorRules.query.all()
        food_locations = FoodLocations.query.all()
        
        # Convert to training data format
        training_data = self._prepare_training_data(cultural_colors, color_rules, food_locations)
        
        # Build the tree
        self.root = self._build_tree_recursive(training_data, ['wedding_type', 'bride_colour'])
        
        end_time = time.time()
        self.build_duration = end_time - start_time
        self.last_build_time = time.time()
        
        print(f"[SUCCESS] Decision tree built successfully in {self.build_duration:.3f} seconds!")
        print(f"[INFO] Training data points: {len(training_data)}")
        return self.root
    
    def _prepare_training_data(self, cultural_colors, color_rules, food_locations) -> List[Dict]:
        """
        Prepare training data from database records.
        
        Args:
            cultural_colors: List of CulturalColors records
            color_rules: List of ColorRules records  
            food_locations: List of FoodLocations records
            
        Returns:
            List[Dict]: Training data for decision tree
        """
        training_data = []
        
        # Create food/location lookup
        food_lookup = {fl.wedding_type: fl for fl in food_locations}
        
        # Create cultural colors lookup for restrictions
        cultural_lookup = {}
        for cc in cultural_colors:
            key = (cc.wedding_type, cc.colour_name)
            cultural_lookup[key] = cc
        
        # Build training examples from color rules
        # Import restriction checker
        from services.wedding_service import is_color_restricted_for_wedding_type
        
        for rule in color_rules:
            # Check if this color is restricted for this wedding type
            # Skip if color is restricted (cannot be used as bride's dress color)
            if is_color_restricted_for_wedding_type(rule.wedding_type, rule.bride_colour):
                    continue
            
            # Get food/location data
            food_data = food_lookup.get(rule.wedding_type)
            
            if food_data:
                example = {
                    'wedding_type': rule.wedding_type,
                    'bride_colour': rule.bride_colour,
                    'prediction': {
                        'bride_colour_mapped': rule.bride_colour,
                        'groom_colour': rule.groom_colour,
                        'bridesmaids_colour': rule.bridesmaids_colour,
                        'best_men_colour': rule.best_men_colour,
                        'flower_deco_colour': rule.flower_deco_colour,
                        'hall_decor_colour': rule.hall_decor_colour,
                        'food_menu': food_data.food_menu,
                        'drinks': food_data.drinks,
                        'pre_shoot_locations': food_data.pre_shoot_locations
                    }
                }
                training_data.append(example)
        
        return training_data
    
    def _build_tree_recursive(self, data: List[Dict], features: List[str], depth: int = 0) -> DecisionNode:
        """
        Recursively build decision tree.
        
        Args:
            data: Training data
            features: Available features to split on
            depth: Current tree depth
            
        Returns:
            DecisionNode: Root of the subtree
        """
        # Base cases
        if not data:
            return DecisionNode(is_leaf=True, prediction={})
        
        if len(data) == 1:
            return DecisionNode(is_leaf=True, prediction=data[0]['prediction'])
        
        if not features or depth > 10:  # Prevent infinite recursion
            # Return most common prediction
            predictions = [d['prediction'] for d in data]
            return DecisionNode(is_leaf=True, prediction=predictions[0])
        
        # Find best feature to split on
        best_feature, best_value = self._find_best_split(data, features)
        
        if best_feature is None:
            # No good split found, create leaf
            return DecisionNode(is_leaf=True, prediction=data[0]['prediction'])
        
        # Split data
        left_data, right_data = self._split_data(data, best_feature, best_value)
        
        # Create node
        node = DecisionNode(feature=best_feature, value=best_value)
        
        # Recursively build children
        remaining_features = [f for f in features if f != best_feature]
        node.left = self._build_tree_recursive(left_data, remaining_features, depth + 1)
        node.right = self._build_tree_recursive(right_data, remaining_features, depth + 1)
        
        return node
    
    def _find_best_split(self, data: List[Dict], features: List[str]) -> Tuple[str, Any]:
        """
        Find the best feature and value to split on using information gain.
        
        Args:
            data: Training data
            features: Available features
            
        Returns:
            Tuple[str, Any]: Best feature and value to split on
        """
        best_feature = None
        best_value = None
        best_gain = -1
        
        for feature in features:
            # Get unique values for this feature
            values = list(set(d[feature] for d in data))
            
            for value in values:
                # Calculate information gain for this split
                gain = self._calculate_information_gain(data, feature, value)
                
                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature
                    best_value = value
        
        return best_feature, best_value
    
    def _calculate_information_gain(self, data: List[Dict], feature: str, value: Any) -> float:
        """
        Calculate information gain for a potential split.
        
        Args:
            data: Training data
            feature: Feature to split on
            value: Value to split on
            
        Returns:
            float: Information gain
        """
        # Split data
        left_data, right_data = self._split_data(data, feature, value)
        
        if not left_data or not right_data:
            return 0  # No gain if split doesn't separate data
        
        # Calculate entropy before split
        entropy_before = self._calculate_entropy(data)
        
        # Calculate weighted entropy after split
        total_size = len(data)
        left_weight = len(left_data) / total_size
        right_weight = len(right_data) / total_size
        
        entropy_after = (left_weight * self._calculate_entropy(left_data) + 
                        right_weight * self._calculate_entropy(right_data))
        
        return entropy_before - entropy_after
    
    def _calculate_entropy(self, data: List[Dict]) -> float:
        """
        Calculate entropy of the data based on predictions.
        
        Args:
            data: Training data
            
        Returns:
            float: Entropy value
        """
        if not data:
            return 0
        
        # Use wedding_type as the class for entropy calculation
        classes = [d['wedding_type'] for d in data]
        class_counts = Counter(classes)
        total = len(data)
        
        entropy = 0
        for count in class_counts.values():
            if count > 0:
                probability = count / total
                entropy -= probability * math.log2(probability)
        
        return entropy
    
    def _split_data(self, data: List[Dict], feature: str, value: Any) -> Tuple[List[Dict], List[Dict]]:
        """
        Split data based on feature and value.
        
        Args:
            data: Training data
            feature: Feature to split on
            value: Value to compare against
            
        Returns:
            Tuple[List[Dict], List[Dict]]: Left and right splits
        """
        left_data = [d for d in data if d[feature] != value]
        right_data = [d for d in data if d[feature] == value]
        
        return left_data, right_data
    
    def predict(self, wedding_type: str, bride_colour: str) -> Dict:
        """
        Make prediction using the decision tree with enhanced error handling.
        
        Args:
            wedding_type: Type of wedding
            bride_colour: Bride's color choice
            
        Returns:
            Dict: Wedding suggestions with confidence score
        """
        if not self.root:
            raise ValueError("Decision tree not built. Call build_tree_from_database() first.")
        
        wedding_type = wedding_type.strip()
        bride_colour = bride_colour.strip()
        
        # Handle color mapping for unknown colors (never returns 'default')
        mapped_bride_colour = self._map_unknown_color(wedding_type, bride_colour)
        
        # Normalize wedding type for tree traversal (try to find matching wedding type)
        normalized_wedding_type = self._normalize_wedding_type(wedding_type)
        
        # Traverse the tree
        prediction = self._traverse_tree(self.root, {
            'wedding_type': normalized_wedding_type,
            'bride_colour': mapped_bride_colour
        })
        
        # Validate prediction matches our input
        # If tree returned a prediction, check if it matches our wedding type and color
        prediction_valid = False
        if prediction:
            pred_bride_color = prediction.get('bride_colour_mapped', '').lower().strip()
            # Check if prediction bride color matches our mapped color
            if pred_bride_color == mapped_bride_colour.lower().strip():
                prediction_valid = True
        
        # If tree traversal returned empty or invalid prediction, use database fallback
        if not prediction or not prediction_valid:
            db_prediction = self._get_database_fallback(normalized_wedding_type, mapped_bride_colour)
            if db_prediction:
                prediction = db_prediction
        
        # If still empty, raise error
        if not prediction:
            raise ValueError(
                f"No suggestions found for wedding_type='{wedding_type}' and bride_colour='{mapped_bride_colour}'. "
                f"Please check if this combination exists in the database."
            )
        
        # Add metadata to prediction
        prediction['prediction_metadata'] = {
            'original_bride_colour': bride_colour,
            'mapped_bride_colour': mapped_bride_colour,
            'wedding_type': normalized_wedding_type,
            'original_wedding_type': wedding_type,
            'tree_build_time': self.last_build_time,
            'confidence_score': self._calculate_prediction_confidence(normalized_wedding_type, mapped_bride_colour)
        }

        # Expose confidence score at the root level for API consumers
        prediction['suggestion_confidence'] = prediction['prediction_metadata']['confidence_score']

        # Ensure enhanced color details are included for frontend display
        if 'color_details' not in prediction or not prediction.get('color_details'):
            # Import here to avoid circular dependencies at module load time
            from services.wedding_service import get_enhanced_color_details

            color_rule = ColorRules.query.filter(
                db.func.lower(ColorRules.wedding_type) == normalized_wedding_type.lower().strip(),
                db.func.lower(ColorRules.bride_colour) == mapped_bride_colour.lower().strip()
            ).first()

            if color_rule:
                prediction['color_details'] = get_enhanced_color_details(normalized_wedding_type, color_rule)
        
        return prediction
    
    def _normalize_wedding_type(self, wedding_type: str) -> str:
        """
        Normalize wedding type to match database entries.
        
        Args:
            wedding_type: Input wedding type
            
        Returns:
            str: Normalized wedding type that exists in database
        """
        wedding_type = wedding_type.strip()
        
        # Try exact match first
        if CulturalColors.query.filter_by(wedding_type=wedding_type).first():
            return wedding_type
        
        # Try case-insensitive match
        exact_match = CulturalColors.query.filter(
            db.func.lower(CulturalColors.wedding_type) == wedding_type.lower()
        ).first()
        
        if exact_match:
            return exact_match.wedding_type
        
        # Try partial match (e.g., "Tamil Wedding" -> "Tamil Hindu Wedding")
        # Split input into words and try to find best match
        input_words = set(wedding_type.lower().split())
        all_types = db.session.query(CulturalColors.wedding_type).distinct().all()
        
        best_match = None
        best_score = 0
        matches = []  # Store all matches with scores
        
        for wt_tuple in all_types:
            wt_db = wt_tuple[0]
            db_words = set(wt_db.lower().split())
            
            # Calculate match score (number of common words)
            common_words = input_words.intersection(db_words)
            score = len(common_words)
            
            # Also check if input is a substring of db type or vice versa
            if wedding_type.lower().strip() in wt_db.lower() or wt_db.lower() in wedding_type.lower().strip():
                score += 10  # Boost score for substring match
            
            # Prefer shorter, more specific names (e.g., "Tamil Hindu Wedding" over "Tamil Christian Wedding (Church Ceremony)")
            # Shorter names often indicate the main/default type
            length_penalty = len(wt_db) / 100.0  # Slight penalty for longer names
            score -= length_penalty
            
            matches.append((wt_db, score))
            
            if score > best_score:
                best_score = score
                best_match = wt_db
        
        # If we have multiple matches with similar scores, prefer the one with more ColorRules
        # (more rules = more complete data)
        if len(matches) > 1:
            matches_with_scores = [(wt, score) for wt, score in matches if score >= best_score * 0.9]  # Within 10% of best
            if len(matches_with_scores) > 1:
                # Count rules for each match
                best_match = None
                max_rules = 0
                for wt, score in matches_with_scores:
                    rule_count = ColorRules.query.filter_by(wedding_type=wt).count()
                    if rule_count > max_rules:
                        max_rules = rule_count
                        best_match = wt
        
        # Return best match if we found a reasonable match (at least 1 common word)
        if best_match and best_score > 0:
            return best_match
        
        # Return original if no match found
        return wedding_type
    
    def _get_database_fallback(self, wedding_type: str, bride_colour: str) -> Dict:
        """
        Get prediction directly from database when tree traversal fails.
        This is the fallback mechanism that queries the database directly.
        
        Args:
            wedding_type: Wedding type (should be normalized)
            bride_colour: Bride colour (should be mapped to valid color)
            
        Returns:
            Dict: Prediction from database or empty dict
        """
        # Try exact match first (case-insensitive for both wedding type and color)
        color_rule = ColorRules.query.filter(
            db.func.lower(ColorRules.wedding_type) == wedding_type.lower().strip(),
            db.func.lower(ColorRules.bride_colour) == bride_colour.lower().strip()
        ).first()
        
        # If exact match not found, search all rules for this wedding type
        if not color_rule:
            # Get all rules for this wedding type
            color_rules = ColorRules.query.filter(
                db.func.lower(ColorRules.wedding_type) == wedding_type.lower().strip()
            ).all()
            
            if color_rules:
                # Try to find rule with matching color name (case-insensitive)
                for rule in color_rules:
                    if rule.bride_colour.lower().strip() == bride_colour.lower().strip():
                        color_rule = rule
                        break
                
                # If still no match, the mapped color might not exist for this wedding type
                # In this case, we should NOT use the first rule - that would give wrong results
                # Instead, we need to verify the color exists in CulturalColors for this wedding type
                if not color_rule:
                    # Check if the mapped color actually exists for this wedding type
                    cultural_color = CulturalColors.query.filter(
                        db.func.lower(CulturalColors.wedding_type) == wedding_type.lower().strip(),
                        db.func.lower(CulturalColors.colour_name) == bride_colour.lower().strip()
                    ).first()
                    
                    if cultural_color:
                        # Color exists but no rule found - this is a data issue
                        # Try to find a rule with a similar color name
                        for rule in color_rules:
                            # Check if rule color is similar (e.g., "blue" matches "navy blue")
                            if bride_colour.lower() in rule.bride_colour.lower() or rule.bride_colour.lower() in bride_colour.lower():
                                color_rule = rule
                                break
                    
                    # Only use first rule as absolute last resort if color really doesn't exist
                    if not color_rule and not cultural_color:
                        # The color doesn't exist for this wedding type - this should not happen
                        # after our mapping, but if it does, return empty to trigger error
                        return {}
        
        if not color_rule:
            return {}
        
        # Get food/location data (case-insensitive)
        food_data = FoodLocations.query.filter(
            db.func.lower(FoodLocations.wedding_type) == wedding_type.lower().strip()
        ).first()
        
        # If no exact match, try similar wedding type
        if not food_data:
            all_food_types = db.session.query(FoodLocations.wedding_type).distinct().all()
            for ft_tuple in all_food_types:
                ft_db = ft_tuple[0]
                if wedding_type.lower().strip() in ft_db.lower() or ft_db.lower() in wedding_type.lower().strip():
                    food_data = FoodLocations.query.filter_by(wedding_type=ft_db).first()
                    if food_data:
                        break
        
        prediction = {
            'bride_colour_mapped': color_rule.bride_colour,
            'groom_colour': color_rule.groom_colour,
            'bridesmaids_colour': color_rule.bridesmaids_colour,
            'best_men_colour': color_rule.best_men_colour,
            'flower_deco_colour': color_rule.flower_deco_colour,
            'hall_decor_colour': color_rule.hall_decor_colour,
        }
        
        if food_data:
            prediction['food_menu'] = food_data.food_menu
            prediction['drinks'] = food_data.drinks
            prediction['pre_shoot_locations'] = food_data.pre_shoot_locations
        else:
            prediction['food_menu'] = 'Menu suggestions will be provided based on your wedding type.'
            prediction['drinks'] = 'Drink suggestions will be provided based on your wedding type.'
            prediction['pre_shoot_locations'] = 'Location suggestions will be provided based on your wedding type.'
        
        return prediction
    
    def _calculate_prediction_confidence(self, wedding_type: str, bride_colour: str) -> float:
        """
        Calculate confidence score for the prediction.
        
        Args:
            wedding_type: Wedding type
            bride_colour: Mapped bride colour
            
        Returns:
            float: Confidence score between 0.0 and 1.0
        """
        confidence = 0.0

        if not wedding_type or not bride_colour:
            return confidence

        normalized_type = wedding_type.strip()
        normalized_type_lower = normalized_type.lower()
        normalized_color_lower = bride_colour.strip().lower()

        # Check if wedding type exists in database (case-insensitive)
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
    
    def _map_unknown_color(self, wedding_type: str, bride_colour: str) -> str:
        """
        Map unknown colors to valid colors using database information and Euclidean distance.
        Returns the configured default color when appropriate.
        
        Args:
            wedding_type: Wedding type
            bride_colour: Original bride color
            
        Returns:
            str: Mapped color name (always a valid color, never 'default')
        """
        wedding_type = wedding_type.strip()
        bride_colour = bride_colour.strip().lower()
        
        # If color is already 'default', use the configured default color for this wedding type
        if bride_colour == 'default':
            default_color = CulturalColors.query.filter(
                db.func.lower(CulturalColors.wedding_type) == wedding_type.lower(),
                db.func.lower(CulturalColors.colour_name) == 'default'
            ).first()

            if default_color:
                from services.wedding_service import is_color_restricted_for_wedding_type
                if not is_color_restricted_for_wedding_type(wedding_type, default_color.colour_name):
                    return default_color.colour_name

            # Fallback to existing logic if default color not found or restricted
            valid_colors = CulturalColors.query.filter(
                db.func.lower(CulturalColors.wedding_type) == wedding_type.lower()
            ).all()

            if not valid_colors:
                all_types = db.session.query(CulturalColors.wedding_type).distinct().all()
                for wt_tuple in all_types:
                    wt_db = wt_tuple[0]
                    if wedding_type.lower() in wt_db.lower() or wt_db.lower() in wedding_type.lower():
                        valid_colors = CulturalColors.query.filter_by(wedding_type=wt_db).all()
                        if valid_colors:
                            break

            for color in valid_colors:
                if color.colour_name.lower() != 'default':
                    return color.colour_name
            return valid_colors[0].colour_name if valid_colors else 'red'
        
        # Try case-insensitive exact match first
        cultural_color = CulturalColors.query.filter(
            db.func.lower(CulturalColors.wedding_type) == wedding_type.lower(),
            db.func.lower(CulturalColors.colour_name) == bride_colour
        ).first()
        
        if cultural_color:
            # Check if this color is restricted for this wedding type
            from services.wedding_service import is_color_restricted_for_wedding_type
            if is_color_restricted_for_wedding_type(wedding_type, bride_colour):
                # Color is restricted - find closest non-restricted color
                pass  # Continue to find closest
            else:
                # Color exists and is not restricted - use it
                return cultural_color.colour_name
        
        # Color not found, use Euclidean distance if we have RGB mapping
        color_mappings = self._load_color_mappings_from_database()
        target_rgb = color_mappings.get(bride_colour)
        
        # Get all valid colors for this wedding type (case-insensitive)
        valid_colors = CulturalColors.query.filter(
            db.func.lower(CulturalColors.wedding_type) == wedding_type.lower()
        ).all()
        
        # If no colors found for this wedding type, try similar wedding type
        if not valid_colors:
            all_types = db.session.query(CulturalColors.wedding_type).distinct().all()
            for wt_tuple in all_types:
                wt_db = wt_tuple[0]
                if wedding_type.lower() in wt_db.lower() or wt_db.lower() in wedding_type.lower():
                    valid_colors = CulturalColors.query.filter_by(wedding_type=wt_db).all()
                    if valid_colors:
                        break
        
        if not valid_colors:
            # Last resort: get any color
            first_color = CulturalColors.query.filter(
                CulturalColors.colour_name != 'default'
            ).first()
            return first_color.colour_name if first_color else 'red'
        
        # Find closest color using Euclidean distance if we have RGB
        if target_rgb:
            closest_color = None
            min_distance = float('inf')
            first_valid_color = None

            # Import restriction checker
            from services.wedding_service import is_color_restricted_for_wedding_type

            for color in valid_colors:
                # Skip 'default' color
                if color.colour_name.lower() == 'default':
                    continue

                # Skip restricted colors - they cannot be used as bride's dress color
                if is_color_restricted_for_wedding_type(wedding_type, color.colour_name):
                    continue

                if first_valid_color is None:
                    first_valid_color = color.colour_name

                try:
                    distance = self._calculate_euclidean_distance(target_rgb, color.rgb)
                    if distance < min_distance:
                        min_distance = distance
                        closest_color = color.colour_name
                except Exception:
                    continue

            if closest_color:
                return closest_color

        # Return first valid non-restricted color as fallback
        from services.wedding_service import is_color_restricted_for_wedding_type
        for color in valid_colors:
            if color.colour_name.lower() != 'default':
                # Skip restricted colors
                if not is_color_restricted_for_wedding_type(wedding_type, color.colour_name):
                    return color.colour_name
        
        # Last resort: return first color (even if restricted)
        return valid_colors[0].colour_name if valid_colors else 'red'
    
    def _calculate_euclidean_distance(self, rgb1: str, rgb2: str) -> float:
        """Calculate Euclidean distance between RGB colors."""
        try:
            r1, g1, b1 = map(int, rgb1.split(','))
            r2, g2, b2 = map(int, rgb2.split(','))
            return math.sqrt((r2 - r1)**2 + (g2 - g1)**2 + (b2 - b1)**2)
        except (ValueError, AttributeError):
            return float('inf')
    
    def _traverse_tree(self, node: DecisionNode, input_data: Dict) -> Dict:
        """
        Traverse the decision tree to make a prediction.
        
        Args:
            node: Current node
            input_data: Input features
            
        Returns:
            Dict: Prediction (empty dict if no match found)
        """
        if node.is_leaf:
            return node.prediction or {}
        
        # Check condition (case-insensitive for strings)
        feature_value = input_data.get(node.feature)
        node_value = node.value
        
        # Normalize strings for comparison
        if isinstance(feature_value, str) and isinstance(node_value, str):
            feature_normalized = feature_value.lower().strip()
            node_normalized = node_value.lower().strip()
            match = feature_normalized == node_normalized
        else:
            match = feature_value == node_value
        
        if match:
            # Condition met, go right
            if node.right:
                result = self._traverse_tree(node.right, input_data)
                if result:
                    return result
        else:
            # Condition not met, go left
            if node.left:
                result = self._traverse_tree(node.left, input_data)
                if result:
                    return result
        
        # No match found in tree - return empty dict (will trigger database fallback)
        return {}
    
    def print_tree(self, node: DecisionNode = None, depth: int = 0):
        """
        Print the decision tree structure for debugging.
        
        Args:
            node: Node to print (defaults to root)
            depth: Current depth for indentation
        """
        if node is None:
            node = self.root
        
        if node is None:
            print("Tree not built yet!")
            return
        
        indent = "  " * depth
        
        if node.is_leaf:
            print(f"{indent}LEAF: {list(node.prediction.keys()) if node.prediction else 'Empty'}")
        else:
            print(f"{indent}IF {node.feature} == '{node.value}':")
            if node.right:
                self.print_tree(node.right, depth + 1)
            print(f"{indent}ELSE:")
            if node.left:
                self.print_tree(node.left, depth + 1)


# Global decision tree instance
wedding_decision_tree = WeddingDecisionTree()


def get_wedding_suggestions_with_decision_tree(wedding_type: str, bride_colour: str) -> Dict:
    """
    Get wedding suggestions using decision tree algorithm.
    
    Args:
        wedding_type: Type of wedding
        bride_colour: Bride's color choice
        
    Returns:
        Dict: Wedding suggestions
    """
    # Build tree if not already built
    if wedding_decision_tree.root is None:
        wedding_decision_tree.build_tree_from_database()
    
    # Make prediction
    return wedding_decision_tree.predict(wedding_type, bride_colour)


def rebuild_decision_tree():
    """
    Rebuild the decision tree from current database state.
    Call this when database rules are updated.
    """
    global wedding_decision_tree
    wedding_decision_tree = WeddingDecisionTree()
    wedding_decision_tree.build_tree_from_database()
    return wedding_decision_tree


def print_decision_tree():
    """Print the current decision tree structure."""
    if wedding_decision_tree.root is None:
        print("Decision tree not built yet!")
    else:
        print("[INFO] Decision Tree Structure:")
        wedding_decision_tree.print_tree()