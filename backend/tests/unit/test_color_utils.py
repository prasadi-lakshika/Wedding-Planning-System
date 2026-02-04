import math
import pytest

from services.wedding_service import (
    hex_to_rgb,
    rgb_to_hex,
    split_color_components,
    calculate_euclidean_distance,
)


def test_hex_to_rgb_valid_upper_lower_cases():
    assert hex_to_rgb("#FF7F7F") == [255, 127, 127]
    assert hex_to_rgb("ff7f7f") == [255, 127, 127]
    assert hex_to_rgb("#000000") == [0, 0, 0]
    assert hex_to_rgb("#FFFFFF") == [255, 255, 255]


def test_hex_to_rgb_invalid_formats():
    with pytest.raises(ValueError):
        hex_to_rgb("#FFF")  # too short
    with pytest.raises(ValueError):
        hex_to_rgb("#ZZZZZZ")  # non-hex characters
    with pytest.raises(ValueError):
        hex_to_rgb("")  # empty


def test_rgb_to_hex_valid_strings():
    assert rgb_to_hex("255,127,127") == "#FF7F7F"
    assert rgb_to_hex("0,0,0") == "#000000"
    assert rgb_to_hex("255,255,255") == "#FFFFFF"


def test_rgb_to_hex_invalid_strings():
    assert rgb_to_hex("") is None
    assert rgb_to_hex("255,255") is None  # incomplete
    assert rgb_to_hex("a,b,c") is None  # non-integer


def test_split_color_components_basic_and_composites():
    assert split_color_components("Red") == ["Red"]
    assert split_color_components("Red and White") == ["Red", "White"]
    assert split_color_components("Gold/ Silver") == ["Gold", "Silver"]
    assert split_color_components("Blue & Green") == ["Blue", "Green"]
    assert split_color_components("Peach, Mint") == ["Peach", "Mint"]
    assert split_color_components("  ") == []


def test_calculate_euclidean_distance_valid_and_invalid():
    # Known distance between (0,0,0) and (255,255,255) = sqrt(3*255^2)
    expected = math.sqrt(3 * (255 ** 2))
    assert calculate_euclidean_distance("0,0,0", "255,255,255") == pytest.approx(expected)

    # Invalid inputs return infinity per implementation
    assert calculate_euclidean_distance("invalid", "255,255,255") == float("inf")
    assert calculate_euclidean_distance(None, "255,255,255") == float("inf")
    assert calculate_euclidean_distance("255,255,255", "1,2") == float("inf")

