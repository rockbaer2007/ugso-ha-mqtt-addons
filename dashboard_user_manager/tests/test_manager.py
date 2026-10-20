import asyncio
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, AsyncMock

APP = Path(__file__).resolve().parents[1] / 'app'
if not APP.is_dir(): APP = Path(__file__).resolve().parents[1] / 'dashboard_user_manager/app'
sys.path.insert(0, str(APP))
from visibility import Invalid, fingerprint, summary, transform, transform_matrix
from server import HA, HAError, Manager, create_app
from aiohttp import web
from aiohttp.test_utils import make_mocked_request

USERS = [dict(id='admin', name='Administrator', is_active=True, is_owner=True),
         dict(id='web', name='webuser', is_active=True),
         dict(id='phone', name='Telefon', is_active=True),
         dict(id='system', system_generated=True, is_active=True)]
CONFIG = {'title': 'Original', 'background': 'var(--x)', 'custom': {'keep': [1, 2]}, 'views': [
    {'title': 'Alle', 'path': 'home', 'cards': [{'type': 'markdown', 'content': '{{ states("sensor.test") }}'}]},
    {'title': 'Privat', 'visible': [{'user': 'admin'}, {'user': 'deleted'}], 'cards': [], 'theme': 'Dark'},
    {'title': 'Detail', 'visible': False, 'subview': True, 'cards': [{'card_mod': {'style': 'color:red;'}}]},
    {'title': 'Leer', 'visible': [], 'cards': []}]}


class LogicTests(unittest.TestCase):
    def test_replace_preserves_every_other_property_and_original(self):
        before = copy.deepcopy(CONFIG)
        after, changes, warnings = transform(CONFIG, USERS, 'replace', ['web'])
        self.assertEqual(len(changes), 4)
        self.assertEqual(warnings, [])
        for old, new in zip(CONFIG['views'], after['views']):
            self.assertEqual({k:v for k,v in old.items() if k != 'visible'},
                             {k:v for k,v in new.items() if k != 'visible'})
            self.assertEqual(new['visible'], [{'user': 'web'}])
        self.assertEqual(CONFIG, before)
        self.assertEqual(after['custom'], before['custom'])

    def test_add_retains_all_and_deleted_users(self):
        after, changes, _ = transform(CONFIG, USERS, 'add', ['web', 'web'])
        self.assertNotIn('visible', after['views'][0])
        self.assertEqual(after['views'][1]['visible'], [{'user': 'admin'}, {'user': 'deleted'}, {'user': 'web'}])
        self.assertEqual(after['views'][2]['visible'], [{'user': 'web'}])
        self.assertEqual(len(changes), 3)

    def test_remove_all_materializes_humans_only(self):
        after, _, warnings = transform(CONFIG, USERS, 'remove', ['web'])
        self.assertEqual(after['views'][0]['visible'], [{'user': 'admin'}, {'user': 'phone'}])
        self.assertEqual(after['views'][1], CONFIG['views'][1])
        self.assertEqual(len(warnings), 1)

    def test_reset_and_noop(self):
        after, _, _ = transform(CONFIG, USERS, 'reset', [])
        self.assertTrue(all('visible' not in v for v in after['views']))
        self.assertEqual(transform(after, USERS, 'add', ['web'])[1], [])

    def test_fail_closed_for_custom_visibility(self):
        bad = copy.deepcopy(CONFIG)
        bad['views'][-1]['visible'] = [{'user': 'web', 'condition': 'anything'}]
        for op in ['add', 'remove', 'replace', 'reset']:
            with self.subTest(op=op), self.assertRaises(Invalid):
                transform(bad, USERS, op, ['web'])
        self.assertIn('unsupported', summary(bad)[-1])

    def test_invalid_selection_and_strategy(self):
        for ids in [[], ['missing'], ['system'], 'web', [False]]:
            with self.subTest(ids=ids), self.assertRaises(Invalid):
                transform(CONFIG, USERS, 'replace', ids)
        with self.assertRaises(Invalid):
            transform({'strategy': {}, 'views': []}, USERS, 'replace', ['web'])

    def test_matrix_changes_only_selected_rows_and_preserves_deleted_users(self):
        after, changed, _ = transform_matrix(CONFIG, USERS, [{'index': 1, 'users': ['web']}, {'index': 2, 'users': ['web']}])
        self.assertEqual([x['index'] for x in changed], [1, 2])
        self.assertEqual(after['views'][0], CONFIG['views'][0])
        self.assertEqual(after['views'][3], CONFIG['views'][3])
        self.assertEqual(after['views'][1]['visible'], [{'user':'deleted'}, {'user':'web'}])
        for old, new in zip(CONFIG['views'], after['views']):
            self.assertEqual({k:v for k,v in old.items() if k != 'visible'}, {k:v for k,v in new.items() if k != 'visible'})
        self.assertNotIn('visible', CONFIG['views'][0])

    def test_matrix_noop_keeps_implicit_all_and_false(self):
        after, changed, _ = transform_matrix(CONFIG, USERS, [{'index':0,'users':['admin','phone','web']}, {'index':2,'users':[]}])
        self.assertEqual(after, CONFIG)
        self.assertEqual(changed, [])

    def test_matrix_empty_selection_and_invalid_rows(self):
        after, _, _ = transform_matrix(CONFIG, USERS, [{'index':0,'users':[]}])
        self.assertEqual(after['views'][0]['visible'], [])
        for rows in [[{'index':-1,'users':[]}], [{'index':True,'users':[]}], [{'index':0,'users':['system']}],
                     [{'index':0,'users':[]}, {'index':0,'users':[]}], [{'index':0}], None]:
            with self.subTest(rows=rows), self.assertRaises(Invalid): transform_matrix(CONFIG, USERS, rows)


class FakeHA:
    def __init__(self):
        self.data = copy.deepcopy(CONFIG)
        self.people = copy.deepcopy(USERS)
        self.writes = 0
        self.before_write = lambda: None
        self.fail = False
        self.mismatch = False

    async def users(self): return copy.deepcopy(self.people)
    async def dashboards(self): return [{'url_path': 'test', 'mode': 'storage'}]
    async def config(self, path): return copy.deepcopy(self.data)
    async def call(self, command, **kwargs):
        assert command == 'lovelace/config/save'
        self.before_write()
        self.writes += 1
        if self.fail: raise HAError('Testfehler')
        self.data = copy.deepcopy(kwargs['config'])
        if self.mismatch: self.data['unexpected'] = True


class ManagerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.ha = FakeHA()
        self.manager = Manager(self.ha, self.tmp.name)

    async def plan(self): return await self.manager.preview('admin', 'test', 'replace', ['web'])

    async def test_backup_before_write_and_restore_roundtrip(self):
        def check_backup():
            files = list(Path(self.tmp.name).glob('*.json'))
            self.assertGreaterEqual(len(files), 1)
            r = json.loads(files[0].read_text(encoding='utf-8'))
            self.assertEqual(r['before_hash'], fingerprint(r['config']))
        self.ha.before_write = check_backup
        p = await self.plan()
        result = await self.manager.commit('admin', p['token'])
        self.assertEqual(result['changed'], 4)
        self.assertEqual(self.ha.data['views'][0]['visible'], [{'user':'web'}])
        await self.manager.restore('admin', result['backup'])
        self.assertEqual(self.ha.data, CONFIG)
        self.assertEqual(len(self.manager.list_backups()), 2)

    async def test_conflict_config_and_users_prevents_write(self):
        p = await self.plan()
        self.ha.data['title'] = 'Nutzeränderung'
        with self.assertRaises(Invalid): await self.manager.commit('admin', p['token'])
        self.ha.data = copy.deepcopy(CONFIG)
        self.ha.people.append({'id':'new'})
        with self.assertRaises(Invalid): await self.manager.commit('admin', p['token'])
        self.assertEqual(self.ha.writes, 0)

    async def test_actor_expiry_and_replay(self):
        p = await self.plan()
        with self.assertRaises(Invalid): await self.manager.commit('web', p['token'])
        self.manager.previews[p['token']]['expires'] = 0
        with self.assertRaises(Invalid): await self.manager.commit('admin', p['token'])
        p = await self.plan()
        await self.manager.commit('admin', p['token'])
        with self.assertRaises(Invalid): await self.manager.commit('admin', p['token'])
        self.assertEqual(self.ha.writes, 1)

    async def test_failed_and_unconfirmed_write_retains_backup(self):
        for mode in ['fail', 'mismatch']:
            with self.subTest(mode=mode):
                setattr(self.ha, mode, True)
                p = await self.plan()
                with self.assertRaisesRegex(HAError, 'Nicht blind wiederholen'):
                    await self.manager.commit('admin', p['token'])
                self.assertTrue(self.manager.list_backups())
                setattr(self.ha, mode, False)
                self.ha.data = copy.deepcopy(CONFIG)

    async def test_restore_does_not_overwrite_later_edits(self):
        p = await self.plan()
        result = await self.manager.commit('admin', p['token'])
        self.ha.data['title'] = 'Manuell geändert'
        with self.assertRaises(Invalid): await self.manager.restore('admin', result['backup'])
        self.assertEqual(self.ha.data['title'], 'Manuell geändert')
        self.assertEqual(self.ha.writes, 1)

    async def test_yaml_and_invalid_backup_rejected(self):
        with self.assertRaises(Invalid): await self.manager.dashboard('other')
        self.ha.dashboards = AsyncMock(return_value=[{'url_path': 'yaml', 'mode': 'yaml'}])
        with self.assertRaises(Invalid): await self.manager.dashboard('yaml')
        del self.ha.dashboards
        with self.assertRaises(Invalid): self.manager.read_backup('../config.json')
        p = await self.plan()
        result = await self.manager.commit('admin', p['token'])
        target = Path(self.tmp.name) / result['backup']
        r = json.loads(target.read_text(encoding='utf-8'))
        r['config']['title'] = 'Korrupt'
        target.write_text(json.dumps(r), encoding='utf-8')
        with self.assertRaises(Invalid): await self.manager.restore('admin', result['backup'])

    async def test_broken_websocket_is_reported_as_ha_error(self):
        adapter = HA(None, 'test-not-a-real-token')
        adapter._call = AsyncMock(side_effect=TypeError('closed websocket'))
        with self.assertRaises(HAError): await adapter.call('lovelace/config')

    async def test_backup_failure_prevents_write(self):
        p = await self.plan()
        self.manager.save_backup = Mock(side_effect=OSError('disk full'))
        with self.assertRaises(OSError): await self.manager.commit('admin', p['token'])
        self.assertEqual(self.ha.writes, 0)

    async def test_noop_does_not_write(self):
        self.ha.data = {'views': [{'title': 'Alle'}]}
        p = await self.manager.preview('admin', 'test', 'add', ['web'])
        result = await self.manager.commit('admin', p['token'])
        self.assertEqual(result['changed'], 0)
        self.assertEqual(self.ha.writes, 0)
        self.assertEqual(self.manager.list_backups(), [])

    async def test_matrix_uses_loaded_dashboard_and_user_hashes(self):
        rows = [{'index':2,'users':['web']}]
        with self.assertRaises(Invalid):
            await self.manager.matrix('admin','test', rows, 'old-dashboard', fingerprint(USERS))
        with self.assertRaises(Invalid):
            await self.manager.matrix('admin','test', rows, fingerprint(CONFIG), 'old-users')
        self.assertEqual(self.ha.writes, 0)
        p = await self.manager.matrix('admin','test', rows, fingerprint(CONFIG), fingerprint(USERS))
        saved = await self.manager.commit('admin',p['token'])
        self.assertEqual(saved['changed'],1)
        self.assertEqual(self.ha.data['views'][0],CONFIG['views'][0])
        self.assertTrue(saved['backup'])

    async def test_ingress_admin_and_csrf_guards_without_network(self):
        app = create_app(self.manager)
        guard = app.middlewares[0]
        async def handler(request): return web.json_response({'ok':True})
        def request(remote, user='admin', method='GET', extra=None):
            transport = Mock()
            transport.get_extra_info.side_effect = lambda key, default=None: (remote, 1) if key == 'peername' else default
            return make_mocked_request(method, '/api/bootstrap', headers={'X-Remote-User-Id':user, **(extra or {})}, transport=transport)
        for req in [request('127.0.0.1'), request('10.0.0.1', extra={'X-Forwarded-For':'172.30.32.2'}),
                    request('172.30.32.2', 'web'), request('172.30.32.2', ''), request('172.30.32.2', method='POST')]:
            with self.assertRaises(web.HTTPForbidden): await guard(req, handler)
        response = await guard(request('172.30.32.2'), handler)
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers['Cache-Control'], 'no-store')

    async def test_localized_api_errors_and_untouched_backup_download(self):
        app = create_app(self.manager)
        guard = app.middlewares[0]
        async def fail(request): raise Invalid('Ungültige Benutzerauswahl.')
        async def backup(request):
            return web.json_response({'message':'Keine Änderung nötig.','config':CONFIG},headers={'Content-Disposition':'attachment; filename="backup.json"'})
        for lang,expected in [('de','Ungültige Benutzerauswahl.'),('en','Invalid user selection.'),('fr','Sélection d’utilisateurs invalide.')]:
            transport=Mock()
            transport.get_extra_info.side_effect=lambda key,default=None: ('172.30.32.2',1) if key=='peername' else default
            req=make_mocked_request('GET','/api/test',headers={'X-Remote-User-Id':'admin','Accept-Language':lang},transport=transport)
            response=await guard(req,fail)
            self.assertEqual(json.loads(response.body)['error'],expected)
            response=await guard(req,backup)
            self.assertEqual(json.loads(response.body),{'message':'Keine Änderung nötig.','config':CONFIG})

    async def test_real_routes_from_bootstrap_to_save_without_network(self):
        app = create_app(self.manager)
        app.freeze()
        async def request(route, body=None, csrf=None):
            transport = Mock()
            transport.get_extra_info.side_effect = lambda key, default=None: ('172.30.32.2', 1) if key == 'peername' else default
            headers = {'X-Remote-User-Id': 'admin'}
            if body is not None: headers.update({'Content-Type': 'application/json', 'X-Dashboard-CSRF': csrf or ''})
            req = make_mocked_request('GET' if body is None else 'POST', route, headers=headers, transport=transport, app=app)
            if body is not None: req.json = AsyncMock(return_value=body)
            return await app._handle(req)
        response = await request('/api/bootstrap')
        boot = json.loads(response.body)
        self.assertEqual([u['id'] for u in boot['users']], ['admin','web','phone'])
        self.assertNotIn('credentials', response.text)
        self.assertEqual((await request('/')).status, 200)
        self.assertEqual((await request('/static/app.js')).status, 200)
        self.assertEqual(len(json.loads((await request('/api/views?path=test')).body)['views']), 4)
        preview = json.loads((await request('/api/matrix', {'path':'test',
            'rows':[{'index':i,'users':['web']} for i in range(4)],
            'config_hash':fingerprint(CONFIG), 'users_hash':boot['users_hash']}, boot['csrf'])).body)
        saved = json.loads((await request('/api/commit', {'token': preview['token']}, boot['csrf'])).body)
        self.assertEqual(saved['changed'], 4)
        restored = await request('/api/restore', {'id': saved['backup']}, boot['csrf'])
        self.assertEqual(restored.status, 200)
        self.assertEqual(self.ha.data, CONFIG)


if __name__ == '__main__': unittest.main()
