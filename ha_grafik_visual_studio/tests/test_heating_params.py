import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main


class HeatingParamsControlTests(unittest.TestCase):
    def test_switch_command_targets_only_selected_helper(self):
        with patch.object(main, "home_assistant_commands", return_value=[None]) as commands:
            main.set_home_assistant_switch("input_boolean.heating_period", True)
            self.assertEqual(commands.call_args.args[0], [{"type": "call_service", "domain": "input_boolean", "service": "turn_on", "target": {"entity_id": "input_boolean.heating_period"}}])
            main.set_home_assistant_switch("switch.fireplace", False)
            self.assertEqual(commands.call_args.args[0], [{"type": "call_service", "domain": "switch", "service": "turn_off", "target": {"entity_id": "switch.fireplace"}}])

    def test_sensor_unknown_target_and_non_boolean_never_dispatch(self):
        with patch.object(main, "home_assistant_commands") as commands:
            for entity, enabled in [("binary_sensor.holiday", True), ("sensor.present", False), ("", True), ("input_boolean.heating", "on"), ("switch.invalid name", True)]:
                with self.subTest(entity=entity), self.assertRaises(ValueError): main.set_home_assistant_switch(entity, enabled)
            commands.assert_not_called()
