"""Ingress-only administrator UI for bulk Lovelace view visibility."""
import asyncio
import hmac
import json
import logging
import os
from pathlib import Path
import re
import secrets
import time

from aiohttp import ClientError, ClientSession, ClientTimeout, web
from visibility import Invalid, fingerprint, human_users, summary, transform, transform_matrix
from i18n import language, translate, payload

VERSION = '0.1.7'
STATIC = Path(__file__).parent / 'static'
ACTOR = web.RequestKey('actor', str)


class HAError(Exception):
    pass


class HA:
    def __init__(self, session, token):
        self.session, self.token = session, token

    async def call(self, command, **data):
        try:
            return await self._call(command, **data)
        except (ClientError, asyncio.TimeoutError, OSError, ValueError, TypeError) as exc:
            raise HAError('Die Verbindung zu HA wurde unterbrochen oder lieferte keine gültige Antwort.') from exc

    async def _call(self, command, **data):
        async with self.session.ws_connect('http://supervisor/core/websocket',
                                          max_msg_size=32 * 1024 * 1024) as ws:
            first = await ws.receive_json(timeout=20)
            if first.get('type') != 'auth_required':
                raise HAError('HA hat keine Anmeldung angefordert.')
            await ws.send_json({'type': 'auth', 'access_token': self.token})
            if (await ws.receive_json(timeout=20)).get('type') != 'auth_ok':
                raise HAError('Die App konnte sich nicht bei HA anmelden.')
            await ws.send_json({'id': 1, 'type': command, **data})
            while True:
                result = await ws.receive_json(timeout=30)
                if result.get('id') == 1:
                    if not result.get('success'):
                        # Do not echo arbitrary upstream messages/configuration into logs/UI.
                        raise HAError(f'HA lehnt die Anfrage ab ({result.get("error", {}).get("code", "unknown")}).')
                    return result.get('result')

    async def users(self):
        return await self.call('config/auth/list')

    async def dashboards(self):
        listed = await self.call('lovelace/dashboards/list')
        panels = await self.call('get_panels')
        result = {d['url_path']: d for d in listed}
        # Modern HA lists the migrated overview as "lovelace". The panel at
        # that path is the same dashboard, not a second legacy None dashboard.
        # HA resolves None to "lovelace" when present (including old backups).
        if 'lovelace' in result:
            result['lovelace'] = {**result['lovelace'], 'aliases': [None]}
            result.pop(None, None)
        for key, panel in panels.items():
            if panel.get('component_name') != 'lovelace':
                continue
            config = panel.get('config') or {}
            path = ('lovelace' if 'lovelace' in result else None) if key == 'lovelace' else key
            if path not in result:
                result[path] = {'url_path': path, 'title': panel.get('title') or key,
                                'mode': config.get('mode', 'generated'),
                                'require_admin': panel.get('require_admin', False)}
        return sorted(result.values(), key=lambda d: d.get('title', '').casefold())

    async def config(self, path):
        return await self.call('lovelace/config', url_path=path, force=False)


class Manager:
    def __init__(self, ha, backup_dir):
        self.ha, self.backups = ha, Path(backup_dir)
        self.previews = {}
        self.lock = asyncio.Lock()

    async def catalog(self):
        """Inspect real configurations; failed reads must never masquerade as empty."""
        candidates = await self.ha.dashboards()
        limit = asyncio.Semaphore(4)

        async def inspect(item):
            async with limit:
                try:
                    cfg = await self.ha.config(item.get('url_path'))
                    if (not isinstance(cfg, dict) or ('views' not in cfg and 'strategy' not in cfg)
                            or not isinstance(cfg.get('views', []), list)):
                        raise HAError('Ungültige Dashboard-Konfiguration.')
                    views = cfg.get('views', [])
                    if any(not isinstance(view, dict) for view in views):
                        raise HAError('Ungültige Dashboard-Konfiguration.')
                    return {**item, 'view_count': len(views), 'generated': 'strategy' in cfg}
                except (HAError, ClientError, asyncio.TimeoutError, OSError):
                    # A stable translated message, never arbitrary upstream data.
                    return {**item, 'load_error': 'Dashboard konnte nicht geladen werden. Bitte erneut prüfen.'}

        inspected = await asyncio.gather(*(inspect(item) for item in candidates))
        return {'dashboards': [d for d in inspected if d.get('view_count', 0) > 0],
                'dashboard_errors': [d for d in inspected if 'load_error' in d],
                'empty_dashboards': sum(d.get('view_count') == 0 for d in inspected)}

    async def dashboard(self, path):
        dashboards = await self.ha.dashboards()
        item = next((d for d in dashboards if d.get('url_path') == path or path in d.get('aliases', [])), None)
        if not item:
            raise Invalid('Dashboard nicht gefunden. Bitte neu laden.')
        if item.get('mode') != 'storage':
            raise Invalid('YAML- und automatisch erzeugte Dashboards sind nur lesbar.')
        return await self.ha.config(path)

    async def preview(self, actor, path, operation, selected):
        users = await self.ha.users()
        before = await self.dashboard(path)
        after, changes, warnings = transform(before, users, operation, selected)
        return self.prepare(actor, path, before, after, users, changes, warnings)

    async def matrix(self, actor, path, rows, config_hash, users_hash):
        users = await self.ha.users()
        before = await self.dashboard(path)
        if fingerprint(before) != config_hash or fingerprint(users) != users_hash:
            raise Invalid('Dashboard oder Benutzerliste wurde inzwischen geändert. Bitte neu laden; deine Auswahl ist noch sichtbar.')
        after, changes, warnings = transform_matrix(before, users, rows)
        return self.prepare(actor, path, before, after, users, changes, warnings)

    def prepare(self, actor, path, before, after, users, changes, warnings):
        self.previews = {k: p for k, p in self.previews.items() if p['expires'] > time.time()}
        if len(self.previews) >= 100:
            raise Invalid('Zu viele offene Vorschauen. Bitte kurz warten.')
        token = secrets.token_urlsafe(32)
        self.previews[token] = {'actor': actor, 'path': path, 'before': before,
                                'after': after, 'users_hash': fingerprint(users),
                                'expires': time.time() + 300, 'changes': changes}
        return {'token': token, 'changes': changes, 'warnings': warnings,
                'total_views': len(before['views']), 'expires_seconds': 300}

    def save_backup(self, path, before, after, actor, reason):
        self.backups.mkdir(parents=True, exist_ok=True, mode=0o700)
        name = time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + secrets.token_hex(6) + '.json'
        record = {'version': 1, 'created_at': time.time(), 'path': path, 'actor': actor,
                  'reason': reason, 'config': before, 'expected_after_hash': fingerprint(after),
                  'before_hash': fingerprint(before)}
        target = self.backups / name
        # Exclusive creation, restrictive mode, flush before the first HA write.
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(record, handle, ensure_ascii=False, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        return name

    async def commit(self, actor, token):
        async with self.lock:
            p = self.previews.get(token)
            if not p or p['actor'] != actor or p['expires'] < time.time():
                raise Invalid('Die Vorschau ist abgelaufen. Bitte erneut prüfen.')
            current = await self.dashboard(p['path'])
            if fingerprint(current) != fingerprint(p['before']):
                raise Invalid('Das Dashboard wurde inzwischen geändert. Bitte neue Vorschau erstellen.')
            if fingerprint(await self.ha.users()) != p['users_hash']:
                raise Invalid('Die Benutzerliste wurde inzwischen geändert. Bitte erneut prüfen.')
            self.previews.pop(token)
            if not p['changes']:
                return {'changed': 0, 'message': 'Keine Änderung nötig.', 'backup': None}
            backup = self.save_backup(p['path'], current, p['after'], actor, 'bulk-visibility')
            try:
                await self.ha.call('lovelace/config/save', url_path=p['path'], config=p['after'])
                saved = await self.ha.config(p['path'])
                if fingerprint(saved) != fingerprint(p['after']):
                    raise HAError('Gespeicherter Stand weicht ab. Bitte Dashboard und Sicherung prüfen.')
            except (HAError, ClientError, asyncio.TimeoutError, OSError) as exc:
                raise HAError(f'Speicherergebnis nicht bestätigt. Nicht blind wiederholen. Sicherung: {backup}') from exc
            return {'changed': len(p['changes']), 'backup': backup,
                    'message': 'Benutzersichtbarkeit gespeichert und zurückgelesen.'}

    def read_backup(self, name):
        if not isinstance(name, str) or not re.fullmatch(r'\d{8}T\d{6}Z-[a-f0-9]{12}\.json', name):
            raise Invalid('Ungültige Sicherungskennung.')
        try:
            return json.loads((self.backups / name).read_text(encoding='utf-8'))
        except (FileNotFoundError, json.JSONDecodeError) as exc:
            raise Invalid('Sicherung nicht gefunden oder beschädigt.') from exc

    def list_backups(self):
        if not self.backups.exists():
            return []
        records = []
        for file in sorted(self.backups.glob('*.json'), reverse=True)[:200]:
            try:
                r = self.read_backup(file.name)
                if not isinstance(r.get('config'), dict) or not isinstance(r.get('created_at'), (int, float)) or 'path' not in r:
                    continue
            except Invalid:
                continue
            records.append({'id': file.name, 'path': r['path'], 'created_at': r['created_at'],
                            'views': len(r['config'].get('views', []))})
        return records

    async def restore(self, actor, name):
        async with self.lock:
            r = self.read_backup(name)
            if fingerprint(r['config']) != r['before_hash']:
                raise Invalid('Prüfsumme der Sicherung stimmt nicht.')
            current = await self.dashboard(r['path'])
            if fingerprint(current) != r['expected_after_hash']:
                raise Invalid('Dashboard wurde seit dieser Änderung bearbeitet. Automatische Wiederherstellung gesperrt.')
            backup = self.save_backup(r['path'], current, r['config'], actor, 'before-restore')
            try:
                await self.ha.call('lovelace/config/save', url_path=r['path'], config=r['config'])
                if fingerprint(await self.ha.config(r['path'])) != r['before_hash']:
                    raise HAError('Wiederherstellung nicht bestätigt.')
            except (HAError, ClientError, asyncio.TimeoutError, OSError) as exc:
                raise HAError(f'Wiederherstellung nicht bestätigt. Sicherung des vorherigen Standes: {backup}') from exc
            return {'message': 'Sicherung wiederhergestellt und geprüft.', 'backup': backup}


def public_users(users):
    return [{'id': u['id'], 'name': u.get('name') or u.get('username') or u['id'],
             'active': u.get('is_active', False),
             'admin': u.get('is_owner', False) or 'system-admin' in u.get('group_ids', [])}
            for u in human_users(users)]


def create_app(manager):
    csrf = secrets.token_urlsafe(32)

    @web.middleware
    async def guard(request, handler):
        lang = language(request.headers.get('Accept-Language'))
        if request.path == '/health':
            return web.json_response({'healthy': True, 'version': VERSION})
        if request.remote != '172.30.32.2':
            raise web.HTTPForbidden(text=translate('Nur über Home Assistant Ingress erreichbar.',lang))
        actor = request.headers.get('X-Remote-User-Id', '')
        try:
            users = await manager.ha.users()
        except (HAError, ClientError, asyncio.TimeoutError, OSError):
            return web.json_response({'error': translate('Die HA-Administratorprüfung ist momentan nicht erreichbar.',lang)},
                                     status=502, headers={'Cache-Control': 'no-store'})
        user = next((u for u in users if u['id'] == actor), {})
        if not user.get('is_active') or not (user.get('is_owner') or 'system-admin' in user.get('group_ids', [])):
            raise web.HTTPForbidden(text=translate('Nur aktive HA-Administratoren dürfen diese App öffnen.',lang))
        request[ACTOR] = actor
        if request.method == 'POST':
            if request.content_type != 'application/json' or not hmac.compare_digest(
                request.headers.get('X-Dashboard-CSRF', ''), csrf
            ):
                raise web.HTTPForbidden(text=translate('Ungültige Anfrage. Bitte App neu laden.',lang))
        try:
            response = await handler(request)
        except Invalid as exc:
            response = web.json_response({'error': str(exc)}, status=409)
        except (json.JSONDecodeError, TypeError, AttributeError):
            response = web.json_response({'error': 'Ungültige Anfrage.'}, status=400)
        except (HAError, ClientError, asyncio.TimeoutError, OSError) as exc:
            message = str(exc) if isinstance(exc, HAError) else 'HA oder Sicherungsspeicher ist nicht erreichbar.'
            response = web.json_response({'error': message}, status=502)
        if response.content_type == 'application/json' and 'Content-Disposition' not in response.headers:
            response.text = json.dumps(payload(json.loads(response.body),lang),ensure_ascii=False)
        response.headers.update({'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
                                 'Referrer-Policy': 'no-referrer',
                                 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"})
        return response

    app = web.Application(middlewares=[guard], client_max_size=64 * 1024)

    async def index(request):
        return web.Response(text=(STATIC / 'index.html').read_text(encoding='utf-8'), content_type='text/html')

    async def asset(request):
        name = request.match_info['name']
        types = {'app.js':'text/javascript', 'matrix.js':'text/javascript',
                 'i18n.js':'text/javascript', 'style.css':'text/css', 'icon.png':'image/png'}
        if name not in types:
            raise web.HTTPNotFound()
        return web.Response(body=(STATIC / name).read_bytes(), content_type=types[name])

    async def bootstrap(request):
        users = await manager.ha.users()
        return web.json_response({'version': VERSION, 'csrf': csrf,
                                  'users': public_users(users), 'users_hash': fingerprint(users),
                                  **await manager.catalog(),
                                  'backups': manager.list_backups()})

    async def view(request):
        path = request.query.get('path') or None
        cfg = await manager.ha.config(path)
        return web.json_response({'views': summary(cfg), 'generated': 'strategy' in cfg,
                                  'config_hash': fingerprint(cfg)})

    async def matrix(request):
        body = await request.json()
        return web.json_response(await manager.matrix(request[ACTOR], body.get('path'),
                                body.get('rows'), body.get('config_hash'), body.get('users_hash')))

    async def preview(request):
        body = await request.json()
        return web.json_response(await manager.preview(request[ACTOR], body.get('path'),
                                                       body.get('operation'), body.get('users', [])))

    async def commit(request):
        body = await request.json()
        token = body.get('token')
        if not isinstance(token, str):
            raise Invalid('Vorschau fehlt.')
        return web.json_response(await manager.commit(request[ACTOR], token))

    async def restore(request):
        return web.json_response(await manager.restore(request[ACTOR], (await request.json()).get('id')))

    async def download(request):
        r = manager.read_backup(request.match_info['name'])
        return web.json_response(r, headers={'Content-Disposition': 'attachment; filename="dashboard-backup.json"'})

    app.router.add_get('/', index)
    app.router.add_get('/static/{name}', asset)
    async def locales(request):
        return web.Response(body=(STATIC.parent / 'locales.json').read_bytes(),content_type='application/json')
    app.router.add_get('/locales.json',locales)
    app.router.add_get('/health', index)  # answered by middleware without HA credentials
    app.router.add_get('/api/bootstrap', bootstrap)
    app.router.add_get('/api/views', view)
    app.router.add_post('/api/preview', preview)
    app.router.add_post('/api/matrix', matrix)
    app.router.add_post('/api/commit', commit)
    app.router.add_post('/api/restore', restore)
    app.router.add_get('/api/backups/{name}', download)
    return app


async def main():
    token = os.environ.get('SUPERVISOR_TOKEN')
    if not token:
        raise SystemExit('SUPERVISOR_TOKEN fehlt. Diese App benötigt Home Assistant Supervisor.')
    async with ClientSession(timeout=ClientTimeout(total=60)) as session:
        manager = Manager(HA(session, token), '/data/backups')
        app = create_app(manager)
        runner = web.AppRunner(app, access_log=None)
        await runner.setup()
        await web.TCPSite(runner, '0.0.0.0', 8099).start()
        logging.info('Dashboard-Benutzerverwaltung %s bereit, nur Ingress.', VERSION)
        try:
            await asyncio.Event().wait()
        finally:
            await runner.cleanup()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
