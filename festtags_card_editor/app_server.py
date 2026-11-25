"""Ingress-only administrator bridge. Supervisor credentials never reach clients."""
import asyncio
import hmac
import hashlib
import json
import os
from pathlib import Path
import secrets
from urllib.parse import urlsplit

from aiohttp import ClientError, ClientSession, ClientTimeout, web

from installer import install_payload

VERSION = "0.1.4"
ROOT = Path(__file__).resolve().parent
CARD_PATH = "/local/weihnachtssteuerung/weihnachtssteuerung-card.js"


class HomeAssistant:
    def __init__(self, session, token):
        self.session = session
        self.headers = {"Authorization": f"Bearer {token}"}
        self._setup_lock = asyncio.Lock()

    async def ws(self, command, **data):
        async with self.session.ws_connect("http://supervisor/core/websocket", headers=self.headers, max_msg_size=4*1024*1024) as socket:
            if (await socket.receive_json(timeout=20)).get("type") != "auth_required":
                raise RuntimeError("HA-Anmeldung nicht verfügbar.")
            await socket.send_json({"type": "auth", "access_token": self.headers["Authorization"][7:]})
            if (await socket.receive_json(timeout=20)).get("type") != "auth_ok":
                raise RuntimeError("HA-Anmeldung abgelehnt.")
            await socket.send_json({"id": 1, "type": command, **data})
            while True:
                result = await socket.receive_json(timeout=30)
                if result.get("id") == 1:
                    if not result.get("success"):
                        raise RuntimeError("HA-Anfrage abgelehnt.")
                    return result.get("result")

    async def admin(self, actor):
        if not actor:
            return False
        users = await self.ws("config/auth/list")
        user = next((u for u in users if u.get("id") == actor), {})
        return bool(user.get("is_active") and (user.get("is_owner") or "system-admin" in user.get("group_ids", [])))

    async def proxy(self, request, endpoint):
        headers = dict(self.headers)
        if request.method == "POST":
            headers["Content-Type"] = request.headers.get("Content-Type", "application/json")
        query = {"folder": request.query["folder"]} if endpoint == "images" and "folder" in request.query else None
        body = await request.read() if request.method == "POST" else None
        async with self.session.request(request.method, f"http://supervisor/core/api/weihnachtssteuerung/{endpoint}",
                                        headers=headers, params=query, data=body, allow_redirects=False) as response:
            if response.status not in (200, 400, 403):
                return web.json_response({"error": "Integration noch nicht erreichbar. Home Assistant nach Installation neu starten."}, status=502)
            result = await response.json()
            return web.json_response(result, status=response.status)

    async def register_card(self):
        resources = await self.ws("lovelace/resources")
        ours = [r for r in resources if urlsplit(r.get("url", "")).path == CARD_PATH]
        if len(ours) > 1:
            raise RuntimeError("Mehrere eigene Card-Ressourcen vorhanden; bitte in HA prüfen.")
        revision = hashlib.sha256((ROOT / "www" / "weihnachtssteuerung-card.js").read_bytes()).hexdigest()[:12]
        url = f"{CARD_PATH}?v={VERSION}&r={revision}"
        if ours:
            if ours[0].get("url") != url or ours[0].get("type") != "module":
                await self.ws("lovelace/resources/update", resource_id=ours[0]["id"], url=url, res_type="module")
        else:
            await self.ws("lovelace/resources/create", url=url, res_type="module")
        return {"registered": True, "url": url}

    async def restart(self):
        async with self.session.post("http://supervisor/core/api/services/homeassistant/restart", headers=self.headers, json={}) as response:
            if response.status != 200:
                raise RuntimeError("HA-Neustart wurde nicht bestätigt.")
        return {"restarting": True}

    async def _flow_post(self, path, payload):
        async with self.session.post(f"http://supervisor/core/api/config/config_entries/flow{path}", headers=self.headers, json=payload) as response:
            if response.status != 200:
                raise RuntimeError("Integration noch nicht einrichtbar. HA nach der Erstinstallation neu starten.")
            return await response.json()

    async def ensure_integration(self):
        """Bootstrap a fresh HA installation without editing configuration.yaml."""
        async with self._setup_lock:
            if await self.ws("config_entries/get", domain="weihnachtssteuerung"):
                return {"created": False, "exists": True}
            first = await self._flow_post("", {"handler": "weihnachtssteuerung", "show_advanced_options": False})
            if first.get("step_id") != "user" or not first.get("flow_id"):
                raise RuntimeError("Unbekannter Einrichtungsablauf; vorhandene Einstellungen nicht geändert.")
            flow_id = first["flow_id"]
            country = await self._flow_post(f"/{flow_id}", {"region": "central"})
            if country.get("step_id") != "country":
                raise RuntimeError("Länderauswahl nicht erreichbar.")
            result = await self._flow_post(f"/{flow_id}", {"country": "DE", "tradition": "western", "name": "Weihnachtssteuerung"})
            if result.get("type") != "create_entry":
                raise RuntimeError("Einrichtung wurde nicht bestätigt.")
            return {"created": True, "exists": True}


def create_app(ha, installation):
    csrf = secrets.token_urlsafe(32)

    @web.middleware
    async def guard(request, handler):
        if request.path == "/health":
            return web.json_response({"healthy": True, "version": VERSION})
        if request.remote != "172.30.32.2":
            raise web.HTTPForbidden(text="Nur über Home Assistant Ingress.")
        try:
            if not await ha.admin(request.headers.get("X-Remote-User-Id", "")):
                raise web.HTTPForbidden(text="Nur für aktive HA-Administratoren.")
            if request.method == "POST" and not hmac.compare_digest(request.headers.get("X-Festtags-CSRF", ""), csrf):
                raise web.HTTPForbidden(text="App neu laden und erneut versuchen.")
            response = await handler(request)
        except (RuntimeError, OSError, asyncio.TimeoutError, ClientError) as error:
            response = web.json_response({"error": str(error) if isinstance(error, RuntimeError) else "HA derzeit nicht erreichbar."}, status=502)
        except (ValueError, TypeError):
            response = web.json_response({"error": "Ungültige Anfrage."}, status=400)
        response.headers.update({"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"})
        return response

    app = web.Application(middlewares=[guard], client_max_size=5*1024*1024+8192)

    async def index(request):
        return web.Response(body=(ROOT / "app_static" / "index.html").read_bytes(), content_type="text/html")

    async def script(request):
        return web.Response(body=(ROOT / "www" / "festtags-card-editor.js").read_bytes(), content_type="text/javascript")

    async def stylesheet(request):
        return web.Response(body=(ROOT / "app_static" / "app.css").read_bytes(), content_type="text/css")

    async def bootstrap(request):
        return web.json_response({"version": VERSION, "csrf": csrf, "installation": installation})

    async def proxy_editor(request):
        return await ha.proxy(request, "editor")

    async def proxy_images(request):
        return await ha.proxy(request, "images")

    async def resource(request):
        return web.json_response(await ha.register_card())

    async def restart(request):
        return web.json_response(await ha.restart())

    async def setup(request):
        return web.json_response(await ha.ensure_integration())

    app.router.add_get("/health", bootstrap)  # middleware returns the non-sensitive health result
    app.router.add_get("/", index)
    app.router.add_get("/festtags-card-editor.js", script)
    app.router.add_get("/app.css", stylesheet)
    app.router.add_get("/api/bootstrap", bootstrap)
    for path, handler in (("/api/editor", proxy_editor), ("/api/images", proxy_images)):
        app.router.add_get(path, handler)
        app.router.add_post(path, handler)
    app.router.add_post("/api/resource", resource)
    app.router.add_post("/api/restart", restart)
    app.router.add_post("/api/setup", setup)
    return app


async def main():
    installation = await asyncio.to_thread(install_payload, ROOT, "/homeassistant", "/data")
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        raise RuntimeError("Supervisor-Zugang fehlt; nur als HA-App starten.")
    async with ClientSession(timeout=ClientTimeout(total=45)) as session:
        runner = web.AppRunner(create_app(HomeAssistant(session, token), installation))
        await runner.setup()
        await web.TCPSite(runner, "0.0.0.0", 8099).start()
        print(f"Festtags-Card-Editor {VERSION} bereit; eigene Dateien geändert: {installation['changed_files']}", flush=True)
        await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
