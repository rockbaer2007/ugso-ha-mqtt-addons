"""Explicit capability-checked HA climate commands; preserve the legacy temperature API."""
import math
import re

CHOICES = {
    "hvac": (0, "hvac_modes", "set_hvac_mode", "hvac_mode"),
    "preset": (16, "preset_modes", "set_preset_mode", "preset_mode"),
    "fan": (8, "fan_modes", "set_fan_mode", "fan_mode"),
    "swing": (32, "swing_modes", "set_swing_mode", "swing_mode"),
    "swing_horizontal": (512, "swing_horizontal_modes", "set_swing_horizontal_mode", "swing_horizontal_mode"),
}
def finite(value):
    return type(value) in (int, float) and math.isfinite(value)

def climate_command(request, entries):
    if not isinstance(request, dict) or set(request) != {"entity_id", "action", "value"}:
        raise ValueError("Invalid climate request")
    entity, action, value = request["entity_id"], request["action"], request["value"]
    if not isinstance(entity, str) or not re.fullmatch(r"climate\.[a-z0-9_]{1,100}", entity) or not isinstance(action, str):
        raise ValueError("A climate entity is required")
    entry = next((item for item in entries if isinstance(item, dict) and item.get("entity_id") == entity), None)
    if not entry or entry.get("state") in (None, "unknown", "unavailable"):
        raise ValueError("Climate entity is unavailable")
    attrs = entry.get("attributes")
    if not isinstance(attrs, dict):
        raise ValueError("Climate capabilities are missing")
    flags = attrs.get("supported_features", 0)
    if type(flags) is not int or flags < 0:
        raise ValueError("Invalid climate capabilities")
    data = {}
    if action in CHOICES:
        bit, choices, service, key = CHOICES[action]
        options = attrs.get(choices)
        if (bit and not flags & bit) or not isinstance(options, list) or not isinstance(value, str) or value not in options or len(value) > 100:
            raise ValueError("Climate choice is unavailable")
        data[key] = value
    elif action == "power":
        if type(value) is not bool or not flags & (256 if value else 128):
            raise ValueError("Climate power action is unavailable")
        service = "turn_on" if value else "turn_off"
    elif action == "range":
        if not flags & 2 or not isinstance(value, dict) or set(value) != {"low", "high"}:
            raise ValueError("Temperature range is unavailable")
        low, high = value["low"], value["high"]
        minimum, maximum, step = attrs.get("min_temp"), attrs.get("max_temp"), attrs.get("target_temp_step", 0.5)
        if not all(finite(v) for v in (low, high, minimum, maximum, step)) or not minimum <= low < high <= maximum or step <= 0:
            raise ValueError("Invalid temperature range")
        if any(not math.isclose((v - minimum) / step, round((v - minimum) / step), abs_tol=1e-7) for v in (low, high)):
            raise ValueError("Temperature does not match the entity step")
        service, data = "set_temperature", {"target_temp_low": low, "target_temp_high": high}
    elif action == "humidity":
        minimum, maximum, step = attrs.get("min_humidity", 30), attrs.get("max_humidity", 99), attrs.get("target_humidity_step", 1)
        if not flags & 4 or not all(finite(v) for v in (value, minimum, maximum, step)) or not 0 <= minimum <= value <= maximum <= 100 or step <= 0:
            raise ValueError("Invalid target humidity")
        if not math.isclose((value - minimum) / step, round((value - minimum) / step), abs_tol=1e-7):
            raise ValueError("Humidity does not match the entity step")
        service, data = "set_humidity", {"humidity": value}
    else:
        raise ValueError("Climate action is unavailable")
    return {"type": "call_service", "domain": "climate", "service": service, "target": {"entity_id": entity}, "service_data": data}
