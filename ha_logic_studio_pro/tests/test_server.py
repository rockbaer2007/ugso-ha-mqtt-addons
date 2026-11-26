import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch
import io
import threading

from server import RUNTIME_LOG_MAX_BYTES, ScriptRuntime, LogicServer, public_entity, search_entities


class EntityPickerCatalogTests(unittest.TestCase):
    def server(self, supervisor=False):
        server = object.__new__(LogicServer)
        server.supervisor = supervisor
        server.entity_lock = threading.Lock()
        server.entity_cache = []
        server.entity_cache_until = 0
        server.entity_context_cache = {}
        server.entity_context_until = 0
        return server

    def test_search_preserves_filters_and_finds_area_device_name_and_id(self):
        items = []
        for entity_id, name, area, device in [('sensor.pv', 'Solarleistung', 'Garten', 'Hyper 2000'),
                                              ('light.flur', 'Weihnacht', 'Flur', 'Lampe')]:
            item = public_entity({'entity_id': entity_id, 'state': '0', 'attributes': {'friendly_name': name}})
            items.append({**item, 'area': area, 'device': device})
        for query in ['GARTEN', 'hyper', 'Solarleistung', 'sensor.pv']:
            self.assertEqual([item['entity_id'] for item in search_entities(items, query)], ['sensor.pv'])
        self.assertEqual(search_entities(items, 'Garten', output=True), [])
        self.assertEqual(search_entities(items, domains='sensor,input_number'), [items[0]])
        self.assertEqual(search_entities(items, domains='light', output=True), [items[1]])

    def test_short_catalog_cache_avoids_reading_all_states_for_each_keystroke(self):
        server = self.server()
        server.entity_states = Mock(return_value=[{'entity_id': 'sensor.pv', 'state': '123', 'attributes': {}}])
        with patch('server.monotonic', return_value=100):
            self.assertEqual(server.entities(), server.entities())
        server.entity_states.assert_called_once()
        with patch('server.monotonic', return_value=104):
            server.entities()
        self.assertEqual(server.entity_states.call_count, 2)

    def test_context_reads_only_names_and_is_cached(self):
        server = self.server(True)
        opener = Mock()
        opener.open.return_value = io.BytesIO(json.dumps([
            ['sensor.pv', 'Garten', 'Hyper 2000'], ['not-an-id', 'area', 'device'], ['sensor.bad', {}, 'device']
        ]).encode())
        with patch.dict('os.environ', {'SUPERVISOR_TOKEN': 'unit-test-only'}), \
                patch('server.build_opener', return_value=opener), patch('server.monotonic', return_value=100):
            expected = {'sensor.pv': {'area': 'Garten', 'device': 'Hyper 2000'}}
            self.assertEqual(server.entity_context(), expected)
            self.assertEqual(server.entity_context(), expected)
        opener.open.assert_called_once()
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, 'http://supervisor/core/api/template')
        template = json.loads(request.data)['template']
        self.assertIn('area_name(s.entity_id)', template)
        self.assertNotIn('serial_number', template)
        self.assertNotIn('unit-test-only', json.dumps(expected))

    def test_context_failure_does_not_hide_entities_or_grant_runtime_access(self):
        server = self.server(True)
        server.entity_states = Mock(return_value=[{'entity_id': 'sensor.pv', 'state': '123', 'attributes': {'secret': 'omit'}}])
        opener = Mock()
        opener.open.side_effect = OSError('Template unavailable')
        with patch.dict('os.environ', {'SUPERVISOR_TOKEN': 'unit-test-only'}), \
                patch('server.build_opener', return_value=opener):
            items = server.entities()
        self.assertEqual([item['entity_id'] for item in items], ['sensor.pv'])
        self.assertNotIn('secret', items[0]['attributes'])
        self.assertNotIn('readable', items[0])


class RuntimeRetentionTests(unittest.TestCase):
    def test_expired_and_oversized_logs_are_rewritten_and_survive_restart(self):
        with TemporaryDirectory() as directory:
            runtime = ScriptRuntime(directory)
            key = ('owner', '42')
            path = runtime.log_directory(key[0]) / '42.json'
            path.parent.mkdir()
            now = datetime.now(timezone.utc)
            def entry(text, age=0):
                return {'time': (now - timedelta(days=age)).isoformat(), 'text': text, 'error': False}

            path.write_text(json.dumps([entry('expired', 31)] +
                                       [entry(str(i) + 'ä' * 1000) for i in range(90)] +
                                       [entry('newest')]), encoding='utf-8')
            runtime.prune_logs()
            self.assertLessEqual(path.stat().st_size, RUNTIME_LOG_MAX_BYTES)
            first = list(runtime.saved_messages(key))
            self.assertEqual(first[-1]['text'], 'newest')
            self.assertNotIn('expired', [item['text'] for item in first])
            self.assertLess(len(first), 90)
            self.assertEqual(first, list(ScriptRuntime(directory).saved_messages(key)))

    def test_age_applies_to_cached_and_inactive_projects(self):
        with TemporaryDirectory() as directory:
            runtime = ScriptRuntime(directory)
            key = ('owner', '42')
            stale = {'time': (datetime.now(timezone.utc) - timedelta(days=31)).isoformat(),
                     'text': 'expired', 'error': False}
            for project in ('42', '43'):
                runtime.write_log(runtime.log_directory('owner') / (project + '.json'), [stale])
            runtime.jobs[key] = {'state': 'stopped', 'messages': [stale]}
            runtime.prune_logs()
            self.assertEqual(list(runtime.jobs[key]['messages']), [])
            self.assertEqual(list(Path(directory).glob('*/*.json')), [])
