"""Fixed HA light color commands for the Universal content control."""
import math
import re

def universal_color_command(request, entries):
    if not isinstance(request, dict) or set(request) != {"entity_id", "kind", "value"}:
        raise ValueError("Invalid color request")
    entity = request["entity_id"]
    if not isinstance(entity, str) or not re.fullmatch(r"light\.[a-z0-9_]{1,100}", entity):
        raise ValueError("A light entity is required")
    entry = next((entry for entry in entries if isinstance(entry, dict) and entry.get("entity_id") == entity), None)
    if not entry or entry.get("state") in ("unknown", "unavailable"):
        raise ValueError("Light is unavailable")
    attributes = entry.get("attributes") or {}
    if not isinstance(attributes, dict):
        raise ValueError("Invalid light attributes")
    value = request["value"]
    modes = attributes.get("supported_color_modes") or []
    if not isinstance(modes, list):
        raise ValueError("Invalid light capabilities")
    if request["kind"] == "rgb":
        if not isinstance(value, list) or len(value) != 3 or any(type(v) is not int or not 0 <= v <= 255 for v in value):
            raise ValueError("Invalid RGB color")
        if not any(mode in modes for mode in ("rgb", "rgbw", "rgbww", "hs", "xy")):
            raise ValueError("Light does not support color")
        data = {"rgb_color": value}
    elif request["kind"] == "kelvin":
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError("Invalid Kelvin value")
        if "color_temp" not in modes or not attributes.get("min_color_temp_kelvin", 2000) <= value <= attributes.get("max_color_temp_kelvin", 6500):
            raise ValueError("Light does not support this temperature")
        data = {"color_temp_kelvin": round(value)}
    else:
        raise ValueError("Invalid color kind")
    return {"type": "call_service", "domain": "light", "service": "turn_on", "target": {"entity_id": entity}, "service_data": data}
