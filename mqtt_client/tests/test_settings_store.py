import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from main import AppController
from settings_store import SettingsStore
from test_client import FakeBridge


class SettingsStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "options.json"
        self.baseline = {"broker_host": "broker", "password": "old-secret", "entities": ["switch.original"],
                         "label_device_readings": False, "topic_layout_new": "nested"}
        self.regenerate(self.baseline)

    def regenerate(self, options):
        self.path.write_text(json.dumps(options), encoding="utf-8")

    def test_upgrade_rewriting_supervisor_defaults_keeps_saved_choices_and_secrets(self):
        store = SettingsStore(self.path)
        saved = {**self.baseline, "label_device_readings": True, "topic_layout_new": "flat", "password": "new-secret",
                 "tls_cert": "existing-private-cert", "entities": ["switch.original", "light.new"]}
        store.write(saved)
        self.assertEqual(SettingsStore(self.path).read(), saved)  # Ordinary restart before update.
        for _ in range(3):
            self.regenerate(self.baseline)
            self.assertEqual(SettingsStore(self.path).read(), saved)

    def test_actual_supervisor_change_is_merged_without_resetting_ingress_choices(self):
        store = SettingsStore(self.path)
        saved = {**self.baseline, "label_device_readings": True, "topic_layout_new": "flat", "password": "keep-secret"}
        store.write(saved)
        changed = {**self.baseline, "broker_host": "new-broker", "broker_port": 1884}
        self.regenerate(changed)
        expected = {**saved, "broker_host": "new-broker", "broker_port": 1884}
        self.assertEqual(SettingsStore(self.path).read(), expected)
        self.assertEqual(SettingsStore(self.path).read(), expected)

    def test_explicit_unchecking_and_nested_choice_remain_saved(self):
        store = SettingsStore(self.path)
        store.write({**self.baseline, "label_device_readings": True, "topic_layout_new": "flat"})
        store.write(self.baseline)
        self.regenerate(self.baseline)
        self.assertEqual(SettingsStore(self.path).read(), self.baseline)

    def test_failed_durable_write_keeps_previous_file_memory_and_mirror(self):
        store = SettingsStore(self.path)
        before = store.path.read_bytes(), self.path.read_bytes()
        with patch("settings_store.Path.replace", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                store.write({**self.baseline, "label_device_readings": True})
        self.assertEqual(store.read(), self.baseline)
        self.assertEqual((store.path.read_bytes(), self.path.read_bytes()), before)

    def test_corrupt_persistent_file_is_not_silently_replaced_with_defaults(self):
        store = SettingsStore(self.path)
        store.path.write_text('{"broken":true}', encoding="utf-8")
        with self.assertRaises(ValueError): SettingsStore(self.path)
        self.assertEqual(store.path.read_text(), '{"broken":true}')

    def test_controller_restart_after_upgrade_keeps_routes_and_export_restores_choices(self):
        controller = AppController(self.path, "ha-token-never-saved", FakeBridge)
        controller.update_connection({"label_device_readings": True, "topic_layout_new": "flat"})
        exported = controller.export_settings()
        controller.stop()
        routes_before = (self.path.parent / "mqtt-routes.json").read_bytes()
        self.regenerate(self.baseline)
        restarted = AppController(self.path, "ha-token-never-saved", FakeBridge)
        self.addCleanup(restarted.stop)
        restarted.start()
        self.assertTrue(restarted.public_config()["label_device_readings"])
        self.assertEqual(restarted.public_config()["topic_layout_new"], "flat")
        self.assertEqual((self.path.parent / "mqtt-routes.json").read_bytes(), routes_before)
        restarted.update_connection({"label_device_readings": False, "topic_layout_new": "nested"})
        restarted.import_settings(exported)
        self.assertTrue(restarted.read_options()["label_device_readings"])
        self.assertNotIn("ha-token-never-saved", restarted.settings.path.read_text())
        self.assertNotIn("password", restarted.public_config())
