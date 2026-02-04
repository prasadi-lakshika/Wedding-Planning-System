from datetime import datetime, date
from decimal import Decimal

from models.user import User
from models.project import Project
from models.checklist_task import ChecklistTask
from models.budget_item import BudgetItem


def test_user_to_dict_shape_and_values():
    u = User(
        id=1,
        email="admin@wedding.com",
        username="admin",
        name="Admin User",
        phone_number="0712345678",
        address="123 Street",
        role="admin",
    )
    u.created_at = datetime(2025, 1, 1, 10, 0, 0)
    u.updated_at = datetime(2025, 1, 2, 12, 30, 0)

    d = u.to_dict()
    assert d["id"] == 1
    assert d["email"] == "admin@wedding.com"
    assert d["username"] == "admin"
    assert d["name"] == "Admin User"
    assert d["phone_number"] == "0712345678"
    assert d["address"] == "123 Street"
    assert d["role"] == "admin"
    assert d["created_at"].startswith("2025-01-01T10:00:00")
    assert d["updated_at"].startswith("2025-01-02T12:30:00")
    assert "password" not in d


def test_project_to_dict_shape_and_values():
    p = Project(
        id=5,
        company_id=2,
        bride_name="Jane",
        groom_name="John",
        contact_number="0770000000",
        contact_email="jane@example.com",
        wedding_date=date(2025, 6, 15),
        wedding_type="Kandyan Sinhala Wedding",
        bride_color="red",
        status="planning",
        budget=50000.0,
        notes="Test notes",
        created_by=1,
        assigned_to=2,
    )
    p.created_at = datetime(2025, 1, 1, 9, 0, 0)
    p.updated_at = datetime(2025, 1, 2, 9, 0, 0)

    d = p.to_dict()
    assert d["id"] == 5
    assert d["company_id"] == 2
    assert d["bride_name"] == "Jane"
    assert d["groom_name"] == "John"
    assert d["contact_number"] == "0770000000"
    assert d["contact_email"] == "jane@example.com"
    assert d["wedding_date"] == "2025-06-15"
    assert d["wedding_type"] == "Kandyan Sinhala Wedding"
    assert d["bride_color"] == "red"
    assert d["status"] == "planning"
    assert d["budget"] == 50000.0
    assert d["notes"] == "Test notes"
    assert d["created_by"] == 1
    assert d["assigned_to"] == 2
    assert d["created_at"].startswith("2025-01-01T09:00:00")
    assert d["updated_at"].startswith("2025-01-02T09:00:00")


def test_checklist_task_to_dict_defaults_and_dates():
    t = ChecklistTask(
        id=9,
        project_id=5,
        title="Book venue",
        description="Find a venue",
        status="in_progress",
        due_date=date(2025, 5, 1),
        assigned_to=2,
        created_by=1,
    )
    t.created_at = datetime(2025, 1, 3, 8, 0, 0)
    t.updated_at = datetime(2025, 1, 4, 18, 45, 0)

    d = t.to_dict()
    assert d["id"] == 9
    assert d["project_id"] == 5
    assert d["title"] == "Book venue"
    assert d["description"] == "Find a venue"
    assert d["status"] == "in_progress"
    assert d["due_date"] == "2025-05-01"
    assert d["assigned_to"] == 2
    assert d["assigned_to_name"] is None  # relationship not loaded
    assert d["assigned_to_email"] is None
    assert d["created_by"] == 1
    assert d["created_at"].startswith("2025-01-03T08:00:00")
    assert d["updated_at"].startswith("2025-01-04T18:45:00")


def test_budget_item_to_dict_casts_amounts_and_dates():
    b = BudgetItem(
        id=11,
        project_id=5,
        category="Venue",
        planned_amount=Decimal("1234.50"),
        actual_amount=Decimal("1200.00"),
        vendor="ABC Events",
        notes="Advance paid",
        created_by=1,
    )
    b.expense_date = date(2025, 4, 20)
    b.created_at = datetime(2025, 1, 5, 14, 0, 0)
    b.updated_at = datetime(2025, 1, 6, 16, 30, 0)

    d = b.to_dict()
    assert d["id"] == 11
    assert d["project_id"] == 5
    assert d["category"] == "Venue"
    assert d["planned_amount"] == 1234.5
    assert d["actual_amount"] == 1200.0
    assert d["expense_date"] == "2025-04-20"
    assert d["vendor"] == "ABC Events"
    assert d["notes"] == "Advance paid"
    assert d["created_by"] == 1
    assert d["created_at"].startswith("2025-01-05T14:00:00")
    assert d["updated_at"].startswith("2025-01-06T16:30:00")

