"""
Budget Item model.

Represents a single planned/actual expense entry linked to a project.
"""

from datetime import datetime

from extensions import db


class BudgetItem(db.Model):
    __tablename__ = 'budget_items'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)

    category = db.Column(db.String(100), nullable=False)
    planned_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    actual_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    expense_date = db.Column(db.Date, nullable=True)
    vendor = db.Column(db.String(150), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    project = db.relationship('Project', backref=db.backref('budget_items', lazy='dynamic'))
    creator = db.relationship('User', backref=db.backref('budget_items', lazy='dynamic'))

    def to_dict(self):
        """Serialize model to dictionary for JSON responses."""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'category': self.category,
            'planned_amount': float(self.planned_amount) if self.planned_amount is not None else 0.0,
            'actual_amount': float(self.actual_amount) if self.actual_amount is not None else 0.0,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'vendor': self.vendor,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<BudgetItem {self.id} for Project {self.project_id}>'

