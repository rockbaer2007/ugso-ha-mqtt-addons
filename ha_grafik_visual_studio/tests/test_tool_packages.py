"""Tool package contract and HTTP lifecycle checks."""

import json
import sys
import tempfile
import unittest
from http.server import ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from threading import Thread
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main  # noqa: E402
from tool_packages import read_tool_package_zip  # noqa: E402


def manifest():
    return {
        "format": "ha-grafik-tool-package", "apiVersion": "0.1",
        "id": "demo.tools", "name": "Demo Tools", "version": "1.0.0", "license": "MIT",
        "tools": [{
            "id": "demo.tools/background", "definitionVersion": "0.1",
            "label": "Seitenfarbe", "description": "Setzt die Hintergrundfarbe der aktuellen Seite.",
            "context": "page", "capabilities": ["project.read", "project.write"],
            "action": {"kind": "set-page-background", "defaultColor": "#224466"},
        }],
    }


def package_bytes(data, extra=None):
    stream = BytesIO()
    with ZipFile(stream, "w") as archive:
        archive.writestr("manifest.json", json.dumps(data))
        if extra:
            archive.writestr(extra, "not allowed")
    return stream.getvalue()


class ToolPackageTests(unittest.TestCase):
    def test_valid_data_only_tool(self):
        self.assertEqual(read_tool_package_zip(package_bytes(manifest()))["tools"][0]["id"], "demo.tools/background")

    def test_scripts_and_undeclared_capabilities_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "nur manifest.json"):
            read_tool_package_zip(package_bytes(manifest(), "tool.js"))
        data = manifest()
        data["tools"][0]["capabilities"].append("homeassistant.call_service")
        with self.assertRaisesRegex(ValueError, "Fähigkeiten"):
            read_tool_package_zip(package_bytes(data))

    def test_install_list_and_delete(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(main, "TOOL_PACKAGES_DIR", Path(directory) / "tools"):
                server = ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
                thread = Thread(target=server.serve_forever, daemon=True)
                thread.start()
                url = f"http://127.0.0.1:{server.server_port}/api/tool-packages"
                try:
                    install = Request(url, data=package_bytes(manifest()), method="POST", headers={"X-Package-Name": "demo.tp.zip"})
                    with urlopen(install) as response:
                        self.assertEqual(response.status, 201)
                    with urlopen(url) as response:
                        self.assertEqual(json.load(response)["packages"][0]["tools"][0]["action"]["kind"], "set-page-background")
                    with self.assertRaises(HTTPError) as duplicate:
                        urlopen(install)
                    self.assertEqual(duplicate.exception.code, 409)
                    with urlopen(Request(url + "/demo.tools", method="DELETE")) as response:
                        self.assertEqual(response.status, 200)
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
