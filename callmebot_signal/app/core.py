"""Original UGSo CallMeBot Signal gateway. Provider secrets never enter MQTT payloads."""
import json
import os
import queue
import re
import threading
import time
from collections import OrderedDict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

TOPIC = "ugso/callmebot_signal"
PROFILE = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


class Failure(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def provider_send(profile, message):
    query = urlencode({"phone": profile["phone"], "text": message,
                       "apikey": profile["api_key"]})
    request = Request("https://signal.callmebot.com/signal/send.php?" + query,
                      headers={"User-Agent": "UGSo-CallMeBot/0.1.0"})
    try:
        with build_opener(NoRedirect()).open(request, timeout=20) as response:
            body = response.read(16385)
            if response.status != 200 or len(body) > 16384 or b"ERROR" in body.upper():
                raise Failure("provider_rejected")
    except (HTTPError, URLError, TimeoutError, OSError):
        # Never return provider response bodies, request URLs, numbers or keys.
        raise Failure("provider_unavailable") from None


class Gateway:
    def __init__(self, directory, sender=provider_send, clock=time.monotonic):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / "profiles.json"
        self.lock = threading.RLock()
        self.sender, self.clock = sender, clock
        self.settings = {"profiles": [], "default_profile": ""}
        if self.path.exists():
            self.settings = self.validate(json.loads(self.path.read_text("utf-8")))
        self.pending = queue.Queue(maxsize=20)
        self.seen = OrderedDict()
        self.last_attempt = {}
        self.recent = []
        self.connected = False
        self.publish = lambda *args, **kwargs: None

    def validate(self, data):
        if not isinstance(data, dict) or set(data) != {"profiles", "default_profile"}:
            raise Failure("invalid_config")
        rows = data["profiles"]
        if not isinstance(rows, list) or len(rows) > 16:
            raise Failure("invalid_config")
        old = {p["id"]: p for p in self.settings["profiles"]}
        clean, ids = [], set()
        for row in rows:
            if not isinstance(row, dict) or set(row) - {"id", "name", "phone", "api_key", "key_configured"}:
                raise Failure("invalid_profile")
            pid = row.get("id", "")
            name, phone, key = row.get("name", ""), row.get("phone", ""), row.get("api_key", "")
            if not isinstance(pid, str) or not PROFILE.fullmatch(pid) or pid in ids:
                raise Failure("invalid_profile")
            if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80:
                raise Failure("invalid_profile")
            if not isinstance(phone, str) or not (re.fullmatch(r"\+[1-9][0-9]{6,14}", phone) or re.fullmatch(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", phone)):
                raise Failure("invalid_phone")
            if not isinstance(key, str):
                raise Failure("invalid_key")
            key = key or old.get(pid, {}).get("api_key", "")
            if not re.fullmatch(r"[A-Za-z0-9_-]{3,200}", key):
                raise Failure("invalid_key")
            ids.add(pid)
            clean.append({"id": pid, "name": name.strip(), "phone": phone, "api_key": key})
        if not isinstance(data["default_profile"], str) or (clean and data["default_profile"] not in ids) or (not clean and data["default_profile"]):
            raise Failure("invalid_default")
        return {"profiles": clean, "default_profile": data["default_profile"]}

    def save(self, data):
        with self.lock:
            clean = self.validate(data)
            temporary = self.path.with_suffix(".tmp")
            fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(clean, stream, ensure_ascii=False)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.path)
            self.settings = clean
        self.publish_profiles()

    def profile_catalog(self):
        with self.lock:
            return {"source": "ugso_callmebot_signal", "profiles": [{"id": p["id"], "name": p["name"]} for p in self.settings["profiles"]],
                    "default_profile": self.settings["default_profile"], "count": len(self.settings["profiles"])}

    def publish_profiles(self):
        try:
            self.publish(TOPIC + "/profiles", json.dumps(self.profile_catalog(), ensure_ascii=False), qos=0, retain=True)
        except Exception:
            pass  # The latest catalog is republished when MQTT reconnects.

    def public(self):
        with self.lock:
            return {"profiles": [{k: v for k, v in p.items() if k != "api_key"} | {"key_configured": True} for p in self.settings["profiles"]],
                    "default_profile": self.settings["default_profile"], "connected": self.connected,
                    "recent": list(self.recent), "topic": TOPIC + "/send", "version": "0.1.0"}

    def submit(self, data, retained=False):
        if retained:
            raise Failure("retained_rejected")
        if not isinstance(data, dict) or set(data) - {"profile", "message", "request_id", "loglevel"}:
            raise Failure("invalid_message")
        pid = data.get("profile", "") or self.settings["default_profile"]
        message, rid, level = data.get("message"), data.get("request_id", ""), data.get("loglevel", "errors")
        if not isinstance(pid, str) or not PROFILE.fullmatch(pid):
            raise Failure("unknown_profile")
        if not isinstance(message, str) or not message.strip() or len(message) > 4000:
            raise Failure("invalid_message")
        if not isinstance(rid, str) or len(rid) > 100 or (rid and not re.fullmatch(r"[A-Za-z0-9_-]+", rid)) or level not in ("none", "errors", "info"):
            raise Failure("invalid_message")
        with self.lock:
            if not any(p["id"] == pid for p in self.settings["profiles"]):
                raise Failure("unknown_profile")
            now = self.clock()
            while self.seen and next(iter(self.seen.values())) < now - 3600:
                self.seen.popitem(last=False)
            key = (pid, rid)
            if rid and key in self.seen:
                raise Failure("duplicate")
            try:
                self.pending.put_nowait({"profile": pid, "message": message, "request_id": rid, "loglevel": level})
            except queue.Full:
                raise Failure("queue_full") from None
            if rid:
                self.seen[key] = now
                if len(self.seen) > 1000:
                    self.seen.popitem(last=False)
        return {"status": "queued", "profile": pid, "request_id": rid}

    def process(self, item):
        pid, code = item["profile"], "accepted"
        try:
            with self.lock:
                profile = next((dict(p) for p in self.settings["profiles"] if p["id"] == pid), None)
                if not profile:
                    raise Failure("unknown_profile")
                now = self.clock()
                if now - self.last_attempt.get(pid, -1000) < 10:
                    raise Failure("rate_limited")
                self.last_attempt[pid] = now
            self.sender(profile, item["message"])
        except Failure as error:
            code = str(error)
        except Exception:
            code = "provider_unavailable"
        result = {"profile": pid, "request_id": item["request_id"], "status": code, "time": int(time.time())}
        with self.lock:
            self.recent = [result] + self.recent[:19]
        try:
            self.publish(TOPIC + "/result", json.dumps(result), qos=0, retain=False)
        except Exception:
            # A disconnected broker must not kill the worker or trigger a resend.
            pass
        if item["loglevel"] == "info" or (item["loglevel"] == "errors" and code != "accepted"):
            print("CallMeBot:", code, flush=True)
        return result

    def worker(self):
        while True:
            item = self.pending.get()
            try:
                self.process(item)
            finally:
                self.pending.task_done()


def connect_mqtt(gateway, options):
    import paho.mqtt.client as mqtt
    config = options.get("mqtt", {})
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="ugso-callmebot-signal", clean_session=True)
    username = os.environ.get("MQTT_USERNAME", config.get("username", ""))
    password = os.environ.get("MQTT_PASSWORD", config.get("password", ""))
    if username:
        client.username_pw_set(username, password)
    client.will_set(TOPIC + "/availability", "offline", qos=0, retain=True)
    def connected(client, userdata, flags, reason, properties):
        gateway.connected = not reason.is_failure
        if gateway.connected:
            client.subscribe(TOPIC + "/send", qos=0)
            client.publish(TOPIC + "/availability", "online", retain=True)
            discovery = {"name": "Profiles", "unique_id": "ugso_callmebot_signal_profiles", "default_entity_id": "sensor.ugso_callmebot_signal_profiles",
                         "state_topic": TOPIC + "/profiles", "value_template": "{{ value_json.count }}",
                         "json_attributes_topic": TOPIC + "/profiles", "availability_topic": TOPIC + "/availability",
                         "entity_category": "diagnostic", "icon": "mdi:account-multiple",
                         "device": {"identifiers": ["ugso_callmebot_signal"], "name": "UGSo CallMeBot Signal", "manufacturer": "UGSo", "sw_version": "0.1.0"}}
            client.publish("homeassistant/sensor/ugso_callmebot_signal/profiles/config", json.dumps(discovery), retain=True)
            gateway.publish_profiles()
    def disconnected(client, userdata, flags, reason, properties):
        gateway.connected = False
    def received(client, userdata, message):
        try:
            if len(message.payload) > 20000:
                raise Failure("invalid_message")
            gateway.submit(json.loads(message.payload), retained=message.retain)
        except (Failure, ValueError, UnicodeError) as error:
            code = str(error) if isinstance(error, Failure) else "invalid_message"
            client.publish(TOPIC + "/result", json.dumps({"status": code}), retain=False)
    client.on_connect, client.on_disconnect, client.on_message = connected, disconnected, received
    gateway.publish = client.publish
    client.connect_async(os.environ.get("MQTT_HOST", config.get("host", "core-mosquitto")), int(os.environ.get("MQTT_PORT", config.get("port", 1883))))
    client.loop_start()
    return client
