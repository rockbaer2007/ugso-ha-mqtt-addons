"""Studio file-root creation and confinement."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from test_states import APP


class ObjectRootTests(unittest.TestCase):
    def test_creates_missing_root_and_excludes_parent(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            root = base / "www" / "studio"
            with patch.object(APP, "WWW_DIR", root):
                self.assertTrue(APP.Handler.list_objects("")["available"])
                self.assertTrue(root.is_dir())
                (root / "icon.svg").write_text("<svg/>")
                (root.parent / "outside.svg").write_text("<svg/>")
                self.assertEqual([f["name"] for f in APP.Handler.list_objects("")["files"]], ["icon.svg"])
                self.assertIsNone(APP.Handler.resolve_object_path("../outside.svg"))

    def test_creation_failure_reports_manual_action(self):
        with patch.object(Path, "mkdir", side_effect=PermissionError("denied")):
            result = APP.Handler.list_objects("")
            self.assertFalse(result["available"])
            self.assertIn("/config/www/studio", result["error"])

    def test_search_finds_nested_files_case_insensitively(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "studio"
            (root / "action" / "nested").mkdir(parents=True)
            (root / "action" / "nested" / "Home.svg").write_text("<svg/>")
            (root / "other.svg").write_text("<svg/>")
            with patch.object(APP, "WWW_DIR", root):
                found = APP.Handler.list_objects("missing", " HOME ")
                self.assertEqual([f["path"] for f in found["files"]], ["action/nested/Home.svg"])
                self.assertEqual(APP.Handler.list_objects("", "absent")["files"], [])
