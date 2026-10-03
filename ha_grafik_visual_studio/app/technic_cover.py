"""Fixed Home Assistant cover position command for the Technic window widget."""
import math
import re

def cover_entry_writable(entry):
    if not isinstance(entry, dict) or entry.get("state") not in {"open", "closed", "opening", "closing"} or not isinstance(entry.get("attributes"), dict):
        return False
    flags = entry["attributes"].get("supported_features")
    return isinstance(flags, int) and not isinstance(flags, bool) and flags >= 0 and bool(flags & 4)


def cover_position_command(request):
    if not isinstance(request, dict) or set(request) != {"entity_id", "position"}:
        raise ValueError("Ungültiger Rollobefehl.")
    entity, position = request["entity_id"], request["position"]
    if not isinstance(entity, str) or not re.fullmatch(r"cover\.[a-z0-9_]{1,100}", entity):
        raise ValueError("Eine einzelne cover-Entität ist erforderlich.")
    if isinstance(position, bool) or not isinstance(position, (int, float)) or not math.isfinite(position) or not 0 <= position <= 100:
        raise ValueError("Rolloposition muss zwischen 0 und 100 liegen.")
    return {"type": "call_service", "domain": "cover", "service": "set_cover_position", "target": {"entity_id": entity}, "service_data": {"position": position}}
