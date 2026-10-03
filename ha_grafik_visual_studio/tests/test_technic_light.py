import sys
import unittest
import json
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main
from technic_light import light_request, dimmer_commands

LIGHT = {"entity_id": "light.demo", "state": "on", "attributes": {"brightness": 128, "supported_color_modes": ["brightness"]}}
SWITCH = {"entity_id": "switch.demo", "state": "off", "attributes": {}}
HELPER = {"entity_id": "input_number.demo", "state": "50", "attributes": {"min": 0, "max": 100, "step": 1}}
REQUEST = {"power_entity": "light.demo", "brightness_entity": "light.demo", "linked": True, "action": "brightness", "value": 25}

class LightTests(unittest.TestCase):
    def test_same_light_is_one_combined_action(self):
        for action, value, service, data in [("brightness", 25, "turn_on", {"brightness_pct": 25}), ("brightness", 0, "turn_off", {}), ("power", True, "turn_on", {"brightness_pct": 100}), ("power", False, "turn_off", {})]:
            result = dimmer_commands({**REQUEST, "action": action, "value": value}, [LIGHT])
            self.assertEqual(result, [{"type": "call_service", "domain": "light", "service": service, "target": {"entity_id": "light.demo"}, "service_data": data}])
        self.assertEqual(dimmer_commands({**REQUEST, "linked": False, "action": "power", "value": True}, [LIGHT])[0]["service_data"], {})
    def test_separate_helpers_and_unlinked_actions(self):
        request = {**REQUEST, "power_entity": "switch.demo", "brightness_entity": "input_number.demo"}
        commands = dimmer_commands(request, [SWITCH, HELPER])
        self.assertEqual([c["service"] for c in commands], ["set_value", "turn_on"])
        self.assertEqual(commands[0]["service_data"], {"value": 25})
        self.assertEqual(len(dimmer_commands({**request, "linked": False}, [HELPER])), 1)
        self.assertEqual(len(dimmer_commands({**request, "linked": False, "action": "power", "value": True}, [SWITCH])), 1)
    def test_validation_rejects_invalid_and_incomplete_plans(self):
        for request in [None, {}, {**REQUEST, "extra": True}, {**REQUEST, "linked": "true"}, {**REQUEST, "value": True}, {**REQUEST, "value": -1}, {**REQUEST, "value": 101}, {**REQUEST, "value": "25"}, {**REQUEST, "value": float("nan")}, {**REQUEST, "action": "toggle"}, {**REQUEST, "action": "power", "value": 1}, {**REQUEST, "power_entity": ["light.demo"]}]:
            with self.subTest(request=request), self.assertRaises(ValueError): light_request(request)
        for light in [{**LIGHT, "state": "unavailable"}, {**LIGHT, "attributes": {"supported_color_modes": ["onoff"]}}]:
            with self.assertRaises(ValueError): dimmer_commands(REQUEST, [light])
        with self.assertRaises(ValueError): dimmer_commands({**REQUEST, "brightness_entity": "sensor.demo"}, [LIGHT])
        with self.assertRaises(ValueError): dimmer_commands({**REQUEST, "power_entity": "switch.demo", "brightness_entity": "input_number.demo"}, [SWITCH, {**HELPER, "attributes": {"min": 10, "max": 90, "step": 5}}])
    def test_http_prevalidates_all_targets_before_writing_and_hides_provider_details(self):
        class Quiet(main.Handler):
            def log_message(self, *_): pass
        server = ThreadingHTTPServer(("127.0.0.1", 0), Quiet); thread = Thread(target=server.serve_forever, daemon=True); thread.start()
        def send(payload, content="application/json"):
            return urlopen(Request(f"http://127.0.0.1:{server.server_port}/api/light-dimmer", data=json.dumps(payload).encode(), headers={"Content-Type":content}), timeout=3)
        try:
            with patch.object(main, "home_assistant_commands", side_effect=[[[LIGHT]], [None]]) as calls:
                with send(REQUEST) as response: self.assertEqual(json.load(response), {"accepted": True})
                self.assertEqual(calls.call_args.args[0], dimmer_commands(REQUEST, [LIGHT]))
            with patch.object(main, "home_assistant_commands", return_value=[[SWITCH]]) as calls:
                with self.assertRaises(HTTPError) as error: send({**REQUEST, "action": "power", "value": True, "power_entity": "switch.demo"})
                self.assertEqual(error.exception.code, 400); self.assertEqual(calls.call_count, 1)
            with patch.object(main, "home_assistant_commands") as calls:
                with self.assertRaises(HTTPError) as error: send({**REQUEST, "value": 101})
                self.assertEqual(error.exception.code, 400); calls.assert_not_called()
                with self.assertRaises(HTTPError) as error: send(REQUEST, "text/plain")
                self.assertEqual(error.exception.code, 415)
            with patch.object(main, "home_assistant_commands", side_effect=[[[SWITCH, HELPER]], [None], main.HomeAssistantAPIError("secret")]) as calls:
                with self.assertRaises(HTTPError) as error: send({**REQUEST, "power_entity":"switch.demo", "brightness_entity":"input_number.demo"})
                self.assertEqual(error.exception.code, 503); self.assertNotIn(b"secret", error.exception.read()); self.assertEqual(calls.call_count, 3)
        finally: server.shutdown(); server.server_close(); thread.join()
