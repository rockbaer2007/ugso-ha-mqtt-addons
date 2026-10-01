"""Source-folder checks and exports use the same validation as Studio imports."""

import json
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "packer"))
from core import build_package, export_package  # noqa: E402
from test_tool_packages import manifest as tool_manifest  # noqa: E402
from test_widget_packages import manifest as widget_manifest  # noqa: E402


class PackerCoreTests(unittest.TestCase):
    def test_widget_folder_exports_multiple_widgets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source"
            output = root / "output"
            source.mkdir()
            output.mkdir()
            manifest = widget_manifest()
            second = json.loads(json.dumps(manifest["widgets"][0]))
            second["type"] = "demo.widgets/second"
            manifest["widgets"].append(second)
            (source / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            target = export_package(source, output, "widget")
            self.assertEqual(target.name, "demo.widgets.wg")
            with ZipFile(target) as archive:
                self.assertEqual(len(json.loads(archive.read("manifest.json"))["widgets"]), 2)
            with self.assertRaisesRegex(ValueError, "existiert bereits"):
                export_package(source, output, "widget")

    def test_tool_folder_exports_single_tool(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source"
            output = root / "output"
            source.mkdir()
            output.mkdir()
            (source / "manifest.json").write_text(json.dumps(tool_manifest()), encoding="utf-8")
            target = export_package(source, output, "tool")
            self.assertEqual(target.name, "demo.tools.tp")
            with ZipFile(target) as archive:
                self.assertEqual(json.loads(archive.read("manifest.json"))["tools"][0]["id"], "demo.tools/background")

    def test_unapproved_files_and_wrong_kind_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            (source / "manifest.json").write_text(json.dumps(tool_manifest()), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Paketmanifest"):
                build_package(source, "widget")
            (source / "script.py").write_text("print('no')", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unzulässige Paketdatei"):
                build_package(source, "tool")


if __name__ == "__main__":
    unittest.main()
