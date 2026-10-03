import json
import sys
import unittest
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
from zipfile import ZipFile
from io import BytesIO

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
import main
from technic_cover import cover_position_command, cover_entry_writable
from widget_packages import read_package_zip


class TechnicTests(unittest.TestCase):
    def test_command_is_fixed_and_strictly_bounded(self):
        request = {"entity_id": "cover.garage", "position": 25}
        self.assertEqual(cover_position_command(request), {"type": "call_service", "domain": "cover", "service": "set_cover_position", "target": {"entity_id": "cover.garage"}, "service_data": {"position": 25}})
        for invalid in [None, {}, {**request, "service": "open_cover"}, {**request, "entity_id": "switch.light"}, {**request, "entity_id": ["cover.garage"]}, *[{**request, "position": value} for value in [-1, 101, True, "25", float("nan"), float("inf")]]]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError): cover_position_command(invalid)

    def test_capabilities_and_unknown_states(self):
        self.assertTrue(cover_entry_writable({"state": "closed", "attributes": {"supported_features": 15}}))
        for entry in [None, {"state": "open", "attributes": None}, {"state": "unknown", "attributes": {"supported_features": 4}}, {"state": "open", "attributes": {"supported_features": "4"}}, {"state": "open", "attributes": {"supported_features": 3}}]: self.assertFalse(cover_entry_writable(entry))

    def test_http_controls_cover_only_after_capability_check(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
        thread = Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            url = f"http://127.0.0.1:{server.server_port}/api/cover-position"
            def send(payload, content="application/json"):
                return urlopen(Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": content}), timeout=3)
            payload = {"entity_id": "cover.test", "position": 75}
            with patch.object(main, "home_assistant_commands", side_effect=[[[{"entity_id": "cover.test", "state": "open", "attributes": {"supported_features": 4}}]], [None]]) as commands:
                with send(payload) as response: self.assertEqual(json.load(response), {"accepted": True})
                self.assertEqual(commands.call_args.args[0], [cover_position_command(payload)])
            with patch.object(main, "home_assistant_commands", return_value=[[{"entity_id": "cover.test", "state": "unavailable", "attributes": {"supported_features": 4}}]]) as commands:
                with self.assertRaises(HTTPError) as error: send(payload)
                self.assertEqual(error.exception.code, 400); self.assertEqual(commands.call_count, 1)
            with patch.object(main, "home_assistant_commands") as commands:
                with self.assertRaises(HTTPError) as error: send({**payload, "position": -1})
                self.assertEqual(error.exception.code, 400); commands.assert_not_called()
                with self.assertRaises(HTTPError) as error: send(payload, "text/plain")
                self.assertEqual(error.exception.code, 415)
            with patch.object(main, "home_assistant_commands", side_effect=main.HomeAssistantAPIError("secret")):
                with self.assertRaises(HTTPError) as error: send(payload)
                self.assertEqual(error.exception.code, 503); self.assertNotIn(b"secret", error.exception.read())
        finally: server.shutdown(); server.server_close(); thread.join()

    def test_package_includes_license_and_rejects_active_or_oversized_docs(self):
        path = Path(__file__).resolve().parents[1] / "packages/technic/ugso.technic.wg"
        package = read_package_zip(path.read_bytes())
        self.assertEqual(package["id"], "ugso.technic"); self.assertEqual(len(package["widgets"]), 2)
        from widget_packages import validate_additive_update
        import hashlib
        # Frozen Window – Wall definition from the published 1.0.0 package.
        self.assertEqual(hashlib.sha256(json.dumps(package["widgets"][0], sort_keys=True, ensure_ascii=True).encode()).hexdigest(), "57341c9e07a61b64335777d47019b286eb15b4787334a95c20a20662ade264c5")
        validate_additive_update({**package, "version": "1.0.0", "widgets": package["widgets"][:1]}, package)
        with ZipFile(path) as source:
            entries = {name: source.read(name) for name in source.namelist()}
        self.assertIn(b"Copyright (c) 2026 Sefina-DS", entries["LICENSE.txt"])
        for name, value in [("README.md", b"x" * 50_001), ("README.md", b"\xff"), ("script.js", b"alert(1)")]:
            stream = BytesIO()
            with ZipFile(stream, "w") as archive:
                for key, body in {**entries, name: value}.items(): archive.writestr(key, body)
            with self.assertRaises(ValueError): read_package_zip(stream.getvalue())
