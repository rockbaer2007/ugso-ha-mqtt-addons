import copy
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
from routing import TopicRoutes
from test_client import FakeBridge


class RoutingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.config = Config.load({"broker_host": "broker", "entities": ["switch.old"], "publish_delay_ms": 0})
        self.inventory = TopicInventory(self.path / "topics.json")
        self.routes = TopicRoutes(self.path / "routes.json")
        self.routes.bootstrap(self.config, self.inventory)
        self.client = Mock()
        self.client.publish.return_value.rc = 0
        self.client.publish.return_value.is_published.return_value = True
        self.bridge = Bridge(self.config, Mock(), self.client)
        self.bridge.routes, self.bridge.inventory = self.routes, self.inventory
        self.bridge.on_connect(self.client, None, None, SimpleNamespace(is_failure=False), None)

    def test_new_flat_entities_do_not_move_existing_paths_even_when_names_change(self):
        states = {"switch.old": {"entity_id": "switch.old", "state": "on", "attributes": {"friendly_name": "Old PC"}}}
        self.bridge.poll(states)
        old = self.bridge.topic("switch.old", "state")
        self.bridge.config = replace(self.config, topic_layout_new="flat", entities=("switch.old", "sensor.new"))
        states["switch.old"]["attributes"]["friendly_name"] = "Renamed PC"
        states["sensor.new"] = {"entity_id": "sensor.new", "state": "42", "attributes": {"friendly_name": "PC Leistung", "device_class": "power", "unit_of_measurement": "W"}}
        self.bridge.poll(states)
        new = self.bridge.topic("sensor.new", "state")
        self.assertEqual(self.bridge.topic("switch.old", "state"), old)
        self.assertTrue(old.endswith("/state"))
        self.assertTrue(new.endswith("/leistung"))
        self.assertEqual(self.bridge.topic("sensor.new", "attribute/device_class"), new + "_attribute/device_class")
        self.assertIn(old[:-6] + "/set", self.bridge.command_topics)
        self.bridge.routes = TopicRoutes(self.path / "routes.json")
        self.bridge.config = replace(self.bridge.config, topic_layout_new="nested")
        self.bridge.poll(states)
        self.assertEqual(self.bridge.topic("sensor.new", "state"), new)
        catalog = json.loads(self.bridge.sent[("selection",)][3:])
        self.assertEqual(catalog["sensor.new"]["topic_layout"], "flat")
        self.assertEqual(catalog["switch.old"]["topic_layout"], "nested")

    def test_upgrade_seeds_exact_inventory_paths_and_removed_labels(self):
        inventory = TopicInventory(self.path / "previous-topics.json")
        inventory.remember(self.config, "ha_external/fixed/path/state", "switch.old")
        inventory.remember(self.config, "ha_external/previous/removed/state", "sensor.removed")
        inventory.reconcile(self.config, {"ha_external/fixed/path/state"})
        routes = TopicRoutes(self.path / "migrated.json")
        config = replace(self.config, topic_layout_new="flat")
        routes.bootstrap(config, inventory)
        for entity, base in [("switch.old", "fixed/path"), ("sensor.removed", "previous/removed")]:
            routes.assign(config, entity, "ha_external/changed/name", "leistung")
            self.assertEqual(routes.topic(config, entity, "state"), "ha_external/" + base + "/state")
        # Auth/TLS changes at the same broker do not change assignment scope.
        changed_auth = replace(config, username="new-user", tls=True)
        self.assertEqual(routes.topic(changed_auth, "switch.old", "state"), "ha_external/fixed/path/state")

    def test_label_changes_restarts_and_readding_reuse_the_original_route(self):
        config = replace(self.config, forward_label="mqtt", entities=())
        routes = TopicRoutes(self.path / "labels.json")
        routes.bootstrap(config, self.inventory)
        self.bridge.config, self.bridge.routes = config, routes
        states = {e: {"entity_id": e, "state": "on", "attributes": {"friendly_name": e}} for e in ["switch.old", "switch.new"]}
        registry = [{"entity_id": e, "labels": ["mqtt"] if e == "switch.old" else []} for e in states]
        def select():
            with patch("main.entity_registry", return_value=registry):
                self.bridge.refresh_label_selection()
            self.bridge.poll(states)
        select()
        old = self.bridge.topic("switch.old", "state")
        self.bridge.config = replace(config, topic_layout_new="flat")
        registry[1]["labels"] = ["mqtt"]
        select()
        new = self.bridge.topic("switch.new", "state")
        self.assertTrue(old.endswith("/state")); self.assertTrue(new.endswith("/schalter"))
        registry[1]["labels"] = []
        select()
        self.bridge.routes = TopicRoutes(self.path / "labels.json")
        registry[1]["labels"] = ["mqtt"]
        states["switch.new"]["attributes"]["friendly_name"] = "Different name"
        select()
        self.assertEqual(self.bridge.topic("switch.new", "state"), new)
        self.assertEqual(self.bridge.topic("switch.old", "state"), old)

    def test_flat_lights_catalog_and_commands_use_explicit_topic_paths(self):
        self.bridge.config = replace(self.config, topic_layout_new="flat", entities=())
        self.bridge.label_roots = frozenset(["light.lamp"])
        self.bridge.labeled_entities = self.bridge.label_roots
        states = {"light.lamp": {"entity_id": "light.lamp", "state": "on", "attributes": {"supported_color_modes": ["rgb"], "brightness": 128, "rgb_color": [1,2,3]}}}
        self.bridge.poll(states)
        topic = self.bridge.topic("light.lamp", "state")
        self.assertTrue(topic.endswith("/licht"))
        self.assertIn(topic + "_set", self.bridge.command_topics)
        self.assertIn(topic + "_brightness_set", self.bridge.command_topics)
        self.assertEqual(self.bridge.command_features[topic + "_brightness_set"], "brightness")
        catalog = json.loads(self.bridge.sent[("selection",)][3:])["light.lamp"]
        self.assertEqual(catalog["feature_state_topics"]["brightness"], topic + "_brightness")
        self.assertEqual(catalog["feature_command_topics"]["brightness"], topic + "_brightness_set")
        self.bridge.on_message(self.client, None, SimpleNamespace(topic=topic + "_brightness_set", payload=b"75", retain=False))
        self.bridge.process_command(self.bridge.commands.get_nowait())
        self.bridge.ha.command.assert_called_once_with("light.lamp", "turn_on", {"brightness_pct": 75})

    def test_durable_assignments_avoid_existing_folders_and_light_feature_collisions(self):
        config = replace(self.config, topic_layout_new="flat")
        self.routes.assign(config, "light.lamp", "ha_external/device/switch", "licht")
        self.routes.assign(config, "sensor.other", "ha_external/device/value", "licht_brightness")
        self.assertEqual(self.routes.topic(config, "sensor.other", "state"), "ha_external/device/licht_brightness_2")
        self.routes.assign(config, "sensor.power", "ha_external/device/value", "leistung")
        self.routes.assign(config, "sensor.power2", "ha_external/device/value", "leistung")
        self.assertEqual(self.routes.topic(config, "sensor.power2", "state"), "ha_external/device/leistung_2")
        nested = replace(config, topic_layout_new="nested")
        self.routes.assign(nested, "sensor.new_nested", "ha_external/device/leistung", "unused")
        self.assertEqual(self.routes.topic(nested, "sensor.new_nested", "state"), "ha_external/device/leistung_3/state")
        TopicRoutes(self.path / "routes.json")  # Both layouts remain valid after restart.

    def test_failed_route_write_prevents_publish_and_retries_without_losing_old_assignments(self):
        states = {"switch.old": {"entity_id": "switch.old", "state": "on", "attributes": {}}}
        with patch("routing.Path.replace", side_effect=OSError("disk full")):
            with self.assertRaises(OSError): self.bridge.poll(states)
        self.client.publish.assert_not_called()
        self.assertIsNone(self.routes.route(self.config, "switch.old")["base"])
        self.bridge.poll(states)
        self.assertIsNotNone(TopicRoutes(self.path / "routes.json").route(self.config, "switch.old")["base"])

    def test_backup_restores_routes_without_secrets_and_rejects_conflicting_paths(self):
        self.routes.assign(self.config, "switch.old", "ha_external/original/switch", "schalter")
        exported = self.routes.export(self.config)
        restored = TopicRoutes(self.path / "restored.json")
        restored.merge(self.config, exported)
        self.assertEqual(restored.topic(self.config, "switch.old", "state"), "ha_external/original/switch/state")
        changed = copy.deepcopy(exported); changed["scopes"][0]["entities"]["switch.old"]["base"] = "ha_external/other/value"
        before = (self.path / "restored.json").read_text()
        with self.assertRaises(ValueError): restored.merge(self.config, changed)
        self.assertEqual((self.path / "restored.json").read_text(), before)
        self.assertNotIn("password", json.dumps(exported))

    def test_controller_exports_routes_and_accepts_old_backups_without_changing_assignments(self):
        options = self.path / "options.json"
        options.write_text(json.dumps({"broker_host": "broker", "password": "keep-secret", "entities": ["switch.old"], "topic_layout_new": "nested"}))
        controller = AppController(options, "token-secret", FakeBridge)
        self.addCleanup(controller.stop)
        controller.start()
        controller.routes.assign(self.config, "switch.old", "ha_external/original/switch", "schalter")
        controller.update_connection({"topic_layout_new": "flat"})
        backup = controller.export_settings()
        self.assertEqual(backup["options"]["topic_layout_new"], "flat")
        self.assertNotIn("keep-secret", json.dumps(backup)); self.assertNotIn("token-secret", json.dumps(backup))
        backup.pop("topic_routes")
        controller.import_settings(backup)
        self.assertEqual(controller.routes.topic(self.config, "switch.old", "state"), "ha_external/original/switch/state")
        self.assertEqual(controller.read_options()["password"], "keep-secret")

    def test_invalid_layout_and_malformed_registry_are_rejected(self):
        with self.assertRaises(ValueError): Config.load({"broker_host": "broker", "topic_layout_new": "oops"})
        invalid = self.path / "bad.json"; invalid.write_text('{"format":"wrong"}')
        with self.assertRaises(ValueError): TopicRoutes(invalid)
        self.assertEqual(invalid.read_text(), '{"format":"wrong"}')
