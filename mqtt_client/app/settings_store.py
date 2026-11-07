"""Keep ingress settings independent of Supervisor-generated options.json."""
import copy
import json
import logging
import os
import threading
from pathlib import Path
from tempfile import NamedTemporaryFile


class SettingsStore:
    def __init__(self, options_path):
        self.options_path = Path(options_path)
        self.path = self.options_path.parent / "mqtt-settings.json"
        self.lock = threading.RLock()
        incoming = json.loads(self.options_path.read_text(encoding="utf-8"))
        if not isinstance(incoming, dict):
            raise ValueError("Invalid Supervisor options")
        if self.path.exists():
            record = json.loads(self.path.read_text(encoding="utf-8"))
            if not isinstance(record, dict) or record.get("format") != "ugso-mqtt-settings" or record.get("version") != 1 or not isinstance(record.get("options"), dict) or not isinstance(record.get("supervisor"), dict):
                raise ValueError("Invalid persistent MQTT settings")
            self.options = copy.deepcopy(record["options"])
            self.supervisor = copy.deepcopy(record["supervisor"])
            # An unchanged local mirror is not a Supervisor configuration edit.
            # A regenerated old baseline must not undo ingress settings.
            if incoming != self.options:
                for key, value in incoming.items():
                    if key not in self.supervisor or value != self.supervisor[key]:
                        self.options[key] = copy.deepcopy(value)
                self.supervisor = incoming
        else:
            self.options = copy.deepcopy(incoming)
            self.supervisor = incoming
        self.atomic_write(self.path, self.record(self.options))

    def record(self, options):
        return {"format": "ugso-mqtt-settings", "version": 1,
                "options": options, "supervisor": self.supervisor}

    @staticmethod
    def atomic_write(path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
                temporary = Path(handle.name)
                json.dump(data, handle, indent=2)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            temporary.replace(path)
        finally:
            if temporary:
                temporary.unlink(missing_ok=True)

    def read(self):
        with self.lock:
            return copy.deepcopy(self.options)

    def write(self, options):
        with self.lock:
            saved = copy.deepcopy(options)
            self.atomic_write(self.path, self.record(saved))
            self.options = saved
            # Backwards-compatible local mirror; the independent file above is
            # authoritative and survives Supervisor rewriting this mirror.
            try:
                self.atomic_write(self.options_path, saved)
            except OSError:
                logging.getLogger(__name__).warning("MQTT settings saved; options mirror could not be updated")
