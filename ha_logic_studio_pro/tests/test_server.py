import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch
import io
import threading
import yaml

from server import RUNTIME_LOG_MAX_BYTES, ScriptRuntime, LogicServer, ProjectStore, runtime_source, public_entity, search_entities


class BlocksAutostartTests(unittest.TestCase):
    def project(self, enabled=True):
        return {'name': 'Autostart test', 'type': 'blocks-js', 'autostart': enabled,
                'workspace': {'blocks': {'languageVersion': 0, 'blocks': [
                    {'type': 'ha_js_log', 'inputs': {'VALUE': {'block': {'type': 'text', 'fields': {'TEXT': 'started'}}}}}
                ]}}}

    def test_autostart_survives_store_reload_without_enabling_other_projects(self):
        with TemporaryDirectory() as directory:
            project = self.project()
            tree = {'folders': [], 'projects': [['42', project], ['43', self.project(False)]]}
            ProjectStore(directory).write('owner', {'revision': 0, 'tree': tree})
            reloaded = ProjectStore(directory)
            self.assertEqual(list(reloaded.autostart_projects()), [('owner', '42', project)])
            self.assertEqual(reloaded.read('owner')['tree'], tree)
            with self.assertRaises(ValueError):
                reloaded.write('owner', {'revision': 1, 'tree': {'folders': [], 'projects': [
                    ['44', {'name': 'Native YAML', 'type': 'blocks', 'autostart': True}]]}})

    def test_app_restart_regenerates_saved_blocks_and_uses_existing_permissions(self):
        with TemporaryDirectory() as directory:
            project = self.project()
            ProjectStore(directory).write('owner', {'revision': 0, 'tree': {'folders': [], 'projects': [
                ['42', project], ['43', self.project(False)]]}})
            server = LogicServer(('127.0.0.1', 0), directory, supervisor=True)
            options = {'readable': ['sensor.test'], 'writable': [], 'writeAll': False}
            try:
                with patch.object(server, 'live_runtime_config', return_value=options), patch.object(server.runtime, 'control') as control:
                    server.start_configured_projects()
                control.assert_called_once()
                args, kwargs = control.call_args
                self.assertEqual(args[:3], ('owner', '42', 'start'))
                self.assertIn('ha.log', args[3])
                self.assertIn('started', args[3])
                self.assertEqual(args[4], 'javascript')
                self.assertEqual(args[5], {**options, 'startupRetry': True})
                self.assertEqual(kwargs['project_snapshot'], project)
            finally:
                server.server_close()

    def test_invalid_saved_blocks_report_startup_error_without_starting(self):
        with TemporaryDirectory() as directory:
            project = {**self.project(), 'workspace': {'blocks': {'blocks': [{'type': 'unknown_invalid_block'}]}}}
            ProjectStore(directory).write('owner', {'revision': 0, 'tree': {'folders': [], 'projects': [['42', project]]}})
            server = LogicServer(('127.0.0.1', 0), directory, supervisor=True)
            try:
                with patch.object(server.runtime, 'control') as control, patch.object(server.runtime, 'startup_error') as error:
                    server.start_configured_projects()
                control.assert_not_called()
                error.assert_called_once()
                self.assertEqual(error.call_args.args[:2], ('owner', '42'))
            finally:
                server.server_close()


class SensorBridgeTests(unittest.TestCase):
    def test_bridge_follows_permissions_and_is_stopped_on_close(self):
        with TemporaryDirectory() as directory:
            server = LogicServer(('127.0.0.1', 0), directory, supervisor=True)
            config = {'token': 'unit-test-only', 'writeAll': False, 'writable': ['sensor.test']}
            process = Mock()
            process.poll.return_value = None
            with patch.object(server, 'live_runtime_config', side_effect=lambda: config), patch('subprocess.Popen', return_value=process) as popen:
                server.sync_sensor_bridge()
                self.assertEqual(popen.call_count, 1)
                self.assertEqual(json.loads(process.stdin.write.call_args.args[0]), config)
                process.stdin.close.assert_called_once()
                server.sync_sensor_bridge()
                self.assertEqual(popen.call_count, 1)
                config = {**config, 'writable': []}
                server.sync_sensor_bridge()
                process.terminate.assert_called_once()
                self.assertIsNone(server.sensor_bridge)
            server.server_close()

    def test_invalid_options_stop_existing_bridge(self):
        with TemporaryDirectory() as directory:
            server = LogicServer(('127.0.0.1', 0), directory, supervisor=True)
            process = Mock()
            process.poll.return_value = None
            server.sensor_bridge = process
            with patch.object(server, 'live_runtime_config', side_effect=ValueError('invalid options')):
                server.sync_sensor_bridge()
            process.terminate.assert_called_once()
            server.server_close()


class RuntimeAllPermissionTests(unittest.TestCase):
    def read_config(self, root, options):
        path = Path(root) / 'options.json'
        path.write_text(json.dumps(options), encoding='utf-8')
        before = path.read_bytes()
        server = object.__new__(LogicServer)
        server.supervisor = True
        server.runtime_options = path
        with patch.dict('os.environ', {'SUPERVISOR_TOKEN': 'unit-test-only'}):
            result = server.live_runtime_config()
        self.assertEqual(path.read_bytes(), before, 'Reading permissions must never erase stored lists')
        return result

    def test_missing_flags_keep_legacy_behavior(self):
        with TemporaryDirectory() as root:
            result = self.read_config(root, {'runtime_read_entities': ['sensor.pv']})
        self.assertEqual(result['readable'], ['sensor.pv'])
        for flag in ('readAll', 'writeAll', 'eventsAll', 'mqttAll'):
            self.assertIs(result[flag], False)

    def test_each_all_flag_ignores_only_its_list_and_preserves_original_file(self):
        pairs = [('runtime_read_all', 'runtime_read_entities', 'readable', 'readAll', 'sensor.pv'),
                 ('runtime_write_all', 'runtime_write_entities', 'writable', 'writeAll', 'light.flur'),
                 ('runtime_events_all', 'runtime_events', 'events', 'eventsAll', 'sample_event'),
                 ('runtime_mqtt_all', 'runtime_mqtt_topics', 'mqttTopics', 'mqttAll', 'house/topic')]
        options = {key: [value] for _, key, _, _, value in pairs}
        for flag, key, result_key, all_key, value in pairs:
            with self.subTest(flag=flag), TemporaryDirectory() as root:
                result = self.read_config(root, {**options, flag: True})
                self.assertEqual(result[result_key], [])
                self.assertIs(result[all_key], True)
                restored = self.read_config(root, {**options, flag: False})
                self.assertEqual(restored[result_key], [value])
                for other_flag, _, other_key, other_all, other_value in pairs:
                    if other_flag != flag:
                        self.assertEqual(result[other_key], [other_value])
                        self.assertIs(result[other_all], False)

    def test_flags_are_strict_booleans_and_inactive_lists_are_not_validated(self):
        for invalid in ('true', 1, None):
            with TemporaryDirectory() as root, self.assertRaises(ValueError):
                self.read_config(root, {'runtime_read_all': invalid})
        with TemporaryDirectory() as root:
            self.assertEqual(self.read_config(root, {'runtime_read_all': True,
                                                   'runtime_read_entities': ['old invalid entry']})['readable'], [])
        with TemporaryDirectory() as root, self.assertRaises(ValueError):
            self.read_config(root, {'runtime_read_all': False, 'runtime_read_entities': ['old invalid entry']})

    def test_four_boolean_options_default_off_and_all_locale_labels_exist(self):
        root = Path(__file__).resolve().parents[1]
        config = yaml.safe_load((root / 'config.yaml').read_text(encoding='utf-8'))
        flags = ('runtime_read_all', 'runtime_write_all', 'runtime_events_all', 'runtime_mqtt_all')
        for flag in flags:
            self.assertIs(config['options'][flag], False)
            self.assertEqual(config['schema'][flag], 'bool')
        for locale in ('de', 'en', 'fr'):
            messages = yaml.safe_load((root / 'translations' / (locale + '.yaml')).read_text(encoding='utf-8'))['configuration']
            self.assertEqual(set(messages), set(config['options']))
            self.assertTrue(all(item['name'] and item['description'] for item in messages.values()))


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
    def test_clear_messages_keeps_process_and_state_and_does_not_restore_old_log(self):
        with TemporaryDirectory() as directory:
            runtime = ScriptRuntime(directory)
            key = ('owner', '42')
            now = datetime.now(timezone.utc).isoformat()
            old = {'time': now, 'text': 'old', 'error': False}
            process = object()
            runtime.jobs[key] = {'process': process, 'state': 'running', 'messages': [old]}
            runtime.write_log(runtime.log_directory('owner') / '42.json', [old])
            runtime.clear_messages('owner', '42')
            self.assertIs(runtime.jobs[key]['process'], process)
            self.assertEqual(runtime.jobs[key]['state'], 'running')
            self.assertEqual(runtime.jobs[key]['messages'], [])
            self.assertEqual(list(ScriptRuntime(directory).saved_messages(key)), [])
            runtime.add_message(key, runtime.jobs[key], 'new', False)
            self.assertEqual([entry['text'] for entry in runtime.jobs[key]['messages']], ['new'])
            self.assertEqual([entry['text'] for entry in ScriptRuntime(directory).saved_messages(key)], ['new'])

    def test_runtime_status_reports_saved_changes_without_restarting(self):
        runtime = ScriptRuntime()
        original = {'type': 'blocks-js', 'name': 'Example', 'workspace': {'value': 0.5}}
        runtime.jobs[('owner', '42')] = {'process': None, 'state': 'running', 'messages': [], 'project_snapshot': original}
        changed = {**original, 'workspace': {'value': 1.5}}
        self.assertFalse(runtime.status('owner', lambda: {'tree': {'projects': [['42', original]]}})['42']['outdated'])
        self.assertTrue(runtime.status('owner', lambda: {'tree': {'projects': [['42', changed]]}})['42']['outdated'])

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
