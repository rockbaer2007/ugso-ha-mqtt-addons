import sys
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import Bridge, Config


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.options = {"broker_host": "iobroker.local", "entities": ["sensor.temperature", "switch.test"],
                        "command_entities": ["switch.test"]}
        self.client = Mock()
        self.client.publish.return_value.rc = 0
        self.client.publish.return_value.is_published.return_value = True
        self.ha = Mock()
        self.ha.states.return_value = {"sensor.temperature": "21.5", "switch.test": "off", "sensor.private": "secret"}
        self.bridge = Bridge(Config.load(self.options), self.ha, self.client)
        self.bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)

    def message(self, payload=b"ON", topic="ha_external/switch.test/set", retain=False):
        self.bridge.on_message(self.client, None, SimpleNamespace(topic=topic, payload=payload, retain=retain))

    def test_only_selected_states_and_no_unchanged_republish(self):
        self.bridge.poll()
        self.assertEqual(self.client.publish.call_count, 3)
        self.assertNotIn("secret", str(self.client.publish.call_args_list))
        self.client.publish.reset_mock()
        self.bridge.poll()
        self.client.publish.assert_called_once_with("ha_external/availability", "online", qos=1, retain=True)

    def test_reconnect_resends_states(self):
        self.bridge.poll()
        self.client.publish.reset_mock()
        self.bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)
        self.bridge.poll()
        self.assertEqual(self.client.publish.call_count, 3)

    def test_missing_entity_becomes_unavailable(self):
        self.ha.states.return_value = {}
        self.bridge.poll()
        self.client.publish.assert_any_call("ha_external/switch.test/state", "unavailable", qos=1, retain=True)

    def test_failed_publish_is_not_cached(self):
        self.client.publish.return_value.rc = 4
        with self.assertRaises(ConnectionError):
            self.bridge.poll()
        self.assertEqual(self.bridge.sent, {})

    def test_publish_requires_acknowledgement(self):
        self.client.publish.return_value.is_published.return_value = False
        with self.assertRaises(ConnectionError):
            self.bridge.poll()
        self.assertEqual(self.bridge.sent, {})

    def test_commands_are_explicit_and_not_retained(self):
        for args in ({"retain": True}, {"topic": "ha_external/light.other/set"},
                     {"payload": b"TOGGLE"}, {"payload": b"\xff"}, {"payload": b"ON" * 20}):
            self.message(**args)
        self.assertTrue(self.bridge.commands.empty())
        self.message(b"on")
        self.bridge.process_command(self.bridge.commands.get_nowait())
        self.ha.command.assert_called_once_with("switch.test", "turn_on")

    def test_stale_and_previous_connection_commands_are_dropped(self):
        self.bridge.process_command((time.monotonic() - 11, self.bridge.generation, "switch.test", "turn_on"))
        self.message()
        self.bridge.generation += 1
        self.bridge.process_command(self.bridge.commands.get_nowait())
        self.ha.command.assert_not_called()

    def test_configuration_rejects_wildcards_and_unapproved_commands(self):
        for changes in ({"topic_prefix": "ha/#"}, {"broker_host": "mqtt://host"},
                        {"entities": ["switch.+"]}, {"command_entities": ["light.other"]},
                        {"entities": ["lock.front"], "command_entities": ["lock.front"]},
                        {"poll_interval": 0}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                Config.load({**self.options, **changes})


if __name__ == "__main__":
    unittest.main()
