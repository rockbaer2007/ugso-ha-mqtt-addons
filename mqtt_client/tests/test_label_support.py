import json
import sys
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import Bridge, Config, AppController
from live import TopicInventory
from label_support import light_features, light_command
from test_client import FakeBridge


class LabelSupportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.client = Mock()
        self.client.publish.return_value.rc = 0
        self.client.publish.return_value.is_published.return_value = True
        self.ha = Mock()
        self.options = {"broker_host": "broker", "forward_label": "mqtt", "publish_delay_ms": 0}
        self.states = {
            "switch.plug": {"state": "on", "attributes": {"friendly_name": "Plug", "private_token": "never-send"}},
            "sensor.power": {"state": "42", "attributes": {"device_class": "power", "unit_of_measurement": "W", "state_class": "measurement"}},
            "sensor.battery": {"state": "20", "attributes": {"device_class": "battery", "unit_of_measurement": "%"}},
            "binary_sensor.battery_low": {"state": "on", "attributes": {"device_class": "battery"}},
            "sensor.other": {"state": "99", "attributes": {"device_class": "power"}},
            "sensor.disabled": {"state": "99", "attributes": {"device_class": "power"}},
            "sensor.uptime": {"state": "99", "attributes": {"device_class": "duration"}},
        }
        self.registry = [{"entity_id": key, "device_id": "other" if key == "sensor.other" else "plug", "labels": ["mqtt"] if key == "switch.plug" else [], "disabled_by": "user" if key == "sensor.disabled" else None} for key in self.states]
        self.bridge = self.make_bridge()

    def make_bridge(self, **options):
        bridge = Bridge(Config.load({**self.options, **options}), self.ha, self.client)
        bridge.inventory = TopicInventory(Path(self.temp.name) / "topics.json")
        bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)
        return bridge

    def select(self, bridge=None):
        bridge = bridge or self.bridge
        with patch("main.entity_registry", return_value=self.registry):
            bridge.refresh_label_selection()
        bridge.poll(self.states)

    def send(self, entity, payload, feature=None, retained=False):
        topic = next(topic for topic, value in self.bridge.command_topics.items() if value == entity and self.bridge.command_features.get(topic) == feature)
        self.bridge.on_message(self.client, None, SimpleNamespace(topic=topic, payload=payload.encode(), retain=retained))

    def light(self):
        self.states["light.lamp"] = {"state": "on", "attributes": {"friendly_name": "Lamp", "supported_color_modes": ["rgb", "color_temp"], "brightness": 128, "rgb_color": [1, 2, 3], "effect_list": ["Rainbow", "off"], "effect": "Rainbow", "color_temp_kelvin": 3000, "min_color_temp_kelvin": 2000, "max_color_temp_kelvin": 6500}}
        self.registry.append({"entity_id": "light.lamp", "device_id": "lamp", "labels": ["mqtt"]})
        self.select()

    def test_label_switch_has_commands_and_no_action_during_setup(self):
        self.select()
        self.assertIn("switch.plug", self.bridge.command_topics.values())
        self.assertEqual(sum(entity == "switch.plug" for entity in self.bridge.command_topics.values()), 1)
        state_topic = self.bridge.sent_topics[("state", "switch.plug")]
        self.assertIn(state_topic.removesuffix("/state") + "/set", self.bridge.command_topics)
        self.ha.command.assert_not_called()
        self.assertNotIn("never-send", str(self.client.publish.call_args_list))
        self.send("switch.plug", "OFF")
        self.bridge.process_command(self.bridge.commands.get_nowait())
        self.ha.command.assert_called_once_with("switch.plug", "turn_off")

    def test_vis2_catalog_binds_selection_to_current_topic_and_revokes_removed_labels(self):
        self.select()
        def catalog():
            payload = [call.args[1] for call in self.client.publish.call_args_list if call.args[0] == "ha_external/selected_entities"][-1]
            self.assertTrue(payload.startswith("v1:"))
            return json.loads(payload[3:])
        data = catalog()
        self.assertEqual(set(data), {"switch.plug"})
        self.assertTrue(data["switch.plug"]["command"])
        self.assertNotIn("never-send", str(data))
        old_topic = data["switch.plug"]["state_topic"]
        self.states["switch.plug"]["attributes"]["friendly_name"] = "New name"
        self.bridge.poll(self.states)
        self.assertNotEqual(catalog()["switch.plug"]["state_topic"], old_topic)
        self.registry[0]["labels"] = []
        self.select()
        self.assertEqual(catalog(), {})
        self.ha.command.assert_not_called()

    def test_label_removal_revokes_queued_commands_but_keeps_manual(self):
        self.bridge = self.make_bridge(entities=["switch.plug"])
        self.select()
        self.send("switch.plug", "OFF")
        queued = self.bridge.commands.get_nowait()
        self.registry[0]["labels"] = []
        self.select()
        self.bridge.process_command(queued)
        self.ha.command.assert_called_once_with("switch.plug", "turn_off")
        self.bridge = self.make_bridge()
        self.registry[0]["labels"] = ["mqtt"]
        self.select()
        self.send("switch.plug", "OFF")
        queued = self.bridge.commands.get_nowait()
        self.registry[0]["labels"] = []
        self.select()
        self.ha.command.reset_mock()
        self.bridge.process_command(queued)
        self.ha.command.assert_not_called()
        self.assertNotIn("switch.plug", self.bridge.command_topics.values())

    def test_optional_related_readings_use_device_id_and_allowlist(self):
        self.select()
        self.assertEqual(self.bridge.labeled_entities, {"switch.plug"})
        self.bridge = self.make_bridge(label_device_readings=True)
        self.select()
        self.assertEqual(self.bridge.labeled_entities, {"switch.plug", "sensor.power", "sensor.battery", "binary_sensor.battery_low"})
        self.assertTrue(self.bridge.labeled_entities <= self.bridge.event_entities)
        self.assertNotIn("sensor.other", self.bridge.event_entities)
        self.assertNotIn("sensor.power", self.bridge.command_topics.values())
        self.assertNotIn("binary_sensor.battery_low", self.bridge.command_topics.values())
        rows = self.bridge.transmission_snapshot()["values"]
        self.assertTrue(all(row["origin"] == "label" for row in rows))
        self.assertTrue(any(row["attribute"] == "unit_of_measurement" and row["value"] == "W" for row in rows))

    def test_related_units_and_switch_without_unit(self):
        self.bridge = self.make_bridge(label_device_readings=True)
        units = {"sensor.arbitrary_2": ("W", "power"), "sensor.voltage_2": ("V", "voltage"),
                 "sensor.current_2": ("A", "current"), "sensor.energy_2": ("kWh", "energy")}
        for entity, (unit, _) in units.items():
            self.states[entity] = {"state": "912345", "attributes": {"unit_of_measurement": unit}}
            self.registry.append({"entity_id": entity, "device_id": "plug"})
        self.states["sensor.ambiguous"] = {"state": "50", "attributes": {"unit_of_measurement": "%"}}
        self.states["sensor.conflicting"] = {"state": "50", "attributes": {"device_class": "monetary", "unit_of_measurement": "W"}}
        for entity in ("sensor.ambiguous", "sensor.conflicting"):
            self.registry.append({"entity_id": entity, "device_id": "plug"})
        self.select()
        self.assertIn("switch.plug", self.bridge.command_topics.values())
        for entity, (_, dc) in units.items():
            self.assertIn(entity, self.bridge.event_entities)
            self.assertEqual(self.bridge.catalog_attributes(entity, self.states)["device_class"], dc)
            self.assertNotIn("device_class", self.states[entity]["attributes"])
        self.assertNotIn("sensor.ambiguous", self.bridge.labeled_entities)
        self.assertNotIn("sensor.conflicting", self.bridge.labeled_entities)
        report = self.bridge.reading_diagnostics()
        candidates = {item["entity_id"]: item for item in report["roots"][0]["candidates"]}
        self.assertEqual(candidates["sensor.arbitrary_2"]["class_source"], "unit")
        self.assertEqual(candidates["sensor.disabled"]["reason"], "disabled")
        self.assertNotIn("912345", json.dumps(report))
        self.assertNotIn("never-send", json.dumps(report))

    def test_missing_device_does_not_guess_by_entity_name(self):
        self.bridge = self.make_bridge(label_device_readings=True)
        self.registry[0].pop("device_id")
        self.select()
        self.assertEqual(self.bridge.labeled_entities, {"switch.plug"})
        report = self.bridge.reading_diagnostics()["roots"][0]
        self.assertFalse(report["device_linked"])
        self.assertEqual(report["candidates"], [])

    def test_metadata_is_deduplicated_and_active_topics_are_protected(self):
        self.bridge = self.make_bridge(entity_attributes=["switch.plug:friendly_name"])
        self.select()
        rows = self.bridge.transmission_snapshot()["values"]
        attrs = [row for row in rows if row["attribute"] == "friendly_name"]
        self.assertEqual(len(attrs), 1)
        self.assertEqual(attrs[0]["origin"], "both")
        self.assertEqual(self.bridge.inventory.candidates(self.bridge.config, self.bridge.labeled_entities, self.bridge.inventory_attributes()), [])

    def test_disabling_related_readings_preserves_manual_sensor(self):
        self.bridge = self.make_bridge(label_device_readings=True, entities=["sensor.power"])
        self.select()
        self.assertIn("sensor.battery", self.bridge.labeled_entities)
        self.bridge.config = replace(self.bridge.config, label_device_readings=False)
        self.bridge.poll(self.states)
        rows = self.bridge.transmission_snapshot()["values"]
        self.assertFalse(any(row["entity_id"] == "sensor.battery" for row in rows))
        self.assertEqual(next(row["origin"] for row in rows if row["entity_id"] == "sensor.power"), "manual")

    def test_label_value_commands_enforce_entity_limits(self):
        for entity, attrs, valid, invalid in [
            ("number.level", {"min": 10, "max": 20}, "15", "21"),
            ("select.mode", {"options": ["Auto", "Manual"]}, "Auto", "Missing"),
            ("text.title", {"min": 2, "max": 5}, "Hello", "toolong"),
        ]:
            self.states[entity] = {"state": valid, "attributes": attrs}
            self.registry.append({"entity_id": entity, "labels": ["mqtt"]})
            self.select()
            self.send(entity, valid)
            self.bridge.process_command(self.bridge.commands.get_nowait())
            self.ha.command.assert_called()
            self.ha.command.reset_mock()
            self.send(entity, invalid)
            self.assertTrue(self.bridge.commands.empty())
            self.ha.command.assert_not_called()

    def test_light_normalized_values_and_capability_checked_commands(self):
        self.light()
        features = {row["attribute"]: row for row in self.bridge.transmission_snapshot()["values"] if "/attribute/" not in row["topic"] and row["attribute"]}
        self.assertEqual(set(features), {"brightness", "rgb_color", "effect", "color_temp_kelvin"})
        self.assertEqual(float(features["brightness"]["value"]), 50.2)
        self.assertEqual(json.loads(features["rgb_color"]["value"]), [1, 2, 3])
        self.assertTrue(all(row["set_topic"].endswith('/set') for row in features.values()))
        for feature, payload, expected in [("brightness", "75", {"brightness_pct": 75}), ("rgb_color", "[255,0,8]", {"rgb_color": [255, 0, 8]}), ("effect", "Rainbow", {"effect": "Rainbow"}), ("color_temp_kelvin", "4000", {"color_temp_kelvin": 4000})]:
            self.send("light.lamp", payload, feature)
            self.bridge.process_command(self.bridge.commands.get_nowait())
            self.ha.command.assert_called_with("light.lamp", "turn_on", expected)
        self.assertEqual(self.bridge.inventory.candidates(self.bridge.config, self.bridge.labeled_entities, self.bridge.inventory_attributes()), [])

    def test_invalid_light_values_retained_and_empty_commands_never_execute(self):
        self.light()
        for feature, payload in [("brightness", "101"), ("brightness", "true"), ("brightness", "NaN"), ("rgb_color", "[1,2,999]"), ("rgb_color", "[true,2,3]"), ("effect", "Unknown"), ("color_temp_kelvin", "999"), ("color_temp_kelvin", "3000.5")]:
            self.send("light.lamp", payload, feature)
        self.send("light.lamp", "50", "brightness", retained=True)
        self.send("light.lamp", "", "brightness")
        self.assertTrue(self.bridge.commands.empty())
        self.ha.command.assert_not_called()

    def test_capability_removal_unsubscribes_and_revokes_queued_light_write(self):
        self.light()
        self.send("light.lamp", "50", "brightness")
        command = self.bridge.commands.get_nowait()
        self.states["light.lamp"]["attributes"] = {"supported_color_modes": ["onoff"]}
        self.bridge.poll(self.states)
        self.bridge.process_command(command)
        self.ha.command.assert_not_called()
        self.assertNotIn("brightness", self.bridge.command_features.values())
        self.client.unsubscribe.assert_called()
        self.assertTrue(self.bridge.inventory.candidates(self.bridge.config, self.bridge.labeled_entities, self.bridge.inventory_attributes()))

    def test_rgb_temperature_metadata_is_not_invented(self):
        self.assertEqual(light_features({"supported_color_modes": ["onoff"]}), set())
        self.assertEqual(light_features({"supported_color_modes": ["brightness"]}), {"brightness"})
        with self.assertRaises(ValueError):
            light_command("rgb_color", "[1,2,3]", {"supported_color_modes": ["brightness"]})

    def test_config_backup_restore_preserves_option_and_credentials(self):
        path = Path(self.temp.name) / "options.json"
        path.write_text(json.dumps({**self.options, "password": "keep-me", "label_device_readings": True}), encoding="utf-8")
        controller = AppController(path, "private-token", FakeBridge)
        self.addCleanup(controller.stop)
        backup = controller.export_settings()
        self.assertTrue(backup["options"]["label_device_readings"])
        self.assertNotIn("keep-me", str(backup))
        controller.import_settings(backup)
        self.assertEqual(json.loads(path.read_text())["password"], "keep-me")
        self.assertTrue(controller.public_config()["label_device_readings"])
        self.assertFalse(Config.load(self.options).label_device_readings)
        with self.assertRaises(ValueError):
            Config.load({**self.options, "label_device_readings": "false"})


if __name__ == '__main__':
    unittest.main()
