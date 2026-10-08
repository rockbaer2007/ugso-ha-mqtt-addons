"""Build the independent declarative UGSo Calendar + package (Studio 0.1.266+)."""
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / 'app'))
from widget_packages import read_package_zip, validate_manifest


def manifest():
    defaults = dict(heading='UGSo Calendar +', lookaheadDays=14, maxEvents=5, unfoldEvents=True,
                    popupEnabled=True, groupByDay=True, groupByCalendar=False, showUpcoming=True,
                    showEmptyDays=False, showDivider=True, showCalendarName=False, showDate=False,
                    showLocation=False, showDuration=False, showTime=True, showWeekday=True,
                    swapMonthWeekday=False, longWeekday=False, calendarTheme='auto',
                    calendarAccent='#e85b64', calendarFontSize=14, width=480, height=460,
                    padding=0, borderWidth=0)

    def field(key, label, kind='checkbox', **options):
        return dict(key=key, label=label, type=kind, **options)

    groups = [dict(label='Konfiguration', fields=[field('heading', 'Bezeichnung', 'text'),
        field('lookaheadDays', 'Vorschau (Tage)', 'number', min=1, max=90, step=1),
        field('maxEvents', 'Maximale Termine', 'number', min=1, max=20, step=1),
        field('unfoldEvents', 'Ereignisse ausklappen'), field('popupEnabled', 'Detail-Popup aktivieren'),
        field('showDivider', 'Zeige Trenner'), field('groupByDay', 'Nach Tag gruppieren'),
        field('groupByCalendar', 'Nach Tag und Kalender gruppieren'),
        field('showUpcoming', 'Zeige bevorstehende Ereignisse'), field('showEmptyDays', 'Zeige leere Tage')]),
        dict(label='Text & Sichtbarkeit', fields=[field('showCalendarName', 'Einblenden Kalender Name'),
        field('showDate', 'Einblenden Datum'), field('showLocation', 'Zeige Ort'), field('showDuration', 'Zeige Dauer'),
        field('showTime', 'Zeige Zeit'), field('showWeekday', 'Zeige Wochentag'),
        field('swapMonthWeekday', 'Monat und Wochentag tauschen'), field('longWeekday', 'Wochentag ausschreiben')]),
        dict(label='Farben', fields=[field('calendarTheme', 'Theme', 'select', options=['auto', 'dark', 'light']),
        field('calendarAccent', 'Akzentfarbe', 'color'),
        field('calendarFontSize', 'Schriftgröße (px)', 'number', min=10, max=24, step=1)]),
        dict(label='Größe', fields=[field('width', 'Breite (px)', 'number', min=260, max=3000),
        field('height', 'Höhe (px)', 'number', min=180, max=3000)])]
    return dict(format='ha-grafik-widget-package', apiVersion='0.2', id='ugso.calendar-plus',
        name='UGSo Calendar +', version='0.1.0', license='MIT', icon='icons/calendar.svg',
        widgets=[dict(type='ugso.calendar-plus/calendar', label='Kalender +', icon='icons/calendar.svg',
        defaults=defaults, propertyGroups=groups, render=dict(kind='calendar-plus', valueKey='heading'))])


def build():
    data = validate_manifest(manifest())
    target = ROOT / 'ugso.calendar-plus.wg'
    with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', json.dumps(data, ensure_ascii=False, indent=2))
        archive.writestr('icons/calendar.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
            '<path d="M3 5H21V22H3ZM3 10H21M7 2V7M17 2V7" fill="none" stroke="#e85b64" stroke-width="2"/>'
            '<path d="M7 14H10V17H7ZM14 14H17V17H14Z" fill="#e85b64"/></svg>')
        for name in ['README.md', 'LICENSE.txt']:
            archive.write(ROOT / name, name)
    read_package_zip(target.read_bytes())
    return target


if __name__ == '__main__':
    print(build())
