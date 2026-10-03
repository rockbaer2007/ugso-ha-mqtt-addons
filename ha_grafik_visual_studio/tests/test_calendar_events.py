import unittest
from unittest.mock import patch
from test_states import APP

class CalendarEventsTests(unittest.TestCase):
    def test_read_command_batches_sources_and_strips_context(self):
        result = {"context": {"secret": "hidden"}, "response": {"calendar.family": {"events": [{"summary": "Trip", "start": "2026-10-03", "end": "2026-10-04", "secret": "hidden"}]}}}
        with patch.object(APP, "home_assistant_commands", return_value=[result]) as commands:
            events = APP.load_calendar_events(["calendar.family", "calendar.family"], "2026-10-01T00:00:00+02:00", "2026-11-01T00:00:00+01:00")
        command = commands.call_args[0][0][0]
        self.assertEqual(command["service"], "get_events")
        self.assertTrue(command["return_response"])
        self.assertEqual(command["target"]["entity_id"], ["calendar.family"])
        self.assertNotIn("secret", events["calendar.family"][0])

    def test_invalid_sources_never_call_home_assistant(self):
        for sources in ([], ["input_text.events"], ["calendar.a"] * 21, ["calendar.a/b"]):
            with self.subTest(sources=sources), patch.object(APP, "home_assistant_commands") as commands:
                with self.assertRaises(ValueError): APP.load_calendar_events(sources, "2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z")
                commands.assert_not_called()

    def test_range_requires_timezone_order_and_bound(self):
        for start, end in (("bad", "bad"), ("2026-10-01", "2026-11-01"), ("2026-11-01T00:00:00Z", "2026-10-01T00:00:00Z"), ("2026-01-01T00:00:00Z", "2028-01-01T00:00:00Z")):
            with self.subTest(start=start), self.assertRaises(ValueError): APP.load_calendar_events(["calendar.a"], start, end)

    def test_missing_response_is_an_explicit_error(self):
        for result in (None, {}, {"response": {}}):
            with patch.object(APP, "home_assistant_commands", return_value=[result]), self.assertRaises(APP.HomeAssistantAPIError):
                APP.load_calendar_events(["calendar.a"], "2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z")

if __name__ == "__main__": unittest.main()
