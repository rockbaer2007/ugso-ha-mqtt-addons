import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import server


class EntitiesTest(unittest.TestCase):
    def test_catalog_omits_attributes_and_secrets(self):
        rows = server.entity_catalog([{"entity_id": "light.kitchen", "state": "on", "attributes": {"friendly_name": "Küche", "token": "secret", "latitude": 52}}, None, {"entity_id": "invalid"}])
        self.assertEqual(rows, [{"entity_id": "light.kitchen", "domain": "light", "state": "on", "name": "Küche", "unit": ""}])
        self.assertNotIn("secret", json.dumps(rows))

    def test_supervisor_and_unconfigured_connections(self):
        self.assertEqual(server.connection({"SUPERVISOR_TOKEN": "test"}), ("http://supervisor/core/api/states", "test"))
        with self.assertRaises(server.APIError) as error: server.connection({})
        self.assertEqual(error.exception.status, 503)
        for url in ['file:///etc/passwd', 'http://user:pass@localhost', 'http://localhost/?token=x', 'http://localhost/api']:
            with self.assertRaises(server.APIError): server.connection({"BLOCKS_HA_URL": url, "BLOCKS_HA_TOKEN": "test"})

    def test_real_http_auth_redirects_and_failure_redaction(self):
        requests = []
        class FakeHA(BaseHTTPRequestHandler):
            def do_GET(self):
                requests.append((self.path, self.headers.get('Authorization')))
                if self.server.mode == 'redirect':
                    self.send_response(302); self.send_header('Location', '/leak'); self.end_headers()
                elif self.server.mode == 'denied':
                    self.send_response(401); self.end_headers(); self.wfile.write(b'secret detail')
                else:
                    self.send_response(200); self.end_headers(); self.wfile.write(b'[{"entity_id":"sensor.demo","state":"20","attributes":{"unit_of_measurement":"C"}}]')
            def log_message(self, *args): pass
        ha = ThreadingHTTPServer(('127.0.0.1', 0), FakeHA)
        thread = threading.Thread(target=ha.serve_forever, daemon=True); thread.start()
        env = {'BLOCKS_HA_URL': f'http://127.0.0.1:{ha.server_port}', 'BLOCKS_HA_TOKEN': 'server-only-test-token'}
        try:
            ha.mode = 'ok'
            self.assertEqual(server.load_entities(env)[0]['entity_id'], 'sensor.demo')
            self.assertEqual(requests[-1], ('/api/states', 'Bearer server-only-test-token'))
            for mode in ('redirect', 'denied'):
                ha.mode = mode
                with self.assertRaises(server.APIError) as error: server.load_entities(env)
                self.assertNotIn('secret', error.exception.message)
            self.assertEqual(len(requests), 3)
        finally: ha.shutdown(); ha.server_close(); thread.join()

    def test_bridge_only_exposes_read_catalog_and_handles_offline(self):
        bridge = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        thread = threading.Thread(target=bridge.serve_forever, daemon=True); thread.start()
        base = f'http://127.0.0.1:{bridge.server_port}'
        try:
            with patch.object(server, 'load_entities', return_value=[]):
                with urlopen(base + '/api/ha/entities') as response:
                    self.assertEqual(json.load(response), {'entities': []})
                    self.assertEqual(response.headers['Cache-Control'], 'no-store')
            for path, method, expected in [('/api/ha/entities', 'POST', 405), ('/api/states', 'GET', 404), ('/api/ha/entities?url=evil', 'GET', 404)]:
                with self.assertRaises(HTTPError) as error: urlopen(Request(base + path, method=method))
                self.assertEqual(error.exception.code, expected)
            with patch.object(server, 'load_entities', side_effect=server.APIError(503, 'Offline')):
                with self.assertRaises(HTTPError) as error: urlopen(base + '/api/ha/entities')
                self.assertEqual(json.load(error.exception), {'error': 'Offline'})
        finally: bridge.shutdown(); bridge.server_close(); thread.join()


if __name__ == '__main__': unittest.main()
