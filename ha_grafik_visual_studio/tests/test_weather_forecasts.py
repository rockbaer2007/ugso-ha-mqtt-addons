import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main

class WeatherForecastTests(unittest.TestCase):
    def test_fixed_read_service_filters_context_and_bounds_payload(self):
        rows = [{"datetime": "2026-10-03T12:00:00Z", "temperature": 0, "cloud_coverage": 25, "context": "private", "token": "private", "precipitation": float("nan")} for _ in range(300)]
        with patch.object(main, "home_assistant_commands", return_value=[{"response": {"weather.home": {"forecast": rows}}}]) as command:
            result = main.load_weather_forecasts(["weather.home"], "daily")
            self.assertEqual(len(result["weather.home"]), 288)
            self.assertEqual(result["weather.home"][0], {"datetime": "2026-10-03T12:00:00Z", "temperature": 0, "cloud_coverage": 25})
            call = command.call_args.args[0][0]
            self.assertEqual((call["domain"], call["service"], call["service_data"]), ("weather", "get_forecasts", {"type": "daily"}))
            self.assertTrue(call["return_response"])
    def test_invalid_targets_modes_and_missing_responses(self):
        for ids, mode in [([], "daily"), (["switch.home"], "daily"), (["weather.home"] * 11, "daily"), (["weather.home"], "unknown")]:
            with self.assertRaises(ValueError): main.load_weather_forecasts(ids, mode)
        for result in [None, {"response": {}}, {"response": {"weather.home": {"forecast": None}}}]:
            with patch.object(main, "home_assistant_commands", return_value=[result]), self.assertRaises(main.HomeAssistantAPIError): main.load_weather_forecasts(["weather.home"], "hourly")
