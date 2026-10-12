import sys
import unittest
import json
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'app'))
from universal_color import universal_color_command
import main

class UniversalColorTests(unittest.TestCase):
    entries = [{'entity_id': 'light.test', 'state': 'on', 'attributes': {'supported_color_modes': ['rgb', 'color_temp'], 'min_color_temp_kelvin': 2500, 'max_color_temp_kelvin': 6000}}]
    def test_http_route_validates_before_writing(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), main.Handler)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.object(main, 'home_assistant_commands', side_effect=[[self.entries], [{}], [self.entries]]) as commands:
                address = f'http://127.0.0.1:{server.server_port}/api/universal-color'
                def send(value):
                    return urlopen(Request(address, data=json.dumps({'entity_id':'light.test','kind':'rgb','value':value}).encode(), headers={'Content-Type':'application/json'}, method='POST'))
                with send([255, 0, 128]) as response:
                    self.assertTrue(json.load(response)['accepted'])
                self.assertEqual(commands.call_args_list[1].args[0][0]['service_data'], {'rgb_color':[255, 0, 128]})
                with self.assertRaises(HTTPError) as error:
                    send([256, 0, 0])
                self.assertEqual(error.exception.code, 400)
                self.assertEqual(commands.call_count, 3)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
    def test_exact_service_plan(self):
        plan = universal_color_command({'entity_id': 'light.test', 'kind': 'rgb', 'value': [255, 0, 128]}, self.entries)
        self.assertEqual(plan, {'type': 'call_service', 'domain': 'light', 'service': 'turn_on', 'target': {'entity_id': 'light.test'}, 'service_data': {'rgb_color': [255, 0, 128]}})
        self.assertEqual(universal_color_command({'entity_id': 'light.test', 'kind': 'kelvin', 'value': 4000}, self.entries)['service_data'], {'color_temp_kelvin': 4000})
    def test_invalid_targets_channels_and_ranges(self):
        for kind, value in [('rgb', [True, 0, 0]), ('rgb', [256, 0, 0]), ('rgb', [1, 2]), ('rgb', 'red'), ('kelvin', float('nan')), ('kelvin', 6500), ('kelvin', True), ('http', 1)]:
            with self.subTest(kind=kind, value=value), self.assertRaises(ValueError):
                universal_color_command({'entity_id': 'light.test', 'kind': kind, 'value': value}, self.entries)
        with self.assertRaises(ValueError):
            universal_color_command({'entity_id': 'switch.test', 'kind': 'rgb', 'value': [1, 2, 3]}, self.entries)
        with self.assertRaises(ValueError):
            universal_color_command({'entity_id': 'light.test', 'kind': 'rgb', 'value': [1, 2, 3]}, [{'entity_id':'light.test','state':'unavailable'}])
    def test_unsupported_capabilities(self):
        with self.assertRaises(ValueError):
            universal_color_command({'entity_id': 'light.test', 'kind': 'rgb', 'value': [1, 2, 3]}, [{'entity_id':'light.test','state':'on','attributes':{'supported_color_modes':['brightness']}}])

if __name__ == '__main__':
    unittest.main()
