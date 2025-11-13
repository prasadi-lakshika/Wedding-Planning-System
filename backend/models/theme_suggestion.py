"""
Theme Suggestion Model for Wedding Planning System.

Stores generated theme details per project with discrete columns.
"""

from datetime import datetime

from extensions import db


class ThemeSuggestion(db.Model):
    __tablename__ = 'theme_suggestions'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)

    wedding_type = db.Column(db.String(100), nullable=False)
    bride_colour = db.Column(db.String(50), nullable=False)
    groom_colour = db.Column(db.String(100), nullable=True)
    bridesmaids_colour = db.Column(db.String(100), nullable=True)
    best_men_colour = db.Column(db.String(100), nullable=True)
    flower_deco_colour = db.Column(db.String(100), nullable=True)
    hall_decor_colour = db.Column(db.String(100), nullable=True)
    food_menu = db.Column(db.Text, nullable=True)
    drinks = db.Column(db.Text, nullable=True)
    pre_shoot_locations = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    project = db.relationship('Project', backref=db.backref('theme_suggestions', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'wedding_type': self.wedding_type,
            'bride_colour': self.bride_colour,
            'groom_colour': self.groom_colour,
            'bridesmaids_colour': self.bridesmaids_colour,
            'best_men_colour': self.best_men_colour,
            'flower_deco_colour': self.flower_deco_colour,
            'hall_decor_colour': self.hall_decor_colour,
            'food_menu': self.food_menu,
            'drinks': self.drinks,
            'pre_shoot_locations': self.pre_shoot_locations,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

