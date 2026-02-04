from decimal import Decimal


def compute_totals(items):
    """
    Mirror the budget totals/variance rule used in the API:
    - planned = sum(planned_amount or 0)
    - actual  = sum(actual_amount or 0)
    - variance = planned - actual
    Cast to float for response formatting.
    """
    total_planned = sum((item.get("planned_amount") or 0) for item in items)
    total_actual = sum((item.get("actual_amount") or 0) for item in items)
    return {
        "planned": float(total_planned),
        "actual": float(total_actual),
        "variance": float(total_planned - total_actual),
    }


def test_budget_totals_basic():
    items = [
        {"planned_amount": Decimal("100.00"), "actual_amount": Decimal("80.00")},
        {"planned_amount": Decimal("50.00"), "actual_amount": Decimal("25.00")},
    ]
    totals = compute_totals(items)
    assert totals["planned"] == 150.0
    assert totals["actual"] == 105.0
    assert totals["variance"] == 45.0


def test_budget_totals_with_none_and_zero():
    items = [
        {"planned_amount": None, "actual_amount": Decimal("0.00")},
        {"planned_amount": Decimal("0.00"), "actual_amount": None},
    ]
    totals = compute_totals(items)
    assert totals["planned"] == 0.0
    assert totals["actual"] == 0.0
    assert totals["variance"] == 0.0


def test_budget_totals_rounding():
    items = [
        {"planned_amount": Decimal("33.335"), "actual_amount": Decimal("10.005")},
        {"planned_amount": Decimal("66.665"), "actual_amount": Decimal("39.995")},
    ]
    totals = compute_totals(items)
    # Sums without extra quantization (mirroring API float casting)
    assert totals["planned"] == 100.0
    assert totals["actual"] == 50.0
    assert totals["variance"] == 50.0

