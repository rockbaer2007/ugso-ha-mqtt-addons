import importlib.util
import sys
import hashlib
import json
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "app"))
import main
from widget_packages import validate_manifest, read_package_zip, validate_additive_update
spec = importlib.util.spec_from_file_location("industrial_build", ROOT / "packages/industrial/build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class IndustrialTests(unittest.TestCase):
    def test_upgrade_keeps_published_gauge_contract(self):
        incoming = read_package_zip(build.build().read_bytes())
        gauge = incoming["widgets"][0]
        contract = {key: value for key, value in gauge.items() if key not in {"icon", "iconData"}}
        # Immutable contract fingerprint of the published 0.1.0 Gauge/Poti.
        self.assertEqual(hashlib.sha256(json.dumps(contract, sort_keys=True).encode()).hexdigest(), "bb9a82b02a07c2d0669553990a2e9fe06aea011e443e5f920acaad49b6fef326")
        validate_additive_update({**incoming, "version": "0.1.0", "widgets": [gauge]}, incoming)
        self.assertEqual(incoming["version"], "0.2.0")
        self.assertEqual(len(incoming["widgets"]), 2)

    def test_package_roundtrip_and_contract_version(self):
        data = build.manifest()
        validate_manifest(data)
        read_package_zip(build.build().read_bytes())
        data["apiVersion"] = "0.1"
        with self.assertRaises(ValueError):
            validate_manifest(data)

    def test_only_explicit_numeric_entities_and_finite_values_can_be_written(self):
        with patch.object(main, "home_assistant_commands") as send:
            for entity in ("number.device", "input_number.test"):
                main.set_industrial_value(entity, -5)
                self.assertEqual(send.call_args.args[0][0]["service_data"], {"value": -5})
                self.assertEqual(send.call_args.args[0][0]["domain"], entity.split(".")[0])
            send.reset_mock()
            for entity, value in (("sensor.no", 1), ("light.no", 1), ("number.test", True), ("number.test", "5"), ("number.test", float("inf")), ("number.test", float("nan")), ("number.Bad", 5)):
                with self.assertRaises(ValueError):
                    main.set_industrial_value(entity, value)
            send.assert_not_called()


if __name__ == "__main__":
    unittest.main()
