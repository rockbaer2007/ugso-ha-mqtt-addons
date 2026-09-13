import json
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import AppController, Bridge, Config, device_name_for_entity, iobroker_mapping


class FakeBridge:
    instances = []

    def __init__(self, config, ha, status=None):
        self.config = config
        self.ha = ha
        self.status = status
        self.stop = SimpleNamespace(set=Mock())
        FakeBridge.instances.append(self)

    def run(self):
        if self.status:
            self.status.set_connected(True, "Verbunden")
        while not self.stop.set.called:
            time.sleep(0.01)


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.options = {"broker_host": "iobroker.local", "entities": ["sensor.temperature", "switch.test"],
                        "command_entities": ["switch.test"]}
        self.client = Mock()
        self.client.publish.return_value.rc = 0
        self.client.publish.return_value.is_published.return_value = True
        self.ha = Mock()
        self.ha.full_states.return_value = [
            {"entity_id": "sensor.temperature", "state": "21.5",
             "attributes": {"friendly_name": "Temperature", "unit_of_measurement": "°C"}},
            {"entity_id": "switch.test", "state": "off", "attributes": {}},
            {"entity_id": "input_number.level", "state": "3", "attributes": {}},
            {"entity_id": "input_select.mode", "state": "auto", "attributes": {}},
            {"entity_id": "input_text.note", "state": "", "attributes": {}},
            {"entity_id": "button.restart", "state": "unknown",
             "attributes": {"friendly_name": "Restart", "device_class": "press"}},
            {"entity_id": "sensor.private", "state": "secret", "attributes": {}},
        ]
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
        self.ha.full_states.return_value = []
        self.bridge.poll()
        self.client.publish.assert_any_call("ha_external/switch.test/state", "unavailable", qos=1, retain=True)

    def test_selected_attributes_publish_to_separate_topics(self):
        bridge = Bridge(Config.load({**self.options,
                                     "entity_attributes": ["sensor.temperature:unit_of_measurement"]}),
                        self.ha, self.client)
        bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)
        bridge.poll()
        self.client.publish.assert_any_call("ha_external/temperature/sensor/attribute/unit_of_measurement",
                                            "°C", qos=1, retain=True)

    def test_attribute_can_publish_without_state(self):
        bridge = Bridge(Config.load({**self.options, "entities": [],
                                     "command_entities": [],
                                     "entity_attributes": ["sensor.temperature:unit_of_measurement"]}),
                        self.ha, self.client)
        bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)
        bridge.poll()
        self.client.publish.assert_any_call("ha_external/temperature/sensor/attribute/unit_of_measurement",
                                            "°C", qos=1, retain=True)
        self.assertNotIn("ha_external/sensor.temperature/state", str(self.client.publish.call_args_list))

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

    def test_value_commands_write_numeric_select_and_text_values(self):
        config = Config.load({**self.options,
                              "entities": ["input_number.level", "input_select.mode", "input_text.note"],
                              "command_entities": ["input_number.level", "input_select.mode", "input_text.note"]})
        bridge = Bridge(config, self.ha, self.client)
        bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)
        for topic, payload in (
                ("ha_external/input_number.level/set", b"42.5"),
                ("ha_external/input_select.mode/set", "Urlaub".encode()),
                ("ha_external/input_text.note/set", "Hallo".encode())):
            bridge.on_message(self.client, None, SimpleNamespace(topic=topic, payload=payload, retain=False))
            bridge.process_command(bridge.commands.get_nowait())
        self.ha.command.assert_any_call("input_number.level", "set_value", {"value": 42.5})
        self.ha.command.assert_any_call("input_select.mode", "select_option", {"option": "Urlaub"})
        self.ha.command.assert_any_call("input_text.note", "set_value", {"value": "Hallo"})

    def test_press_command_calls_ha_press_service(self):
        config = Config.load({**self.options, "entities": ["button.restart"],
                              "command_entities": ["button.restart"]})
        bridge = Bridge(config, self.ha, self.client)
        bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)
        bridge.on_message(self.client, None, SimpleNamespace(topic="ha_external/button.restart/set",
                                                             payload=b"PRESS", retain=False))
        bridge.process_command(bridge.commands.get_nowait())
        self.ha.command.assert_called_with("button.restart", "press")

    def test_invalid_value_commands_are_dropped(self):
        config = Config.load({**self.options, "entities": ["input_number.level"],
                              "command_entities": ["input_number.level"]})
        bridge = Bridge(config, self.ha, self.client)
        bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)
        bridge.on_message(self.client, None, SimpleNamespace(topic="ha_external/input_number.level/set",
                                                             payload=b"hoch", retain=False))
        self.assertTrue(bridge.commands.empty())

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
                        {"poll_interval": 0}, {"entity_attributes": ["sensor.temperature:bad/attr"]}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                Config.load({**self.options, **changes})

    def test_controller_updates_connection_and_keeps_password_when_empty(self):
        FakeBridge.instances = []
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "options.json"
            path.write_text(json.dumps({**self.options, "password": "old"}), encoding="utf-8")
            controller = AppController(path, "token", bridge_factory=FakeBridge)
            controller.start()
            updated = controller.update_connection({"broker_host": "192.168.1.20", "broker_port": 1883,
                                                    "username": "ha", "password": "new"})
            self.assertEqual(updated["broker_host"], "192.168.1.20")
            self.assertTrue(updated["has_password"])
            second = controller.update_connection({"broker_host": "192.168.1.21", "broker_port": 1883,
                                                   "username": "ha"})
            saved = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(saved["password"], "new")
            self.assertEqual(second["broker_host"], "192.168.1.21")
            self.assertGreaterEqual(len(FakeBridge.instances), 3)
            controller.stop()

    def test_controller_lists_entities_and_updates_selection(self):
        FakeBridge.instances = []
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "options.json"
            path.write_text(json.dumps({**self.options, "entity_attributes": []}), encoding="utf-8")
            controller = AppController(path, "token", bridge_factory=FakeBridge)
            controller.ha.full_states = Mock(return_value=[
                {"entity_id": "sensor.temperature", "state": "21.5",
                 "attributes": {"friendly_name": "Temperature", "unit_of_measurement": "°C"}},
                {"entity_id": "bad.entity/id", "state": "x", "attributes": {}},
            ])
            catalog = controller.entity_catalog()
            self.assertEqual(catalog["entities"][0]["entity_id"], "sensor.temperature")
            self.assertEqual(catalog["devices"][0]["name"], "Temperature")
            self.assertIn("unit_of_measurement", catalog["entities"][0]["attributes"])
            self.assertEqual(catalog["entities"][0]["iobroker_type"], "number")
            updated = controller.update_selections({
                "entities": ["sensor.temperature"],
                "entity_attributes": ["sensor.temperature:unit_of_measurement"],
            })
            self.assertEqual(updated["entities"], ["sensor.temperature"])
            self.assertEqual(updated["entity_attributes"], ["sensor.temperature:unit_of_measurement"])
            saved = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(saved["command_entities"], [])
            controller.stop()

    def test_controller_groups_entities_by_device_name(self):
        FakeBridge.instances = []
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "options.json"
            path.write_text(json.dumps({**self.options, "entity_attributes": []}), encoding="utf-8")
            controller = AppController(path, "token", bridge_factory=FakeBridge)
            controller.ha.full_states = Mock(return_value=[
                {"entity_id": "switch.1pm_mini_gen3_res1", "state": "off",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1"}},
                {"entity_id": "sensor.1pm_mini_gen3_res1_energie", "state": "7.1",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Energie"}},
                {"entity_id": "update.1pm_mini_gen3_res1_firmware", "state": "off",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Firmware"}},
                {"entity_id": "button.1pm_mini_gen3_res1_neu_starten", "state": "unknown",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Neu starten"}},
                {"entity_id": "sensor.1pm_mini_gen3_res1_stromstaerke", "state": "0.0",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Stromstärke"}},
                {"entity_id": "switch.1pm_mini_gen3_res1_switch", "state": "off",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Switch"}},
                {"entity_id": "binary_sensor.1pm_mini_gen3_res1_ueberhitzung", "state": "off",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Überhitzung"}},
                {"entity_id": "binary_sensor.1pm_mini_gen3_res1_ueberlast", "state": "off",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Überlast"}},
                {"entity_id": "binary_sensor.1pm_mini_gen3_res1_ueberspannung", "state": "off",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Überspannung"}},
                {"entity_id": "binary_sensor.1pm_mini_gen3_res1_ueberstrom", "state": "off",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Überstrom"}},
                {"entity_id": "sensor.1pm_mini_gen3_res1_sonderwert", "state": "ok",
                 "attributes": {"friendly_name": "1PM Mini Gen3-Res1 Sonderwert"}},
            ])
            catalog = controller.entity_catalog()
            self.assertEqual(len(catalog["devices"]), 1)
            self.assertEqual(catalog["devices"][0]["name"], "1PM Mini Gen3-Res1")
            self.assertEqual(len(catalog["devices"][0]["entities"]), 11)
            controller.stop()

    def test_device_name_prefers_device_attribute(self):
        self.assertEqual(
            device_name_for_entity("sensor.anything", "Other Name Energie", {"device_name": "Shelly Keller"}),
            "Shelly Keller",
        )

    def test_iobroker_mapping_press_and_state_boolean(self):
        self.assertEqual(iobroker_mapping("button.restart", "unknown", {"device_class": "press"}),
                         {"state_type": "press", "iobroker_type": "button"})
        self.assertEqual(iobroker_mapping("switch.plug", "off", {}),
                         {"state_type": "state_boolean", "iobroker_type": "switch"})
        self.assertEqual(iobroker_mapping("sensor.text", "Hallo", {"device_class": "text"}),
                         {"state_type": "state", "iobroker_type": "state"})

    def test_controller_saves_only_supported_bidirectional_entities(self):
        FakeBridge.instances = []
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "options.json"
            path.write_text(json.dumps({**self.options, "command_entities": []}), encoding="utf-8")
            controller = AppController(path, "token", bridge_factory=FakeBridge)
            updated = controller.update_selections({
                "entities": ["sensor.temperature", "switch.test", "input_number.level"],
                "entity_attributes": [],
                "command_entities": ["sensor.temperature", "switch.test", "input_number.level"],
            })
            self.assertEqual(updated["command_entities"], ["switch.test", "input_number.level"])
            saved = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(saved["command_entities"], ["switch.test", "input_number.level"])
            controller.stop()


if __name__ == "__main__":
    unittest.main()
