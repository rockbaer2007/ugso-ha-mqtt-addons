"""Minimal local web shell for HA Grafik Visual Studio."""

import json
import logging
import math
import os
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse
from uuid import uuid4

from widget_packages import MAX_ZIP_BYTES, list_packages, read_package_zip
from tool_packages import list_tool_packages, read_tool_package_zip
from color_favorites import favorites, is_admin

LOG = logging.getLogger("ha-grafik-visual-studio")
PORT = int(os.environ.get("HA_GRAFIK_INGRESS_PORT", "8098"))
DATA_DIR = Path(os.environ.get("HA_GRAFIK_DATA", "/data"))
APP_DIR = Path(__file__).resolve().parent
WEB_DIR = APP_DIR / "web"
if not WEB_DIR.is_dir():
    WEB_DIR = APP_DIR.parent / "web"
PROJECT_FILE = DATA_DIR / "project.json"
PROJECTS_DIR = DATA_DIR / "projects"
WIDGET_PACKAGES_DIR = DATA_DIR / "widget_packages"
TOOL_PACKAGES_DIR = DATA_DIR / "tool_packages"
WWW_CANDIDATES = (
    Path("/homeassistant/www/studio"),
    Path("/homeassistant_config/www/studio"),
    Path("/config/www/studio"),
)
if os.environ.get("HA_GRAFIK_WWW_DIR"):
    WWW_DIR = Path(os.environ["HA_GRAFIK_WWW_DIR"])
else:
    WWW_DIR = next((candidate for candidate in WWW_CANDIDATES if candidate.parent.parent.is_dir()), WWW_CANDIDATES[0])
MAX_BODY = 1_000_000
MAX_OBJECT_BYTES = 20_000_000
DEFAULT_PROJECT_ID = "main"
HOME_ASSISTANT_WS_URL = "ws://supervisor/core/websocket"
ENTITY_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*\.[a-z0-9_]+$")

DEFAULT_PROJECT = {
    "schemaVersion": 2,
    "name": "Mein Zuhause",
    "currentPageId": "page-1",
    "pages": [{
        "id": "page-1",
        "name": "main",
        "visible": True,
        "page": {"preset": "desktop", "width": 1920, "height": 1080, "background": "#202124", "backgroundMode": "tile"},
        "widgets": [],
    }],
}


class HomeAssistantAPIError(RuntimeError):
    """Raised when a Home Assistant WebSocket request fails."""


def project_widgets(project):
    """Walk project widgets including owned tab surfaces."""
    pending = list(project.get("widgets", []))
    for page in project.get("pages", []):
        pending.extend(page.get("widgets", []))
    while pending:
        widget = pending.pop()
        if not isinstance(widget, dict):
            continue
        yield widget
        for surface in widget.get("tabSurfaces", []) or []:
            if isinstance(surface, dict):
                pending.extend(surface.get("widgets", []))


def home_assistant_commands(commands):
    """Run Home Assistant WebSocket commands via Supervisor."""
    try:
        import websocket
    except ImportError as error:
        raise HomeAssistantAPIError("WebSocket-Abhängigkeit fehlt. Erstelle das Add-on-Image neu.") from error

    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        raise HomeAssistantAPIError(
            "Home-Assistant-API-Zugriff fehlt. Aktualisiere das Add-on und starte es neu."
        )

    connection = None
    try:
        connection = websocket.create_connection(
            HOME_ASSISTANT_WS_URL,
            timeout=12,
            suppress_origin=True,
            http_no_proxy=["supervisor"],
        )
        connection.settimeout(12)
        greeting = json.loads(connection.recv())
        if greeting.get("type") != "auth_required":
            raise HomeAssistantAPIError("Home Assistant hat die WebSocket-Verbindung abgelehnt.")

        connection.send(json.dumps({"type": "auth", "access_token": token}))
        authentication = json.loads(connection.recv())
        if authentication.get("type") != "auth_ok":
            raise HomeAssistantAPIError("Home-Assistant-API-Authentifizierung fehlgeschlagen.")

        def command(identifier, specification):
            payload = {"id": identifier, "type": specification} if isinstance(specification, str) else {"id": identifier, **specification}
            connection.send(json.dumps(payload))
            while True:
                response = json.loads(connection.recv())
                if response.get("id") != identifier:
                    continue
                if not response.get("success"):
                    message = response.get("error", {}).get("message", "Unbekannter API-Fehler")
                    raise HomeAssistantAPIError(f"Home Assistant: {message}")
                return response.get("result")

        return [command(index, specification) for index, specification in enumerate(commands, 1)]
    except HomeAssistantAPIError:
        raise
    except (websocket.WebSocketException, OSError, ValueError, TypeError) as error:
        raise HomeAssistantAPIError(
            "Home-Assistant-API nicht erreichbar. Prüfe die Add-on-Berechtigung „homeassistant_api“."
        ) from error
    finally:
        if connection is not None:
            try:
                connection.close()
            except websocket.WebSocketException:
                pass


def load_home_assistant_entities():
    """Read entity registry, device registry, and current states via Supervisor."""
    entity_entries, device_entries, state_entries = home_assistant_commands(
        ["config/entity_registry/list", "config/device_registry/list", "get_states"]
    )
    entities = [
        {key: entry[key] for key in ("entity_id", "name", "name_by_user", "original_name", "device_id", "disabled_by") if key in entry}
        for entry in entity_entries if isinstance(entry, dict)
    ]
    devices = [
        {key: entry[key] for key in ("id", "name", "name_by_user", "model", "manufacturer") if key in entry}
        for entry in device_entries if isinstance(entry, dict)
    ]
    states = [
        {"entity_id": entry["entity_id"], "state": entry.get("state"),
         "attributes": {"friendly_name": entry.get("attributes", {}).get("friendly_name")}}
        for entry in state_entries if isinstance(entry, dict) and "entity_id" in entry
    ]
    return {"entities": entities, "devices": devices, "states": states}


def load_home_assistant_states(entity_ids):
    """Read only the requested states without fetching the registries."""
    requested = set(entity_ids)
    (state_entries,) = home_assistant_commands(["get_states"])
    return [
        {key: entry.get(key) for key in ("entity_id", "state", "last_changed", "last_updated")}
        for entry in (state_entries or []) if isinstance(entry, dict) and entry.get("entity_id") in requested
    ]


def set_home_assistant_switch(entity_id, enabled):
    """Control one explicitly selected switch-like entity, never arbitrary services."""
    if not isinstance(entity_id, str) or not ENTITY_ID_PATTERN.fullmatch(entity_id) or entity_id.split(".", 1)[0] not in {"switch", "light", "input_boolean"}:
        raise ValueError("Diese Entität unterstützt die Schaltersteuerung nicht.")
    if not isinstance(enabled, bool):
        raise ValueError("Ungültiger Schaltzustand.")
    domain = entity_id.split(".", 1)[0]
    home_assistant_commands([{
        "type": "call_service", "domain": domain,
        "service": "turn_on" if enabled else "turn_off",
        "target": {"entity_id": entity_id},
    }])


def set_home_assistant_helper_value(entity_id, value):
    """Write only to an explicitly selected numeric or text helper."""
    if not isinstance(entity_id, str) or not ENTITY_ID_PATTERN.fullmatch(entity_id):
        raise ValueError("Ungültige Home-Assistant-Entität.")
    domain = entity_id.split(".", 1)[0]
    if domain == "input_number":
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError("Der Zahlenhelfer benötigt einen endlichen Zahlenwert.")
    elif domain == "input_text":
        if not isinstance(value, str) or len(value) > 255:
            raise ValueError("Der Texthelfer benötigt höchstens 255 Zeichen.")
    else:
        raise ValueError("Nur input_number und input_text können hier beschrieben werden.")
    home_assistant_commands([{
        "type": "call_service", "domain": domain, "service": "set_value",
        "target": {"entity_id": entity_id}, "service_data": {"value": value},
    }])

MIME_TYPES = {".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml"}
FILE_MIME_TYPES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif", ".bmp": "image/bmp", ".ico": "image/x-icon",
    ".json": "application/json", ".js": "text/javascript", ".css": "text/css", ".xml": "application/xml", ".yaml": "text/yaml", ".yml": "text/yaml",
    ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv", ".log": "text/plain",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".flac": "audio/flac",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mkv": "video/x-matroska",
}
PROJECT_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


class Handler(BaseHTTPRequestHandler):
    server_version = "HAGrafikVisualStudio/0.1.101"

    def log_message(self, fmt, *args):
        LOG.info("%s - %s", self.address_string(), fmt % args)

    def send_bytes(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, value):
        self.send_bytes(status, json.dumps(value, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def color_favorites_request(self, write=False):
        try:
            user_id = self.headers.get("X-Remote-User-Id")
            if self.client_address[0] != "172.30.32.2" or not user_id:
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Gemeinsame Favoriten benötigen einen HA-Admin und einen aktuellen Ingress-Aufruf."})
                return
            users = home_assistant_commands(["config/auth/list"])[0]
            if not is_admin(self.client_address[0], user_id, users):
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Favoriten sind nur für HA-Admins verfügbar."})
                return
            request = self.read_request_json() if write else None
            if write and request is None:
                return
            self.send_json(HTTPStatus.OK, {"favorites": favorites(DATA_DIR / "color-favorites.json", request)})
        except HomeAssistantAPIError:
            self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "HA-Adminprüfung momentan nicht verfügbar."})
        except ValueError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültige Favoritendaten."})
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Favoriten konnten nicht gespeichert werden."})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = parse_qs(parsed.query)
        if path == "/api/color-favorites":
            self.color_favorites_request()
            return
        if path == "/health":
            self.send_json(HTTPStatus.OK, {"status": "ok", "app": "ha_grafik_visual_studio", "version": "0.1.131"})
            return
        if path == "/api/entities":
            try:
                self.send_json(HTTPStatus.OK, load_home_assistant_entities())
            except HomeAssistantAPIError as error:
                LOG.warning("Home-Assistant-Entitäten konnten nicht geladen werden: %s", error)
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
            return
        if path == "/api/states":
            entity_ids = query.get("entity_id", [])
            if not entity_ids or len(entity_ids) > 100 or any(not ENTITY_ID_PATTERN.fullmatch(entity_id) for entity_id in entity_ids):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültige Entitätenauswahl."})
                return
            try:
                self.send_json(HTTPStatus.OK, {"states": load_home_assistant_states(entity_ids)})
            except HomeAssistantAPIError as error:
                LOG.warning("Home-Assistant-Zustände konnten nicht geladen werden: %s", error)
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
            return
        if path == "/api/projects":
            self.send_json(HTTPStatus.OK, self.list_projects())
            return
        if path == "/api/widget-packages":
            self.send_json(HTTPStatus.OK, {"packages": list_packages(WIDGET_PACKAGES_DIR)})
            return
        if path == "/api/tool-packages":
            self.send_json(HTTPStatus.OK, {"packages": list_tool_packages(TOOL_PACKAGES_DIR)})
            return
        if path == "/api/objects":
            self.send_json(HTTPStatus.OK, self.list_objects(query.get("path", [""])[0]))
            return
        if path == "/api/object-file":
            self.send_object_file(query.get("path", [""])[0])
            return
        if path == "/api/project":
            project_id = query.get("project", [DEFAULT_PROJECT_ID])[0]
            project = self.read_project(project_id)
            if project is None:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self.send_json(HTTPStatus.OK, project)
            return
        asset = "index.html" if path in ("/", "/editor", "/runtime") else path.lstrip("/")
        target = (WEB_DIR / asset).resolve()
        if WEB_DIR.resolve() not in target.parents and target != WEB_DIR.resolve():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content_type = MIME_TYPES.get(target.suffix, "text/html; charset=utf-8" if target.suffix == ".html" else "application/octet-stream")
        self.send_bytes(HTTPStatus.OK, target.read_bytes(), content_type)

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/project":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        project_id = parse_qs(parsed.query).get("project", [DEFAULT_PROJECT_ID])[0]
        project = self.read_request_json()
        if project is None:
            return
        if not self.valid_project_id(project_id) or not self.valid_project(project):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültiges Projektformat."})
            return
        try:
            self.write_project(project_id, project)
        except OSError as error:
            LOG.warning("Projekt konnte nicht gespeichert werden: %s", error)
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Projekt konnte nicht gespeichert werden."})
            return
        self.send_json(HTTPStatus.OK, {"saved": True})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/color-favorites":
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "JSON-Anfrage erforderlich."})
                return
            self.color_favorites_request(write=True)
            return
        if parsed.path == "/api/widget-packages":
            self.install_widget_package()
            return
        if parsed.path == "/api/tool-packages":
            self.install_tool_package()
            return
        if parsed.path == "/api/switch":
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "JSON-Anfrage erforderlich."})
                return
            request = self.read_request_json()
            if request is None:
                return
            if not isinstance(request, dict):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültiger Schaltbefehl."})
                return
            try:
                set_home_assistant_switch(request.get("entity_id"), request.get("enabled"))
            except ValueError as error:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
                return
            except HomeAssistantAPIError as error:
                LOG.warning("Home-Assistant-Schaltaktion fehlgeschlagen: %s", error)
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
                return
            self.send_json(HTTPStatus.OK, {"accepted": True})
            return
        if parsed.path == "/api/helper-value":
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "JSON-Anfrage erforderlich."})
                return
            request = self.read_request_json()
            if request is None:
                return
            if not isinstance(request, dict):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültiger Wertbefehl."})
                return
            try:
                set_home_assistant_helper_value(request.get("entity_id"), request.get("value"))
            except ValueError as error:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
                return
            except HomeAssistantAPIError as error:
                LOG.warning("Home-Assistant-Helferwert konnte nicht gesetzt werden: %s", error)
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
                return
            self.send_json(HTTPStatus.OK, {"accepted": True})
            return
        if parsed.path == "/api/files/folder":
            self.create_object_folder(parse_qs(parsed.query).get("path", [""])[0])
            return
        if parsed.path == "/api/files":
            self.save_uploaded_file(parse_qs(parsed.query).get("path", [""])[0])
            return
        if parsed.path != "/api/projects":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        request = self.read_request_json()
        if request is None:
            return
        name = str(request.get("name", "Neues Projekt")).strip()[:100] or "Neues Projekt"
        source_id = request.get("source")
        project = self.read_project(source_id) if source_id else json.loads(json.dumps(DEFAULT_PROJECT))
        if project is None:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Vorlageprojekt wurde nicht gefunden."})
            return
        project["name"] = name
        project_id = self.new_project_id(name)
        try:
            self.write_project(project_id, project)
        except OSError as error:
            LOG.warning("Projekt konnte nicht angelegt werden: %s", error)
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Projekt konnte nicht angelegt werden."})
            return
        self.send_json(HTTPStatus.CREATED, {"id": project_id, "name": name})

    def save_uploaded_file(self, relative_path):
        target = self.resolve_object_path(relative_path)
        if target is None or not target.name or target.name in (".", ".."):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültiger Dateipfad."})
            return
        if target.suffix.lower() not in FILE_MIME_TYPES:
            self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "Dieser Dateityp wird nicht unterstützt."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_OBJECT_BYTES:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Datei ist leer oder größer als 20 MB."})
            return
        if not target.parent.is_dir():
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Zielordner wurde nicht gefunden."})
            return
        body = self.rfile.read(length)
        if len(body) != length:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Datei wurde nicht vollständig übertragen."})
            return
        try:
            with target.open("xb") as uploaded:
                uploaded.write(body)
        except FileExistsError:
            self.send_json(HTTPStatus.CONFLICT, {"error": "Eine Datei mit diesem Namen existiert bereits."})
            return
        except OSError as error:
            LOG.warning("Datei konnte nicht hochgeladen werden: %s", error)
            try:
                target.unlink(missing_ok=True)
            except OSError:
                pass
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Datei konnte nicht gespeichert werden."})
            return
        self.send_json(HTTPStatus.CREATED, {"uploaded": True, "path": target.relative_to(WWW_DIR.resolve()).as_posix()})

    def create_object_folder(self, relative_path):
        target = self.resolve_object_path(relative_path)
        if target is None or not target.name or not target.parent.is_dir():
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültiger Ordnername oder Zielpfad."})
            return
        try:
            target.mkdir()
        except FileExistsError:
            self.send_json(HTTPStatus.CONFLICT, {"error": "Ein Ordner oder eine Datei mit diesem Namen existiert bereits."})
            return
        except OSError as error:
            LOG.warning("Ordner konnte nicht erstellt werden: %s", error)
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Ordner konnte nicht erstellt werden."})
            return
        self.send_json(HTTPStatus.CREATED, {"created": True, "path": target.relative_to(WWW_DIR.resolve()).as_posix()})

    def do_PATCH(self):
        path = urlparse(self.path).path
        project_id = path.removeprefix("/api/projects/")
        if not path.startswith("/api/projects/") or not self.valid_project_id(project_id):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        request = self.read_request_json()
        if request is None:
            return
        project = self.read_project(project_id)
        if project is None:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        project["name"] = str(request.get("name", project.get("name", ""))).strip()[:100] or "Unbenanntes Projekt"
        self.write_project(project_id, project)
        self.send_json(HTTPStatus.OK, {"id": project_id, "name": project["name"]})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/widget-packages/"):
            self.delete_widget_package(unquote(parsed.path.removeprefix("/api/widget-packages/")))
            return
        if parsed.path.startswith("/api/tool-packages/"):
            self.delete_tool_package(unquote(parsed.path.removeprefix("/api/tool-packages/")))
            return
        if parsed.path == "/api/files":
            self.delete_object_file(parse_qs(parsed.query).get("path", [""])[0])
            return
        path = parsed.path
        project_id = path.removeprefix("/api/projects/")
        if not path.startswith("/api/projects/") or not self.valid_project_id(project_id):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        projects = self.list_projects()
        if len(projects) <= 1:
            self.send_json(HTTPStatus.CONFLICT, {"error": "Das letzte Projekt kann nicht gelöscht werden."})
            return
        project_file = self.project_path(project_id)
        if not project_file.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        project_file.unlink()
        self.send_json(HTTPStatus.OK, {"deleted": True})

    def install_widget_package(self):
        if not self.headers.get("X-Package-Name", "").lower().endswith((".wg", ".wg.zip")):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Widget-Paket muss auf .wg oder .wg.zip enden."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_ZIP_BYTES:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Widget-Paket ist leer oder größer als 2 MB."})
            return
        try:
            manifest = read_package_zip(self.rfile.read(length))
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        WIDGET_PACKAGES_DIR.mkdir(parents=True, exist_ok=True)
        target = WIDGET_PACKAGES_DIR / (manifest["id"] + ".json")
        if target.exists():
            self.send_json(HTTPStatus.CONFLICT, {"error": "Paket ist bereits installiert. Updates folgen später."})
            return
        try:
            target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Widget-Paket konnte nicht gespeichert werden."})
            return
        self.send_json(HTTPStatus.CREATED, {"installed": manifest["id"]})

    def delete_widget_package(self, package_id):
        installed = next((item for item in list_packages(WIDGET_PACKAGES_DIR) if item["id"] == package_id), None)
        if installed is None:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Widget-Paket wurde nicht gefunden."})
            return
        used_types = {widget["type"] for widget in installed["widgets"]}
        self.ensure_projects()
        for project_file in PROJECTS_DIR.glob("*.json"):
            project = self.read_project_file(project_file)
            if any(widget.get("type") in used_types for widget in project_widgets(project or {})):
                self.send_json(HTTPStatus.CONFLICT, {"error": "Paket wird in einem Projekt verwendet und kann nicht entfernt werden."})
                return
        try:
            (WIDGET_PACKAGES_DIR / (package_id + ".json")).unlink()
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Widget-Paket konnte nicht entfernt werden."})
            return
        self.send_json(HTTPStatus.OK, {"deleted": package_id})

    def install_tool_package(self):
        if not self.headers.get("X-Package-Name", "").lower().endswith((".tp", ".tp.zip")):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Tool-Paket muss auf .tp oder .tp.zip enden."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_ZIP_BYTES:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Tool-Paket ist leer oder größer als 2 MB."})
            return
        try:
            manifest = read_tool_package_zip(self.rfile.read(length))
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        TOOL_PACKAGES_DIR.mkdir(parents=True, exist_ok=True)
        target = TOOL_PACKAGES_DIR / (manifest["id"] + ".json")
        if target.exists():
            self.send_json(HTTPStatus.CONFLICT, {"error": "Tool-Paket ist bereits installiert. Updates folgen später."})
            return
        try:
            target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Tool-Paket konnte nicht gespeichert werden."})
            return
        self.send_json(HTTPStatus.CREATED, {"installed": manifest["id"]})

    def delete_tool_package(self, package_id):
        if not any(item["id"] == package_id for item in list_tool_packages(TOOL_PACKAGES_DIR)):
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Tool-Paket wurde nicht gefunden."})
            return
        try:
            (TOOL_PACKAGES_DIR / (package_id + ".json")).unlink()
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Tool-Paket konnte nicht entfernt werden."})
            return
        self.send_json(HTTPStatus.OK, {"deleted": package_id})

    @staticmethod
    def valid_project_id(project_id):
        return isinstance(project_id, str) and PROJECT_ID_PATTERN.fullmatch(project_id) is not None

    @staticmethod
    def valid_project(project):
        if not isinstance(project, dict):
            return False
        if project.get("schemaVersion") == 1 and isinstance(project.get("widgets"), list):
            return True
        if project.get("schemaVersion") != 2 or not isinstance(project.get("pages"), list) or not project["pages"]:
            return False
        return all(
            isinstance(page, dict) and isinstance(page.get("id"), str) and isinstance(page.get("name"), str)
            and isinstance(page.get("page"), dict) and isinstance(page.get("widgets"), list)
            for page in project["pages"]
        ) and project.get("currentPageId") in {page["id"] for page in project["pages"]}

    @classmethod
    def project_path(cls, project_id):
        if not cls.valid_project_id(project_id):
            raise ValueError("Ungültige Projekt-ID")
        return PROJECTS_DIR / f"{project_id}.json"

    @staticmethod
    def new_project_id(name):
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "projekt"
        return f"{slug}-{uuid4().hex[:8]}"

    @classmethod
    def write_project(cls, project_id, project):
        PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
        target = cls.project_path(project_id)
        temporary = target.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(target)

    @classmethod
    def ensure_projects(cls):
        PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
        if any(cls.valid_project_id(path.stem) and path.is_file() for path in PROJECTS_DIR.glob("*.json")):
            return
        try:
            legacy = json.loads(PROJECT_FILE.read_text(encoding="utf-8"))
            project = legacy if cls.valid_project(legacy) else json.loads(json.dumps(DEFAULT_PROJECT))
        except (OSError, json.JSONDecodeError):
            project = json.loads(json.dumps(DEFAULT_PROJECT))
        cls.write_project(DEFAULT_PROJECT_ID, project)

    @classmethod
    def read_project(cls, project_id=DEFAULT_PROJECT_ID):
        if not cls.valid_project_id(project_id):
            return None
        cls.ensure_projects()
        try:
            project = json.loads(cls.project_path(project_id).read_text(encoding="utf-8"))
            return project if cls.valid_project(project) else None
        except (OSError, json.JSONDecodeError, ValueError):
            return None

    @classmethod
    def list_projects(cls):
        cls.ensure_projects()
        projects = []
        for path in PROJECTS_DIR.glob("*.json"):
            if not cls.valid_project_id(path.stem):
                continue
            project = cls.read_project_file(path)
            if project is not None:
                projects.append({"id": path.stem, "name": str(project.get("name", path.stem))})
        return sorted(projects, key=lambda item: item["name"].casefold())

    @classmethod
    def read_project_file(cls, path):
        try:
            project = json.loads(path.read_text(encoding="utf-8"))
            return project if cls.valid_project(project) else None
        except (OSError, json.JSONDecodeError):
            return None

    def read_request_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Anfrage ist leer oder zu groß."})
            return None
        try:
            value = json.loads(self.rfile.read(length))
            if not isinstance(value, dict):
                raise ValueError("JSON-Objekt erwartet")
            return value
        except (json.JSONDecodeError, ValueError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ungültige JSON-Anfrage."})
            return None

    @staticmethod
    def resolve_object_path(relative_path):
        relative = unquote(str(relative_path or "")).replace("\\", "/")
        if relative.startswith("/") or any(part in (".", "..") for part in relative.split("/")):
            return None
        root = WWW_DIR.resolve()
        target = (root / relative).resolve()
        try:
            target.relative_to(root)
        except ValueError:
            return None
        return target

    @classmethod
    def list_objects(cls, relative_path):
        try:
            WWW_DIR.mkdir(parents=True, exist_ok=True)
        except OSError:
            return {"available": False, "checked": [str(WWW_DIR)], "path": relative_path or "", "folders": [], "files": [], "error": "Der Ordner /config/www/studio konnte nicht automatisch erstellt werden. Bitte den Ordner in Home Assistant erstellen und die Schreibrechte der Konfigurationseinbindung prüfen."}
        target = cls.resolve_object_path(relative_path)
        if target is None or not target.is_dir():
            return {"available": WWW_DIR.is_dir(), "checked": [str(path) for path in WWW_CANDIDATES], "path": relative_path or "", "folders": [], "files": []}
        folders, files = [], []
        try:
            for entry in target.iterdir():
                resolved = entry.resolve()
                try:
                    resolved.relative_to(WWW_DIR.resolve())
                except ValueError:
                    continue
                relative = resolved.relative_to(WWW_DIR.resolve()).as_posix()
                if entry.is_dir():
                    folders.append({"name": entry.name, "path": relative})
                elif entry.is_file() and entry.suffix.lower() in FILE_MIME_TYPES and entry.stat().st_size <= MAX_OBJECT_BYTES:
                    files.append({"name": entry.name, "path": relative, "size": entry.stat().st_size, "mime": FILE_MIME_TYPES[entry.suffix.lower()], "url": f"api/object-file?path={quote(relative, safe='/')}"})
        except OSError:
            return {"available": False, "checked": [str(path) for path in WWW_CANDIDATES], "path": relative_path or "", "folders": [], "files": []}
        return {"available": True, "checked": [str(WWW_DIR)], "path": relative_path or "", "folders": sorted(folders, key=lambda item: item["name"].casefold()), "files": sorted(files, key=lambda item: item["name"].casefold())}

    def delete_object_file(self, relative_path):
        target = self.resolve_object_path(relative_path)
        if target is None or not target.is_file() or target.suffix.lower() not in FILE_MIME_TYPES:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Datei wurde nicht gefunden."})
            return
        try:
            target.unlink()
        except OSError as error:
            LOG.warning("Datei konnte nicht gelöscht werden: %s", error)
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Datei konnte nicht gelöscht werden."})
            return
        self.send_json(HTTPStatus.OK, {"deleted": True, "path": relative_path})

    def send_object_file(self, relative_path):
        target = self.resolve_object_path(relative_path)
        if target is None or not target.is_file() or target.suffix.lower() not in FILE_MIME_TYPES:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            if target.stat().st_size > MAX_OBJECT_BYTES:
                self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
                return
            body = target.read_bytes()
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", FILE_MIME_TYPES[target.suffix.lower()])
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'; sandbox")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    LOG.info("HA Grafik Visual Studio startet auf Port %s", PORT)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
