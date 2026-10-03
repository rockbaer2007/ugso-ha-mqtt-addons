"""Build the optional Studio Weather and Heating package (no executable ZIP code)."""
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / "app"))
from widget_packages import validate_manifest, read_package_zip


def manifest():
    defaults = {"headline": "headline", "entityId": "", "dataCount": 1, "xAxisType": "time", "xAxisFormat": "ddd HH:mm", "showLegend": True, "noCard": False, "width": 560, "height": 320, "axisColor": "#dce6eb", "gridColor": "#45535c", "backgroundColor": "#20282d", "textColor": "#ffffff", "borderWidth": 0}
    def field(key, label, kind="text", **extra):
        return {"key": key, "label": label, "type": kind, **extra}
    groups = [{"label": "Allgemein", "fields": [field("headline", "Überschrift"), field("entityId", "Home-Assistant-Entität"), field("dataCount", "Anzahl der Serien", "number", min=1, max=10), field("noCard", "Ohne Karte", "checkbox"), field("showLegend", "Legende anzeigen", "checkbox")]}, {"label": "X-Achse", "fields": [field("xAxisType", "Achsentyp", "select", options=["time", "category"]), field("xAxisFormat", "Datumsformat X-Achse")]}, {"label": "CSS Diagramm", "fields": [field("axisColor", "Achsenfarbe", "color"), field("gridColor", "Rasterfarbe", "color"), field("backgroundColor", "Hintergrundfarbe", "color")]}, {"label": "Größe und Position", "fields": [field("width", "Breite (px)", "number", min=64, max=2000), field("height", "Höhe (px)", "number", min=64, max=2000)]}]
    for i in range(1, 11):
        entries = [("Name", "Serienname", "text", f"Serie {i}"), ("EntityId", "Serien-Entität", "text", ""), ("Attribute", "Datenattribut (optional)", "text", ""), ("Data", "Vorschau-Daten (JSON)", "text", '[{"x":"2026-10-03T08:00:00","value":12},{"x":"2026-10-03T09:00:00","value":18},{"x":"2026-10-03T10:00:00","value":15},{"x":"2026-10-03T11:00:00","value":22}]'), ("XKey", "X-Schlüssel", "text", "x"), ("YKey", "Y-Schlüssel", "text", "value"), ("Unit", "Einheit", "text", ""), ("Color", "Serienfarbe", "color", ["#42aee8", "#ffca28", "#29c8b5"][(i - 1) % 3]), ("Type", "Serientyp", "select", "line"), ("Axis", "Y-Achse", "select", "left"), ("Difference", "Differenz berechnen", "checkbox", False)]
        fields = []
        for suffix, label, kind, value in entries:
            key = f"series{suffix}{i}"
            defaults[key] = value
            extra = {"options": ["line", "bar"]} if suffix == "Type" else {"options": ["left", "right"]} if suffix == "Axis" else {}
            fields.append(field(key, label, kind, **extra))
        groups.append({"label": f"Daten [{i}]", "fields": fields})
    weekly = {"chartMode": "two-weeks", "headline": "", "headlineColor": "#ffffff", "legendTextColor": "#000000", "showWeekData": False, "unit": "kWh", "previousWeekColor": "#0000ff", "currentWeekColor": "#ffff00", "axisColor": "#0000ff", "xAxisColor": "#ffffff", "positionYAxis": "right", "decimalPlaces": 2, "noCard": False, "showLegend": True, "width": 560, "height": 320, "backgroundColor": "#20282d", "textColor": "#ffffff", "borderWidth": 0}
    week_groups = [{"label": "Allgemein", "fields": [field("noCard", "Ohne Karte", "checkbox"), field("headline", "Überschrift"), field("headlineColor", "Überschriftenfarbe", "color"), field("legendTextColor", "Farbe des Legendentextes", "color"), field("showWeekData", "Wochenwerte anzeigen", "checkbox"), field("unit", "Einheit"), field("previousWeekColor", "Farbe der Vorwoche", "color"), field("currentWeekColor", "Farbe der aktuellen Woche", "color"), field("axisColor", "Farbe der Achsenbeschriftung", "color"), field("positionYAxis", "Position der Y-Achse", "select", options=["left", "right"]), field("decimalPlaces", "Dezimalstellen", "number", min=0, max=5), field("showLegend", "Legende anzeigen", "checkbox")]}, {"label": "X-Achse", "fields": [field("xAxisColor", "Farbe der X-Achse", "color")]}, {"label": "Größe und Position", "fields": [field("width", "Breite (px)", "number", min=64, max=2000), field("height", "Höhe (px)", "number", min=64, max=2000)]}]
    days = [("Monday", "Montag"), ("Tuesday", "Dienstag"), ("Wednesday", "Mittwoch"), ("Thursday", "Donnerstag"), ("Friday", "Freitag"), ("Saturday", "Samstag"), ("Sunday", "Sonntag")]
    for week, label, demo in [("current", "Aktuelle Woche", [12, 18, 15, 22, 16, 8, 10]), ("previous", "Vorwoche", [10, 14, 17, 19, 13, 9, 11])]:
        fields = []
        for i, (day, day_label) in enumerate(days):
            entity_key, preview_key = f"{week}{day}EntityId", f"{week}{day}Preview"
            weekly[entity_key], weekly[preview_key] = "", demo[i]
            fields.extend([field(entity_key, f"{day_label}: Entität"), field(preview_key, f"{day_label}: Vorschauwert", "number")])
        week_groups.append({"label": label, "fields": fields})
    return {"format": "ha-grafik-widget-package", "apiVersion": "0.2", "id": "ugso.weather-heating", "name": "Wetter und Heizung", "version": "1.1.0", "license": "MIT", "icon": "icons/chart.svg", "widgets": [{"type": "ugso.weather-heating/general-chart", "label": "Allgemeines Diagramm", "icon": "icons/chart.svg", "defaults": defaults, "propertyGroups": groups, "render": {"kind": "chart", "valueKey": "headline"}}, {"type": "ugso.weather-heating/two-weeks-bar", "label": "Balkendiagramm für zwei Wochen", "icon": "icons/chart.svg", "defaults": weekly, "propertyGroups": week_groups, "render": {"kind": "chart", "valueKey": "headline"}}]}


if __name__ == "__main__":
    data = validate_manifest(manifest())
    target = ROOT / "ugso.weather-heating.wg"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(data, ensure_ascii=False, indent=2))
        archive.writestr("icons/chart.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 3V21H22M5 17L10 12L14 15L21 5" fill="none" stroke="#42aee8" stroke-width="2"/></svg>')
    read_package_zip(target.read_bytes())
    print(target)
