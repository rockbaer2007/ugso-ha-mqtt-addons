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
    def test_four_widgets_have_expected_entity_bindings_and_safe_icons(self):
        package = read_package_zip(builder.build().read_bytes())
        self.assertEqual(package['id'], 'ugso.solar')
        self.assertEqual(package['version'], '0.1.3')
        self.assertEqual([widget['type'] for widget in package['widgets']], ['ugso.solar/head', 'ugso.solar/battery', 'ugso.solar/solo', 'ugso.solar/panel'])
        for widget in package['widgets']:
            self.assertEqual(widget['render']['kind'], 'solar-widget')
            self.assertTrue(widget['iconData'].startswith('data:image/svg+xml'))
            fields = {field['key'] for group in widget['propertyGroups'] for field in group['fields']}
            expected = set() if widget['type'].endswith('/head') else {'powerEntityId', 'showPower'} if widget['type'].endswith('/panel') else {'powerEntityId', 'temperatureEntityId', 'socEntityId', 'showPower', 'showTemperature', 'showSoc'}
            self.assertTrue(expected <= fields)
        head, battery, solo, panel = package['widgets']
        self.assertEqual(head['defaults']['width'], battery['defaults']['width'])
        self.assertLess(solo['defaults']['width'], head['defaults']['width'])
        self.assertEqual(battery['defaults']['housingSpace'], 0)
        self.assertEqual(panel['defaults']['solarOutputPosition'], 'pipe')
        self.assertTrue(panel['defaults']['solarOutputEnabled'])
        self.assertFalse(panel['defaults']['housingSnapEnabled'])
        fields = {field['key']: field for group in panel['propertyGroups'] for field in group['fields']}
        self.assertEqual(fields['solarPanelOrientation']['options'], ['original', 'mirrored'])


if __name__ == '__main__':
    unittest.main()
