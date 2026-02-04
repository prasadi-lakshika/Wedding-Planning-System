import pytest

import services.wedding_service as ws


def test_process_hex_color_restricted_black(monkeypatch):
    # Simulate that 'black' is restricted for this wedding type
    monkeypatch.setattr(ws, "is_color_restricted_for_wedding_type", lambda wt, c: c.lower() == "black")
    # Default color configured for the wedding type
    monkeypatch.setattr(ws, "get_default_color_for_wedding_type", lambda wt: "cream")
    # Fallback finder (should not be used when default exists in this path)
    monkeypatch.setattr(ws, "find_closest_cultural_color_by_rgb", lambda rgb, wt: "red")

    mapped, message = ws.process_hex_color("#000000", "Tamil Hindu Wedding")

    assert mapped == "cream"
    assert isinstance(message, str) and "restricted" in message.lower()


def test_process_hex_color_non_restricted_maps(monkeypatch):
    # No restriction
    monkeypatch.setattr(ws, "is_color_restricted_for_wedding_type", lambda wt, c: False)
    # Map arbitrary hex to a cultural color via finder
    monkeypatch.setattr(ws, "find_closest_cultural_color_by_rgb", lambda rgb, wt: "red")

    mapped, message = ws.process_hex_color("#FF7F7F", "Tamil Hindu Wedding")

    assert mapped == "red"
    assert message is None


def test_validate_and_map_bride_color_restricted_name(monkeypatch):
    # If the provided color name is restricted, the function should return default (if present)
    monkeypatch.setattr(ws, "is_color_restricted_for_wedding_type", lambda wt, c: True)
    monkeypatch.setattr(ws, "get_default_color_for_wedding_type", lambda wt: "cream")
    # Fallback closest (should not be needed since default is provided)
    monkeypatch.setattr(ws, "find_closest_valid_color", lambda color, wt: "gold")

    mapped, message = ws.validate_and_map_bride_color("Tamil Hindu Wedding", "black")

    assert mapped == "cream"
    assert isinstance(message, str) and "restricted" in message.lower()


def test_build_color_swatches_for_composite(monkeypatch):
    # Simulate RGB lookups for component colors
    def fake_get_rgb(name, _allow_composite=True):
        table = {
            "red": "255,0,0",
            "white": "255,255,255",
        }
        return table.get(name.strip().lower())

    monkeypatch.setattr(ws, "get_rgb_for_color_name", fake_get_rgb)

    swatches = ws.build_color_swatches("Red and White")

    # Expect two swatches, in order
    assert isinstance(swatches, list) and len(swatches) == 2
    assert swatches[0]["name"].lower() == "red" and swatches[0]["rgb"] == "255,0,0"
    assert swatches[1]["name"].lower() == "white" and swatches[1]["rgb"] == "255,255,255"

