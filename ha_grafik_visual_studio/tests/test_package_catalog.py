"""Exercise remote download boundaries and the existing installation API together."""
import hashlib
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import tempfile
from threading import Thread
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main
import package_catalog as catalog
from test_tool_packages import manifest, package_bytes


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.payload = package_bytes(manifest())
        self.entry = dict(id="demo.tools", kind="tool", name="Demo", description="Test", version="1.0.0", license="MIT", download_url="/downloads/tools/demo.tools-1.0.0.tp", sha256=hashlib.sha256(self.payload).hexdigest())
        owner = self
        class Source(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == "/api/v1/catalog":
                    body = json.dumps(dict(schema_version="1.0", packages=[owner.entry])).encode()
                else:
                    body = owner.payload
                self.send_response(200); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
            def log_message(self, *args):
                pass
        self.source = ThreadingHTTPServer(("127.0.0.1", 0), Source)
        self.thread = Thread(target=self.source.serve_forever, daemon=True); self.thread.start()
        self.override = patch.object(catalog, "CATALOG_URL", f"http://127.0.0.1:{self.source.server_port}"); self.override.start()

    def tearDown(self):
        self.override.stop(); self.source.shutdown(); self.source.server_close(); self.thread.join(timeout=2)

    def test_catalog_and_download_integrity(self):
        self.assertEqual(catalog.catalog_packages()["packages"][0]["id"], "demo.tools")
        self.assertEqual(catalog.package_download(self.entry["download_url"], "tool", self.entry["sha256"]), self.payload)
        with self.assertRaisesRegex(ValueError, "Prüfsumme"):
            catalog.package_download(self.entry["download_url"], "tool", "0" * 64)
        with self.assertRaisesRegex(ValueError, "Prüfsumme"):
            catalog.package_download(self.entry["download_url"], "tool")

    def test_untrusted_urls_redirect_targets_and_oversize(self):
        for url in ["http://github.com/a/b/file.tp", "https://127.0.0.1/file.tp", "https://github.com.evil.invalid/file.tp", "https://user:password@github.com/a/b/file.tp", "https://github.com:444/a/b/file.tp"]:
            with self.subTest(url=url), self.assertRaises(ValueError): catalog.checked_url(url)
        with self.assertRaises(ValueError):
            catalog.CheckedRedirect().redirect_request(Request("https://github.com/a/b"), None, 302, "Found", {}, "http://127.0.0.1:8123/private")
        with self.assertRaisesRegex(ValueError, "groß"):
            catalog.download_bytes(catalog.CATALOG_URL + "/file", limit=10)

    def test_catalog_cannot_change_download_target(self):
        self.entry["download_url"] = "https://github.com/a/b/file.tp"
        with self.assertRaisesRegex(ValueError, "Download"):
            catalog.catalog_packages()

    def test_github_blob_links_are_normalized(self):
        with patch.object(catalog, "download_bytes", return_value=self.payload) as fetch:
            catalog.package_download("https://github.com/user/repo/blob/main/demo.tp", "tool")
            fetch.assert_called_once_with("https://raw.githubusercontent.com/user/repo/main/demo.tp")
        with self.assertRaisesRegex(ValueError, "direkten"):
            catalog.package_download("https://github.com/user/repo", "tool")

    def test_api_checks_selection_and_updates_tools(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(main, "TOOL_PACKAGES_DIR", Path(directory)):
            server = ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
            thread = Thread(target=server.serve_forever, daemon=True); thread.start()
            base = f"http://127.0.0.1:{server.server_port}"
            try:
                with urlopen(base + "/api/package-catalog") as response:
                    self.assertEqual(json.load(response)["packages"][0]["id"], "demo.tools")
                headers = {"X-Package-Name": "demo.tp", "X-Expected-Package-Id": "wrong.tools", "X-Expected-Package-Version": "1.0.0"}
                with self.assertRaises(HTTPError) as mismatch:
                    urlopen(Request(base + "/api/tool-packages", data=self.payload, headers=headers))
                self.assertEqual(mismatch.exception.code, 400)
                self.assertFalse(list(Path(directory).glob("*.json")))
                headers["X-Expected-Package-Id"] = "demo.tools"
                with urlopen(Request(base + "/api/tool-packages", data=self.payload, headers=headers)) as response:
                    self.assertEqual(response.status, 201)
                update = manifest(); update["version"] = "1.1.0"; headers["X-Expected-Package-Version"] = "1.1.0"
                with urlopen(Request(base + "/api/tool-packages", data=package_bytes(update), headers=headers)) as response:
                    self.assertTrue(json.load(response)["updated"])
                self.assertEqual(json.loads(Path(directory,"demo.tools.json").read_text())["version"], "1.1.0")
            finally:
                server.shutdown(); server.server_close(); thread.join(timeout=2)


if __name__ == "__main__": unittest.main()
