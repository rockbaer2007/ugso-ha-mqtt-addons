"""HA event stream and a persistent inventory of retained topics owned by this app."""
import json
import threading
import time
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlsplit, urlunsplit

import websocket


def connect_socket(url, timeout=5, enable_multithread=True):
    socket = websocket.WebSocket(enable_multithread=enable_multithread)
    socket.settimeout(timeout)
    try:
        socket.connect(url)
    except BaseException:
        socket.shutdown()
        raise
    return socket


class StateStream:
    def __init__(self, ha, stop, deliver, status, connector=None):
        self.ha, self.stop, self.deliver, self.status = ha, stop, deliver, status
        self.connector = connector or connect_socket
        self.socket = None

    def session(self):
        parts = urlsplit(self.ha.base_url)
        url = urlunsplit(("wss" if parts.scheme == "https" else "ws", parts.netloc,
                          parts.path.rstrip("/") + "/websocket", "", ""))
        self.socket = self.connector(url, timeout=5, enable_multithread=True)
        ws = self.socket
        try:
            if json.loads(ws.recv()).get("type") != "auth_required":
                raise ValueError("HA authentication handshake")
            ws.send(json.dumps({"type": "auth", "access_token": self.ha.token}))
            if json.loads(ws.recv()).get("type") != "auth_ok":
                raise ValueError("HA authentication rejected")
            ws.send(json.dumps({"id": 1, "type": "subscribe_events", "event_type": "state_changed"}))
            buffered = []
            deadline = time.monotonic() + 15
            while not self.stop.is_set():
                reply = json.loads(ws.recv())
                if reply.get("type") == "event":
                    buffered.append(reply)
                elif reply.get("id") == 1:
                    if not reply.get("success"):
                        raise ValueError("HA subscription rejected")
                    break
                if len(buffered) > 10000 or time.monotonic() > deadline:
                    raise TimeoutError("HA subscription timeout")
            ws.send(json.dumps({"id": 2, "type": "get_states"}))
            while not self.stop.is_set():
                message = json.loads(ws.recv())
                if message.get("type") == "event":
                    buffered.append(message)
                    if len(buffered) > 10000:
                        raise ValueError("HA initial event buffer full")
                elif message.get("id") == 2:
                    if not message.get("success") or not isinstance(message.get("result"), list):
                        raise ValueError("HA initial states rejected")
                    self.deliver(("snapshot", message["result"]))
                    for event in buffered:
                        self.deliver(("event", event["event"]["data"]))
                    break
                if time.monotonic() > deadline:
                    raise TimeoutError("HA initial states timeout")
            if self.stop.is_set():
                return
            last_pong = last_ping = time.monotonic()
            ping_id = 3
            while not self.stop.is_set():
                try:
                    message = json.loads(ws.recv())
                except websocket.WebSocketTimeoutException:
                    message = {}
                if message.get("type") == "event":
                    self.deliver(("event", message["event"]["data"]))
                elif message.get("type") == "pong":
                    last_pong = time.monotonic()
                now = time.monotonic()
                if now - last_pong > 75:
                    raise TimeoutError("HA heartbeat timeout")
                if now - last_ping > 25:
                    ws.send(json.dumps({"id": ping_id, "type": "ping"}))
                    ping_id += 1
                    last_ping = now
        finally:
            try:
                ws.close()
            finally:
                ws.shutdown()
                self.socket = None

    def run(self):
        delay = 1
        while not self.stop.is_set():
            try:
                self.session()
                delay = 1
            except Exception as error:
                # Never expose tokens, payloads or server response bodies.
                if self.status:
                    self.status.update(mode="polling", stream_error=type(error).__name__)
                self.deliver(("fallback", None))
            if self.stop.wait(delay):
                break
            delay = min(delay * 2, 30)

    def close(self):
        socket = self.socket
        if socket:
            socket.close()


def broker_identity(config):
    return [config.host, config.port, config.username, config.tls]


class TopicInventory:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.RLock()
        self.records = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else []

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile("w", encoding="utf-8", dir=self.path.parent, delete=False) as handle:
            json.dump(self.records, handle)
            temp = Path(handle.name)
        temp.replace(self.path)

    def remember(self, config, topic, entity, attribute=None):
        with self.lock:
            broker = broker_identity(config)
            record = next((r for r in self.records if r["broker"] == broker and r["topic"] == topic), None)
            data = dict(broker=broker, topic=topic, entity=entity, attribute=attribute,
                        prefix=config.prefix, active=True)
            if record != data:
                if record:
                    record.update(data)
                else:
                    self.records.append(data)
                self.save()

    def reconcile(self, config, targets):
        with self.lock:
            changed = False
            for record in self.records:
                if record["broker"] == broker_identity(config):
                    active = record["topic"] in targets
                    if record["active"] != active:
                        record["active"] = active
                        changed = True
            if changed:
                self.save()

    def candidates(self, config):
        with self.lock:
            result = []
            for r in self.records:
                selected = (True if r["entity"] is None else r["entity"] in config.entities if r["attribute"] is None else
                            f'{r["entity"]}:{r["attribute"]}' in config.entity_attributes)
                if r["broker"] == broker_identity(config) and (not r["active"] or r["prefix"] != config.prefix or not selected):
                    result.append(r["topic"])
            return sorted(result)

    def forget(self, config, topic):
        with self.lock:
            self.records = [r for r in self.records if not (r["broker"] == broker_identity(config) and r["topic"] == topic)]
            self.save()
