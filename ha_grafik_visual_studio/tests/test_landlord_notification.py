import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import json
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from landlord_notification import notification_command
import main


class LandlordNotificationTests(unittest.TestCase):
    def test_explicit_targets_and_plain_message(self):
        request = {"service": "notify.send_message", "entity_id": "notify.landlord", "message": "  Heizung defekt  ", "priority": "urgent", "subject": "Wohnung"}
        self.assertEqual(notification_command(request), {"type": "call_service", "domain": "notify", "service": "send_message", "target": {"entity_id": "notify.landlord"}, "service_data": {"message": "Wohnung\n[urgent] Heizung defekt"}})
        request.update(service="notify.landlord_email", entity_id="")
        self.assertNotIn("target", notification_command(request))

    def test_invalid_targets_payloads_and_limits(self):
        base = {"service": "notify.landlord_email", "message": "Test", "priority": "information"}
        invalid = [None, [], {**base, "service": "light.turn_on"}, {**base, "service": "notify.notify"}, {**base, "service": "notify.persistent_notification"}, {**base, "service": "notify.send_message"}, {**base, "entity_id": "notify.other"}, {**base, "message": " "}, {**base, "message": "a" * 10001}, {**base, "subject": "a" * 201}, {**base, "priority": []}, {**base, "priority": "alarm"}, {**base, "target": "unapproved"}]
        for request in invalid:
            with self.subTest(request=request), self.assertRaises(ValueError): notification_command(request)

    def test_endpoint_validates_and_reports_acceptance_or_failure_without_real_send(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
        thread = Thread(target=server.serve_forever, daemon=True); thread.start()
        url = f"http://127.0.0.1:{server.server_port}/api/landlord-notification"
        data = {"service": "notify.landlord", "message": "Unit test only", "priority": "important"}
        def post(value, content_type="application/json"):
            request = Request(url, data=json.dumps(value).encode(), headers={"Content-Type": content_type}, method="POST")
            return urlopen(request)
        try:
            with patch.object(main, "home_assistant_commands", return_value=[{}]) as commands:
                with post(data) as response: self.assertEqual(json.load(response), {"accepted": True})
                self.assertEqual(commands.call_args.args[0][0]["service"], "landlord")
                commands.reset_mock()
                for value, content_type, code in [({**data, "service": "switch.turn_on"}, "application/json", 400), (data, "text/plain", 415)]:
                    with self.assertRaises(HTTPError) as error: post(value, content_type)
                    self.assertEqual(error.exception.code, code)
                commands.assert_not_called()
            with patch.object(main, "home_assistant_commands", side_effect=main.HomeAssistantAPIError("private provider response")):
                with self.assertRaises(HTTPError) as error: post(data)
                self.assertEqual(error.exception.code, 503)
                self.assertNotIn("private", error.exception.read().decode())
        finally:
            server.shutdown(); server.server_close(); thread.join()
