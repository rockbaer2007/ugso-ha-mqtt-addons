import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from server import RUNTIME_LOG_MAX_BYTES, ScriptRuntime


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
