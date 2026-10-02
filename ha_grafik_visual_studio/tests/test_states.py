"""Focused tests for the Home Assistant state bridge."""

import importlib.util
import json
import os
import sys
import types
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import patch


SOURCE = Path(__file__).resolve().parents[1] / "app" / "main.py"
sys.path.insert(0, str(SOURCE.parent))
SPEC = importlib.util.spec_from_file_location("ha_grafik_main", SOURCE)
APP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(APP)


class FakeConnection:
    def __init__(self):
        self.sent = []
        self.replies = iter([
            {"type": "auth_required"},
            {"type": "auth_ok"},
            {"id": 1, "success": True, "result": [
                {"entity_id": "sensor.kitchen", "state": "21.5", "last_changed": "t1", "last_updated": "t2", "attributes": {"secret": "ignored"}},
                {"entity_id": "sensor.bedroom", "state": "19", "last_changed": "t3", "last_updated": "t4"},
            ]},
        ])
        self.closed = False

    def settimeout(self, _timeout):
        pass

    def recv(self):
        return json.dumps(next(self.replies))

    def send(self, message):
        self.sent.append(json.loads(message))

    def close(self):
        self.closed = True


class StatesTests(unittest.TestCase):
    def test_only_requested_states_are_returned_without_registry_reads(self):
        connection = FakeConnection()
        websocket = types.SimpleNamespace(
            create_connection=lambda *_args, **_kwargs: connection,
            WebSocketException=Exception,
        )
        with patch.dict(sys.modules, {"websocket": websocket}), patch.dict(os.environ, {"SUPERVISOR_TOKEN": "test-token"}):
            states = APP.load_home_assistant_states(["sensor.kitchen"])

        self.assertEqual(states, [{"entity_id": "sensor.kitchen", "state": "21.5", "last_changed": "t1", "last_updated": "t2"}])
        self.assertEqual(connection.sent[1], {"id": 1, "type": "get_states"})
        self.assertEqual(len(connection.sent), 2)
        self.assertTrue(connection.closed)

    def test_switch_uses_targeted_service_call(self):
        connection = FakeConnection()
        websocket = types.SimpleNamespace(
            create_connection=lambda *_args, **_kwargs: connection,
            WebSocketException=Exception,
        )
        with patch.dict(sys.modules, {"websocket": websocket}), patch.dict(os.environ, {"SUPERVISOR_TOKEN": "test-token"}):
            APP.set_home_assistant_switch("switch.garden", True)

        self.assertEqual(connection.sent[1], {
            "id": 1, "type": "call_service", "domain": "switch",
            "service": "turn_on", "target": {"entity_id": "switch.garden"},
        })

    def test_switch_rejects_unsupported_entity_and_non_boolean_state(self):
        with self.assertRaises(ValueError):
            APP.set_home_assistant_switch("sensor.temperature", True)
        with self.assertRaises(ValueError):
            APP.set_home_assistant_switch("switch.garden", "on")

    def test_number_helper_writes_signed_value(self):
        with patch.object(APP, "home_assistant_commands") as commands:
            APP.set_home_assistant_helper_value("input_number.line1", -200)
            APP.set_home_assistant_helper_value("input_number.line1", 200.0)

        self.assertEqual(commands.call_args_list[0].args[0], [{
            "type": "call_service", "domain": "input_number", "service": "set_value",
            "target": {"entity_id": "input_number.line1"}, "service_data": {"value": -200},
        }])
        self.assertEqual(commands.call_args_list[1].args[0][0]["service_data"], {"value": 200.0})

    def test_text_helper_writes_string(self):
        with patch.object(APP, "home_assistant_commands") as commands:
            APP.set_home_assistant_helper_value("input_text.message", "Hallo")

        self.assertEqual(commands.call_args.args[0], [{
            "type": "call_service", "domain": "input_text", "service": "set_value",
            "target": {"entity_id": "input_text.message"}, "service_data": {"value": "Hallo"},
        }])

    def test_helper_write_rejects_unsupported_entities_and_invalid_values(self):
        for entity_id, value in [
            ("sensor.temperature", 5), ("input_number.line1", True),
            ("input_number.line1", float("nan")), ("input_number.line1", "5"),
            ("input_text.message", 5), ("input_text.message", "a" * 256),
        ]:
            with self.subTest(entity_id=entity_id, value=value), self.assertRaises(ValueError):
                APP.set_home_assistant_helper_value(entity_id, value)

    def test_helper_value_endpoint_forwards_only_valid_json(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), APP.Handler)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{server.server_port}/api/helper-value"
        try:
            with patch.object(APP, "set_home_assistant_helper_value") as writer:
                request = Request(url, data=b'{"entity_id":"input_number.line1","value":-200}', method="POST", headers={"Content-Type": "application/json"})
                with urlopen(request) as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(json.load(response), {"accepted": True})
                writer.assert_called_once_with("input_number.line1", -200)

                wrong_type = Request(url, data=b'{}', method="POST", headers={"Content-Type": "text/plain"})
                with self.assertRaises(HTTPError) as error:
                    urlopen(wrong_type)
                self.assertEqual(error.exception.code, 415)
                writer.assert_called_once()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
