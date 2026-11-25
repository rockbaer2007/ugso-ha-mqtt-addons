from importlib import import_module
from io import BytesIO
from pathlib import Path
import sys
import tempfile
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

from aiohttp import web
from PIL import Image


def stub(name, **attributes):
    result = ModuleType(name)
    result.__dict__.update(attributes)
    return result


class ImageTests(unittest.TestCase):
    def setUp(self):
        self.modules = patch.dict(sys.modules, {
            "homeassistant": stub("homeassistant"),
            "homeassistant.components": stub("homeassistant.components"),
            "homeassistant.components.http": stub("homeassistant.components.http", HomeAssistantView=object),
            "homeassistant.components.panel_custom": stub("homeassistant.components.panel_custom", async_register_panel=lambda *a, **kw: None),
            "homeassistant.helpers": stub("homeassistant.helpers"),
            "homeassistant.helpers.entity_registry": stub("homeassistant.helpers.entity_registry"),
        })
        self.modules.start()
        sys.modules.pop("custom_components.weihnachtssteuerung.editor", None)
        self.editor = import_module("custom_components.weihnachtssteuerung.editor")
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.hass = SimpleNamespace(config=SimpleNamespace(path=lambda name: str(self.root / name)))
        content = BytesIO()
        Image.new("RGB", (4, 4), "blue").save(content, format="PNG")
        self.png = content.getvalue()

    def tearDown(self):
        self.temporary.cleanup()
        sys.modules.pop("custom_components.weihnachtssteuerung.editor", None)
        self.modules.stop()

    def test_safe_extension_and_no_overwrite(self):
        name = self.editor.save_image(self.hass, "/local/own", "sample.exe", self.png)
        self.assertEqual(name, "sample.png")
        again = self.editor.save_image(self.hass, "/local/own", "sample.png", self.png)
        self.assertEqual(again, "sample-2.png")
        self.assertEqual((self.root / "www/own/sample.png").read_bytes(), self.png)

    def test_bad_content_and_path_are_rejected(self):
        with self.assertRaises(OSError):
            self.editor.save_image(self.hass, "/local/own", "image.png", b"not an image")
        with self.assertRaises(ValueError):
            self.editor.save_image(self.hass, "/local/../outside", "image.png", self.png)

    def test_animation_bytes_are_preserved(self):
        content = BytesIO()
        Image.new("RGB", (4, 4), "red").save(content, format="GIF", save_all=True,
            append_images=[Image.new("RGB", (4, 4), "blue")], duration=80, loop=0)
        data = content.getvalue()
        filename = self.editor.save_image(self.hass, "/local/own", "animation.gif", data)
        stored = self.root / "www/own" / filename
        self.assertEqual(stored.read_bytes(), data)
        with Image.open(stored) as image:
            self.assertEqual(image.n_frames, 2)

    def test_http_views_require_admin(self):
        for request in ({}, {"hass_user": SimpleNamespace(is_admin=False)}):
            with self.assertRaises(web.HTTPForbidden):
                self.editor.admin(request)
        self.editor.admin({"hass_user": SimpleNamespace(is_admin=True)})

    def test_distribution_contains_no_pictures(self):
        root = Path(__file__).resolve().parents[1]
        self.assertEqual([p for p in (root / "www").rglob("*") if p.suffix.lower() in {".png", ".jpg", ".svg", ".gif", ".webp"}], [])
