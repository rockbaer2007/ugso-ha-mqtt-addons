"""Exercise the actual runtime with isolated HA boundaries and no network."""
import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from importlib import import_module
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch


def module(name, **values):
    result = ModuleType(name)
    result.__dict__.update(values)
    return result


class Coordinator:
    def __init__(self, hass, *args, **kwargs):
        self.hass = hass

    def async_set_updated_data(self, data):
        self.data = data


class Store:
    data = None

    def __init__(self, *args):
        pass

    async def async_load(self):
        return deepcopy(Store.data)

    async def async_save(self, value):
        Store.data = deepcopy(value)


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from custom_components.weihnachtssteuerung.engine import DEFAULTS
        self.now = datetime(2026, 12, 1, 17, tzinfo=timezone.utc)
        self.registry = SimpleNamespace(async_get=lambda entity_id: None)
        modules = {
            "homeassistant": module("homeassistant"),
            "homeassistant.const": module("homeassistant.const", EVENT_HOMEASSISTANT_STARTED="started", STATE_UNAVAILABLE="unavailable", STATE_UNKNOWN="unknown"),
            "homeassistant.core": module("homeassistant.core", callback=lambda fn: fn),
            "homeassistant.helpers": module("homeassistant.helpers"),
            "homeassistant.helpers.entity_registry": module("homeassistant.helpers.entity_registry", async_get=lambda hass: self.registry),
            "homeassistant.helpers.event": module("homeassistant.helpers.event", async_track_state_change_event=lambda *a, **kw: lambda: None, async_track_time_change=lambda *a, **kw: lambda: None),
            "homeassistant.helpers.storage": module("homeassistant.helpers.storage", Store=Store),
            "homeassistant.helpers.update_coordinator": module("homeassistant.helpers.update_coordinator", DataUpdateCoordinator=Coordinator),
            "homeassistant.util": module("homeassistant.util"),
            "homeassistant.util.dt": module("homeassistant.util.dt", now=lambda: self.now),
        }
        self.modules = patch.dict(sys.modules, modules)
        self.modules.start()
        sys.modules.pop("custom_components.weihnachtssteuerung.runtime", None)
        runtime = import_module("custom_components.weihnachtssteuerung.runtime")
        self.state = "off"
        self.hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda entity: SimpleNamespace(state=self.state)),
            services=SimpleNamespace(async_call=AsyncMock()), config=SimpleNamespace(language="de"), is_running=True)
        channel = {"entity_id": "input_boolean.demo", "mode": "period", "on_time": "16:00", "off_time": "23:00", "holidays": []}
        self.entry = SimpleNamespace(entry_id="isolated-test", data=DEFAULTS | {"channels": [channel]}, options={})
        Store.data = None
        self.runtime = runtime.ChristmasRuntime(self.hass, self.entry)
        await self.runtime.async_load()

    async def asyncTearDown(self):
        sys.modules.pop("custom_components.weihnachtssteuerung.runtime", None)
        self.modules.stop()

    async def test_change_only_and_scheduled_off(self):
        await self.runtime._async_tick(None)
        await self.runtime._async_tick(None)
        self.assertEqual(self.hass.services.async_call.await_count, 1)
        self.assertEqual(self.hass.services.async_call.await_args.args[:2], ("input_boolean", "turn_on"))
        self.now = self.now.replace(hour=23)
        await self.runtime._async_tick(None)
        self.assertEqual(self.hass.services.async_call.await_count, 2)
        self.assertEqual(self.hass.services.async_call.await_args.args[:2], ("input_boolean", "turn_off"))

    async def test_pause_is_persistent_and_does_not_touch_target(self):
        await self.runtime.async_enable(0, False)
        self.hass.services.async_call.assert_not_awaited()
        replacement = type(self.runtime)(self.hass, self.entry)
        await replacement.async_load()
        self.assertFalse(replacement.is_enabled(0))
        await replacement.async_enable(0, True)
        self.hass.services.async_call.assert_awaited_once()

    async def test_unavailable_then_recovery_and_service_error_retry(self):
        self.state = "unavailable"
        await self.runtime._async_tick(None)
        self.hass.services.async_call.assert_not_awaited()
        self.assertIn(0, self.runtime.errors)
        self.state = "off"
        self.hass.services.async_call.side_effect = RuntimeError("synthetic failure")
        await self.runtime._async_tick(None)
        self.assertNotIn(0, self.runtime.desired)
        self.hass.services.async_call.side_effect = None
        await self.runtime._async_tick(None)
        self.assertNotIn(0, self.runtime.errors)

    async def test_recursive_target_is_rejected(self):
        self.registry.async_get = lambda entity: SimpleNamespace(platform="weihnachtssteuerung")
        await self.runtime._async_tick(None)
        self.hass.services.async_call.assert_not_awaited()
        self.assertIn(0, self.runtime.errors)

    async def test_five_channels_are_independent(self):
        template = self.runtime.channels[0]
        self.runtime.channels = [template | {"entity_id": f"input_boolean.demo_{n}", "mode": "period" if n % 2 == 0 else "holidays", "holidays": ["christmas"]} for n in range(5)]
        await self.runtime._async_tick(None)
        calls = self.hass.services.async_call.await_args_list
        self.assertEqual(len(calls), 5)
        self.assertEqual([c.args[1] for c in calls], ["turn_on", "turn_off", "turn_on", "turn_off", "turn_on"])
        self.assertEqual(len({c.args[2]["entity_id"] for c in calls}), 5)
