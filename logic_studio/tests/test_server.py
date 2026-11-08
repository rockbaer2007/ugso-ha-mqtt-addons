import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import LogicServer, Store, public_entity


class ServerTests(unittest.TestCase):
    def test_language_preferences_survive_restart_without_changing_plan(self):
        with tempfile.TemporaryDirectory() as root:
            plan={'format':'ugso.logic/1','name':'Mein Plan','blocks':[],'links':[]}
            for locale in ('de','en','fr'):
                store=Store(root)
                payload={'revision':store.read('lang')['revision'],'plan':plan,'preferences':{'language':locale,'favorites':['AND'],'recent':['STATE_IN'],'collapsed':['memory']}}
                store.write('lang',payload)
                saved=Store(root).read('lang')
                self.assertEqual(saved['plan'],plan)
                self.assertEqual(saved['preferences'],payload['preferences'])

    def test_entity_metadata_without_arbitrary_attributes(self):
        entity = public_entity({'entity_id':'sensor.test','state':'21.2','attributes':{'friendly_name':'Test','latitude':42,'device_class':'temperature','unit_of_measurement':'°C'}})
        self.assertEqual(entity['signal_type'], 'REAL')
        self.assertNotIn('latitude', str(entity))
        self.assertFalse(entity['output_supported'])
        self.assertEqual(public_entity({'entity_id':'switch.test','state':'off'})['signal_type'], 'BOOL')
        light=public_entity({'entity_id':'light.test','state':'on','attributes':{'brightness':128,'battery':80,'latitude':42}})
        self.assertEqual(light['attributes']['brightness'],128)
        self.assertEqual(light['attributes']['battery'],80)
        self.assertNotIn('latitude',light['attributes'])
        self.assertTrue(public_entity({'entity_id':'input_number.test','state':'2'})['output_supported'])
        self.assertTrue(public_entity({'entity_id':'input_text.test','state':'001'})['output_supported'])

    def test_store_conflict_backup_and_user_isolation(self):
        with tempfile.TemporaryDirectory() as root:
            store = Store(root)
            payload={'revision':0,'plan':{'format':'ugso.logic/1','blocks':[],'links':[]},'preferences':{'favorites':['AND']}}
            self.assertEqual(store.write('user1',payload)['revision'],1)
            self.assertIsNone(store.write('user1',payload))
            self.assertIsNone(store.read('user2')['plan'])
            payload['revision']=1
            self.assertEqual(store.write('user1',payload)['revision'],2)
            self.assertEqual(len(list((Path(root)/'backups').glob('*.json'))),1)
            self.assertEqual(Store(root).read('user1')['preferences']['favorites'],['AND'])

    def test_api_demo_filters_read_only_and_persistence(self):
        with tempfile.TemporaryDirectory() as root:
            server=LogicServer(('127.0.0.1',0),root,demo=True)
            worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
            base='http://127.0.0.1:'+str(server.server_port)
            def call(path,body=None,headers=None):
                req=Request(base+path,data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'PUT',headers=headers or {'Content-Type':'application/json'})
                with urlopen(req) as response:return json.load(response)
            try:
                data=call('/api/entities?output=1')
                self.assertEqual(data['total'],3)
                self.assertTrue(all(e['output_supported'] for e in data['items']))
                self.assertEqual(call('/api/entities?q=temperatur')['items'][0]['entity_id'],'sensor.demo_temperatur')
                payload={'revision':0,'plan':{'format':'ugso.logic/1','blocks':[],'links':[]}}
                self.assertEqual(call('/api/workspace',payload)['revision'],1)
                self.assertEqual(call('/api/workspace')['revision'],1)
                for path in ['/api/services/light/turn_on','/api/workspace']:
                    with self.assertRaises(HTTPError) as ctx:call(path,payload)
                    self.assertIn(ctx.exception.code,(404,409))
                with self.assertRaises(HTTPError) as ctx:call('/api/workspace',payload,{'Content-Type':'application/json','Sec-Fetch-Site':'cross-site'})
                self.assertEqual(ctx.exception.code,403)
                with self.assertRaises(HTTPError) as ctx:call('/api/info',headers={'Host':'other-host.test'})
                self.assertEqual(ctx.exception.code,403)
                with self.assertRaises(HTTPError) as ctx:call('/../server.py')
                self.assertEqual(ctx.exception.code,404)
            finally:
                server.shutdown();server.server_close();worker.join()

    def test_supervisor_token_stays_backend_and_only_states_are_read(self):
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,limit):return b'[{"entity_id":"switch.test","state":"on"}]'
        with tempfile.TemporaryDirectory() as root:
            server=LogicServer(('127.0.0.1',0),root,supervisor=True)
            try:
                with patch.dict('os.environ',{'SUPERVISOR_TOKEN':'test-secret'}),patch('server.build_opener') as opener:
                    opener.return_value.open.return_value=Response()
                    entities=server.entities()
                    req=opener.return_value.open.call_args.args[0]
                    self.assertEqual(req.full_url,'http://supervisor/core/api/states')
                    self.assertEqual(req.get_method(),'GET')
                    self.assertEqual(req.get_header('Authorization'),'Bearer test-secret')
                    self.assertNotIn('test-secret',json.dumps(entities))
            finally:server.server_close()

    def test_native_import_api_is_bounded_read_only_and_blocks_cross_origin(self):
        with tempfile.TemporaryDirectory() as root:
            config=Path(root)/'config';config.mkdir();original='- alias: Source test\n  triggers: []\n  actions: []\n';(config/'automations.yaml').write_text(original)
            server=LogicServer(('127.0.0.1',0),Path(root)/'data',config_root=config)
            worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start();base='http://127.0.0.1:'+str(server.server_port)
            try:
                with urlopen(base+'/api/ha-sources?kind=automation') as r:self.assertEqual(json.load(r)['items'][0]['name'],'Source test')
                body=json.dumps({'text':'alias: Script\nsequence: []','kind':'script'}).encode()
                with urlopen(Request(base+'/api/parse-ha',data=body,headers={'Content-Type':'application/json'})) as r:self.assertEqual(json.load(r)['items'][0]['kind'],'script')
                with self.assertRaises(HTTPError) as ctx:urlopen(Request(base+'/api/parse-ha',data=body,headers={'Content-Type':'application/json','Sec-Fetch-Site':'cross-site'}))
                self.assertEqual(ctx.exception.code,403)
                self.assertEqual((config/'automations.yaml').read_text(),original)
                self.assertEqual(len(list((Path(root)/'data'/'ha-source-backups').glob('*/automations.yaml'))),1)
            finally:server.shutdown();server.server_close();worker.join()


if __name__=='__main__':unittest.main()
