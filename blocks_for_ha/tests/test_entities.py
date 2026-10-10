import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import server


class EntitiesTest(unittest.TestCase):
    def test_callmebot_profiles_strip_private_fields_and_handle_offline(self):
        attrs = {'source':'ugso_callmebot','default_profile':'home','profiles':[{'id':'home','name':'Home','phone':'private-phone','api_key':'private-key'},{'id':'bad id','name':'Bad'}],'api_key':'private-key'}
        result = server.callmebot_profiles([{'entity_id':'sensor.renamed_catalog','state':'1','attributes':attrs}])
        self.assertEqual(result, {'profiles':[{'id':'home','name':'Home'}],'default_profile':'home'})
        self.assertNotIn('private', json.dumps(result))
        for states in [[], [{'entity_id':'sensor.renamed_catalog','state':'unavailable','attributes':attrs}]]:
            with self.assertRaises(server.APIError): server.callmebot_profiles(states)
    def test_actions_and_registries_expose_only_selection_metadata(self):
        actions = server.action_catalog([{'domain':'light','services':{'turn_on':{'name':'On','target':{'entity':[{'domain':['light']}]},'secret':'private'}}}, {'domain':'switch','services':['toggle']}])
        self.assertEqual(actions[0], {'id':'light.turn_on','name':'On','domain':'light','domains':['light']})
        self.assertEqual(actions[1]['id'], 'switch.toggle')
        rows = server.registry_catalog({'device_id':[{'id':'abc','name':'Device','secret':'private'}], 'area_id':[{'area_id':'kitchen','name':'Kitchen'}]})
        self.assertEqual(rows['device_id'], [{'id':'abc','name':'Device'}])
        self.assertEqual(rows['area_id'][0]['id'], 'kitchen')
        self.assertNotIn('private', json.dumps([actions,rows]))

    def test_registry_auth_read_commands_partial_denial_and_redaction(self):
        class Socket:
            def __init__(self, denied=False):
                self.sent=[]; self.closed=False
                self.replies=[{'type':'auth_required'}, {'type':'auth_invalid' if denied else 'auth_ok'}]+[{'id':i,'type':'result','success':i!=3,'result':[]} for i in range(1,5)]
            def recv(self): return json.dumps(self.replies.pop(0))
            def send(self, text): self.sent.append(json.loads(text))
            def settimeout(self, value): pass
            def close(self): self.closed=True
        for denied in [False,True]:
            sock=Socket(denied)
            with patch('websocket.create_connection', return_value=sock) as connect:
                env={'BLOCKS_HA_URL':'https://ha.example','BLOCKS_HA_TOKEN':'server-only-secret'}
                if denied:
                    with self.assertRaises(server.APIError) as error: server.load_targets(env)
                    self.assertNotIn('secret',error.exception.message)
                else:
                    result=server.load_targets(env)
                    self.assertEqual(result['unavailable'],['floor_id'])
                    self.assertNotIn('secret',json.dumps(result))
                    self.assertEqual([r['type'] for r in sock.sent[1:]],['config/'+v+'_registry/list' for v in server.REGISTRIES.values()])
                self.assertEqual(connect.call_args.args[0],'wss://ha.example/api/websocket')
                self.assertEqual(connect.call_args.kwargs['redirect_limit'],0)
                self.assertTrue(sock.closed)

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
                    self.send_response(200); self.end_headers()
                    self.wfile.write(b'[{"domain":"light","services":["turn_on"]}]' if self.path == '/api/services' else b'[{"entity_id":"sensor.demo","state":"20","attributes":{"unit_of_measurement":"C"}}]')
            def log_message(self, *args): pass
        ha = ThreadingHTTPServer(('127.0.0.1', 0), FakeHA)
        thread = threading.Thread(target=ha.serve_forever, daemon=True); thread.start()
        env = {'BLOCKS_HA_URL': f'http://127.0.0.1:{ha.server_port}', 'BLOCKS_HA_TOKEN': 'server-only-test-token'}
        try:
            ha.mode = 'ok'
            self.assertEqual(server.load_entities(env)[0]['entity_id'], 'sensor.demo')
            self.assertEqual(requests[-1], ('/api/states', 'Bearer server-only-test-token'))
            self.assertEqual(server.action_catalog(server.load_rest('services',env))[0]['id'],'light.turn_on')
            self.assertEqual(requests[-1],('/api/services','Bearer server-only-test-token'))
            for mode in ('redirect', 'denied'):
                ha.mode = mode
                with self.assertRaises(server.APIError) as error: server.load_entities(env)
                self.assertNotIn('secret', error.exception.message)
            self.assertEqual(len(requests), 4)
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
            with patch.object(server, 'load_rest', return_value=[]), patch.object(server,'load_targets',return_value={'targets':{},'unavailable':[]}):
                with urlopen(base+'/api/ha/actions') as response: self.assertEqual(json.load(response),{'actions':[]})
                with urlopen(base+'/api/ha/targets') as response: self.assertEqual(json.load(response),{'targets':{},'unavailable':[]})
            for path, method, expected in [('/api/ha/entities', 'POST', 405), ('/api/states', 'GET', 404), ('/api/ha/entities?url=evil', 'GET', 404)]:
                with self.assertRaises(HTTPError) as error: urlopen(Request(base + path, method=method))
                self.assertEqual(error.exception.code, expected)
            with patch.object(server, 'load_entities', side_effect=server.APIError(503, 'Offline')):
                with self.assertRaises(HTTPError) as error: urlopen(base + '/api/ha/entities')
                self.assertEqual(json.load(error.exception), {'error': 'Offline'})
        finally: bridge.shutdown(); bridge.server_close(); thread.join()


if __name__ == '__main__': unittest.main()
