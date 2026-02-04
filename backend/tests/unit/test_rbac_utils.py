import types

from routes.budget import _user_can_access_project


class FakeProject:
    def __init__(self, created_by=None, assigned_to=None):
        self.created_by = created_by
        self.assigned_to = assigned_to


def make_user(user_id, role):
    """Create a lightweight fake current_user with role helpers."""
    user = types.SimpleNamespace()
    user.id = user_id
    user.role = role
    user.is_admin = lambda: role == "admin"
    user.is_coordinator = lambda: role == "coordinator"
    user.is_planner = lambda: role == "planner"
    return user


def test_user_can_access_project_admin(monkeypatch):
    admin = make_user(1, "admin")
    monkeypatch.setattr("routes.budget.current_user", admin, raising=False)

    proj = FakeProject(created_by=999, assigned_to=888)
    assert _user_can_access_project(proj) is True


def test_user_can_access_project_coordinator_assigned(monkeypatch):
    coord = make_user(10, "coordinator")
    monkeypatch.setattr("routes.budget.current_user", coord, raising=False)

    # Coordinator can access only when assigned_to matches their id
    assert _user_can_access_project(FakeProject(created_by=1, assigned_to=10)) is True
    assert _user_can_access_project(FakeProject(created_by=10, assigned_to=99)) is False


def test_user_can_access_project_planner_created_or_assigned(monkeypatch):
    planner = make_user(7, "planner")
    monkeypatch.setattr("routes.budget.current_user", planner, raising=False)

    # Planner can access if they created the project or are assigned to it
    assert _user_can_access_project(FakeProject(created_by=7, assigned_to=99)) is True
    assert _user_can_access_project(FakeProject(created_by=1, assigned_to=7)) is True
    assert _user_can_access_project(FakeProject(created_by=1, assigned_to=2)) is False


def test_user_can_access_project_none_project(monkeypatch):
    user = make_user(3, "planner")
    monkeypatch.setattr("routes.budget.current_user", user, raising=False)

    assert _user_can_access_project(None) is False
