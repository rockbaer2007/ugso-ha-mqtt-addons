"""Real WebSocket frames and MQTT broker; optional websockets test dependency."""
import json
import os
import queue
import sys
import threading
import time
import unittest
from uuid import uuid4
from pathlib import Path
from unittest.mock import Mock
import paho.mqtt.client as mqtt

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import Bridge, Config, HomeAssistant, RuntimeStatus
try:
    from websockets.sync.server import serve
except ImportError:
    serve = None


@unittest.skipUnless(os.environ.get("MQTT_TEST_PORT") and serve, "Disposable MQTT broker and websockets test dependency required")
class LiveIntegration(unittest.TestCase):
    def test_short_transitions_fallback_reconnect_and_extended_command(self):
        state = {"entity_id": "cover.blind", "state": "closed", "attributes": {"friendly_name": "Blind"}}
        events = queue.Queue()
        connections = []
        reconnect_allowed = threading.Event(); reconnect_allowed.set()
        def handler(ws):
            connections.append(ws)
            if not reconnect_allowed.is_set():
                ws.close(); return
            ws.send(json.dumps({"type": "auth_required"}))
            auth = json.loads(ws.recv()); self.assertEqual(auth["access_token"], "test-only")
            ws.send(json.dumps({"type": "auth_ok"}))
            sub = json.loads(ws.recv()); self.assertEqual(sub["event_type"], "state_changed")
            ws.send(json.dumps({"id": 1, "type": "result", "success": True}))
            ws.recv(); ws.send(json.dumps({"id": 2, "type": "result", "success": True, "result": [dict(state)]}))
            while True:
                try:
                    command = json.loads(ws.recv(timeout=0.05))
                    if command.get("type") == "ping":
                        ws.send(json.dumps({"id": command["id"], "type": "pong"}))
                except TimeoutError:
                    pass
                except Exception:
                    return
                try:
                    event = events.get_nowait()
                except queue.Empty:
                    continue
                ws.send(json.dumps({"id": 1, "type": "event", "event": {"data": {"entity_id": "cover.blind", "new_state": event}}}))
        server = serve(handler, "127.0.0.1", 0)
        server_thread = threading.Thread(target=server.serve_forever, daemon=True); server_thread.start()
        port = server.socket.getsockname()[1]
        ha = HomeAssistant("test-only", f"http://127.0.0.1:{port}/api")
        ha.full_states = Mock(side_effect=lambda: [dict(state)])
        ha.command = Mock()
        prefix = "live_" + uuid4().hex
        config = Config.load({"broker_host": "127.0.0.1", "broker_port": int(os.environ["MQTT_TEST_PORT"]), "client_id": prefix, "topic_prefix": prefix, "entities": ["cover.blind"], "poll_interval": 1, "publish_delay_ms": 0})
        received = []
        probe = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=prefix + "_probe")
        probe.on_message = lambda c, u, m: received.append((m.topic, m.payload.decode())) if m.topic.startswith(prefix + "/") else None
        probe.connect(config.host, config.port); probe.loop_start(); probe.subscribe(prefix + "/#", qos=1)
        status = RuntimeStatus(); bridge = Bridge(config, ha, status=status)
        thread = threading.Thread(target=bridge.run, daemon=True); thread.start()
        def wait(predicate):
            deadline = time.monotonic() + 15
            while not predicate():
                if time.monotonic() >= deadline:
                    self.fail(f"Timed out; topic={topic}; status={status.snapshot()}; received={received}")
                time.sleep(0.02)
        try:
            wait(lambda: status.snapshot()["mode"] == "websocket")
            topic = prefix + "/blind/blind/state"
            # Derive the app's published topic without assuming device-name grouping.
            wait(lambda: any(t.endswith("/state") for t, p in received))
            topic = next(t for t, p in received if t.endswith("/state"))
            received.clear()
            for value in ["opening", "open", "closing", "closed"]:
                events.put({**state, "state": value})
            expected = ["opening", "open", "closing", "closed"]
            def transitions():
                values = [p for t, p in received if t == topic]
                return values[values.index("opening"):] if "opening" in values else []
            wait(lambda: len(transitions()) >= 4)
            self.assertEqual(transitions()[:4], expected)
            info = probe.publish(config.prefix + "/cover.blind/set", '{"position":45}', qos=1)
            info.wait_for_publish(timeout=5)
            wait(lambda: ha.command.called)
            ha.command.assert_called_with("cover.blind", "set_cover_position", {"position": 45})
            reconnect_allowed.clear(); connections[-1].close()
            wait(lambda: status.snapshot()["mode"] == "polling")
            before = ha.full_states.call_count
            state["state"] = "open"
            wait(lambda: ha.full_states.call_count > before and (topic, "open") in received)
            reconnect_allowed.set()
            wait(lambda: status.snapshot()["mode"] == "websocket")
            self.assertTrue(status.snapshot()["ha_connected"])
        finally:
            bridge.stop.set()
            if getattr(bridge, "stream", None): bridge.stream.close()
            thread.join(timeout=15)
            probe.disconnect(); probe.loop_stop(); server.shutdown(); server_thread.join(timeout=5)
        self.assertFalse(thread.is_alive())


if __name__ == "__main__": unittest.main()
