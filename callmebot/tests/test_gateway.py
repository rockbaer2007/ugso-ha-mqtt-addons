import sys
import tempfile
import unittest
import json
import threading
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch, MagicMock
from urllib.parse import urlsplit, parse_qs

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'app'))
from core import Gateway, Failure, provider_send, NoRedirect
from server import handler

CONFIG = {'profiles': [{'id': 'default', 'name': 'Test', 'phone': '+49123456789', 'api_key': 'dummy_secret'}], 'default_profile': 'default'}

class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.calls = []
        self.now = 100
        self.g = Gateway(self.temp.name, sender=lambda p, m: self.calls.append((p, m)), clock=lambda: self.now)
        self.g.save(CONFIG)

    def tearDown(self):
        self.temp.cleanup()

    def test_private_keys_preserved_and_reload(self):
        public = self.g.public()
        self.assertNotIn('dummy_secret', json.dumps(public))
        self.g.save({'profiles': public['profiles'], 'default_profile': 'default'})
        self.assertEqual(Gateway(self.temp.name).settings, CONFIG)
        self.g.save({'profiles': [], 'default_profile': ''})
        self.assertEqual(Gateway(self.temp.name).public()['profiles'], [])

    def test_provider_encoding_and_safe_errors(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = b'OK'
        with patch('core.build_opener') as opener:
            opener.return_value.open.return_value = response
            provider_send(CONFIG['profiles'][0], 'A & B\nGrüße')
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(urlsplit(request.full_url).netloc, 'api.callmebot.com')
            self.assertEqual(parse_qs(urlsplit(request.full_url).query)['text'], ['A & B\nGrüße'])
            response.read.return_value = b'ERROR: dummy_secret'
            with self.assertRaisesRegex(Failure, '^provider_rejected$'):
                provider_send(CONFIG['profiles'][0], 'test')
            opener.return_value.open.side_effect = TimeoutError('dummy_secret')
            with self.assertRaisesRegex(Failure, '^provider_unavailable$'):
                provider_send(CONFIG['profiles'][0], 'test')
        self.assertIsNone(NoRedirect().redirect_request(None, None, None, None, None, 'https://other.example'))

    def test_validation_retained_and_deduplication(self):
        for payload in [{'message': ''}, {'message': 'x', 'profile': 'missing'}, {'message': 'x', 'api_key': 'bad'}]:
            with self.assertRaises(Failure): self.g.submit(payload)
        with self.assertRaisesRegex(Failure, 'retained_rejected'): self.g.submit({'message': 'x'}, retained=True)
        self.g.submit({'message': 'x', 'request_id': 'unique'})
        with self.assertRaisesRegex(Failure, 'duplicate'): self.g.submit({'message': 'x', 'request_id': 'unique'})
        self.now += 3601
        self.g.submit({'message': 'x', 'request_id': 'unique'})

    def test_mock_send_rate_limit_and_redaction(self):
        message = 'A "quote"\nFrançais & Grüße'
        self.g.submit({'message': message})
        result = self.g.process(self.g.pending.get())
        self.assertEqual(result['status'], 'accepted')
        self.assertEqual(self.calls[0][1], message)
        self.assertNotIn(message, json.dumps(self.g.public()))
        self.g.submit({'message': message})
        self.assertEqual(self.g.process(self.g.pending.get())['status'], 'rate_limited')
        self.assertEqual(len(self.calls), 1)
        self.now += 10
        def fail(*args): raise RuntimeError('dummy_secret provider URL')
        self.g.sender = fail
        self.g.publish = fail
        self.g.submit({'message': message, 'loglevel': 'none'})
        self.assertEqual(self.g.process(self.g.pending.get())['status'], 'provider_unavailable')
        self.assertNotIn('dummy_secret', json.dumps(self.g.public()))

    def test_queue_capacity(self):
        for i in range(20): self.g.submit({'message': str(i)})
        with self.assertRaisesRegex(Failure, 'queue_full'): self.g.submit({'message': 'extra'})

    def test_http_csrf_and_private_state(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler(self.g))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        try:
            state = json.load(urlopen(base + '/api/state'))
            self.assertNotIn('dummy_secret', json.dumps(state))
            data = json.dumps({'message': 'Mock only'}).encode()
            headers = {'Content-Type': 'application/json'}
            with self.assertRaises(HTTPError) as error: urlopen(Request(base + '/api/send', data, headers))
            self.assertEqual(error.exception.code, 403)
            headers['X-CSRF-Token'] = state['csrf']
            with urlopen(Request(base + '/api/send', data, headers)) as response:
                self.assertEqual(response.status, 202)
            self.assertEqual(self.calls, [])
            self.assertTrue(json.load(urlopen(base + '/health'))['ok'])
        finally:
            server.shutdown(); server.server_close(); thread.join()

if __name__ == '__main__': unittest.main()
