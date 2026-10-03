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
    package = {"format": "ha-grafik-widget-package", "apiVersion": "0.2", "id": "ugso.weather-heating", "name": "Wetter und Heizung", "version": "1.2.0", "license": "MIT", "icon": "icons/chart.svg", "widgets": [{"type": "ugso.weather-heating/general-chart", "label": "Allgemeines Diagramm", "icon": "icons/chart.svg", "defaults": defaults, "propertyGroups": groups, "render": {"kind": "chart", "valueKey": "headline"}}, {"type": "ugso.weather-heating/two-weeks-bar", "label": "Balkendiagramm für zwei Wochen", "icon": "icons/chart.svg", "defaults": weekly, "propertyGroups": week_groups, "render": {"kind": "chart", "valueKey": "headline"}}]}
    package["widgets"].append(weather_definition(field))
    return package


def weather_definition(field):
    defaults = {"chartMode": "weather", "headline": "", "entityId": "", "locationEntityId": "", "weatherSource": "home-assistant", "forecastType": "daily", "forecastAttribute": "forecast", "headlineColor": "#ffffff", "legendTextColor": "#000000", "noCard": False, "showLegend": True, "xAxisFormat": "ddd HH:mm", "xAxisColor": "#ffffff", "temperatureVisible": True, "temperatureMaxColor": "#ff0000", "temperatureMinColor": "#0000ff", "temperatureAxisColor": "#ff0000", "temperatureAxis": "left", "temperatureUnit": "°C", "rainUnit": "mm", "rainVisible": False, "rainColor": "#0000ff", "rainAxisColor": "#0000ff", "rainAxis": "right", "rainSeparate": False, "cloudsVisible": False, "cloudsColor": "#ffff00", "cloudsAxisColor": "#ffff00", "cloudsAxis": "right", "cloudsSeparate": True, "sunOrCloud": "sun", "chanceVisible": False, "chanceColor": "#0000ff", "chanceAxisColor": "#0000ff", "chanceAxis": "right", "chanceSeparate": False, "width": 700, "height": 430, "backgroundColor": "#20282d", "textColor": "#ffffff", "borderWidth": 0}
    defaults["forecastPreview"] = json.dumps([{"datetime": f"2026-10-{3+i:02d}T12:00:00", "temperature": [18, 21, 16, 19, 22][i], "templow": [10, 12, 8, 9, 11][i], "precipitation": [0, 2, 5, 1, 0][i], "precipitation_probability": [5, 50, 80, 30, 10][i], "cloud_coverage": [10, 40, 90, 30, 20][i]} for i in range(5)])
    groups = [{"label": "Allgemein", "fields": [field("noCard", "Ohne Karte", "checkbox"), field("headline", "Name"), field("weatherSource", "Datenquelle", "select", options=["home-assistant", "json", "individual"]), field("entityId", "Wetter-/JSON-Entität"), field("locationEntityId", "Standort-Entität (optional)"), field("forecastType", "Datenstruktur", "select", options=["daily", "hourly"]), field("forecastAttribute", "Vorhersageattribut (JSON)"), field("forecastPreview", "Vorschau-Daten (JSON)"), field("headlineColor", "Überschriftenfarbe", "color"), field("legendTextColor", "Farbe des Legendentextes", "color"), field("showLegend", "Legende anzeigen", "checkbox")]}, {"label": "X-Achse", "fields": [field("xAxisFormat", "Datumsformat X-Achse"), field("xAxisColor", "Farbe der X-Achse", "color")]}, {"label": "Temperatur", "fields": [field("temperatureVisible", "Temperatur anzeigen", "checkbox"), field("temperatureMaxColor", "Max. Temperaturfarbe", "color"), field("temperatureMinColor", "Min. Temperaturfarbe", "color"), field("temperatureAxisColor", "Farbe der Achsenbeschriftung", "color"), field("temperatureAxis", "Position der Y-Achse", "select", options=["left", "right"]), field("temperatureUnit", "Temperatureinheit")] }]
    for key, label in [("rain", "Regen"), ("clouds", "Wolken"), ("chance", "Regenwahrscheinlichkeit")]:
        fields = [field(key + "Visible", label + " anzeigen", "checkbox"), field(key + "Color", label + "farbe", "color"), field(key + "AxisColor", "Farbe der Achsenbeschriftung", "color"), field(key + "Axis", "Position der Y-Achse", "select", options=["left", "right"]), field(key + "Separate", "Im zweiten Diagramm anzeigen", "checkbox")]
        if key == "rain": fields.append(field("rainUnit", "Regeneinheit"))
        if key == "clouds": fields.append(field("sunOrCloud", "Sonne oder Wolken", "select", options=["sun", "cloud"]))
        groups.append({"label": label, "fields": fields})
    for key, label, length in [("day", "Tagesdatum", 5), ("time", "Zeitpunkte", 24), ("rain", "Regenwerte", 24), ("tempMax", "Temperatur-Maximalwerte", 24), ("tempMin", "Temperatur-Minimalwerte", 24), ("cloud", "Wolkenwerte", 24), ("chance", "Regenwahrscheinlichkeitswerte", 24)]:
        fields = []
        for i in range(1, length + 1):
            name = f"{key}{i}EntityId"; defaults[name] = ""; fields.append(field(name, f"Entität [{i}]"))
        groups.append({"label": label, "fields": fields})
    groups.append({"label": "Größe und Position", "fields": [field("width", "Breite (px)", "number", min=64, max=2000), field("height", "Höhe (px)", "number", min=64, max=2000)]})
    return {"type": "ugso.weather-heating/weather", "label": "Wetter-Widget", "icon": "icons/chart.svg", "defaults": defaults, "propertyGroups": groups, "render": {"kind": "chart", "valueKey": "headline"}}


if __name__ == "__main__":
    data = validate_manifest(manifest())
    target = ROOT / "ugso.weather-heating.wg"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(data, ensure_ascii=False, indent=2))
        archive.writestr("icons/chart.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 3V21H22M5 17L10 12L14 15L21 5" fill="none" stroke="#42aee8" stroke-width="2"/></svg>')
    read_package_zip(target.read_bytes())
    print(target)
