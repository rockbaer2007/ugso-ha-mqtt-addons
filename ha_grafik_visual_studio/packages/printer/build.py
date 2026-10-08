"""Build the declarative UGSo Printer 0.1.0 package for Studio 0.1.261+."""
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / 'app'))
from widget_packages import read_package_zip, validate_manifest


def manifest():
    def field(key, label, kind='text', **options):
        return dict(key=key, label=label, type=kind, **options)

    defaults = dict(heading='UGSo Printer', entityId='', messageEntityId='', powerEntityId='', pagesEntityId='',
                    printerModel='mfp', supplyStyle='ink', cartridgeCount=4, lowThreshold=20, showMessage=True,
                    printerBackground='#17242d', printerText='#e7edf2', accentColor='#61c5ef',
                    width=480, height=440, padding=0, borderWidth=0)
    groups = [dict(label='Drucker', fields=[field('heading', 'Bezeichnung'), field('entityId', 'Status: Entität'),
        field('printerModel', 'Druckermodell', 'select', options=['mfp', 'inkjet', 'office']),
        field('showMessage', 'Statusmeldung anzeigen', 'checkbox'), field('messageEntityId', 'Statusmeldung: Entität (optional)'),
        field('powerEntityId', 'Leistung: Entität (optional)'), field('pagesEntityId', 'Seitenzähler: Entität (optional)')]),
        dict(label='Patronen', fields=[field('cartridgeCount', 'Anzahl der Patronen', 'number', min=1, max=6, step=1),
        field('supplyStyle', 'Darstellung', 'select', options=['ink', 'toner']),
        field('lowThreshold', 'Warnschwelle (%)', 'number', min=0, max=100, step=1)])]
    colors = ['#263442', '#21bce4', '#e9539c', '#f3d34f', '#9daab9', '#7ed6e8']
    names = ['Schwarz', 'Cyan', 'Magenta', 'Gelb', 'Grau', 'Hellcyan']
    for index in range(1, 7):
        prefix = f'cartridge{index}'
        defaults.update({prefix + 'EntityId': '', prefix + 'Name': names[index - 1], prefix + 'Color': colors[index - 1]})
        groups.append(dict(label=f'Patrone {index}', fields=[field(prefix + 'EntityId', 'Füllstand: Entität (%)'),
            field(prefix + 'Name', 'Beschriftung'), field(prefix + 'Color', 'Farbe', 'color')]))
    groups += [dict(label='Farben', fields=[field('printerBackground', 'Hintergrundfarbe', 'color'),
        field('printerText', 'Schriftfarbe', 'color'), field('accentColor', 'Druckstatus: Farbe', 'color')]),
        dict(label='Größe', fields=[field('width', 'Breite (px)', 'number', min=240, max=3000),
        field('height', 'Höhe (px)', 'number', min=280, max=2000)])]
    return dict(format='ha-grafik-widget-package', apiVersion='0.2', id='ugso.printer', name='UGSo Printer',
        version='0.1.0', license='MIT', icon='icons/printer.svg', widgets=[dict(type='ugso.printer/printer',
        label='Drucker', icon='icons/printer.svg', defaults=defaults, propertyGroups=groups,
        render=dict(kind='printer-widget', valueKey='heading'))])


def build():
    data = validate_manifest(manifest())
    target = ROOT / 'ugso.printer.wg'
    with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', json.dumps(data, ensure_ascii=False, indent=2))
        archive.writestr('icons/printer.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
            '<path d="M6 8V2H18V8M6 17H3V8H21V17H18M6 14H18V22H6Z" fill="none" stroke="#61c5ef" stroke-width="2"/>'
            '<circle cx="18" cy="11" r="1" fill="#61c5ef"/></svg>')
        for name in ['README.md', 'LICENSE.txt']:
            archive.write(ROOT / name, name)
    read_package_zip(target.read_bytes())
    return target


if __name__ == '__main__':
    print(build())
