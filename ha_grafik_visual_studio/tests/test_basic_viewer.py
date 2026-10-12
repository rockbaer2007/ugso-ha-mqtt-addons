import json
import sys
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from unittest.mock import patch
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main


class BasicViewerTests(unittest.TestCase):
    def request(self, peer, user_id, users):
        class Handler(main.Handler):
            def setup(self):
                super().setup()
                self.client_address = (peer, self.client_address[1])

            def log_message(self, *_args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            with patch.object(main, "home_assistant_commands", return_value=[users]) as commands:
                headers = {"X-Remote-User-Id": user_id} if user_id else {}
                with urlopen(Request(f"http://127.0.0.1:{server.server_port}/api/viewer", headers=headers)) as response:
                    data = json.load(response)
                return data, commands.call_count
        finally:
            server.shutdown()
            server.server_close()
            worker.join()

    def test_only_active_trusted_ingress_viewer_gets_groups(self):
        users = [{"id": "user", "is_active": True, "group_ids": ["system-users"]}]
        self.assertEqual(self.request("172.30.32.2", "user", users), ({"groups": ["system-users"]}, 1))
        self.assertEqual(self.request("127.0.0.1", "user", users), ({"groups": []}, 0))
        self.assertEqual(self.request("172.30.32.2", "unknown", users), ({"groups": []}, 1))
        self.assertEqual(self.request("172.30.32.2", "user", [{**users[0], "is_active": False}]), ({"groups": []}, 1))
        self.assertEqual(self.request("172.30.32.2", "", users), ({"groups": []}, 0))
