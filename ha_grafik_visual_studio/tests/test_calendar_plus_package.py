import importlib.util
import sys
import unittest
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'app'))
from widget_packages import read_package_zip
spec = importlib.util.spec_from_file_location('calendar_plus_build', ROOT / 'packages/calendar-plus/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class CalendarPlusPackageTests(unittest.TestCase):
    def test_installable_declarative_package_and_attribution(self):
        target = builder.build()
        package = read_package_zip(target.read_bytes())
        self.assertEqual(package['id'], 'ugso.calendar-plus')
        widget = package['widgets'][0]
        self.assertEqual(widget['render']['kind'], 'calendar-plus')
        self.assertTrue(widget['iconData'].startswith('data:image/svg+xml'))
        self.assertNotIn('calendarCount', widget['defaults'])
        self.assertTrue(widget['defaults']['unfoldEvents'])
        self.assertTrue(widget['defaults']['showTime'])
        with ZipFile(target) as archive:
            self.assertIn('xBourner/calendar-card-plus', archive.read('README.md').decode('utf-8'))
            self.assertIn('LICENSE.txt', archive.namelist())
            self.assertFalse(any(name.endswith('.js') for name in archive.namelist()))


if __name__ == '__main__':
    unittest.main()
