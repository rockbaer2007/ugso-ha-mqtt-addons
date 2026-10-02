"""Atomic shared favorites and trusted Ingress administrator checks."""
import json
import re
from threading import Lock

LOCK = Lock()
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def is_admin(peer, user_id, users):
    return peer == "172.30.32.2" and bool(user_id) and any(
        user.get("id") == user_id and user.get("is_active") and
        (user.get("is_owner") or "system-admin" in user.get("group_ids", []))
        for user in users
    )


def favorites(path, request=None):
    with LOCK:
        values = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        if request is None:
            return values
        action = request.get("action")
        incoming = request.get("colors", []) if action == "merge" else [request.get("hex")]
        if action not in ("add", "delete", "merge") or not isinstance(incoming, list) or len(incoming) > 15 or any(not isinstance(value, str) or not HEX.fullmatch(value) for value in incoming):
            raise ValueError("Ungültige Favoritenanfrage.")
        incoming = [value.lower() for value in incoming]
        if action == "delete":
            values = [value for value in values if value not in incoming]
        else:
            values = list(dict.fromkeys(values + incoming))[:15]
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(values), encoding="utf-8")
        temporary.replace(path)
        return values
