import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'app'))
from widget_packages import read_package_zip
spec = importlib.util.spec_from_file_location('solar_build', ROOT / 'packages/solar/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class SolarPackageTests(unittest.TestCase):
    def test_three_independent_widgets_have_three_entity_bindings_and_safe_icons(self):
        package = read_package_zip(builder.build().read_bytes())
        self.assertEqual(package['id'], 'ugso.solar')
        self.assertEqual(package['version'], '0.1.0')
        self.assertEqual([widget['type'] for widget in package['widgets']], ['ugso.solar/head', 'ugso.solar/battery', 'ugso.solar/solo'])
        for widget in package['widgets']:
            self.assertEqual(widget['render']['kind'], 'solar-widget')
            self.assertTrue(widget['iconData'].startswith('data:image/svg+xml'))
            fields = {field['key'] for group in widget['propertyGroups'] for field in group['fields']}
            self.assertTrue({'powerEntityId', 'temperatureEntityId', 'socEntityId', 'showPower', 'showTemperature', 'showSoc'} <= fields)
        head, battery, solo = package['widgets']
        self.assertEqual(head['defaults']['width'], battery['defaults']['width'])
        self.assertLess(solo['defaults']['width'], head['defaults']['width'])
        self.assertEqual(battery['defaults']['housingSpace'], 0)


if __name__ == '__main__':
    unittest.main()
