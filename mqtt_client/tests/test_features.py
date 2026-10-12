import json
import queue
import ssl
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import AppController, Bridge, Config, HomeAssistant, RuntimeStatus, mqtt_command, tls_context
from live import StateStream, TopicInventory, connect_socket
from test_client import FakeBridge


class FeatureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.config = Config.load({"broker_host": "broker", "entities": ["switch.test"], "publish_delay_ms": 0})
        self.client = Mock()
        self.client.publish.return_value.rc = 0
        self.client.publish.return_value.is_published.return_value = True
        self.status = RuntimeStatus()
        self.ha = Mock()
        self.ha.full_states.return_value = [{"entity_id": "switch.test", "state": "off", "attributes": {"friendly_name": "Test"}}]
        self.bridge = Bridge(self.config, self.ha, self.client, self.status)
        self.bridge.inventory = TopicInventory(self.path / "topics.json")
        self.bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)

    def test_live_short_transitions_and_removal(self):
        self.bridge.process_event(("snapshot", self.ha.full_states()))
        self.client.publish.reset_mock()
        for state in ["on", "off"]:
            self.bridge.process_event(("event", {"entity_id": "switch.test", "new_state": {"entity_id": "switch.test", "state": state, "attributes": {"friendly_name": "Test"}}}))
        states = [call.args[1] for call in self.client.publish.call_args_list if call.args[0].endswith("/state")]
        self.assertEqual(states, ["on", "off"])
        self.assertEqual(self.ha.full_states.call_count, 1, "events do not request REST states")
        self.assertEqual(self.status.snapshot()["mode"], "websocket")
        self.bridge.process_event(("event", {"entity_id": "switch.test", "new_state": None}))
        self.assertIn("unavailable", [c.args[1] for c in self.client.publish.call_args_list])
        self.bridge.process_event(("fallback", None))
        self.assertFalse(self.bridge.live)

    def test_topic_rename_republishes_same_value_and_tracks_old_topic(self):
        self.bridge.poll()
        old = self.client.publish.call_args_list[0].args[0]
        self.ha.full_states.return_value[0]["attributes"]["friendly_name"] = "Renamed"
        self.bridge.poll()
        candidates = self.bridge.inventory.candidates(self.config)
        self.assertEqual(candidates, [old])
        self.assertEqual(TopicInventory(self.path / "topics.json").candidates(self.config), [old])
        with self.assertRaises(ValueError):
            self.bridge.cleanup(["another/app/state"])
        self.assertEqual(self.bridge.cleanup([old]), [old])
        self.assertEqual(self.bridge.inventory.candidates(self.config), [])
        self.assertIn(((old, ""), {"qos": 1, "retain": True}), [(c.args, c.kwargs) for c in self.client.publish.call_args_list])

    def test_cleanup_never_deletes_active_or_other_broker_topics(self):
        self.bridge.poll()
        topic = self.client.publish.call_args_list[0].args[0]
        with self.assertRaises(ValueError):
            self.bridge.cleanup([topic])
        other = Config.load({"broker_host": "other", "entities": []})
        self.assertEqual(self.bridge.inventory.candidates(other), [])
        changed = Config.load({"broker_host": "broker", "topic_prefix": "new", "entities": []})
        self.assertEqual(len(self.bridge.inventory.candidates(changed)), 2, "state and old availability")

    def test_failed_cleanup_keeps_inventory_for_retry(self):
        self.bridge.inventory.remember(self.config, "ha_external/old/state", "sensor.old")
        self.client.publish.return_value.is_published.return_value = False
        with self.assertRaises(ConnectionError):
            self.bridge.cleanup(["ha_external/old/state"])
        self.assertEqual(self.bridge.inventory.candidates(self.config), ["ha_external/old/state"])

    def test_overflow_forces_resync_and_reports_it(self):
        self.bridge.events = queue.Queue(maxsize=1)
        self.bridge.deliver_event(("snapshot", []))
        with self.assertRaises(ConnectionError):
            self.bridge.deliver_event(("event", {"entity_id": "switch.test"}))
        self.assertEqual(self.bridge.events.get_nowait(), ("fallback", None))
        self.assertEqual(self.status.snapshot()["dropped_events"], 1)

    def test_extended_commands_are_strict(self):
        for entity, payload, expected in [
            ("cover.blind", "OPEN", "open_cover"), ("cover.blind", "CLOSE", "close_cover"),
            ("cover.blind", "STOP", "stop_cover"), ("cover.blind", '{"position":45}', ("set_cover_position", {"position": 45})),
            ("light.test", '{"brightness_pct":75}', ("turn_on", {"brightness_pct": 75})),
            ("fan.test", '{"percentage":50}', ("set_percentage", {"percentage": 50})),
        ]:
            self.assertEqual(mqtt_command(entity, payload), expected)
        for payload in ['{"position":101}', '{"position":true}', '{"position":NaN}', '{"position":50,"entity_id":"cover.other"}', 'ON', '{}', '[]']:
            with self.assertRaises(ValueError):
                mqtt_command("cover.blind", payload)
        for payload in ["nan", "inf", "-inf"]:
            with self.assertRaises(ValueError):
                mqtt_command("number.test", payload)

    def test_backup_roundtrip_secret_policy_and_validation(self):
        options = self.path / "options.json"
        options.write_text(json.dumps({"broker_host": "broker", "password": "private", "entities": ["cover.blind"], "poll_interval": 2}), encoding="utf-8")
        controller = AppController(options, "ha-private", FakeBridge)
        self.addCleanup(controller.stop)
        backup = controller.export_settings()
        self.assertNotIn("private", json.dumps(backup))
        self.assertNotIn("tls_key", backup["options"])
        controller.import_settings(backup)
        self.assertEqual(controller.read_options()["password"], "private")
        self.assertIn("cover.blind", controller.public_config()["command_entities"])
        backup["options"]["broker_host"] = "new-broker"
        controller.import_settings(backup)
        self.assertEqual(controller.read_options()["password"], "")
        before = options.read_text()
        backup["options"]["entities"] = ["sensor.*"]
        with self.assertRaises(ValueError):
            controller.import_settings(backup)
        self.assertEqual(options.read_text(), before)
        with self.assertRaises(ValueError):
            controller.cleanup_retained({"topics": []})

    def test_status_reports_transfer_and_no_secret(self):
        self.bridge.poll()
        status = self.status.snapshot()
        self.assertTrue(status["mqtt_connected"] and status["ha_connected"])
        self.assertIsNotNone(status["last_sync"])
        self.assertIsNotNone(status["last_publish"])
        self.assertEqual(status["published"], 2)
        self.assertNotIn("password", status)

    def test_existing_015_settings_survive_start_and_selection_save(self):
        old = {"broker_host": "existing-broker", "broker_port": 1883, "username": "existing-user",
               "password": "keep-password", "tls": False, "client_id": "existing-client",
               "topic_prefix": "existing/tree", "poll_interval": 17, "publish_delay_ms": 50,
               "entities": ["switch.test", "sensor.temperature"],
               "entity_attributes": ["sensor.temperature:unit_of_measurement"],
               "command_entities": ["switch.test"]}
        options = self.path / "options.json"
        text = json.dumps(old); options.write_text(text, encoding="utf-8")
        controller = AppController(options, "private", FakeBridge)
        self.addCleanup(controller.stop)
        controller.start()
        self.assertEqual(options.read_text(), text, "startup does not migrate or rewrite existing settings")
        controller.update_selections({k: old[k] for k in ("entities", "entity_attributes", "command_entities")})
        self.assertEqual(controller.read_options(), old)
        config = Config.load(old)
        self.assertEqual(config.topic("switch.test", "set"), "existing/tree/switch.test/set")
        self.assertEqual((config.tls_ca, config.tls_cert, config.tls_key), ("", "", ""))
        self.assertEqual(controller.inventory.records, [], "upgrade does not delete pre-existing retained values")

    def test_websocket_handshake_snapshot_and_buffered_events(self):
        stop, received = threading.Event(), []
        messages = [{"type": "auth_required"}, {"type": "auth_ok"},
                    {"type": "event", "event": {"data": {"entity_id": "switch.test", "new_state": None}}},
                    {"id": 1, "success": True},
                    {"id": 2, "success": True, "result": []}]
        ws = Mock()
        ws.recv.side_effect = [json.dumps(m) for m in messages]
        connector = Mock(return_value=ws)
        def deliver(event):
            received.append(event)
            if event[0] == "event":
                stop.set()
        StateStream(HomeAssistant("private-token"), stop, deliver, self.status, connector).session()
        self.assertEqual([kind for kind, _ in received], ["snapshot", "event"])
        self.assertEqual(connector.call_args.args[0], "ws://supervisor/core/api/websocket")
        self.assertEqual(json.loads(ws.send.call_args_list[1].args[0])["event_type"], "state_changed")
        ws.close.assert_called_once()

    def test_websocket_auth_failure_and_reconnect_fallback(self):
        ws = Mock(); ws.recv.side_effect = [json.dumps({"type": "auth_required"}), json.dumps({"type": "auth_invalid"})]
        stream = StateStream(HomeAssistant("private"), threading.Event(), Mock(), self.status, Mock(return_value=ws))
        with self.assertRaises(ValueError):
            stream.session()
        ws.close.assert_called_once()
        def session():
            if stream.session.call_count == 1:
                raise ConnectionError("private response must not appear")
            stream.stop.set()
        stream.session = Mock(side_effect=session)
        stream.run()
        self.assertEqual(stream.session.call_count, 2)
        self.assertEqual(self.status.snapshot()["stream_error"], "ConnectionError")
        stream.deliver.assert_called_once_with(("fallback", None))

    def test_failed_websocket_upgrade_closes_allocated_socket(self):
        socket = Mock(); socket.connect.side_effect = ConnectionError("upgrade failed")
        with patch("live.websocket.WebSocket", return_value=socket):
            with self.assertRaises(ConnectionError):
                connect_socket("ws://localhost/api/websocket")
        socket.shutdown.assert_called_once()

    def test_tls_pair_and_invalid_ca_reject_before_options_change(self):
        with self.assertRaises(ValueError):
            Config.load({"broker_host": "broker", "tls_cert": "cert"})
        options = self.path / "options.json"
        options.write_text('{"broker_host":"broker"}', encoding="utf-8")
        controller = AppController(options, "private", FakeBridge)
        with self.assertRaises(ssl.SSLError):
            controller.update_connection({"tls": True, "tls_ca": "invalid"})
        self.assertEqual(json.loads(options.read_text()), {"broker_host": "broker"})

    @unittest.skipUnless(Path("C:/Program Files/Git/usr/bin/openssl.exe").exists(), "OpenSSL required for real PEM test")
    def test_real_ca_and_client_key_with_verification_enabled(self):
        cert, key = self.path / "cert.pem", self.path / "key.pem"
        subprocess.run(["C:/Program Files/Git/usr/bin/openssl.exe", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost", "-keyout", str(key), "-out", str(cert)], check=True, capture_output=True)
        config = Config.load({"broker_host": "broker", "tls": True, "tls_ca": cert.read_text(), "tls_cert": cert.read_text(), "tls_key": key.read_text()})
        context = tls_context(config)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)
        server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_context.load_cert_chain(cert, key)
        server_context.load_verify_locations(cafile=str(cert))
        server_context.verify_mode = ssl.CERT_REQUIRED
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0)); listener.listen(); listener.settimeout(5)
            result = []
            def accept():
                connection, _ = listener.accept()
                with server_context.wrap_socket(connection, server_side=True) as secured:
                    result.append(bool(secured.getpeercert()))
                    secured.sendall(secured.recv(4))
            thread = threading.Thread(target=accept); thread.start()
            with socket.create_connection(listener.getsockname(), timeout=5) as connection:
                with context.wrap_socket(connection, server_hostname="localhost") as secured:
                    secured.sendall(b"ping")
                    self.assertEqual(secured.recv(4), b"ping")
            thread.join(timeout=5)
            self.assertEqual(result, [True], "server verifies the configured client certificate")


if __name__ == "__main__":
    unittest.main()
