"""Run with MQTT_TEST_PORT pointing to a disposable localhost MQTT broker."""
import json
import os
import sys
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import paho.mqtt.client as mqtt

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import Bridge, Config, HomeAssistant


@unittest.skipUnless(os.environ.get("MQTT_TEST_PORT"), "Set MQTT_TEST_PORT for real broker test")
class IntegrationTest(unittest.TestCase):
    def test_round_trip_and_ha_recovery(self):
        state = {"value": "off", "fail": False, "calls": []}

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def respond(self, value, status=200):
                self.send_response(status)
                self.end_headers()
                self.wfile.write(json.dumps(value).encode())

            def do_GET(self):
                if self.headers.get("Authorization") != "Bearer test-only-token":
                    return self.respond({}, 401)
                if state["fail"]:
                    return self.respond({}, 503)
                self.respond([{"entity_id": "switch.test", "state": state["value"]}])

            def do_POST(self):
                data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                state["calls"].append((self.path, data))
                state["value"] = "on" if self.path.endswith("turn_on") else "off"
                self.respond([])

        def wait(predicate):
            deadline = time.monotonic() + 10
            while not predicate():
                if time.monotonic() > deadline:
                    self.fail("Timed out waiting for MQTT/HA round trip")
                time.sleep(0.05)

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()
        port = int(os.environ["MQTT_TEST_PORT"])
        prefix = f"test_{os.getpid()}"
        messages = []
        probe = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"probe-{os.getpid()}")
        probe.on_message = lambda client, userdata, message: messages.append((message.topic, message.payload.decode()))
        probe.connect("127.0.0.1", port)
        probe.loop_start()
        probe.subscribe(f"{prefix}/#", qos=1)
        retained = probe.publish(f"{prefix}/switch.test/set", "ON", qos=1, retain=True)
        retained.wait_for_publish(timeout=5)
        config = Config.load({"broker_host": "127.0.0.1", "broker_port": port,
                              "client_id": f"app-{os.getpid()}", "topic_prefix": prefix,
                              "poll_interval": 1, "entities": ["switch.test"],
                              "command_entities": ["switch.test"]})
        bridge = Bridge(config, HomeAssistant("test-only-token", f"http://127.0.0.1:{server.server_port}/api"))
        worker = threading.Thread(target=bridge.run, daemon=True)
        worker.start()
        try:
            wait(lambda: (f"{prefix}/availability", "online") in messages)
            self.assertEqual(state["calls"], [], "Retained ON must not switch on at startup")
            self.assertIn((f"{prefix}/switch.test/state", "off"), messages)
            probe.publish(f"{prefix}/switch.test/set", "ON", qos=1, retain=False)
            wait(lambda: (f"{prefix}/switch.test/state", "on") in messages)
            self.assertEqual(state["calls"], [("/api/services/switch/turn_on", {"entity_id": "switch.test"})])
            state["fail"] = True
            wait(lambda: (f"{prefix}/availability", "offline") in messages)
            messages.clear()
            state["fail"] = False
            wait(lambda: (f"{prefix}/availability", "online") in messages)
            bridge.stop.set()
            worker.join(timeout=10)
            self.assertFalse(worker.is_alive())
            wait(lambda: messages[-1] == (f"{prefix}/availability", "offline"))
        finally:
            bridge.stop.set()
            worker.join(timeout=12)
            probe.disconnect()
            probe.loop_stop()
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
