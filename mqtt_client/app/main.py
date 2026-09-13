"""Independent HA -> external MQTT client, with explicit command permissions."""

import json
import logging
import os
import queue
import re
import signal
import ssl
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import NamedTemporaryFile

import paho.mqtt.client as mqtt

LOG = logging.getLogger("mqtt-client")
ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
COMMAND_DOMAINS = {"switch", "light", "input_boolean", "fan"}
OPTIONS_PATH = Path(os.environ.get("MQTT_CLIENT_OPTIONS", "/data/options.json"))
INGRESS_PORT = int(os.environ.get("MQTT_CLIENT_INGRESS_PORT", "8099"))
APP_VERSION = "0.1.1"


INDEX_HTML = """<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MQTT-Client</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: var(--ha-card-background, #111827); color: var(--primary-text-color, #f9fafb); }
    main { max-width: 560px; margin: 0 auto; padding: 24px 16px 32px; }
    h1 { font-size: 1.35rem; margin: 0 0 18px; font-weight: 650; }
    form { display: grid; gap: 14px; }
    label { display: grid; gap: 6px; font-size: .93rem; }
    input { box-sizing: border-box; width: 100%; border: 1px solid rgba(148, 163, 184, .55); border-radius: 8px; padding: 11px 12px; font: inherit; background: rgba(15, 23, 42, .18); color: inherit; }
    input:focus { outline: 2px solid #03a9f4; outline-offset: 1px; }
    .row { display: grid; grid-template-columns: 1fr 120px; gap: 12px; }
    .status { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; font-weight: 650; }
    .dot { width: 14px; height: 14px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, .18); }
    .status.connected .dot { background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, .18); }
    .hint { color: var(--secondary-text-color, #94a3b8); font-size: .85rem; margin: -4px 0 2px; }
    button { justify-self: start; border: 0; border-radius: 8px; padding: 11px 18px; font: inherit; font-weight: 650; color: #fff; background: #03a9f4; cursor: pointer; }
    button:disabled { opacity: .55; cursor: default; }
    .message { min-height: 1.35em; font-size: .9rem; color: var(--secondary-text-color, #94a3b8); }
    @media (max-width: 480px) { .row { grid-template-columns: 1fr; } main { padding-top: 18px; } }
  </style>
</head>
<body>
  <main>
    <h1>MQTT-Client</h1>
    <div id="status" class="status"><span class="dot"></span><span>Keine Verbindung</span></div>
    <form id="form" autocomplete="off">
      <div class="row">
        <label>IP oder Hostname
          <input id="broker_host" name="broker_host" required placeholder="192.168.1.20">
        </label>
        <label>Port
          <input id="broker_port" name="broker_port" type="number" min="1" max="65535" value="1883" required>
        </label>
      </div>
      <label>Username
        <input id="username" name="username" autocomplete="username">
      </label>
      <label>Passwort
        <input id="password" name="password" type="password" autocomplete="new-password" placeholder="unverändert lassen">
      </label>
      <p class="hint">Standardport für den ioBroker-MQTT-Adapter: 1883.</p>
      <button id="save" type="submit">Speichern und verbinden</button>
      <div id="message" class="message"></div>
    </form>
  </main>
  <script>
    const form = document.getElementById('form');
    const statusBox = document.getElementById('status');
    const message = document.getElementById('message');
    const save = document.getElementById('save');

    function setStatus(data) {
      statusBox.classList.toggle('connected', Boolean(data.connected));
      statusBox.querySelector('span:last-child').textContent = data.text || 'Keine Verbindung';
    }

    async function loadConfig() {
      const response = await fetch('./api/config', { cache: 'no-store' });
      const data = await response.json();
      form.broker_host.value = data.broker_host || '';
      form.broker_port.value = data.broker_port || 1883;
      form.username.value = data.username || '';
      setStatus(data.status || {});
    }

    async function refreshStatus() {
      try {
        const response = await fetch('./api/status', { cache: 'no-store' });
        setStatus(await response.json());
      } catch (error) {
        setStatus({ connected: false, text: 'Keine Verbindung' });
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.disabled = true;
      message.textContent = 'Speichere...';
      const payload = {
        broker_host: form.broker_host.value.trim(),
        broker_port: Number(form.broker_port.value || 1883),
        username: form.username.value.trim()
      };
      if (form.password.value) payload.password = form.password.value;
      try {
        const response = await fetch('./api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
        form.password.value = '';
        message.textContent = 'Gespeichert. Verbindung wird aufgebaut...';
        setStatus(data.status || {});
      } catch (error) {
        message.textContent = error.message;
      } finally {
        save.disabled = false;
      }
    });

    loadConfig().catch(() => message.textContent = 'Konfiguration konnte nicht geladen werden.');
    setInterval(refreshStatus, 3000);
  </script>
</body>
</html>"""


class RuntimeStatus:
    def __init__(self):
        self.lock = threading.Lock()
        self.connected = False
        self.message = "Keine Verbindung"

    def set_connected(self, connected, message=None):
        with self.lock:
            self.connected = connected
            self.message = message or ("Verbunden" if connected else "Keine Verbindung")

    def snapshot(self):
        with self.lock:
            return {"connected": self.connected, "text": self.message}


@dataclass(frozen=True)
class Config:
    host: str
    port: int
    username: str
    password: str
    tls: bool
    client_id: str
    prefix: str
    interval: int
    entities: tuple
    command_entities: tuple

    @classmethod
    def load(cls, options):
        host = str(options.get("broker_host", "")).strip()
        prefix = str(options.get("topic_prefix", "ha_external")).strip().strip("/")
        client_id = str(options.get("client_id", "ugso-ha-mqtt-client")).strip()
        if not host or any(c in host for c in "/\x00\r\n"):
            raise ValueError("broker_host muss einen Hostnamen oder eine IP enthalten")
        if not prefix or prefix.startswith("$") or any(c in prefix for c in "+#\x00"):
            raise ValueError("topic_prefix darf keine MQTT-Platzhalter enthalten")
        if not client_id or "\x00" in client_id:
            raise ValueError("client_id muss gesetzt sein")
        port = int(options.get("broker_port", 1883))
        interval = int(options.get("poll_interval", 5))
        if not 1 <= port <= 65535 or not 1 <= interval <= 300:
            raise ValueError("Port oder Abfrageintervall liegt außerhalb des erlaubten Bereichs")
        selections = []
        for key in ("entities", "command_entities"):
            values = options.get(key, [])
            if not isinstance(values, list) or any(not isinstance(v, str) or not ENTITY.fullmatch(v) for v in values):
                raise ValueError(f"{key} muss eine Liste konkreter Entity-IDs sein")
            selections.append(tuple(dict.fromkeys(values)))
        entities, commands = selections
        if not set(commands).issubset(entities):
            raise ValueError("command_entities muss eine Teilmenge von entities sein")
        if any(entity.split('.')[0] not in COMMAND_DOMAINS for entity in commands):
            raise ValueError("Befehle sind nur für switch, light, input_boolean und fan erlaubt")
        return cls(host, port, str(options.get("username", "")), str(options.get("password", "")),
                   bool(options.get("tls", False)), client_id, prefix, interval, entities, commands)

    def topic(self, entity, suffix):
        return f"{self.prefix}/{entity}/{suffix}"


class HomeAssistant:
    def __init__(self, token, base_url="http://supervisor/core/api"):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def request(self, path, data=None):
        request = urllib.request.Request(
            f"{self.base_url}/{path}",
            data=None if data is None else json.dumps(data).encode(),
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.load(response)

    def states(self):
        states = self.request("states")
        if not isinstance(states, list):
            raise ValueError("Invalid HA states response")
        return {state["entity_id"]: state["state"] for state in states}

    def command(self, entity, service):
        return self.request(f"services/{entity.split('.')[0]}/{service}", {"entity_id": entity})


class Bridge:
    def __init__(self, config, ha, client=None, status=None):
        self.config = config
        self.ha = ha
        self.status = status
        self.connected = threading.Event()
        self.stop = threading.Event()
        self.commands = queue.Queue(maxsize=50)
        self.generation = 0
        self.sent_generation = -1
        self.sent = {}
        self.availability = f"{config.prefix}/availability"
        self.command_topics = {config.topic(entity, "set"): entity for entity in config.command_entities}
        self.client = client or mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                                            client_id=config.client_id, clean_session=True)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)
        self.client.max_queued_messages_set(100)
        if config.username:
            self.client.username_pw_set(config.username, config.password)
        if config.tls:
            self.client.tls_set_context(ssl.create_default_context())
        self.client.will_set(self.availability, "offline", qos=1, retain=True)

    def on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            LOG.warning("MQTT-Anmeldung fehlgeschlagen: %s", reason_code)
            if self.status:
                self.status.set_connected(False, "Keine Verbindung")
            return
        self.generation += 1
        for topic in self.command_topics:
            # QoS 0 avoids replay of QoS 1 command deliveries after reconnect.
            client.subscribe(topic, qos=0)
        self.connected.set()
        if self.status:
            self.status.set_connected(True, "Verbunden")
        LOG.info("Mit externem MQTT-Broker verbunden")

    def on_disconnect(self, client, userdata, flags, reason_code, properties):
        self.connected.clear()
        if self.status:
            self.status.set_connected(False, "Keine Verbindung")
        LOG.info("MQTT-Verbindung getrennt; automatischer Wiederaufbau aktiv")

    def on_message(self, client, userdata, message):
        entity = self.command_topics.get(message.topic)
        if entity is None or message.retain or len(message.payload) > 16:
            return
        try:
            payload = message.payload.decode("utf-8").strip().upper()
        except UnicodeDecodeError:
            return
        service = {"ON": "turn_on", "OFF": "turn_off"}.get(payload)
        if service is None:
            LOG.warning("Ungültiger Befehl verworfen; nur ON/OFF erlaubt")
            return
        try:
            self.commands.put_nowait((time.monotonic(), self.generation, entity, service))
        except queue.Full:
            LOG.warning("Befehlswarteschlange voll; Befehl verworfen")

    def publish(self, topic, payload):
        info = self.client.publish(topic, payload, qos=1, retain=True)
        if info.rc != mqtt.MQTT_ERR_SUCCESS:
            raise ConnectionError("MQTT publish failed")
        info.wait_for_publish(timeout=5)
        if not info.is_published():
            raise ConnectionError("MQTT publish acknowledgement timed out")

    def poll(self):
        generation = self.generation
        if generation != self.sent_generation:
            self.sent.clear()
            self.sent_generation = generation
        states = self.ha.states()
        for entity in self.config.entities:
            state = states.get(entity, "unavailable")
            if self.sent.get(entity) != state:
                self.publish(self.config.topic(entity, "state"), state)
                self.sent[entity] = state
        self.publish(self.availability, "online")

    def process_command(self, command):
        created, generation, entity, service = command
        if self.connected.is_set() and generation == self.generation and time.monotonic() - created <= 10:
            self.ha.command(entity, service)

    def run(self):
        self.client.connect_async(self.config.host, self.config.port, keepalive=30)
        self.client.loop_start()
        next_poll = 0
        try:
            while not self.stop.is_set():
                if not self.connected.wait(timeout=1):
                    continue
                if time.monotonic() >= next_poll:
                    try:
                        self.poll()
                    except (OSError, ValueError, RuntimeError, KeyError) as error:
                        # Never log HTTP bodies, options, credentials or state payloads.
                        LOG.warning("Zustandsabgleich fehlgeschlagen (%s)", type(error).__name__)
                        try:
                            self.publish(self.availability, "offline")
                        except (OSError, RuntimeError, ValueError):
                            pass
                    next_poll = time.monotonic() + self.config.interval
                try:
                    command = self.commands.get(timeout=min(0.5, max(0, next_poll - time.monotonic())))
                except queue.Empty:
                    continue
                try:
                    self.process_command(command)
                    next_poll = 0
                except (OSError, ValueError) as error:
                    LOG.warning("HA-Befehl fehlgeschlagen (%s); keine Wiederholung", type(error).__name__)
        finally:
            try:
                if self.connected.is_set():
                    self.publish(self.availability, "offline")
            except (OSError, RuntimeError, ValueError):
                pass
            self.client.disconnect()
            self.client.loop_stop()


class AppController:
    def __init__(self, options_path, token, bridge_factory=Bridge):
        self.options_path = Path(options_path)
        self.token = token
        self.bridge_factory = bridge_factory
        self.lock = threading.Lock()
        self.status = RuntimeStatus()
        self.bridge = None
        self.thread = None

    def read_options(self):
        return json.loads(self.options_path.read_text(encoding="utf-8"))

    def write_options(self, options):
        self.options_path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile("w", encoding="utf-8", dir=self.options_path.parent, delete=False) as handle:
            json.dump(options, handle, indent=2)
            handle.write("\n")
            temp_path = Path(handle.name)
        temp_path.replace(self.options_path)

    def start(self):
        with self.lock:
            try:
                config = Config.load(self.read_options())
            except (OSError, ValueError, TypeError) as error:
                LOG.info("MQTT-Client wartet auf gültige Broker-Konfiguration (%s)", type(error).__name__)
                self.status.set_connected(False, "Keine Verbindung")
                return None
            self._start_locked(config)
            return config

    def stop(self):
        with self.lock:
            self._stop_locked()

    def _start_locked(self, config):
        self.status.set_connected(False, "Keine Verbindung")
        self.bridge = self.bridge_factory(config, HomeAssistant(self.token), status=self.status)
        self.thread = threading.Thread(target=self.bridge.run, name="mqtt-bridge", daemon=True)
        self.thread.start()

    def _stop_locked(self):
        if self.bridge:
            self.bridge.stop.set()
        thread = self.thread
        self.bridge = None
        self.thread = None
        if thread and thread.is_alive():
            thread.join(timeout=8)
        self.status.set_connected(False, "Keine Verbindung")

    def public_config(self):
        options = self.read_options()
        return {
            "broker_host": options.get("broker_host", ""),
            "broker_port": options.get("broker_port", 1883),
            "username": options.get("username", ""),
            "has_password": bool(options.get("password")),
            "status": self.status.snapshot(),
        }

    def update_connection(self, payload):
        with self.lock:
            options = self.read_options()
            for key in ("broker_host", "broker_port", "username"):
                if key in payload:
                    options[key] = payload[key]
            if "password" in payload:
                options["password"] = payload["password"]
            config = Config.load(options)
            self.write_options(options)
            self._stop_locked()
            self._start_locked(config)
        return self.public_config()


def make_handler(controller):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            LOG.debug("Web UI: " + fmt, *args)

        def send_json(self, status, data):
            body = json.dumps(data).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path.endswith("/api/config"):
                try:
                    self.send_json(HTTPStatus.OK, controller.public_config())
                except (OSError, ValueError, TypeError) as error:
                    self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})
                return
            if self.path.endswith("/api/status"):
                self.send_json(HTTPStatus.OK, controller.status.snapshot())
                return
            body = INDEX_HTML.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if not self.path.endswith("/api/config"):
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                result = controller.update_connection(payload)
                self.send_json(HTTPStatus.OK, result)
            except (json.JSONDecodeError, ValueError, TypeError) as error:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            except OSError as error:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})

    return Handler


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        LOG.error("Home-Assistant-API-Zugang fehlt (SUPERVISOR_TOKEN)")
        return 1
    controller = AppController(OPTIONS_PATH, token)
    config = controller.start()
    server = ThreadingHTTPServer(("0.0.0.0", INGRESS_PORT), make_handler(controller))

    def shutdown(*_):
        controller.stop()
        threading.Thread(target=server.shutdown, name="web-shutdown", daemon=True).start()

    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, shutdown)
    if config:
        LOG.info("MQTT-Client %s: %d Entitäten, %d Befehlsfreigaben", APP_VERSION,
                 len(config.entities), len(config.command_entities))
    else:
        LOG.info("MQTT-Client %s: Weboberfläche bereit, Broker noch nicht konfiguriert", APP_VERSION)
    LOG.info("Weboberfläche auf Port %d aktiv", INGRESS_PORT)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        controller.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
