import pytest
from decimal import Decimal

from routes.budget import _parse_amount, _parse_expense_date


def test_parse_amount_valid_values():
    assert _parse_amount("100", "planned_amount") == Decimal("100.00")
    assert _parse_amount(100, "planned_amount") == Decimal("100.00")
    assert _parse_amount("100.5", "planned_amount") == Decimal("100.50")
    assert _parse_amount(" 123.40 ", "actual_amount") == Decimal("123.40")
    assert _parse_amount("0", "actual_amount") == Decimal("0.00")


def test_parse_amount_invalid_non_numeric():
    with pytest.raises(ValueError):
        _parse_amount("abc", "planned_amount")
    with pytest.raises(ValueError):
        _parse_amount({}, "planned_amount")


def test_parse_amount_negative_rejected():
    with pytest.raises(ValueError):
        _parse_amount("-1", "planned_amount")


def test_parse_amount_required_field():
    with pytest.raises(ValueError):
        _parse_amount(None, "planned_amount")


def test_parse_expense_date_valid_and_none():
    assert str(_parse_expense_date("2025-06-15")) == "2025-06-15"
    assert _parse_expense_date(None) is None


def test_parse_expense_date_invalid_format():
    with pytest.raises(ValueError):
        _parse_expense_date("15-06-2025")
    with pytest.raises(ValueError):
        _parse_expense_date("2025/06/15")
    with pytest.raises(ValueError):
        _parse_expense_date("invalid")

