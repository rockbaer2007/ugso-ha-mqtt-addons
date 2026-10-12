"""Local UI fixture with disposable settings and acknowledged fake MQTT publishes."""
import json
import sys
import tempfile
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import AppController, Bridge, Config, make_handler


class PreviewBridge(Bridge):
    def __init__(self, config, ha, status=None):
        client = Mock(); client.publish.return_value.rc = 0
        client.publish.return_value.is_published.return_value = True
        super().__init__(config, ha, client, status)

    def run(self):
        self.connected.set(); self.status.set_connected(True)
        self.poll(); self.status.update(mode="websocket")
        self.stop.wait()


with tempfile.TemporaryDirectory(prefix="mqtt-client-ui-") as directory:
    path = Path(directory) / "options.json"
    path.write_text(json.dumps({"broker_host": "demo-broker", "password": "test-private-password", "entities": ["switch.test"], "publish_delay_ms": 0}), encoding="utf-8")
    controller = AppController(path, "test-private-token", PreviewBridge)
    controller.ha = Mock()
    controller.ha.full_states.return_value = [
        {"entity_id": "switch.test", "state": "on", "attributes": {"friendly_name": "Demo switch"}},
        {"entity_id": "cover.blind", "state": "closed", "attributes": {"friendly_name": "Blind"}},
    ]
    controller.inventory.remember(Config.load(controller.read_options()), "ha_external/old/state", "sensor.removed")
    controller.start()
    try:
        ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), make_handler(controller)).serve_forever()
    finally:
        controller.stop()
