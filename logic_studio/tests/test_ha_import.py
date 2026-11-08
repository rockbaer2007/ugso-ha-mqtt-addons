from pathlib import Path
import json
import tempfile
import unittest
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ha_import import parse_documents, SourceReader

class ImportTests(unittest.TestCase):
    def test_tags_types_and_multiple_entries(self):
        items=parse_documents('- alias: Test\n  triggers: []\n  actions:\n    - variables:\n        switch: on\n        flag: false\n        date: 2026-11-08\n        entity: !input target\n')
        v=items[0]['config']['actions'][0]['variables']
        self.assertEqual(v,{'switch':'on','flag':False,'date':'2026-11-08','entity':{'$haTag':'input','value':'target'}})
        self.assertEqual(len(parse_documents('a:\n  sequence: []\nb:\n  sequence: []','script')),2)
    def test_invalid_yaml_is_not_executed_or_silently_replaced(self):
        for value in ('a: 1\na: 2','x: !!python/object/apply:os.system [echo hi]','x: &x [*x]','x: .nan','__proto__: 1'):
            with self.assertRaises(Exception):parse_documents(value)
    def test_source_copy_precedes_parse_originals_unchanged(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)/'ha';root.mkdir();backup=Path(temp)/'backup';data=b'- alias: Test\n  triggers: []\n  actions: []\n';(root/'automations.yaml').write_bytes(data)
            (root/'secrets.yaml').write_text('private: never read')
            reader=SourceReader(root,backup);self.assertEqual(len(reader.sources('automation')),1)
            self.assertEqual((root/'automations.yaml').read_bytes(),data)
            copies=list(backup.glob('*/automations.yaml'));self.assertEqual(copies[0].read_bytes(),data)
            self.assertFalse(list(backup.rglob('secrets.yaml')))
            with self.assertRaises(ValueError):reader.path('../secret')
            (root/'scripts.yaml').write_text('invalid: [')
            with self.assertRaises(Exception):reader.sources('script')
            self.assertEqual(len(list(backup.glob('*/scripts.yaml'))),1)

if __name__=='__main__':unittest.main()
