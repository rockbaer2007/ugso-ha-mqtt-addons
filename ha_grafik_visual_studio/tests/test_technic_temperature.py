import json
import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main
from technic_temperature import temperature_command, temperature_request, history_plan, history_series

REQUEST = {"entity_id": "climate.room", "value": 21.5, "min": 15, "max": 28, "step": .5}
ENTRY = {"entity_id": "climate.room", "state": "heat", "attributes": {"temperature": 21, "supported_features": 1, "min_temp": 5, "max_temp": 30, "target_temp_step": .5}}
HISTORY = {"target_entity": "climate.room", "actual_entity": "climate.room", "actuator_entity": "climate.room", "range": "24h"}

class TemperatureTests(unittest.TestCase):
    def test_fixed_commands_and_live_limits(self):
        command = temperature_command(REQUEST, [ENTRY])
        self.assertEqual(command["service"], "set_temperature")
        self.assertEqual(command["service_data"], {"temperature": 21.5})
        helper = {"entity_id": "input_number.temp", "state": "20", "attributes": {"min": 15, "max": 28, "step": .5}}
        self.assertEqual(temperature_command({**REQUEST, "entity_id": helper["entity_id"]}, [helper])["service"], "set_value")
        for value in [14, 29, 21.3]:
            with self.assertRaises(ValueError): temperature_command({**REQUEST, "value": value}, [ENTRY])
        for attrs in [{**ENTRY["attributes"], "supported_features": 2}, {**ENTRY["attributes"], "max_temp": 20}, {**ENTRY["attributes"], "target_temp_step": 1}]:
            with self.assertRaises(ValueError): temperature_command(REQUEST, [{**ENTRY, "attributes": attrs}])
        with self.assertRaises(ValueError): temperature_command(REQUEST, [{**ENTRY, "state": "unavailable"}])

    def test_request_rejects_extra_keys_types_and_nonfinite(self):
        for request in [None, {}, {**REQUEST, "service": "turn_on"}, {**REQUEST, "entity_id": "sensor.temp"}, *[{**REQUEST, "value": value} for value in [True, "21", float("nan"), float("inf")]]]:
            with self.assertRaises(ValueError): temperature_request(request)

    def test_history_plan_is_bounded_deduplicated_and_read_only(self):
        command, start, end = history_plan(HISTORY, datetime(2026, 10, 3, tzinfo=timezone.utc))
        self.assertEqual(command["type"], "history/history_during_period")
        self.assertEqual(command["entity_ids"], ["climate.room"]); self.assertEqual(end - start, 86400000)
        self.assertFalse(command["no_attributes"])
        for request in [{**HISTORY, "range": "all"}, {**HISTORY, "actual_entity": []}, {**HISTORY, "service": "x"}]:
            with self.assertRaises(ValueError): history_plan(request)

    def test_history_compressed_and_standard_states_preserve_unknown_gaps(self):
        rows = [{"s": "heat", "a": {"temperature": 21, "current_temperature": 20, "hvac_action": "heating"}, "lu": 1}, {"state": "unavailable", "last_updated": "1970-01-01T00:00:02Z"}, {"s": "cool", "a": {"temperature": 22, "current_temperature": 21, "hvac_action": "idle"}, "lu": 3}]
        result = history_series(HISTORY, {"climate.room": rows}, 0, 4000)["series"]
        self.assertEqual([p["value"] for p in result["target_entity"]], [21, None, 22])
        self.assertEqual([p["value"] for p in result["actuator_entity"]], [100, None, 0])

    def test_history_sampling_keeps_endpoints_and_filters_invalid_timestamps(self):
        request = {**HISTORY, "target_entity": "sensor.temp", "actual_entity": "", "actuator_entity": ""}
        rows = [{"s": str(i), "lu": i} for i in range(1000)] + [{"s": "1", "lu": "invalid"}]
        points = history_series(request, {"sensor.temp": rows}, 0, 999000)["series"]["target_entity"]
        self.assertEqual(len(points), 720); self.assertEqual(points[0]["value"], 0); self.assertEqual(points[-1]["value"], 999)

    def test_history_carries_start_state_and_keeps_short_unknown_intervals(self):
        request = {**HISTORY, "target_entity": "sensor.temp", "actual_entity": "", "actuator_entity": ""}
        rows = [{"s": str(i), "lu": i} for i in range(2000)]
        rows[1000]["s"] = "unavailable"
        points = history_series(request, {"sensor.temp": rows}, 10000, 1999000)["series"]["target_entity"]
        self.assertEqual(points[0]["t"], 10000); self.assertTrue(any(point["value"] is None for point in points))
        self.assertEqual(len(points), 720)

    def test_http_validates_then_writes_once_and_history_never_writes(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
        thread = Thread(target=server.serve_forever, daemon=True); thread.start()
        def send(path, payload, content="application/json"):
            return urlopen(Request(f"http://127.0.0.1:{server.server_port}/api/{path}", data=json.dumps(payload).encode(), headers={"Content-Type": content}), timeout=3)
        try:
            with patch.object(main, "home_assistant_commands", side_effect=[[[ENTRY]], [None]]) as commands:
                with send("temperature", REQUEST) as response: self.assertEqual(json.load(response), {"accepted": True})
                self.assertEqual(commands.call_args.args[0], [temperature_command(REQUEST, [ENTRY])])
                self.assertEqual(commands.call_count, 2)
            with patch.object(main, "home_assistant_commands", return_value=[[{**ENTRY, "state": "unavailable"}]]) as commands:
                with self.assertRaises(HTTPError) as error: send("temperature", REQUEST)
                self.assertEqual(error.exception.code, 400); self.assertEqual(commands.call_count, 1)
            with patch.object(main, "home_assistant_commands") as commands:
                with self.assertRaises(HTTPError) as error: send("temperature", {**REQUEST, "value": True})
                self.assertEqual(error.exception.code, 400); commands.assert_not_called()
                with self.assertRaises(HTTPError) as error: send("temperature", REQUEST, "text/plain")
                self.assertEqual(error.exception.code, 415)
            with patch.object(main, "home_assistant_commands", return_value=[{}]) as commands:
                with send("thermostat-history", HISTORY) as response: self.assertIn("series", json.load(response))
                self.assertEqual(commands.call_count, 1); self.assertEqual(commands.call_args.args[0][0]["type"], "history/history_during_period")
            with patch.object(main, "home_assistant_commands", side_effect=main.HomeAssistantAPIError("secret")):
                with self.assertRaises(HTTPError) as error: send("temperature", REQUEST)
                self.assertEqual(error.exception.code, 503); self.assertNotIn(b"secret", error.exception.read())
        finally: server.shutdown(); server.server_close(); thread.join()
