"""Minimal local web shell for HA Grafik Visual Studio."""

import json
import logging
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

LOG = logging.getLogger("ha-grafik-visual-studio")
PORT = int(os.environ.get("HA_GRAFIK_INGRESS_PORT", "8098"))
DATA_DIR = Path(os.environ.get("HA_GRAFIK_DATA", "/data"))
APP_DIR = Path(__file__).resolve().parent
WEB_DIR = APP_DIR / "web"
if not WEB_DIR.is_dir():
    WEB_DIR = APP_DIR.parent / "web"
PROJECT_FILE = DATA_DIR / "project.json"
MAX_BODY = 1_000_000

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

MIME_TYPES = {".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml"}


class Handler(BaseHTTPRequestHandler):
    server_version = "HAGrafikVisualStudio/0.1.13"

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

    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path == "/health":
            self.send_json(HTTPStatus.OK, {"status": "ok", "app": "ha_grafik_visual_studio", "version": "0.1.13"})
            return
        if path == "/api/project":
            self.send_json(HTTPStatus.OK, self.read_project())
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
        if urlparse(self.path).path != "/api/project":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BODY:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Projektdatei ist leer oder zu groß."})
            return
        try:
            project = json.loads(self.rfile.read(length))
            if not isinstance(project, dict):
                raise ValueError("Ungültiges Projektformat")
            if project.get("schemaVersion") == 1 and isinstance(project.get("widgets"), list):
                pass
            elif project.get("schemaVersion") == 2 and isinstance(project.get("pages"), list) and project["pages"] and all(
                isinstance(page, dict) and isinstance(page.get("id"), str) and isinstance(page.get("name"), str)
                and isinstance(page.get("page"), dict) and isinstance(page.get("widgets"), list)
                for page in project["pages"]
            ):
                if project.get("currentPageId") not in {page["id"] for page in project["pages"]}:
                    raise ValueError("Ungültige aktive Seite")
            else:
                raise ValueError("Ungültiges Projektformat")
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            temporary = PROJECT_FILE.with_suffix(".json.tmp")
            temporary.write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding="utf-8")
            temporary.replace(PROJECT_FILE)
        except (json.JSONDecodeError, ValueError, OSError) as error:
            LOG.warning("Projekt konnte nicht gespeichert werden: %s", error)
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Projekt konnte nicht gespeichert werden."})
            return
        self.send_json(HTTPStatus.OK, {"saved": True})

    @staticmethod
    def read_project():
        try:
            project = json.loads(PROJECT_FILE.read_text(encoding="utf-8"))
            if isinstance(project, dict) and project.get("schemaVersion") == 1 and isinstance(project.get("widgets"), list):
                return project
            if isinstance(project, dict) and project.get("schemaVersion") == 2 and isinstance(project.get("pages"), list) and project["pages"] and all(
                isinstance(page, dict) and isinstance(page.get("id"), str) and isinstance(page.get("name"), str)
                and isinstance(page.get("page"), dict) and isinstance(page.get("widgets"), list)
                for page in project["pages"]
            ):
                return project
        except (OSError, json.JSONDecodeError):
            pass
        return DEFAULT_PROJECT


if __name__ == "__main__":
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    LOG.info("HA Grafik Visual Studio startet auf Port %s", PORT)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
