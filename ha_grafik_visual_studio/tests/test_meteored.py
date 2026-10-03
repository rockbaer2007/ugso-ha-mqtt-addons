import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from meteored import meteored_document


class MeteoredTests(unittest.TestCase):
    def test_fixed_loader_and_matching_container(self):
        html = meteored_document("abc_123-X").decode()
        self.assertIn('id="mrwidabc_123-X"', html)
        self.assertIn('src="https://api.meteored.com/widget/loader/abc_123-X"', html)
        self.assertEqual(html.count("<script"), 1)

    def test_invalid_ids_do_not_enter_document(self):
        for value in ["", "../evil", "a?x", '<script>', 'https://evil.example', "a" * 129, None]:
            with self.assertRaises(ValueError):
                meteored_document(value)
