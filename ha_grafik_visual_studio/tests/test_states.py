"""Focused tests for the Home Assistant state bridge."""

import importlib.util
import json
import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


SOURCE = Path(__file__).resolve().parents[1] / "app" / "main.py"
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


if __name__ == "__main__":
    unittest.main()
