"""HA dashboard selection only exposes Lovelace titles and paths."""
import unittest
from unittest.mock import patch
from test_states import APP


class DashboardTests(unittest.TestCase):
    def test_only_dashboard_metadata_is_exposed(self):
        panels = {
            "lovelace": {"component_name": "lovelace", "title": None, "config": {"secret": "not exposed"}},
            "dashboard-solar": {"component_name": "lovelace", "title": "Solar"},
            "config": {"component_name": "config", "title": "Settings"},
            "../auth": {"component_name": "lovelace", "title": "Invalid"},
            "invalid": None,
        }
        with patch.object(APP, "home_assistant_commands", return_value=[panels]) as commands:
            self.assertEqual(APP.load_home_assistant_dashboards(), {"dashboards": [
                {"title": "lovelace", "path": "/lovelace"},
                {"title": "Solar", "path": "/dashboard-solar"},
            ]})
            commands.assert_called_once_with(["get_panels"])

    def test_invalid_dashboard_response_is_reported(self):
        with patch.object(APP, "home_assistant_commands", return_value=[None]):
            with self.assertRaises(APP.HomeAssistantAPIError):
                APP.load_home_assistant_dashboards()
