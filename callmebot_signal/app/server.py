"""Ingress-only admin UI, or loopback preview. No direct network send endpoint."""
import json
import os
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from core import Failure, Gateway, connect_mqtt


def handler(gateway):
    csrf = secrets.token_urlsafe(32)
    root = Path(__file__).parent / "static"
    ingress = os.environ.get("CALLMEBOT_INGRESS") == "1"
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def reply(self, status, data, kind="application/json"):
            body = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", kind + "; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'")
            self.end_headers()
            self.wfile.write(body)

        def allowed(self):
            # Supervisor Ingress is the only remote admin peer; no trust in forwarded headers.
            if ingress:
                return self.client_address[0] == "172.30.32.2"
            host = self.headers.get("Host", "").split(":")[0]
            return self.client_address[0] == "127.0.0.1" and host in ("localhost", "127.0.0.1")

        def do_GET(self):
            if self.path == "/health" and self.client_address[0] == "127.0.0.1":
                return self.reply(200, {"ok": True, "version": "0.1.0"})
            if not self.allowed():
                return self.reply(403, {"error": "forbidden"})
            path = urlsplit(self.path).path
            if path == "/api/state":
                return self.reply(200, gateway.public() | {"csrf": csrf})
            file = {"/": ("index.html", "text/html"), "/app.js": ("app.js", "text/javascript"), "/request-id.mjs": ("request-id.mjs", "text/javascript"), "/style.css": ("style.css", "text/css"), "/icon.svg": ("icon.svg", "image/svg+xml")}.get(path)
            if not file:
                return self.reply(404, {"error": "not_found"})
            return self.reply(200, (root / file[0]).read_bytes(), file[1])

        def do_POST(self):
            if not self.allowed() or not secrets.compare_digest(self.headers.get("X-CSRF-Token", ""), csrf):
                return self.reply(403, {"error": "forbidden"})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 64000 or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    raise Failure("invalid_message")
                data = json.loads(self.rfile.read(size))
                if self.path == "/api/settings":
                    gateway.save(data)
                    return self.reply(200, {"status": "saved"})
                if self.path == "/api/send":
                    return self.reply(202, gateway.submit(data))
                return self.reply(404, {"error": "not_found"})
            except (Failure, ValueError, UnicodeError) as error:
                return self.reply(400, {"error": str(error) if isinstance(error, Failure) else "invalid_message"})
            except OSError:
                return self.reply(500, {"error": "storage_failed"})
    return Handler


def main():
    gateway = Gateway(os.environ.get("CALLMEBOT_DATA", "./data"))
    options_path = Path(os.environ.get("CALLMEBOT_OPTIONS", "/data/options.json"))
    options = json.loads(options_path.read_text("utf-8")) if options_path.exists() else {}
    if os.environ.get("CALLMEBOT_NO_MQTT") != "1":
        connect_mqtt(gateway, options)
    threading.Thread(target=gateway.worker, daemon=True).start()
    host = "0.0.0.0" if os.environ.get("CALLMEBOT_INGRESS") == "1" else "127.0.0.1"
    print("UGSo CallMeBot Signal 0.1.0 started", flush=True)
    ThreadingHTTPServer((host, int(os.environ.get("CALLMEBOT_PORT", "4183"))), handler(gateway)).serve_forever()


if __name__ == "__main__":
    main()
