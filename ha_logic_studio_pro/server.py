"""Local preview or HA ingress app; HA entity access is read-only."""
import argparse
from datetime import datetime, timezone
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import re
import subprocess
import threading
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
import webbrowser
from ha_import import SourceReader,parse_documents

VERSION = '0.1.11'
ROOT = Path(__file__).resolve().parent
MAX_BODY = 1_000_000
TEST_RUN_SLOTS = threading.BoundedSemaphore(2)
OUTPUT_DOMAINS = {'switch', 'light', 'input_boolean', 'input_number', 'input_text'}
BOOL_DOMAINS = {'switch', 'light', 'input_boolean', 'binary_sensor'}
SAFE_ATTRIBUTES = {'brightness', 'temperature', 'current_temperature', 'target_temperature',
                   'battery', 'battery_level', 'humidity', 'current_humidity', 'voltage', 'current',
                   'power', 'energy', 'min', 'max', 'step', 'min_temp', 'max_temp', 'effect',
                   'color_temp_kelvin', 'min_color_temp_kelvin', 'max_color_temp_kelvin'}


def public_entity(item):
    entity_id = item.get('entity_id', '')
    if not re.fullmatch(r'[a-z_]+\.[a-z0-9_]+', entity_id):
        return None
    attr = item.get('attributes') or {}
    state = str(item.get('state', 'unknown'))[:500]
    domain = entity_id.split('.')[0]
    signal = 'BOOL' if domain in BOOL_DOMAINS else 'STRING'
    if signal == 'STRING' and state not in ('unknown', 'unavailable'):
        try:
            if math.isfinite(float(state)):
                signal = 'REAL'
        except ValueError:
            pass
    return {'entity_id': entity_id, 'name': str(attr.get('friendly_name') or entity_id)[:200],
            'state': state, 'domain': domain, 'signal_type': signal,
            'unit': str(attr.get('unit_of_measurement') or '')[:40],
            'device_class': str(attr.get('device_class') or '')[:60],
            'output_supported': domain in OUTPUT_DOMAINS,
            'attributes': {key: value for key, value in attr.items() if key in SAFE_ATTRIBUTES and
                           (value is None or type(value) in (str, int, float, bool)) and
                           (not isinstance(value, float) or math.isfinite(value)) and len(str(value)) <= 500}}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Store:
    def __init__(self, root):
        self.root = Path(root)
        self.lock = threading.Lock()

    def path(self, user):
        return self.root / ('workspace-' + hashlib.sha256(user.encode()).hexdigest()[:32] + '.json')

    def read(self, user):
        path = self.path(user)
        return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'revision': 0, 'plan': None, 'preferences': None}

    def write(self, user, payload):
        if not isinstance(payload, dict) or type(payload.get('revision')) is not int:
            raise ValueError('Revision fehlt.')
        plan, preferences = payload.get('plan'), payload.get('preferences', {})
        if not isinstance(plan, dict) or plan.get('format') != 'ugso.logic/1':
            raise ValueError('Ungültiges Projektformat.')
        if not isinstance(plan.get('blocks'), list) or len(plan['blocks']) > 200 or not isinstance(plan.get('links'), list) or len(plan['links']) > 500 or not isinstance(preferences, dict):
            raise ValueError('Projektlimit überschritten.')
        clean_prefs = {k: [v for v in preferences.get(k, []) if isinstance(v, str)][:100]
                       for k in ('favorites', 'recent', 'collapsed') if isinstance(preferences.get(k, []), list)}
        if preferences.get('language') in ('de', 'en', 'fr'):
            clean_prefs['language'] = preferences['language']
        with self.lock:
            old = self.read(user)
            if payload['revision'] != old['revision']:
                return None
            self.root.mkdir(parents=True, exist_ok=True)
            path = self.path(user)
            if path.exists():
                backups = self.root / 'backups'
                backups.mkdir(exist_ok=True)
                (backups / f'{path.stem}-{old["revision"]:08d}.json').write_bytes(path.read_bytes())
                for expired in sorted(backups.glob(path.stem + '-*.json'))[:-10]:
                    expired.unlink()
            result = {'revision': old['revision'] + 1, 'plan': plan, 'preferences': clean_prefs,
                      'saved_at': datetime.now(timezone.utc).isoformat()}
            temp = path.with_suffix('.tmp')
            temp.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
            temp.replace(path)
            return result


class LogicServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, data_dir, supervisor=False, demo=False, config_root=None):
        super().__init__(address, Handler)
        self.store = Store(data_dir)
        self.supervisor, self.demo = supervisor, demo
        self.sources=SourceReader(config_root,Path(data_dir)/'ha-source-backups') if config_root else None

    def entities(self):
        if self.demo:
            data = json.loads((ROOT / 'examples' / 'entities-demo.json').read_text(encoding='utf-8'))
        elif self.supervisor and os.environ.get('SUPERVISOR_TOKEN'):
            req = Request('http://supervisor/core/api/states', headers={
                'Authorization': 'Bearer ' + os.environ['SUPERVISOR_TOKEN'], 'Accept': 'application/json'})
            with build_opener(NoRedirect).open(req, timeout=12) as response:
                body = response.read(10_000_001)
                if len(body) > 10_000_000:
                    raise ValueError('Entitätsliste zu groß.')
                data = json.loads(body)
        else:
            raise ConnectionError('Keine HA-Verbindung.')
        if not isinstance(data, list):
            raise ValueError('Ungültige HA-Antwort.')
        return sorted(filter(None, (public_entity(item) for item in data)), key=lambda x: (x['name'].casefold(), x['entity_id']))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'web'), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        super().end_headers()

    def allowed(self):
        if self.server.supervisor:
            return self.client_address[0] == '172.30.32.2'
        return self.client_address[0] in ('127.0.0.1', '::1') and self.headers.get('Host', '').split(':')[0] in ('localhost', '127.0.0.1')

    def user(self):
        return self.headers.get('X-Remote-User-Id', 'ingress') if self.server.supervisor else 'local'

    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.allowed():
            self.reply(403, {'error': 'Nur über HA-Ingress beziehungsweise localhost öffnen.'})
            return
        route = urlsplit(self.path)
        try:
            if route.path == '/api/info':
                self.reply(200, {'version': VERSION, 'mode': 'homeassistant' if self.server.supervisor else 'demo' if self.server.demo else 'local',
                                 'entities_available': bool(self.server.demo or self.server.supervisor), 'read_only_ha': True})
            elif route.path == '/api/entities':
                query = parse_qs(route.query)
                search = query.get('q', [''])[0].casefold()[:200]
                domain = query.get('domain', [''])[0]
                output = query.get('output', ['0'])[0] == '1'
                offset = max(0, int(query.get('offset', ['0'])[0]))
                items = [e for e in self.server.entities() if (not output or e['output_supported']) and
                         (not domain or e['domain'] == domain) and search in (e['entity_id'] + ' ' + e['name']).casefold()]
                self.reply(200, {'items': items[offset:offset+100], 'total': len(items), 'offset': offset, 'demo': self.server.demo})
            elif route.path == '/api/workspace':
                self.reply(200, self.server.store.read(self.user()))
            elif route.path == '/api/ha-sources':
                if not self.server.sources:raise ValueError('Kein HA-Konfigurationsordner eingebunden. YAML-Datei oder Text importieren.')
                kind=parse_qs(route.query).get('kind',['automation'])[0]
                self.reply(200,{'items':self.server.sources.sources(kind),'read_only':True})
            elif route.path.startswith('/api/'):
                self.reply(404, {'error': 'Unbekannte API.'})
            else:
                candidate = Path(self.translate_path(route.path)).resolve()
                if not candidate.is_relative_to((ROOT / 'web').resolve()) or (candidate.is_dir() and not (candidate / 'index.html').is_file()):
                    self.reply(404, {'error': 'Nicht gefunden.'})
                else:
                    super().do_GET()
        except (ValueError, TypeError) as error:
            self.reply(400, {'error': 'Ungültige Anfrage oder Antwort.'})
        except Exception:
            self.reply(503, {'error': 'HA oder App-Speicher nicht erreichbar. Bitte erneut versuchen.'})

    def do_PUT(self):
        if not self.allowed():
            self.reply(403, {'error': 'Zugriff verweigert.'})
            return
        if urlsplit(self.path).path != '/api/workspace':
            self.reply(404, {'error': 'Nur Projektspeicherung erlaubt; keine HA-Schreibaktionen.'})
            return
        if self.headers.get_content_type() != 'application/json' or self.headers.get('Sec-Fetch-Site') == 'cross-site':
            self.reply(403, {'error': 'JSON-Anfrage derselben Herkunft erforderlich.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > MAX_BODY:
                self.reply(413, {'error': 'Maximal 1 MB.'})
                return
            result = self.server.store.write(self.user(), json.loads(self.rfile.read(length)))
            self.reply(409 if result is None else 200, {'error': 'Projekt wurde in einem anderen Fenster geändert.'} if result is None else {'revision': result['revision'], 'saved_at': result['saved_at']})
        except (ValueError, TypeError):
            self.reply(400, {'error': 'Ungültiges Projekt.'})
        except OSError:
            self.reply(503, {'error': 'Speichern fehlgeschlagen. Projekt als Datei sichern.'})

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == '/api/pro-export-yaml':
            self.export_yaml()
            return
        if not self.allowed() or self.headers.get_content_type()!='application/json' or self.headers.get('Sec-Fetch-Site')=='cross-site':
            self.reply(403,{'error':'JSON-Anfrage derselben Herkunft erforderlich.'});return
        if path == '/api/pro-test-run':
            self.run_javascript_preview()
            return
        if path!='/api/parse-ha':
            self.reply(404,{'error':'Nur lesender YAML-Import erlaubt.'});return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>MAX_BODY:raise ValueError('Maximal 1 MB.')
            payload=json.loads(self.rfile.read(length))
            items=parse_documents(payload.get('text'),payload.get('kind','automation'))
            self.reply(200,{'items':items})
        except Exception:
            self.reply(400,{'error':'YAML/JSON ungültig, zu groß oder nicht als HA-Eintrag unterstützt. Keine Datei verändert.'})

    def export_yaml(self):
        if (not self.allowed() or self.headers.get('Sec-Fetch-Site') == 'cross-site'
                or self.headers.get_content_type() != 'application/x-www-form-urlencoded'):
            self.reply(403, {'error': 'Zugriff verweigert.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 1 <= length <= 3 * MAX_BODY:
                raise ValueError()
            fields = parse_qs(self.rfile.read(length).decode('ascii'), max_num_fields=2, errors='strict')
            filename, = fields['filename']
            source, = fields['source']
            body = source.replace('\r\n', '\n').encode('utf-8')
            if len(body) > MAX_BODY or not re.fullmatch(r'[\w-]{1,180}\.(script|automation)\.yaml', filename):
                raise ValueError()
        except (KeyError, ValueError):
            self.reply(400, {'error': 'YAML-Export ungültig oder zu groß.'})
            return
        self.send_response(200)
        self.send_header('Content-Type', 'application/yaml; charset=utf-8')
        self.send_header('Content-Disposition', "attachment; filename=logic-studio.yaml; filename*=UTF-8''" + quote(filename))
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def run_javascript_preview(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 1 <= length <= 400_000:
                raise ValueError()
            payload = json.loads(self.rfile.read(length))
            source = payload.get('source') if isinstance(payload, dict) else None
            if not isinstance(source, str) or not source.strip() or len(source.encode('utf-8')) > 64_000:
                raise ValueError()
        except (ValueError, UnicodeError):
            self.reply(400, {'error': 'JavaScript-Quelltext mit höchstens 64 KB eingeben.'})
            return
        if not TEST_RUN_SLOTS.acquire(blocking=False):
            self.reply(429, {'error': 'Zwei Testläufe sind bereits aktiv.'})
            return
        try:
            env = {key: value for key, value in os.environ.items()
                   if key.upper() in {'PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR'}}
            result = subprocess.run(
                ['node', str(ROOT / 'runtime' / 'test-run.mjs'), '--stdin'],
                input=json.dumps({'source': source}), encoding='utf-8',
                capture_output=True, timeout=5, env=env, check=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
            )
            self.reply(200, json.loads(result.stdout))
        except subprocess.TimeoutExpired:
            self.reply(503, {'error': 'Zeitlimit des JavaScript-Testlaufs erreicht.'})
        except (OSError, ValueError, subprocess.SubprocessError):
            self.reply(503, {'error': 'JavaScript-Runtime nicht verfügbar. Node.js und npm-Abhängigkeiten prüfen.'})
        finally:
            TEST_RUN_SLOTS.release()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4181)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--ha-app', action='store_true')
    parser.add_argument('--demo-entities', action='store_true')
    parser.add_argument('--data-dir', default=str(ROOT / 'userdata'))
    parser.add_argument('--ha-config-root',default=None,help='Optionaler ausschließlich lesend verwendeter HA-Konfigurationsordner')
    args = parser.parse_args()
    host = '0.0.0.0' if args.ha_app else '127.0.0.1'
    with LogicServer((host, args.port), '/data' if args.ha_app else args.data_dir, args.ha_app, args.demo_entities, '/ha-config' if args.ha_app else args.ha_config_root) as server:
        print(f'HA Logic Studio Pro {VERSION}: ' + ('HA-Ingress' if args.ha_app else f'http://127.0.0.1:{args.port}/'), flush=True)
        if not args.no_browser and not args.ha_app:
            webbrowser.open(f'http://127.0.0.1:{args.port}/')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
