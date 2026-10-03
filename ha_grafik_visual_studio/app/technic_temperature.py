"""Fixed thermostat actions and bounded, read-only HA Recorder history."""
import math
import re
from datetime import datetime, timedelta, timezone

ENTITY = re.compile(r"^[a-z][a-z0-9_]*\.[a-z0-9_]+$")
ROLES = ("target_entity", "actual_entity", "actuator_entity")
def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def temperature_request(request):
    if not isinstance(request, dict) or set(request) != {"entity_id", "value", "min", "max", "step"}:
        raise ValueError("Ungültige Temperatur-Anfrage.")
    if not isinstance(request["entity_id"], str) or not re.fullmatch(r"(climate|input_number)\.[a-z0-9_]+", request["entity_id"]):
        raise ValueError("Sollwert benötigt climate oder input_number.")
    if not all(finite(request[key]) for key in ("value", "min", "max", "step")) or not -100 <= request["min"] < request["max"] <= 200 or not 0 < request["step"] <= request["max"] - request["min"]:
        raise ValueError("Ungültiger Temperaturbereich.")
    return request

def temperature_command(request, entries):
    request = temperature_request(request)
    entry = next((item for item in entries if isinstance(item, dict) and item.get("entity_id") == request["entity_id"]), {})
    attrs = entry.get("attributes") or {}
    climate = request["entity_id"].startswith("climate.")
    if entry.get("state") in (None, "unknown", "unavailable") or not isinstance(attrs, dict):
        raise ValueError("Sollwert ist nicht verfügbar.")
    if climate:
        features = attrs.get("supported_features")
        if not isinstance(features, int) or isinstance(features, bool) or not features & 1 or not finite(attrs.get("temperature")):
            raise ValueError("Thermostat unterstützt keinen einzelnen Sollwert.")
    else:
        if isinstance(entry.get("state"), bool): raise ValueError("Sollwert ist unbekannt.")
        try: current = float(entry.get("state"))
        except (ValueError, TypeError): raise ValueError("Sollwert ist unbekannt.") from None
        if not math.isfinite(current): raise ValueError("Sollwert ist unbekannt.")
    minimum, maximum = attrs.get("min_temp" if climate else "min"), attrs.get("max_temp" if climate else "max")
    step = attrs.get("target_temp_step" if climate else "step", 0.5 if climate else None)
    if not all(finite(value) for value in (minimum, maximum, step)) or minimum >= maximum or step <= 0:
        raise ValueError("HA-Grenzen oder Schrittweite fehlen.")
    value = request["value"]
    if not max(minimum, request["min"]) <= value <= min(maximum, request["max"]):
        raise ValueError("Temperatur liegt außerhalb der Grenzen.")
    for base, increment in [(minimum, step), (request["min"], request["step"])]:
        position = (value - base) / increment
        if not math.isclose(position, round(position), abs_tol=1e-7):
            raise ValueError("Temperatur passt nicht zur Schrittweite.")
    return {"type": "call_service", "domain": "climate" if climate else "input_number", "service": "set_temperature" if climate else "set_value", "target": {"entity_id": request["entity_id"]}, "service_data": {"temperature" if climate else "value": value}}

def history_plan(request, now=None):
    if not isinstance(request, dict) or set(request) != {*ROLES, "range"} or request["range"] not in ("24h", "7d"):
        raise ValueError("Ungültige Verlauf-Anfrage.")
    ids = []
    for role in ROLES:
        value = request[role]
        if not isinstance(value, str) or value and not ENTITY.fullmatch(value): raise ValueError("Ungültige Verlauf-Entität.")
        if value and value not in ids: ids.append(value)
    if not ids: raise ValueError("Keine Verlauf-Entität ausgewählt.")
    end = now or datetime.now(timezone.utc)
    start = end - timedelta(days=7 if request["range"] == "7d" else 1)
    return {"type": "history/history_during_period", "start_time": start.isoformat(), "end_time": end.isoformat(), "entity_ids": ids, "include_start_time_state": True, "significant_changes_only": False, "minimal_response": False, "no_attributes": False}, start.timestamp() * 1000, end.timestamp() * 1000

def history_series(request, raw, start, end):
    if not isinstance(raw, dict): raise ValueError("Ungültige HA-Verlaufantwort.")
    result = {"start": start, "end": end, "series": {}}
    for role in ROLES:
        entity = request[role]; points = []
        entries = raw.get(entity, [])
        if not isinstance(entries, list): raise ValueError("Ungültige HA-Verlaufantwort.")
        for item in entries:
            if not isinstance(item, dict): continue
            timestamp = item.get("lu", item.get("last_updated", item.get("last_changed")))
            try:
                t = timestamp * 1000 if finite(timestamp) else datetime.fromisoformat(timestamp.replace("Z", "+00:00")).timestamp() * 1000
            except (AttributeError, ValueError, TypeError, OverflowError): continue
            if t > end: continue
            state = item.get("s", item.get("state")); attrs = item.get("a", item.get("attributes", {})) or {}
            value = state
            if entity.startswith("climate."):
                value = attrs.get({"target_entity": "temperature", "actual_entity": "current_temperature", "actuator_entity": "hvac_action"}[role]) if isinstance(attrs, dict) and state not in (None, "unknown", "unavailable") else None
            if role == "actuator_entity" and value in ("on", "off", "heating", "cooling", "idle", "true", "false"):
                value = 100 if value in ("on", "heating", "cooling", "true") else 0
            elif isinstance(value, bool): value = 100 if role == "actuator_entity" and value else 0 if role == "actuator_entity" else None
            try: value = float(value)
            except (TypeError, ValueError): value = None
            if value is not None and (not math.isfinite(value) or role == "actuator_entity" and not 0 <= value <= 100): value = None
            points.append({"t": t, "value": value})
        points.sort(key=lambda point: point["t"])
        previous = [point for point in points if point["t"] < start]
        points = ([{**previous[-1], "t": start}] if previous else []) + [point for point in points if point["t"] >= start]
        if len(points) > 720:
            # A short unknown interval must remain a chart gap after sampling.
            sampled = [points[0]]
            for i in range(1, 719):
                bucket = points[1 + (i - 1) * (len(points) - 2) // 718:1 + i * (len(points) - 2) // 718]
                sampled.append(next((point for point in bucket if point["value"] is None), bucket[-1]))
            points = sampled + [points[-1]]
        result["series"][role] = points
    return result
