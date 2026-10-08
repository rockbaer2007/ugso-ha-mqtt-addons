"""Build UGSo Solar 0.1.0 for Studio 0.1.276+."""
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

    widgets = []
    for kind, label, width, height in [('head', 'Stapel-Kopfteil', 256, 64), ('battery', 'Batteriemodul', 256, 169), ('solo', 'Wechselrichter Solo', 144, 103.3)]:
        defaults = dict(heading=label, width=width, height=height, padding=0, borderWidth=0,
                        solarTextColor='#f4f6f5' if kind == 'solo' else '#17242c', solarFontSize=18, showPowerDirection=False,
                        positivePowerDirection='in', powerInIcon='↓', powerOutIcon='↑',
                        housingSnapEnabled=kind != 'solo', housingTopCenter=kind == 'battery',
                        housingBottomCenter=kind != 'solo', housingSpace=0, housingSnapAlwaysVisible=False)
        groups = [dict(label='Solar-Modul', fields=[field('heading', 'Bezeichnung')])]
        for key, name, preview in [('power', 'Leistung', 420), ('temperature', 'Temperatur', 25.4), ('soc', 'Ladezustand (SoC)', 78)]:
            show_key = 'show' + key[0].upper() + key[1:]
            defaults.update({key + 'EntityId': '', key + 'Preview': preview, show_key: kind == 'battery' or kind == 'solo' and key == 'power'})
            groups.append(dict(label=name, fields=[field(key + 'EntityId', 'Home-Assistant-Entität'),
                field(show_key, 'Wert anzeigen', 'checkbox'), field(key + 'Preview', 'Vorschauwert', 'number')]))
        groups += [dict(label='Leistungsrichtung', fields=[field('showPowerDirection', 'Richtungssymbol anzeigen', 'checkbox'),
            field('positivePowerDirection', 'Positive Leistung bedeutet', 'select', options=['in', 'out']),
            field('powerInIcon', 'Symbol Energie hinein'), field('powerOutIcon', 'Symbol Energie heraus')]),
            dict(label='Wertdarstellung', fields=[field('solarTextColor', 'Schriftfarbe', 'color'),
                field('solarFontSize', 'Schriftgröße (px)', 'number', min=9, max=64)]),
            dict(label='Größe', fields=[field('width', 'Breite (px)', 'number', min=96 if kind == 'solo' else 128, max=1600),
                field('height', 'Höhe (px)', 'number', min=24, max=1600)])]
        for anchor in ['left-center', 'right-center', 'top-center', 'bottom-center']:
            prefix = 'solar' + ''.join(part.title() for part in anchor.split('-'))
            defaults.update({prefix + 'Role': 'off', prefix + 'Value': 'power'})
        widgets.append(dict(type='ugso.solar/' + kind, label=label, icon=f'icons/{kind}.svg',
            defaults=defaults, propertyGroups=groups, render=dict(kind='solar-widget', valueKey='heading')))
    return dict(format='ha-grafik-widget-package', apiVersion='0.2', id='ugso.solar', name='UGSo Solar',
                version='0.1.0', license='MIT', icon='icons/head.svg', widgets=widgets)


def build():
    data = validate_manifest(manifest())
    target = ROOT / 'ugso.solar.wg'
    with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', json.dumps(data, ensure_ascii=False, indent=2))
        for kind in ['head', 'battery', 'solo']:
            shape = '<rect x="3" y="4" width="18" height="16" rx="2" fill="#b8c1c5"/><path d="M6 7V17M9 7V17M12 7V17M15 7V17M18 7V17" stroke="#67767c"/>' if kind == 'solo' else '<rect x="3" y="5" width="18" height="14" rx="1" fill="#b8c1c5"/><path d="M3 8H21M3 14H21" stroke="#67767c"/><path d="M8 19H16" stroke="#21c8bd"/>'
            archive.writestr(f'icons/{kind}.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'+shape+'</svg>')
        for name in ['README.md', 'LICENSE.txt']:
            archive.write(ROOT / name, name)
    read_package_zip(target.read_bytes())
    return target


if __name__ == '__main__':
    print(build())
