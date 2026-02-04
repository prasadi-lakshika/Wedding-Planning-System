"""
Checklist Task model for Wedding Planning System.

Stores per-project checklist items that can be assigned to planners and
tracked through their lifecycle.
"""

from datetime import datetime, date

from extensions import db


class ChecklistTask(db.Model):
    """Represents a single task within a project's checklist."""

    __tablename__ = "checklist_tasks"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(
        db.Enum("pending", "in_progress", "completed", name="task_status"),
        nullable=False,
        default="pending",
    )
    due_date = db.Column(db.Date, nullable=True)
    assigned_to = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, index=True
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    project = db.relationship(
        "Project", backref=db.backref("checklist_tasks", lazy="dynamic")
    )
    assignee = db.relationship(
        "User",
        foreign_keys=[assigned_to],
        backref=db.backref("assigned_tasks", lazy="dynamic"),
    )
    creator = db.relationship(
        "User",
        foreign_keys=[created_by],
        backref=db.backref("created_tasks", lazy="dynamic"),
    )

    def to_dict(self):
        """Serialize task for API responses."""
        try:
            # Safely access assignee relationship
            assignee_name = None
            assignee_email = None
            if self.assigned_to:
                try:
                    if self.assignee:
                        assignee_name = self.assignee.name if hasattr(self.assignee, 'name') else None
                        assignee_email = self.assignee.email if hasattr(self.assignee, 'email') else None
                except Exception:
                    # Relationship might not be loaded or user doesn't exist
                    pass
            
            # Safely format dates
            due_date_str = None
            if self.due_date:
                if isinstance(self.due_date, date):
                    due_date_str = self.due_date.isoformat()
                elif hasattr(self.due_date, 'isoformat'):
                    due_date_str = self.due_date.isoformat()
            
            created_at_str = None
            if self.created_at:
                if hasattr(self.created_at, 'isoformat'):
                    created_at_str = self.created_at.isoformat()
            
            updated_at_str = None
            if self.updated_at:
                if hasattr(self.updated_at, 'isoformat'):
                    updated_at_str = self.updated_at.isoformat()
            
            return {
                "id": self.id,
                "project_id": self.project_id,
                "title": self.title or "",
                "description": self.description or None,
                "status": self.status or "pending",
                "due_date": due_date_str,
                "assigned_to": self.assigned_to,
                "assigned_to_name": assignee_name,
                "assigned_to_email": assignee_email,
                "created_by": self.created_by,
                "created_at": created_at_str,
                "updated_at": updated_at_str,
            }
        except Exception as e:
            # Fallback serialization if something goes wrong
            return {
                "id": self.id,
                "project_id": getattr(self, 'project_id', None),
                "title": getattr(self, 'title', ''),
                "description": getattr(self, 'description', None),
                "status": getattr(self, 'status', 'pending'),
                "due_date": None,
                "assigned_to": getattr(self, 'assigned_to', None),
                "assigned_to_name": None,
                "assigned_to_email": None,
                "created_by": getattr(self, 'created_by', None),
                "created_at": None,
                "updated_at": None,
            }

    def __repr__(self):
        return f"<ChecklistTask {self.id} Project {self.project_id} - {self.title}>"

