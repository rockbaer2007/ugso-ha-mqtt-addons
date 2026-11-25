import unittest
from unittest.mock import AsyncMock
from types import SimpleNamespace

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer
from app_server import HomeAssistant, create_app


class AppTests(unittest.IsolatedAsyncioTestCase):
    async def client(self, internal=True, allowed=True):
        ha = SimpleNamespace(admin=AsyncMock(return_value=allowed), proxy=AsyncMock(return_value=web.json_response({"entries": []})),
                             restart=AsyncMock(return_value={"restarting": True}), register_card=AsyncMock(return_value={"registered": True}))
        app = create_app(ha, {"restart_required": False})
        if internal:
            @web.middleware
            async def ingress_transport(request, handler):
                return await handler(request.clone(remote="172.30.32.2"))
            app.middlewares.insert(0, ingress_transport)
        client = TestClient(TestServer(app))
        await client.start_server()
        self.addAsyncCleanup(client.close)
        return client, ha

    async def test_health_is_non_sensitive_and_non_ingress_is_denied(self):
        client, ha = await self.client(internal=False)
        self.assertEqual((await client.get("/health")).status, 200)
        self.assertEqual((await client.get("/api/editor")).status, 403)
        ha.proxy.assert_not_awaited()

    async def test_non_admin_cannot_open_editor(self):
        client, ha = await self.client(allowed=False)
        self.assertEqual((await client.get("/")).status, 403)
        ha.proxy.assert_not_awaited()

    async def test_csrf_required_and_only_fixed_proxy_routes(self):
        client, ha = await self.client()
        self.assertEqual((await client.post("/api/restart", json={})).status, 403)
        ha.restart.assert_not_awaited()
        bootstrap = await (await client.get("/api/bootstrap")).json()
        self.assertNotIn("token", bootstrap)
        self.assertEqual((await client.post("/api/restart", json={}, headers={"X-Festtags-CSRF": bootstrap["csrf"]})).status, 200)
        ha.restart.assert_awaited_once()
        self.assertEqual((await client.get("/api/arbitrary-ha-command")).status, 404)

    async def test_actual_admin_status_is_required(self):
        ha = HomeAssistant(None, "synthetic-only")
        ha.ws = AsyncMock(return_value=[{"id": "a", "is_active": True, "group_ids": ["system-admin"]}, {"id": "b", "is_active": False, "is_owner": True}])
        self.assertTrue(await ha.admin("a"))
        self.assertFalse(await ha.admin("b"))
        self.assertFalse(await ha.admin(""))

    async def test_fresh_install_uses_native_config_flow_without_yaml_changes(self):
        ha=HomeAssistant(None,"synthetic-only")
        ha.ws=AsyncMock(return_value=[])
        ha._flow_post=AsyncMock(side_effect=[{"step_id":"user","flow_id":"owned-flow"},{"step_id":"country","flow_id":"owned-flow"},{"type":"create_entry"}])
        self.assertTrue((await ha.ensure_integration())["created"])
        self.assertEqual(ha._flow_post.await_args_list[1].args,("/owned-flow",{"region":"central"}))
        self.assertEqual(ha._flow_post.await_args_list[2].args[1]["country"],"DE")
        ha.ws=AsyncMock(return_value=[{"entry_id":"existing"}])
        ha._flow_post.reset_mock()
        self.assertFalse((await ha.ensure_integration())["created"])
        ha._flow_post.assert_not_awaited()

    async def test_card_resource_update_preserves_unrelated_resources(self):
        ha=HomeAssistant(None,"synthetic-only")
        ha.ws=AsyncMock(side_effect=[[{"id":"ours","url":"/local/weihnachtssteuerung/weihnachtssteuerung-card.js?v=old","type":"module"},
                                     {"id":"other","url":"/hacsfiles/lovelace-mushroom/mushroom.js","type":"module"}],{}])
        result=await ha.register_card()
        self.assertIn("&r=",result["url"])
        self.assertEqual(ha.ws.await_args_list[1].kwargs["resource_id"],"ours")
        self.assertEqual(ha.ws.await_count,2)
