"""Allowlisted label metadata, device readings and capability-checked light values."""
import json
import math
import re

READING_CLASSES = {"energy", "energy_storage", "voltage", "current", "power", "temperature", "humidity", "battery"}
COLOR_MODES = {"hs", "xy", "rgb", "rgbw", "rgbww"}


def finite(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)


def related_readings(roots, registry, states):
    devices = {entry.get("device_id") for entry in registry if entry.get("entity_id") in roots and entry.get("device_id")}
    result = set()
    for entry in registry:
        entity = entry.get("entity_id", "")
        if not isinstance(entity, str) or not re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity) or entry.get("disabled_by") or not entry.get("device_id") or entry["device_id"] not in devices:
            continue
        attrs = states.get(entity, {}).get("attributes", {})
        if not isinstance(attrs, dict):
            attrs = {}
        dc = attrs.get("device_class") or entry.get("device_class") or entry.get("original_device_class")
        domain = entity.split(".", 1)[0]
        if (domain == "sensor" and dc in READING_CLASSES) or (domain == "binary_sensor" and dc == "battery"):
            result.add(entity)
    return result


def metadata(entity, attrs):
    keys = {"friendly_name", "device_class", "unit_of_measurement", "state_class"}
    domain = entity.split(".", 1)[0]
    if domain in {"number", "input_number"}:
        keys |= {"min", "max", "step"}
    if domain in {"select", "input_select"}:
        keys.add("options")
    if domain in {"text", "input_text"}:
        keys |= {"min", "max", "mode"}
    if domain == "light":
        keys |= {"effect_list", "supported_color_modes", "min_color_temp_kelvin", "max_color_temp_kelvin"}
    return {key for key in keys if key in attrs and attrs[key] is not None}


def light_features(attrs):
    modes = attrs.get("supported_color_modes") or []
    modes = {mode for mode in modes if isinstance(mode, str)} if isinstance(modes, (list, tuple, set)) else set()
    result = set()
    if modes & (COLOR_MODES | {"brightness", "color_temp", "white"}):
        result.add("brightness")
    if modes & COLOR_MODES:
        result.add("rgb_color")
    if isinstance(attrs.get("effect_list"), list) and attrs["effect_list"]:
        result.add("effect")
    lo, hi = attrs.get("min_color_temp_kelvin"), attrs.get("max_color_temp_kelvin")
    if "color_temp" in modes and finite(lo) and finite(hi) and 0 < lo <= hi:
        result.add("color_temp_kelvin")
    return result


def light_value(feature, entry):
    attrs = entry.get("attributes", {})
    if feature == "brightness":
        if entry.get("state") == "off":
            return 0
        value = attrs.get("brightness")
        return round(value * 100 / 255, 2) if finite(value) and 0 <= value <= 255 else "unavailable"
    value = attrs.get(feature)
    return value if value is not None else "unavailable"


def light_command(feature, payload, attrs):
    if feature not in light_features(attrs):
        raise ValueError("Light-Funktion nicht unterstützt")
    if feature == "effect":
        if payload not in attrs.get("effect_list", []):
            raise ValueError("Unbekannter Light-Effekt")
        return ("turn_on", {"effect": payload})
    try:
        value = json.loads(payload)
    except (ValueError, TypeError):
        raise ValueError("Ungültiger Light-Wert") from None
    if feature == "rgb_color":
        if not isinstance(value, list) or len(value) != 3 or any(not finite(v) or int(v) != v or not 0 <= v <= 255 for v in value):
            raise ValueError("RGB benötigt drei Ganzzahlen von 0 bis 255")
        return ("turn_on", {"rgb_color": [int(v) for v in value]})
    if not finite(value):
        raise ValueError("Endlicher Zahlenwert erwartet")
    if feature == "brightness":
        if not 0 <= value <= 100:
            raise ValueError("Helligkeit muss zwischen 0 und 100 liegen")
        return ("turn_on", {"brightness_pct": value})
    if int(value) != value or not attrs["min_color_temp_kelvin"] <= value <= attrs["max_color_temp_kelvin"]:
        raise ValueError("Farbtemperatur außerhalb der Light-Grenzen")
    return ("turn_on", {"color_temp_kelvin": int(value)})
