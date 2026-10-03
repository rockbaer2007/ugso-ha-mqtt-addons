"""Build a fixed, fully validated command plan for the Technic light dimmer."""
import math
import re

COLOR_MODES = {"brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"}

def finite(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)

def light_request(request):
    if not isinstance(request, dict) or set(request) != {"power_entity", "brightness_entity", "linked", "action", "value"}:
        raise ValueError("Ungültiger Lichtbefehl.")
    for key in ("power_entity", "brightness_entity"):
        if not isinstance(request[key], str) or (request[key] and not re.fullmatch(r"[a-z][a-z0-9_]*\.[a-z0-9_]{1,100}", request[key])):
            raise ValueError("Eine einzelne HA-Entität ist erforderlich.")
    if type(request["linked"]) is not bool or request["action"] not in ("power", "brightness"):
        raise ValueError("Ungültige Lichtaktion.")
    value = request["value"]
    if request["action"] == "power":
        if type(value) is not bool:
            raise ValueError("EIN/AUS benötigt einen Boolean-Wert.")
    elif not finite(value) or not 0 <= value <= 100:
        raise ValueError("Helligkeit muss zwischen 0 und 100 liegen.")
    return request

def dimmer_commands(request, entries):
    request = light_request(request)
    states = {entry.get("entity_id"): entry for entry in entries if isinstance(entry, dict)}
    commands = []
    def command(entity, service, data):
        return {"type": "call_service", "domain": entity.split(".")[0], "service": service, "target": {"entity_id": entity}, "service_data": data}
    def power(value):
        entity = request["power_entity"]
        entry = states.get(entity, {})
        if not re.fullmatch(r"(?:light|switch|input_boolean)\.[a-z0-9_]+", entity) or entry.get("state") not in ("on", "off"):
            raise ValueError("EIN/AUS-Entität ist nicht schaltbar oder nicht verfügbar.")
        commands.append(command(entity, "turn_on" if value else "turn_off", {}))
    def brightness(value):
        entity = request["brightness_entity"]
        entry = states.get(entity, {}); attrs = entry.get("attributes", {})
        if not isinstance(attrs, dict):
            raise ValueError("Helligkeitsattribute fehlen.")
        if re.fullmatch(r"light\.[a-z0-9_]+", entity):
            modes = attrs.get("supported_color_modes")
            if entry.get("state") not in ("on", "off") or not isinstance(modes, list) or not any(mode in COLOR_MODES for mode in modes if isinstance(mode, str)):
                raise ValueError("Licht ist nicht verfügbar oder nicht dimmbar.")
            commands.append(command(entity, "turn_off" if value == 0 else "turn_on", {} if value == 0 else {"brightness_pct": value}))
        elif re.fullmatch(r"input_number\.[a-z0-9_]+", entity):
            raw = entry.get("state")
            try: current = float(raw) if not isinstance(raw, bool) and raw not in (None, "") else math.nan
            except (ValueError, TypeError): current = math.nan
            minimum, maximum, step = (attrs.get(key) for key in ("min", "max", "step"))
            if not math.isfinite(current) or not 0 <= current <= 100 or not all(finite(v) for v in (minimum, maximum, step)) or minimum > 0 or maximum < 100 or not 0 < step <= 1:
                raise ValueError("Zahlenhelfer muss verfügbar sein und 0–100 mit Schrittweite höchstens 1 unterstützen.")
            commands.append(command(entity, "set_value", {"value": value}))
        else:
            raise ValueError("Helligkeit benötigt light oder input_number.")
    if request["action"] == "power":
        power(request["value"])
        if request["linked"]: brightness(100 if request["value"] else 0)
    else:
        brightness(request["value"])
        if request["linked"]: power(request["value"] > 0)
    # One light bound to both fields receives exactly one combined action.
    if request["linked"] and request["power_entity"] == request["brightness_entity"]:
        commands = [next(item for item in commands if item["service_data"] or item["service"] == "turn_off")]
    return commands
