import sys
import tempfile
import unittest
import json
from http.server import ThreadingHTTPServer
from threading import Thread
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from color_favorites import favorites, is_admin
import main


class SharedFavoritesTests(unittest.TestCase):
    def test_http_admin_check_and_persistence(self):
        class IngressHandler(main.Handler):
            def setup(self):
                super().setup()
                self.client_address = ("172.30.32.2", self.client_address[1])

            def log_message(self, *_args):
                pass

        with tempfile.TemporaryDirectory() as directory, patch.object(main, "DATA_DIR", Path(directory)), patch.object(main, "home_assistant_commands", return_value=[[{"id": "admin", "is_active": True, "is_owner": True}]]):
            server = ThreadingHTTPServer(("127.0.0.1", 0), IngressHandler)
            worker = Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f"http://127.0.0.1:{server.server_port}/api/color-favorites"
            try:
                for identity in ["reader", ""]:
                    with self.assertRaises(HTTPError) as denied:
                        urlopen(Request(url, headers={"X-Remote-User-Id": identity}))
                    self.assertEqual(denied.exception.code, 403)
                headers = {"X-Remote-User-Id": "admin", "Content-Type": "application/json"}
                with urlopen(Request(url, data=json.dumps({"action": "add", "hex": "#abcdef"}).encode(), headers=headers)) as response:
                    self.assertEqual(json.load(response)["favorites"], ["#abcdef"])
                with urlopen(Request(url, headers=headers)) as response:
                    self.assertEqual(json.load(response)["favorites"], ["#abcdef"])
                with patch.object(main, "home_assistant_commands", side_effect=main.HomeAssistantAPIError("unavailable")):
                    with self.assertRaises(HTTPError) as unavailable:
                        urlopen(Request(url, headers=headers))
                    self.assertEqual(unavailable.exception.code, 503)
            finally:
                server.shutdown()
                server.server_close()
                worker.join()

    def test_identity_requires_trusted_ingress_active_admin(self):
        users = [{"id": "admin", "is_active": True, "group_ids": ["system-admin"]},
                 {"id": "reader", "is_active": True, "group_ids": ["system-users"]}]
        self.assertTrue(is_admin("172.30.32.2", "admin", users))
        for peer, identity in [("127.0.0.1", "admin"), ("172.30.32.2", None), ("172.30.32.2", "reader"), ("172.30.32.2", "unknown")]:
            self.assertFalse(is_admin(peer, identity, users))
        users[0]["is_active"] = False
        self.assertFalse(is_admin("172.30.32.2", "admin", users))

    def test_concurrent_add_capacity_delete_and_merge(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "favorites.json"
            with ThreadPoolExecutor(max_workers=8) as pool:
                list(pool.map(lambda number: favorites(path, {"action": "add", "hex": f"#{number:06x}"}), range(20)))
            saved = favorites(path)
            self.assertEqual(len(saved), 15)
            after = favorites(path, {"action": "delete", "hex": saved[3]})
            self.assertEqual(after, saved[:3] + saved[4:])
            merged = favorites(path, {"action": "merge", "colors": [after[0].upper(), "#abcdef", "#aaaaaa"]})
            self.assertEqual(merged, after + ["#abcdef"])
            self.assertEqual(favorites(path), merged)
            with self.assertRaises(ValueError):
                favorites(path, {"action": "add", "hex": "red"})
            self.assertEqual(favorites(path), merged)
