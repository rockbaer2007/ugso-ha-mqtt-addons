import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from installer import install_payload


class InstallerTests(unittest.TestCase):
    def test_install_update_backup_and_user_data_preservation(self):
        with tempfile.TemporaryDirectory() as temporary:
            source, config, data = [Path(temporary) / n for n in ("source", "config", "data")]
            (source / "custom_components/weihnachtssteuerung").mkdir(parents=True)
            (source / "www").mkdir()
            manifest = source / "custom_components/weihnachtssteuerung/manifest.json"
            manifest.write_text(json.dumps({"version": "0.1.2"}))
            (source / "www/card.js").write_text("first")
            config.mkdir()
            (config / "configuration.yaml").write_text("preserve this")
            result = install_payload(source, config, data)
            self.assertEqual(result["changed_files"], 2)
            self.assertFalse(result["backup_created"])
            pictures = config / "www/weihnachtssteuerung/bilder"
            pictures.mkdir()
            (pictures / "own.png").write_bytes(b"user-picture")
            self.assertEqual(install_payload(source, config, data)["changed_files"], 0)
            (source / "www/card.js").write_text("second")
            result = install_payload(source, config, data)
            self.assertTrue(result["backup_created"])
            archives = list((data / "backups").glob("*.zip"))
            with zipfile.ZipFile(archives[0]) as archive:
                self.assertIsNone(archive.testzip())
                self.assertEqual(archive.read("www/weihnachtssteuerung/card.js"), b"first")
            self.assertEqual((pictures / "own.png").read_bytes(), b"user-picture")
            self.assertEqual((config / "configuration.yaml").read_text(), "preserve this")

    def test_missing_config_root_rejected(self):
        with self.assertRaises(RuntimeError):
            install_payload(Path(__file__).parent, "/nonexistent/festtags-config", "/nonexistent/festtags-data")
