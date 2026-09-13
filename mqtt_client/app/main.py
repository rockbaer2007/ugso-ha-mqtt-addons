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
from pathlib import Path

import paho.mqtt.client as mqtt

LOG = logging.getLogger("mqtt-client")
ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
COMMAND_DOMAINS = {"switch", "light", "input_boolean", "fan"}


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
    def __init__(self, config, ha, client=None):
        self.config = config
        self.ha = ha
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
            return
        self.generation += 1
        for topic in self.command_topics:
            # QoS 0 avoids replay of QoS 1 command deliveries after reconnect.
            client.subscribe(topic, qos=0)
        self.connected.set()
        LOG.info("Mit externem MQTT-Broker verbunden")

    def on_disconnect(self, client, userdata, flags, reason_code, properties):
        self.connected.clear()
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


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        config = Config.load(json.loads(Path("/data/options.json").read_text(encoding="utf-8")))
    except (OSError, ValueError, TypeError) as error:
        LOG.error("Konfiguration ungültig (%s); App-Optionen prüfen", type(error).__name__)
        return 1
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        LOG.error("Home-Assistant-API-Zugang fehlt (SUPERVISOR_TOKEN)")
        return 1
    bridge = Bridge(config, HomeAssistant(token))
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: bridge.stop.set())
    LOG.info("MQTT-Client 0.1.0: %d Entitäten, %d Befehlsfreigaben", len(config.entities), len(config.command_entities))
    bridge.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
