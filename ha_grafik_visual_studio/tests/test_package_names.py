"""Display-name migration preserves package IDs and widget contracts."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "app"))
from widget_packages import PACKAGE_NAMES, list_packages, read_package_zip, validate_additive_update, package_display_name


class PackageNameTests(unittest.TestCase):
    def test_all_previous_packages_update_without_widget_changes(self):
        for package_id, (previous_name, name) in PACKAGE_NAMES.items():
            if package_id == 'ugso.materialdesign':
                # External package has its own repo; real ZIP upgrade is covered separately.
                continue
            with self.subTest(package_id=package_id):
                folder = "industrial" if package_id == "ugso.industrial" else package_id.split(".", 1)[1]
                relative = f"ha_grafik_visual_studio/packages/{folder}/{package_id}.wg"
                previous = read_package_zip(subprocess.check_output(["git", "show", "eb3c9a8:" + relative], cwd=ROOT))
                current = read_package_zip((ROOT / "packages" / folder / (package_id + ".wg")).read_bytes())
                self.assertEqual(current["id"], package_id)
                self.assertEqual(current["name"], name)
                self.assertEqual(previous["widgets"], current["widgets"])
                validate_additive_update(previous, current)
                legacy = dict(previous, name=previous_name)
                validate_additive_update(legacy, current)
                with tempfile.TemporaryDirectory() as directory:
                    path = Path(directory) / "legacy.json"
                    path.write_text(json.dumps(legacy), encoding="utf-8")
                    self.assertEqual(list_packages(directory)[0]["name"], name)
                    self.assertEqual(json.loads(path.read_text("utf-8"))["name"], previous_name)
                with self.assertRaises(ValueError):
                    validate_additive_update(previous, dict(current, name="Unrelated name"))

    def test_external_material_name_migration_does_not_rename_custom_names(self):
        self.assertEqual(package_display_name('ugso.materialdesign','UGSo Material Design'),'Material Design')
        self.assertEqual(package_display_name('ugso.materialdesign','My private name'),'My private name')


if __name__ == "__main__":
    unittest.main()
