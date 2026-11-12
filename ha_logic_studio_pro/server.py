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
import tempfile
import threading
from collections import deque
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
import webbrowser
from ha_import import SourceReader,parse_documents

VERSION = '0.1.62'
ROOT = Path(__file__).resolve().parent
MAX_BODY = 1_000_000
TEST_RUN_SLOTS = threading.BoundedSemaphore(2)
OUTPUT_DOMAINS = {'switch', 'light', 'input_boolean', 'input_number', 'input_text'}
BOOL_DOMAINS = {'switch', 'light', 'input_boolean', 'binary_sensor'}
SAFE_ATTRIBUTES = {'brightness', 'temperature', 'current_temperature', 'target_temperature',
                   'battery', 'battery_level', 'humidity', 'current_humidity', 'voltage', 'current',
                   'power', 'energy', 'min', 'max', 'step', 'min_temp', 'max_temp', 'effect',
                   'color_temp_kelvin', 'min_color_temp_kelvin', 'max_color_temp_kelvin',
                   'next_rising', 'next_setting', 'next_dawn', 'next_dusk', 'next_noon', 'next_midnight'}


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
    prefix = 'workspace'
    empty = {'revision': 0, 'plan': None, 'preferences': None}

    def __init__(self, root):
        self.root = Path(root)
        self.lock = threading.Lock()

    def path(self, user):
        return self.root / (self.prefix + '-' + hashlib.sha256(user.encode()).hexdigest()[:32] + '.json')

    def read(self, user):
        path = self.path(user)
        return json.loads(path.read_text(encoding='utf-8')) if path.exists() else self.empty.copy()

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
        return self.commit(user, payload['revision'], {'plan': plan, 'preferences': clean_prefs})

    def commit(self, user, revision, content):
        with self.lock:
            old = self.read(user)
            if revision != old['revision']:
                return None
            self.root.mkdir(parents=True, exist_ok=True)
            path = self.path(user)
            if path.exists():
                backups = self.root / 'backups'
                backups.mkdir(exist_ok=True)
                (backups / f'{path.stem}-{old["revision"]:08d}.json').write_bytes(path.read_bytes())
                for expired in sorted(backups.glob(path.stem + '-*.json'))[:-10]:
                    expired.unlink()
            result = {'revision': old['revision'] + 1, **content,
                      'saved_at': datetime.now(timezone.utc).isoformat()}
            temp = path.with_suffix('.tmp')
            temp.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
            temp.replace(path)
            return result


class ProjectStore(Store):
    prefix = 'pro-projects'
    empty = {'revision': 0, 'tree': None}

    def write(self, user, payload):
        if not isinstance(payload, dict) or type(payload.get('revision')) is not int:
            raise ValueError('Revision fehlt.')
        tree = payload.get('tree')
        if not isinstance(tree, dict) or set(tree) != {'folders', 'projects'}:
            raise ValueError('Ungültiger Projektbaum.')
        for key in ('folders', 'projects'):
            entries = tree[key]
            if not isinstance(entries, list) or len(entries) > 1000:
                raise ValueError('Ungültige Projektliste.')
            seen = set()
            for entry in entries:
                if not isinstance(entry, list) or len(entry) != 2:
                    raise ValueError('Ungültiger Projekteintrag.')
                entry_id, value = entry
                if not isinstance(entry_id, str) or len(entry_id) > 128 or entry_id in seen:
                    raise ValueError('Ungültige Projekt-ID.')
                seen.add(entry_id)
                if key == 'folders':
                    if not isinstance(value, str):
                        raise ValueError('Ungültiger Ordner.')
                elif not re.fullmatch(r'[0-9]{1,15}', entry_id) or not isinstance(value, dict) or not isinstance(value.get('name'), str) or value.get('type') not in (
                        'yaml', 'rules', 'blocks', 'blocks-js', 'flow', 'javascript', 'typescript'):
                    raise ValueError('Ungültiges Projekt.')
        return self.commit(user, payload['revision'], {'tree': tree})


class ScriptRuntime:
    def __init__(self):
        self.lock = threading.Lock()
        self.jobs = {}

    def status(self, user):
        with self.lock:
            return {key[1]: {'state': job['state'], 'messages': list(job['messages'])}
                    for key, job in self.jobs.items() if key[0] == user}

    def control(self, user, project_id, command, source=None, language=None, home_assistant=None):
        key = (user, project_id)
        with self.lock:
            previous = self.jobs.get(key)
            if previous and previous['process'].poll() is None:
                if command == 'start':
                    raise ValueError('Skript läuft bereits.')
                previous['state'] = 'stopped'
                previous['process'].terminate()
                previous['process'].wait(timeout=2)
            if command == 'stop':
                return
            if sum(job['process'].poll() is None for job in self.jobs.values()) >= 4:
                raise ValueError('Maximal vier laufende Skripte.')
            if key not in self.jobs and len(self.jobs) >= 64:
                expired = next((k for k, j in self.jobs.items() if j['process'].poll() is not None), None)
                if expired is not None:
                    del self.jobs[expired]
            env = {key: value for key, value in os.environ.items()
                   if key.upper() in {'PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR'}}
            with tempfile.TemporaryFile() as input_file:
                input_file.write(json.dumps({'source': source, 'language': language, 'homeAssistant': home_assistant}).encode())
                input_file.seek(0)
                runner = 'fbd-run.mjs' if language == 'flow' else 'live-run.mjs'
                process = subprocess.Popen(['node', str(ROOT / 'runtime' / runner)], stdin=input_file,
                                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, encoding='utf-8', env=env,
                                           creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            job = {'process': process, 'state': 'starting', 'messages': deque(maxlen=100)}
            self.jobs[key] = job
            threading.Thread(target=self.collect, args=(job,), daemon=True).start()

    def collect(self, job):
        process = job['process']
        with process.stdout as stream:
            for line in stream:
                message = json.loads(line)
                with self.lock:
                    if job['state'] == 'stopped':
                        continue
                    kind = message['type']
                    if kind in ('running', 'error'):
                        job['state'] = kind
                    if message['text']:
                        job['messages'].append({'text': message['text'], 'error': kind == 'error',
                                                'time': datetime.now(timezone.utc).isoformat()})
        with self.lock:
            if process.wait() and job['state'] not in ('error', 'stopped'):
                job['state'] = 'error'
            elif job['state'] != 'error':
                job['state'] = 'stopped'

    def close(self):
        with self.lock:
            for job in self.jobs.values():
                if job['process'].poll() is None:
                    job['process'].terminate()


class LogicServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, data_dir, supervisor=False, demo=False, config_root=None):
        super().__init__(address, Handler)
        self.store = Store(data_dir)
        self.projects = ProjectStore(data_dir)
        self.runtime = ScriptRuntime()
        self.supervisor, self.demo = supervisor, demo
        self.sources=SourceReader(config_root,Path(data_dir)/'ha-source-backups') if config_root else None
        self.runtime_options = Path(data_dir) / 'options.json'

    def live_runtime_config(self):
        if not self.supervisor:
            return None
        token = os.environ.get('SUPERVISOR_TOKEN')
        if not token:
            raise ValueError('HA-Verbindung für die Runtime nicht verfügbar.')
        options = json.loads(self.runtime_options.read_text(encoding='utf-8')) if self.runtime_options.exists() else {}
        result = {'token': token}
        for option, key, pattern in (
            ('runtime_read_entities', 'readable', r'[a-z][a-z0-9_]*\.[a-z0-9_]+'),
            ('runtime_write_entities', 'writable', r'[a-z][a-z0-9_]*\.[a-z0-9_]+'),
            ('runtime_events', 'events', r'[a-z][a-z0-9_]*'),
            ('runtime_mqtt_topics', 'mqttTopics', r'[^+#\x00-\x1f\x7f]+'),
        ):
            values = options.get(option, [])
            if not isinstance(values, list) or len(values) > 128 or any(
                not isinstance(value, str) or len(value) > 128 or not re.fullmatch(pattern, value) for value in values
            ):
                raise ValueError('Ungültige Runtime-Freigabe: ' + option)
            result[key] = list(dict.fromkeys(values))
        return result

    def server_close(self):
        self.runtime.close()
        super().server_close()

    def entity_states(self):
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
        return data

    def entities(self):
        return sorted(filter(None, (public_entity(item) for item in self.entity_states())), key=lambda x: (x['name'].casefold(), x['entity_id']))

    def action_names(self):
        if not self.supervisor or not os.environ.get('SUPERVISOR_TOKEN'):
            return []
        request = Request('http://supervisor/core/api/services', headers={
            'Authorization': 'Bearer ' + os.environ['SUPERVISOR_TOKEN'], 'Accept': 'application/json'})
        with build_opener(NoRedirect).open(request, timeout=12) as response:
            body = response.read(10_000_001)
        if len(body) > 10_000_000:
            raise ValueError('Aktionsliste zu groß.')
        return sorted({f'{item["domain"]}.{service}'
                       for item in json.loads(body) for service in item['services']
                       if re.fullmatch(r'[a-z0-9_]+', item['domain']) and re.fullmatch(r'[a-z0-9_]+', service)})

    def callmebot_catalogs(self):
        sources = {'ugso_callmebot': 'whatsapp', 'ugso_callmebot_signal': 'signal'}
        catalogs = {}
        for item in self.entity_states():
            if not isinstance(item, dict) or not str(item.get('entity_id', '')).startswith('sensor.'):
                continue
            if not str(item.get('state', '')).isdigit():
                continue
            attrs = item.get('attributes')
            if not isinstance(attrs, dict):
                continue
            source = attrs.get('source')
            profiles = attrs.get('profiles')
            if not isinstance(source, str) or source not in sources or not isinstance(profiles, list) or len(profiles) > 16:
                continue
            public = {}
            for profile in profiles:
                if not isinstance(profile, dict):
                    continue
                pid, name = profile.get('id'), profile.get('name')
                if isinstance(pid, str) and re.fullmatch(r'[a-z][a-z0-9_]{0,39}', pid) and isinstance(name, str):
                    public[pid] = name[:80]
            catalogs[sources[source]] = public
        return catalogs


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
            elif route.path == '/api/callmebot':
                self.reply(200, self.server.callmebot_catalogs() if self.server.supervisor or self.server.demo else {})
            elif route.path == '/api/rules-actions':
                self.reply(200, {'items': self.server.action_names()})
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
            elif route.path == '/api/pro-projects':
                self.reply(200, self.server.projects.read(self.user()))
            elif route.path == '/api/pro-runtime' and self.runtime_user():
                self.reply(200, self.server.runtime.status(self.user()))
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
        stores = {'/api/workspace': self.server.store, '/api/pro-projects': self.server.projects}
        store = stores.get(urlsplit(self.path).path)
        if store is None:
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
            result = store.write(self.user(), json.loads(self.rfile.read(length)))
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
        if path == '/api/pro-runtime':
            self.control_runtime()
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

    def runtime_user(self):
        return not self.server.supervisor or bool(self.headers.get('X-Remote-User-Id'))

    def control_runtime(self):
        if not self.runtime_user():
            self.reply(403, {'error': 'Benutzerkennung fehlt.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 1 <= length <= 400_000:
                raise ValueError('Ungültige Runtime-Anfrage.')
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Ungültige Runtime-Anfrage.')
            project_id, command = payload.get('id'), payload.get('command')
            if not isinstance(project_id, str) or not re.fullmatch(r'[0-9]{1,15}', project_id) or command not in ('start', 'stop', 'restart'):
                raise ValueError('Ungültiger Runtime-Befehl.')
            user = self.user()
            if command == 'stop':
                self.server.runtime.control(user, project_id, command)
            else:
                saved = self.server.projects.read(user)
                if payload.get('revision') != saved['revision']:
                    raise ValueError('Projektstand neu laden.')
                project = dict((saved['tree'] or {}).get('projects', [])).get(project_id, {})
                kind = project.get('type')
                if kind not in ('javascript', 'typescript', 'blocks-js', 'flow'):
                    raise ValueError('Projekttyp kann nicht in der Runtime gestartet werden.')
                source = (json.dumps(project['graph']) if kind == 'flow' and isinstance(project.get('graph'), dict)
                          else payload.get('source') if kind == 'blocks-js' else project.get('source'))
                if not isinstance(source, str) or not source.strip() or len(source.encode('utf-8')) > 64_000:
                    raise ValueError('Quelltext fehlt oder überschreitet 64 KB.')
                self.server.runtime.control(user, project_id, command, source,
                                            kind if kind in ('typescript', 'flow') else 'javascript',
                                            self.server.live_runtime_config())
            self.reply(200, self.server.runtime.status(user))
        except (ValueError, UnicodeError) as error:
            self.reply(400, {'error': str(error)})
        except (OSError, subprocess.SubprocessError):
            self.reply(503, {'error': 'Runtime konnte nicht gestartet werden.'})

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
            language = payload.get('language', 'javascript')
            if language not in ('javascript', 'typescript'):
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
            time_zone = None
            if self.server.supervisor and not self.server.demo:
                try:
                    req = Request('http://supervisor/core/api/config', headers={
                        'Authorization': 'Bearer ' + os.environ['SUPERVISOR_TOKEN'],
                        'Accept': 'application/json'})
                    with build_opener(NoRedirect).open(req, timeout=4) as response:
                        time_zone = json.loads(response.read(1_000_001))['time_zone']
                    if not isinstance(time_zone, str) or not time_zone:
                        raise ValueError()
                except (OSError, ValueError, KeyError, TypeError):
                    self.reply(503, {'error': 'Home-Assistant-Zeitzone für den Testlauf nicht verfügbar.'})
                    return
            result = subprocess.run(
                ['node', str(ROOT / 'runtime' / 'test-run.mjs'), '--stdin'],
                input=json.dumps({'source': source, 'language': language, 'timeZone': time_zone}), encoding='utf-8',
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
