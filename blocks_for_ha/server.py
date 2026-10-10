"""Read-only Home Assistant entity bridge. Credentials stay in this process."""
import json
import os
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

MAX_BYTES = 20_000_000
ENTITY_ID = re.compile(r"^[a-z][a-z0-9_]*\.[a-z0-9_]+$")


class APIError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def connection(environ):
    token = environ.get("SUPERVISOR_TOKEN")
    if token:
        return "http://supervisor/core/api/states", token
    base, token = environ.get("BLOCKS_HA_URL", ""), environ.get("BLOCKS_HA_TOKEN", "")
    if not base or not token:
        raise APIError(503, "Keine HA-Verbindung eingerichtet. Entitäts-ID manuell eingeben.")
    try:
        parts = urlsplit(base)
        parts.port
    except ValueError:
        raise APIError(503, "HA-Serveradresse ist ungültig.") from None
    if parts.scheme not in ("http", "https") or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment or parts.path not in ("", "/"):
        raise APIError(503, "HA-Serveradresse ist ungültig. Basisadresse ohne API-Pfad verwenden.")
    return base.rstrip("/") + "/api/states", token


def entity_catalog(states):
    if not isinstance(states, list):
        raise APIError(502, "HA hat keine gültige Entitätsliste geliefert.")
    entities = {}
    for row in states:
        if not isinstance(row, dict) or not isinstance(row.get("entity_id"), str) or not ENTITY_ID.fullmatch(row["entity_id"]):
            continue
        entity = row["entity_id"]
        attrs = row.get("attributes")
        attrs = attrs if isinstance(attrs, dict) else {}
        def text(value, fallback=""):
            return value[:256] if isinstance(value, str) else fallback
        entities[entity] = {"entity_id": entity, "name": text(attrs.get("friendly_name"), entity), "domain": entity.split(".")[0], "state": text(row.get("state")), "unit": text(attrs.get("unit_of_measurement"))}
    return sorted(entities.values(), key=lambda row: (row["name"].casefold(), row["entity_id"]))


def load_entities(environ=None):
    return entity_catalog(load_rest("states", environ))


def callmebot_profiles(states):
    if not isinstance(states, list):
        raise APIError(502, "CallMeBot-Katalog nicht verfügbar.")
    for row in states:
        if not isinstance(row, dict) or not str(row.get("entity_id", "")).startswith("sensor."):
            continue
        attrs = row.get("attributes")
        if not isinstance(attrs, dict) or attrs.get("source") != "ugso_callmebot":
            continue
        if row.get("state") in ("unknown", "unavailable"):
            raise APIError(503, "CallMeBot ist nicht verbunden. Profil-ID manuell eingeben.")
        profiles, seen = [], set()
        rows = attrs.get("profiles", [])
        if not isinstance(rows, list) or len(rows) > 16:
            raise APIError(502, "CallMeBot-Katalog nicht verfügbar.")
        for item in rows:
            if not isinstance(item, dict):
                continue
            pid, name = item.get("id"), item.get("name")
            if isinstance(pid, str) and re.fullmatch(r"[a-z][a-z0-9_]{0,39}", pid) and isinstance(name, str) and pid not in seen:
                profiles.append({"id": pid, "name": name[:80]})
                seen.add(pid)
        default = attrs.get("default_profile", "")
        return {"profiles": sorted(profiles, key=lambda p: (p["name"].casefold(), p["id"])), "default_profile": default if isinstance(default, str) and default in seen else ""}
    raise APIError(503, "CallMeBot-App aktualisieren, starten und MQTT-Discovery aktivieren. Profil-ID manuell eingeben.")


def load_rest(endpoint, environ=None):
    if endpoint not in ("states", "services"):
        raise APIError(404, "Unbekannter HA-Katalog.")
    url, token = connection(os.environ if environ is None else environ)
    url = url.removesuffix("states") + endpoint
    request = Request(url, headers={"Authorization": "Bearer " + token, "Accept": "application/json"}, method="GET")
    try:
        # Fixed server-side endpoint; never forward credentials through a redirect.
        with build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=8) as response:
            raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise APIError(502, "HA-Entitätsliste ist zu groß.")
        return json.loads(raw)
    except HTTPError as error:
        message = "HA-Zugriff abgelehnt. Server-Zugangsdaten prüfen." if error.code in (401, 403) else "HA-Entitätsabfrage fehlgeschlagen."
        raise APIError(502, message) from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise APIError(502, "HA ist nicht erreichbar oder hat ungültige Daten geliefert.") from None


def action_catalog(groups):
    if not isinstance(groups, list):
        raise APIError(502, "HA hat keine gültige Aktionsliste geliefert.")
    actions = {}
    for group in groups:
        if not isinstance(group, dict) or not isinstance(group.get("domain"), str) or not re.fullmatch(r"[a-z][a-z0-9_]*", group["domain"]):
            continue
        services = group.get("services", {})
        if isinstance(services, list):
            services = {name: {} for name in services if isinstance(name, str)}
        if not isinstance(services, dict):
            continue
        for name, definition in services.items():
            action = group["domain"] + "." + name if isinstance(name, str) else ""
            if not ENTITY_ID.fullmatch(action):
                continue
            definition = definition if isinstance(definition, dict) else {}
            selectors = definition.get("target", {})
            selectors = selectors.get("entity", []) if isinstance(selectors, dict) else []
            selectors = selectors if isinstance(selectors, list) else [selectors]
            domains = set()
            for selector in selectors:
                if isinstance(selector, dict):
                    values = selector.get("domain", [])
                    values = [values] if isinstance(values, str) else values
                    if isinstance(values, list):
                        domains.update(value for value in values if isinstance(value, str) and re.fullmatch(r"[a-z][a-z0-9_]*", value))
            title = definition.get("name")
            actions[action] = {"id": action, "name": title[:256] if isinstance(title, str) else action, "domain": group["domain"], "domains": sorted(domains)}
    return sorted(actions.values(), key=lambda row: row["id"])


REGISTRIES = {"device_id": "device", "area_id": "area", "floor_id": "floor", "label_id": "label"}


def registry_catalog(registries):
    result = {}
    for kind in REGISTRIES:
        rows = registries.get(kind, [])
        rows = rows if isinstance(rows, list) else []
        result[kind] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            value = row.get(kind if kind != "device_id" else "id")
            if not isinstance(value, str) or not value or len(value) > 256:
                continue
            name = row.get("name_by_user") or row.get("name") or value
            result[kind].append({"id": value, "name": name[:256] if isinstance(name, str) else value})
        result[kind].sort(key=lambda row: (row["name"].casefold(), row["id"]))
    return result


def load_targets(environ=None):
    url, token = connection(os.environ if environ is None else environ)
    url = url.removesuffix("states") + "websocket"
    url = ("wss" if url.startswith("https:") else "ws") + url[url.index(":"):]
    try:
        from websocket import create_connection
        # Zero redirects: neither handshake headers nor the auth frame may be redirected.
        ws = create_connection(url, timeout=3, redirect_limit=0, http_no_proxy=[urlsplit(url).hostname], suppress_origin=True)
        try:
            deadline = time.monotonic() + 10
            def receive():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError()
                ws.settimeout(min(3, remaining))
                raw = ws.recv()
                if len(raw) > MAX_BYTES:
                    raise ValueError()
                return json.loads(raw)
            if receive().get("type") != "auth_required":
                raise ValueError()
            ws.send(json.dumps({"type": "auth", "access_token": token}))
            if receive().get("type") != "auth_ok":
                raise APIError(502, "HA-Registry-Zugriff abgelehnt.")
            registries, unavailable = {}, []
            for request_id, (kind, registry) in enumerate(REGISTRIES.items(), 1):
                ws.send(json.dumps({"id": request_id, "type": "config/" + registry + "_registry/list"}))
                reply = receive()
                if reply.get("type") != "result" or reply.get("id") != request_id:
                    raise ValueError()
                if reply.get("success") and isinstance(reply.get("result"), list):
                    registries[kind] = reply["result"]
                else:
                    unavailable.append(kind)
            return {"targets": registry_catalog(registries), "unavailable": unavailable}
        finally:
            ws.close()
    except APIError:
        raise
    except Exception:
        # Upstream payloads, credentials and connection exceptions stay server-side.
        raise APIError(502, "HA-Zielkatalog nicht verfügbar. ID manuell eingeben.") from None


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path not in ("/api/ha/entities", "/api/ha/actions", "/api/ha/targets", "/api/ha/callmebot-profiles"):
            self.reply(404, {"error": "Unbekannter Endpunkt."})
            return
        try:
            if self.path == "/api/ha/callmebot-profiles":
                self.reply(200, callmebot_profiles(load_rest("states")))
            elif self.path == "/api/ha/actions":
                self.reply(200, {"actions": action_catalog(load_rest("services"))})
            elif self.path == "/api/ha/targets":
                self.reply(200, load_targets())
            else:
                self.reply(200, {"entities": load_entities()})
        except APIError as error:
            self.reply(error.status, {"error": error.message})

    def do_POST(self):
        self.reply(405, {"error": "Nur lesender Zugriff erlaubt."})

    do_PUT = do_PATCH = do_DELETE = do_POST

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 9001), Handler).serve_forever()
