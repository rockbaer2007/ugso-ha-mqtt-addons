"""Dropdown HA service validation and HTTP contract."""
import unittest
from unittest.mock import patch
from test_states import APP
from http.server import ThreadingHTTPServer
from threading import Thread
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json

class DropdownTests(unittest.TestCase):
    def test_select_services_use_only_valid_current_options(self):
        for domain in ("select", "input_select"):
            entity = domain + ".mode"
            with patch.object(APP, "load_home_assistant_states", return_value=[{"entity_id": entity, "state": "Eco", "attributes": {"options": ["Eco", "Boost"]}}]), patch.object(APP, "home_assistant_commands") as commands:
                APP.set_home_assistant_select_option(entity, "Boost")
                self.assertEqual(commands.call_args.args[0], [{"type": "call_service", "domain": domain, "service": "select_option", "target": {"entity_id": entity}, "service_data": {"option": "Boost"}}])
    def test_invalid_domains_and_nonstring_values_fail_before_ha_read(self):
        for entity, value in [("sensor.mode", "Eco"), ("select.BAD", "Eco"), ("select.mode", 2), ("select.mode", "x" * 1025)]:
            with patch.object(APP, "home_assistant_commands") as commands, self.assertRaises(ValueError):
                APP.set_home_assistant_select_option(entity, value)
            commands.assert_not_called()
    def test_removed_option_unavailable_and_missing_state_never_write(self):
        for rows in [[], [{"entity_id": "select.mode", "state": "unavailable", "attributes": {"options": ["Eco"]}}], [{"entity_id": "select.mode", "state": "Eco", "attributes": {"options": ["Eco"]}}]]:
            with patch.object(APP, "load_home_assistant_states", return_value=rows), patch.object(APP, "home_assistant_commands") as commands, self.assertRaises(ValueError):
                APP.set_home_assistant_select_option("select.mode", "Boost")
            commands.assert_not_called()
    def test_endpoint_contract_and_content_type(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), APP.Handler)
        thread = Thread(target=server.serve_forever, daemon=True); thread.start()
        url = f"http://127.0.0.1:{server.server_port}/api/select-option"
        try:
            with patch.object(APP, "set_home_assistant_select_option") as writer:
                request = Request(url, data=b'{"entity_id":"select.mode","value":"Eco"}', headers={"Content-Type": "application/json"}, method="POST")
                with urlopen(request) as response:
                    self.assertEqual(json.load(response), {"accepted": True})
                writer.assert_called_once_with("select.mode", "Eco")
                with self.assertRaises(HTTPError) as error:
                    urlopen(Request(url, data=b'{}', headers={"Content-Type": "text/plain"}, method="POST"))
                self.assertEqual(error.exception.code, 415)
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=2)
