"""Contract checks for data-only widget ZIP packages."""

import sys
import unittest
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import json
import tempfile
import struct
import zlib
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from widget_packages import read_package_zip  # noqa: E402
import main  # noqa: E402


def manifest():
    return {
        "format": "ha-grafik-widget-package", "apiVersion": "0.1",
        "id": "demo.widgets", "name": "Demo Widgets", "version": "1.0.0", "license": "MIT",
        "widgets": [{
            "type": "demo.widgets/label", "label": "Label",
            "defaults": {"text": "Hallo"},
            "propertyGroups": [{"label": "Inhalt", "fields": [{"key": "text", "label": "Text", "type": "text"}]}],
            "render": {"kind": "text", "valueKey": "text"},
        }],
    }


def package_bytes(data, extra=None):
    stream = BytesIO()
    with ZipFile(stream, "w") as archive:
        archive.writestr("manifest.json", json.dumps(data))
        if extra is not None:
            name, content = extra if isinstance(extra, tuple) else (extra, "untrusted")
            archive.writestr(name, content)
    return stream.getvalue()


def tiny_png():
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))
    header = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00\xff")) + chunk(b"IEND", b"")


class WidgetPackageTests(unittest.TestCase):
    def test_valid_declarative_widget(self):
        self.assertEqual(read_package_zip(package_bytes(manifest()))["widgets"][0]["type"], "demo.widgets/label")

    def test_package_accepts_multiple_widgets(self):
        data = manifest()
        second = json.loads(json.dumps(data["widgets"][0]))
        second["type"] = "demo.widgets/second"
        second["label"] = "Zweites Widget"
        data["widgets"].append(second)
        self.assertEqual(len(read_package_zip(package_bytes(data))["widgets"]), 2)

    def test_executable_archive_content_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "SVG-/PNG-Bilder"):
            read_package_zip(package_bytes(manifest(), "widget.js"))

    def test_svg_icon_is_embedded_as_image_data(self):
        data = manifest()
        data["widgets"][0]["icon"] = "icons/label.svg"
        svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#29c8b5" d="M2 2h20v20H2z"/></svg>'
        result = read_package_zip(package_bytes(data, ("icons/label.svg", svg)))
        self.assertTrue(result["widgets"][0]["iconData"].startswith("data:image/svg+xml;base64,"))

    def test_png_widget_and_package_images_are_embedded(self):
        data = manifest()
        data["icon"] = "icons/package.png"
        data["widgets"][0]["icon"] = "icons/label.png"
        stream = BytesIO()
        with ZipFile(stream, "w") as archive:
            archive.writestr("manifest.json", json.dumps(data))
            archive.writestr("icons/package.png", tiny_png())
            archive.writestr("icons/label.png", tiny_png())
        result = read_package_zip(stream.getvalue())
        self.assertTrue(result["iconData"].startswith("data:image/png;base64,"))
        self.assertTrue(result["widgets"][0]["iconData"].startswith("data:image/png;base64,"))

    def test_false_png_and_bad_crc_are_rejected(self):
        data = manifest()
        data["widgets"][0]["icon"] = "icons/label.png"
        for body in (b"not a png", tiny_png()[:-1] + b"x"):
            with self.subTest(body=body), self.assertRaises(ValueError):
                read_package_zip(package_bytes(data, ("icons/label.png", body)))

    def test_svg_script_and_external_references_are_rejected(self):
        data = manifest()
        data["widgets"][0]["icon"] = "icons/label.svg"
        for svg in (
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(https://example.com/x)"/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x"/></svg>',
        ):
            with self.subTest(svg=svg), self.assertRaises(ValueError):
                read_package_zip(package_bytes(data, ("icons/label.svg", svg)))

    def test_widget_cannot_escape_its_namespace(self):
        data = manifest()
        data["widgets"][0]["type"] = "other/label"
        with self.assertRaisesRegex(ValueError, "Namensraum"):
            read_package_zip(package_bytes(data))

    def test_unknown_runtime_is_rejected(self):
        data = manifest()
        data["widgets"][0]["render"]["kind"] = "script"
        with self.assertRaisesRegex(ValueError, "Text-Darstellung"):
            read_package_zip(package_bytes(data))

    def test_wg_extension_installs_multiple_widgets(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(main, "WIDGET_PACKAGES_DIR", Path(directory) / "packages"):
                server = ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
                thread = Thread(target=server.serve_forever, daemon=True)
                thread.start()
                url = f"http://127.0.0.1:{server.server_port}/api/widget-packages"
                try:
                    data = manifest()
                    second = json.loads(json.dumps(data["widgets"][0]))
                    second["type"] = "demo.widgets/second"
                    data["widgets"].append(second)
                    install = Request(url, data=package_bytes(data), method="POST", headers={"X-Package-Name": "demo.wg"})
                    with urlopen(install) as response:
                        self.assertEqual(response.status, 201)
                    with urlopen(url) as response:
                        self.assertEqual(len(json.load(response)["packages"][0]["widgets"]), 2)
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join(timeout=2)

    def test_install_list_and_block_removal_while_used(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(main, "PROJECTS_DIR", root / "projects"), patch.object(main, "WIDGET_PACKAGES_DIR", root / "packages"):
                server = ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
                thread = Thread(target=server.serve_forever, daemon=True)
                thread.start()
                url = f"http://127.0.0.1:{server.server_port}/api/widget-packages"
                try:
                    install = Request(url, data=package_bytes(manifest()), method="POST", headers={"X-Package-Name": "demo.wg.zip"})
                    with urlopen(install) as response:
                        self.assertEqual(response.status, 201)
                    with urlopen(url) as response:
                        self.assertEqual(json.load(response)["packages"][0]["id"], "demo.widgets")
                    project = json.loads(json.dumps(main.DEFAULT_PROJECT))
                    project["pages"][0]["widgets"] = [{"id": "widget-1", "type": "demo.widgets/label"}]
                    main.Handler.write_project("main", project)
                    remove = Request(url + "/demo.widgets", method="DELETE")
                    with self.assertRaises(HTTPError) as blocked:
                        urlopen(remove)
                    self.assertEqual(blocked.exception.code, 409)
                    project["pages"][0]["widgets"] = []
                    main.Handler.write_project("main", project)
                    with urlopen(remove) as response:
                        self.assertEqual(response.status, 200)
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
