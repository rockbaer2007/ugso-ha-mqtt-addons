import importlib.util
import sys
import unittest
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'app'))
from widget_packages import read_package_zip

spec = importlib.util.spec_from_file_location('printer_build', ROOT / 'packages/printer/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PrinterPackageTests(unittest.TestCase):
    def test_declarative_installable_package_with_attribution_and_six_sources(self):
        target = builder.build()
        package = read_package_zip(target.read_bytes())
        self.assertEqual(package['id'], 'ugso.printer')
        widget = package['widgets'][0]
        self.assertEqual(widget['render']['kind'], 'printer-widget')
        self.assertTrue(widget['iconData'].startswith('data:image/svg+xml'))
        fields = {f['key']: f for g in widget['propertyGroups'] for f in g['fields']}
        self.assertEqual(fields['cartridgeCount']['max'], 6)
        self.assertEqual(package['version'], '0.1.1')
        self.assertEqual(fields['supplyStyle']['options'], ['ink', 'toner'])  # Installed contract remains upgradeable.
        self.assertTrue(all(f'cartridge{i}EntityId' in fields for i in range(1, 7)))
        with ZipFile(target) as archive:
            self.assertIn('ADNPolymerase/ha-printer-card', archive.read('README.md').decode('utf-8'))
            self.assertFalse(any(n.endswith('.js') for n in archive.namelist()))


if __name__ == '__main__':
    unittest.main()
