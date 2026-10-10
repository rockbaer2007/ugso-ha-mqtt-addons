"""Read-only Home Assistant entity bridge. Credentials stay in this process."""
import json
import os
import re
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
    url, token = connection(os.environ if environ is None else environ)
    request = Request(url, headers={"Authorization": "Bearer " + token, "Accept": "application/json"}, method="GET")
    try:
        # Fixed server-side endpoint; never forward credentials through a redirect.
        with build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=8) as response:
            raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise APIError(502, "HA-Entitätsliste ist zu groß.")
        return entity_catalog(json.loads(raw))
    except HTTPError as error:
        message = "HA-Zugriff abgelehnt. Server-Zugangsdaten prüfen." if error.code in (401, 403) else "HA-Entitätsabfrage fehlgeschlagen."
        raise APIError(502, message) from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise APIError(502, "HA ist nicht erreichbar oder hat ungültige Daten geliefert.") from None


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
        if self.path != "/api/ha/entities":
            self.reply(404, {"error": "Unbekannter Endpunkt."})
            return
        try:
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
