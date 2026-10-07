"""Build the data-only Industrial set (reference heating art: Studio >= 0.1.253)."""
from copy import deepcopy
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / "app"))
from widget_packages import validate_manifest, read_package_zip


def _base_manifest():
    def field(key, label, kind="text", **extra):
        return {"key": key, "label": label, "type": kind, **extra}
    defaults = {"entityId": "", "outputEntityId": "", "state": 0, "minValue": -20, "maxValue": 30,
                "step": 1, "scaleDivision": 5, "scaleMode": "ticks", "outputMode": "release",
                "heading": "Gauge/Poti", "unit": "", "showValue": False, "industrialStyle": True,
                "scaleColor": "#e1e7e9", "pointerColor": "#f2f5f6", "bandCount": 4,
                "width": 64, "height": 64, "backgroundColor": "transparent", "borderWidth": 0, "padding": 0}
    groups = [
        {"label": "Daten und Bedienung", "fields": [field("heading", "Bezeichnung"), field("entityId", "Eingang: Entität (leer = Poti)"), field("outputEntityId", "Ausgang: number/input_number-Entität"), field("state", "Startwert / Vorschauwert", "number"), field("outputMode", "Ausgabe (release = Loslassen, continuous = beim Ziehen)", "select", options=["release", "continuous"]), field("unit", "Einheit"), field("showValue", "Wert anzeigen", "checkbox")]},
        {"label": "Skala", "fields": [field("minValue", "Skalenminimum", "number"), field("maxValue", "Skalenmaximum", "number"), field("step", "Bedien-Schrittweite", "number", min=0.000001), field("scaleDivision", "Skalenteilung", "number", min=0.000001), field("scaleMode", "Darstellung (ticks = Striche, ring = Farbring)", "select", options=["ticks", "ring"]), field("bandCount", "Anzahl Farbbereiche", "number", min=1, max=8)]},
        {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox"), field("scaleColor", "Skalenfarbe", "color"), field("pointerColor", "Zeigerfarbe", "color")]},
        {"label": "Größe", "fields": [field("width", "Breite (px)", "number", min=64, max=4096), field("height", "Höhe (px)", "number", min=64, max=4096)]},
    ]
    colors = ["#42a5f5", "#4caf50", "#ffca28", "#ef5350"]
    ends = [0, 20, 25, 30]
    for n in range(1, 9):
        defaults[f"bandEnd{n}"] = ends[n - 1] if n <= 4 else 30
        defaults[f"bandColor{n}"] = colors[n - 1] if n <= 4 else "#ef5350"
        groups.append({"label": f"Farbbereich {n}", "fields": [field(f"bandEnd{n}", "Bis Wert (letzter Bereich endet am Maximum)", "number"), field(f"bandColor{n}", "Farbe", "color")]})
    switch_defaults = {"state": 0, "switchCount": 1, "width": 128, "height": 128, "industrialStyle": True, "industrialScrewsEnabled": True, "backgroundColor": "transparent", "borderWidth": 0, "padding": 0, "dockAlwaysVisible": False, "valueFontSize": 12, "valueColor": "#dce5e9"}
    switch_groups = [{"label": "Schalter", "fields": [field("state", "Vorschauwert", "number"), field("switchCount", "Anzahl Schalter", "number", min=1, max=4), field("dockAlwaysVisible", "Koppelpunkte immer anzeigen", "checkbox")]}, {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox")]}, {"label": "Größe", "fields": [field("width", "Breite (px)", "number", min=64, max=4096), field("height", "Höhe (px)", "number", min=64, max=1024)]}]
    for n in range(1, 5):
        switch_defaults.update({f"switchLegend{n}": "on-off", f"label{n}": f"Schalter {n}", f"inputEntityId{n}": "", f"outputEntityId{n}": "", f"switchState{n}": False, f"inputDock{n}": False, f"outputDock{n}": False, f"ledOnColor{n}": "#ef5350", f"ledOffColor{n}": "#30383c"})
        switch_groups.append({"label": f"Schalter {n}", "fields": [field(f"label{n}", "Beschriftung"), field(f"switchLegend{n}", "Schildbeschriftung", "select", options=["on-off", "one-zero", "ein-aus"]), field(f"inputEntityId{n}", "Eingang: Entität"), field(f"outputEntityId{n}", "Ausgang: Entität"), field(f"switchState{n}", "Startzustand", "checkbox"), field(f"inputDock{n}", "Eingangs-Koppelpunkt aktivieren", "checkbox"), field(f"outputDock{n}", "Ausgangs-Koppelpunkt aktivieren", "checkbox"), field(f"ledOnColor{n}", "LED-Farbe Ein", "color"), field(f"ledOffColor{n}", "LED-Farbe Aus", "color")]})
    return {"format": "ha-grafik-widget-package", "apiVersion": "0.2", "id": "ugso.industrial", "name": "UGSo Industrie", "version": "0.2.0", "license": "MIT", "icon": "icons/gauge.svg", "widgets": [{"type": "ugso.industrial/gauge-poti", "label": "Gauge/Poti – 270°", "icon": "icons/gauge.svg", "defaults": defaults, "propertyGroups": groups, "render": {"kind": "industrial-gauge", "valueKey": "state"}}, {"type": "ugso.industrial/switch", "label": "Kippschalter – 1 bis 4", "icon": "icons/switch.svg", "defaults": switch_defaults, "propertyGroups": switch_groups, "render": {"kind": "industrial-switch", "valueKey": "state"}}]}


def manifest():
    data = _base_manifest()
    data["version"] = "0.11.5"
    toggle = data["widgets"][1]
    rocker = deepcopy(toggle)
    rocker.update(type="ugso.industrial/rocker-switch", label="Wippschalter – 1 bis 4", icon="icons/rocker-gray.svg")
    for n in range(1, 5):
        rocker["defaults"][f"rockerColor{n}"] = "white"
        group = next(group for group in rocker["propertyGroups"] if group["label"] == f"Schalter {n}")
        group["fields"].insert(1, {"key": f"rockerColor{n}", "label": "Schalterfarbe", "type": "select", "options": ["white", "red", "black", "green"]})
    data["widgets"].append(rocker)
    for columns, rows, height in ((20, 4, 64), (16, 2, 32)):
        def field(key, label, kind="text", **extra):
            return {"key": key, "label": label, "type": kind, **extra}
        defaults = {"width": 192, "height": height, "industrialStyle": True, "industrialScrewsEnabled": True,
                    "backgroundColor": "transparent", "borderWidth": 0, "padding": 0, "lcdColor": "blue",
                    "displayOn": True, "displayEntityId": "", "displayInputEnabled": False, "dockAlwaysVisible": False}
        groups = [{"label": "Display", "fields": [field("lcdColor", "Farbmodus", "select", options=["yellow", "blue"]),
                   field("displayOn", "Ohne Eingang eingeschaltet", "checkbox"), field("displayEntityId", "Display Ein/Aus: Entität"),
                   field("displayInputEnabled", "Ein/Aus-Koppelpunkt aktivieren", "checkbox"), field("dockAlwaysVisible", "Koppelpunkte immer anzeigen", "checkbox")]},
                  {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox")]},
                  {"label": "Größe", "fields": [field("width", "Breite (px)", "number", min=192, max=4096), field("height", "Höhe (px)", "number", min=height, max=4096)]}]
        for n in range(1, rows + 1):
            defaults.update({f"lineEntityId{n}": "", f"lineText{n}": "", f"lineUnit{n}": "", f"lineAutoUnit{n}": True, f"lineDecimals{n}": "auto"})
            groups.append({"label": f"Zeile {n}", "fields": [field(f"lineEntityId{n}", "Entität"), field(f"lineText{n}", "Text / Präfix"),
                field(f"lineUnit{n}", "Einheit"), field(f"lineAutoUnit{n}", "Einheit aus Entität", "checkbox"), field(f"lineDecimals{n}", "Nachkommastellen", "select", options=["auto", "0", "1", "2", "3", "4", "5", "6"])]})
        data["widgets"].append({"type": f"ugso.industrial/lcd-{columns}x{rows}", "label": f"LCD – {columns}×{rows}", "icon": "icons/lcd.svg",
                                "defaults": defaults, "propertyGroups": groups, "render": {"kind": "industrial-lcd", "valueKey": "lineText1"}})
    for slim in (False, True):
        linear = deepcopy(data["widgets"][0])
        linear.update(type="ugso.industrial/linear-slim" if slim else "ugso.industrial/linear",
                      label="Linear-Gauge / Schieberegler – Schmal" if slim else "Linear-Gauge / Schieberegler", icon="icons/linear.svg")
        linear["render"]["kind"] = "industrial-linear"
        linear["defaults"].update(width=130, height=32 if slim else 64, linearSpan="2", heading="Linear", showValue=True)
        for group in linear["propertyGroups"]:
            if group["label"] == "Größe":
                group["fields"].insert(0, {"key": "linearSpan", "label": "Breite in Rastereinheiten", "type": "select", "options": ["2", "3", "4"]})
                for item in group["fields"]:
                    if item["key"] == "height": item["min"] = 32 if slim else 64
                    if item["key"] == "width": item["min"] = 128
            if group["label"] == "Daten und Bedienung":
                group["fields"][1]["label"] = "Eingang: Entität (leer = Schieberegler)"
            if group["label"] == "Skala":
                group["fields"].append({"key": "scaleLabelsEnabled", "label": "Skalenwerte anzeigen", "type": "checkbox"})
                linear["defaults"]["scaleLabelsEnabled"] = False
        data["widgets"].append(linear)
    for slim in (False, True):
        def field(key, label, kind="text", **extra):
            return {"key": key, "label": label, "type": kind, **extra}
        defaults = {"state": 123.45, "entityId": "", "dataInputEnabled": False, "dataInputAnchor": "value-input", "unit": "",
                    "odometerSpan": "3", "odometerDigits": 5, "odometerDecimals": 2, "odometerSeparator": "comma",
                    "odometerLeadingZeros": True, "odometerSignEnabled": False, "width": 196, "height": 32 if slim else 64,
                    "industrialStyle": True, "industrialScrewsEnabled": True, "backgroundColor": "transparent", "borderWidth": 0, "padding": 0, "dockAlwaysVisible": False}
        groups = [{"label": "Zählwerk", "fields": [field("entityId", "Eingang: Entität"), field("dataInputEnabled", "Eingangs-Koppelpunkt aktivieren", "checkbox"),
                   field("state", "Vorschauwert", "number"), field("odometerDigits", "Ganzzahlstellen", "number", min=1, max=12), field("odometerDecimals", "Nachkommastellen", "number", min=0, max=6),
                   field("odometerLeadingZeros", "Führende Nullen", "checkbox"), field("odometerSignEnabled", "Platz für Minuszeichen", "checkbox"),
                   field("odometerSeparator", "Dezimaltrennzeichen", "select", options=["comma", "dot"]), field("dockAlwaysVisible", "Koppelpunkte immer anzeigen", "checkbox")]},
                  {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox")]},
                  {"label": "Größe", "fields": [field("odometerSpan", "Breite in Rastereinheiten", "select", options=["3", "4"]), field("width", "Breite (px)", "number", min=192, max=4096), field("height", "Höhe (px)", "number", min=32 if slim else 64, max=4096)]}]
        data["widgets"].append({"type": "ugso.industrial/odometer-slim" if slim else "ugso.industrial/odometer", "label": "Zählwerk – Schmal" if slim else "Zählwerk", "icon": "icons/odometer.svg",
                                "defaults": defaults, "propertyGroups": groups, "render": {"kind": "industrial-odometer", "valueKey": "state"}})
    for digits, mode in ((7, "led"), (16, "led"), (16, "lcd")):
        defaults = {"entityId": "", "segmentText": "123.45" if digits == 7 else "SOLAR", "segmentDigits": 6,
                    "segmentDecimals": 2, "segmentLeadingZeros": False, "segmentUnit": "W", "segmentSpan": "4",
                    "segmentColor": "#182a15" if mode == "lcd" else "#ff3b30", "segmentBackground": "#8a9b61" if mode == "lcd" else "#080b0d",
                    "dataInputEnabled": False, "dataInputAnchor": "value-input", "displayEntityId": "", "displayOn": True,
                    "displayInputEnabled": False, "dockAlwaysVisible": False, "width": 262, "height": 64,
                    "industrialStyle": True, "industrialScrewsEnabled": True, "backgroundColor": "transparent", "borderWidth": 0, "padding": 0}
        groups = [{"label": "Segmentanzeige", "fields": [field("entityId", "Inhalt: Entität"), field("segmentText", "Vorschauwert / Text"),
                  field("dataInputEnabled", "Wert-Eingangs-Koppelpunkt aktivieren", "checkbox"), field("segmentDigits", "Stellen (einschließlich Minuszeichen)", "number", min=1, max=10),
                  *([field("segmentDecimals", "Nachkommastellen", "number", min=0, max=9), field("segmentLeadingZeros", "Führende Nullen", "checkbox")] if digits == 7 else []),
                  field("segmentUnit", "Einheiten-LED", "select", options=["off", "W", "A", "V"]), field("segmentColor", "Segment- und Einheitenfarbe", "color"), field("segmentBackground", "Bildschirm-Hintergrund", "color")]},
                  {"label": "Display Ein/Aus", "fields": [field("displayOn", "Ohne Eingang eingeschaltet", "checkbox"), field("displayEntityId", "Display Ein/Aus: Entität"),
                  field("displayInputEnabled", "Ein/Aus-Koppelpunkt aktivieren", "checkbox"), field("dockAlwaysVisible", "Koppelpunkte immer anzeigen", "checkbox")]},
                  {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox")]},
                  {"label": "Größe", "fields": [field("segmentSpan", "Breite in Rastereinheiten", "select", options=["3", "4"]), field("width", "Breite (px)", "number", min=192, max=4096), field("height", "Höhe (px)", "number", min=64, max=4096)]}]
        data["widgets"].append({"type": f"ugso.industrial/segment-{digits}-{mode}", "label": f"{digits}-Segment – {mode.upper()}", "icon": "icons/segment.svg",
                                "defaults": defaults, "propertyGroups": groups, "render": {"kind": "industrial-segment", "valueKey": "segmentText"}})
    data["widgets"].append({"type": "ugso.industrial/clock", "label": "Industrie-Uhr – Nixie / LED / LCD", "icon": "icons/clock.svg",
        "defaults": {"clockMode": "nixie", "clockSeconds": True, "clockBlink": True, "clockZone": "local", "clockLedColor": "#ff3b30", "clockLcdColor": "#182a15", "clockLcdBackground": "#8a9b61",
                     "width": 518, "height": 128, "displayOn": True, "displayEntityId": "", "displayInputEnabled": False, "dockAlwaysVisible": False,
                     "industrialStyle": True, "industrialScrewsEnabled": True, "backgroundColor": "transparent", "borderWidth": 0, "padding": 0},
        "propertyGroups": [{"label": "Uhr", "fields": [field("clockMode", "Anzeigeart", "select", options=["nixie", "led", "lcd"]), field("clockSeconds", "Sekunden anzeigen", "checkbox"),
            field("clockBlink", "Doppelpunkte blinken", "checkbox"), field("clockZone", "Zeitzone", "select", options=["local", "UTC", "Europe/Berlin"]),
            field("clockLedColor", "LED-Leuchtfarbe", "color"), field("clockLcdColor", "LCD-Segmentfarbe", "color"), field("clockLcdBackground", "LCD-Hintergrundfarbe", "color")]},
            {"label": "Display Ein/Aus", "fields": [field("displayOn", "Ohne Eingang eingeschaltet", "checkbox"), field("displayEntityId", "Display Ein/Aus: Entität"), field("displayInputEnabled", "Ein/Aus-Koppelpunkt aktivieren", "checkbox"), field("dockAlwaysVisible", "Koppelpunkte immer anzeigen", "checkbox")]},
            {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox")]},
            {"label": "Größe", "fields": [field("width", "Breite (px)", "number", min=96, max=4096), field("height", "Höhe (px)", "number", min=32, max=4096)]}],
        "render": {"kind": "industrial-clock", "valueKey": "clockMode"}})
    data["widgets"].append({"type": "ugso.industrial/weather", "label": "Industrie-Wetter – LCD / LED", "icon": "icons/weather.svg",
        "defaults": {"entityId": "", "weatherMode": "lcd", "weatherRain": True, "weatherMinMax": True, "weatherDemo": False,
                     "weatherLedColor": "#42a5f5", "weatherLcdColor": "#182a15", "weatherLcdBackground": "#8a9b61",
                     "temperatureEntityId": "", "humidityEntityId": "", "windEntityId": "", "rainEntityId": "", "lowEntityId": "", "highEntityId": "",
                     "width": 262, "height": 130, "displayOn": True, "displayEntityId": "", "displayInputEnabled": False, "dockAlwaysVisible": False,
                     "industrialStyle": True, "industrialScrewsEnabled": True, "backgroundColor": "transparent", "borderWidth": 0, "padding": 0},
        "propertyGroups": [{"label": "Wetterdisplay", "fields": [field("entityId", "Wetterentität"), field("weatherMode", "Anzeigeart", "select", options=["lcd", "led"]),
            field("weatherRain", "Regenwahrscheinlichkeit anzeigen", "checkbox"), field("weatherMinMax", "Tagesminimum/-maximum anzeigen", "checkbox"), field("weatherDemo", "Beispieldaten ohne Wetterentität", "checkbox"),
            field("weatherLedColor", "LED-Leuchtfarbe", "color"), field("weatherLcdColor", "LCD-Segmentfarbe", "color"), field("weatherLcdBackground", "LCD-Hintergrundfarbe", "color")]},
            {"label": "Zusätzliche Sensoren", "fields": [field("temperatureEntityId", "Temperatur: Sensor"), field("humidityEntityId", "Luftfeuchtigkeit: Sensor"), field("windEntityId", "Windgeschwindigkeit: Sensor"),
            field("rainEntityId", "Regenwahrscheinlichkeit: Sensor"), field("lowEntityId", "Tagesminimum: Sensor"), field("highEntityId", "Tagesmaximum: Sensor")]},
            {"label": "Display Ein/Aus", "fields": [field("displayOn", "Ohne Eingang eingeschaltet", "checkbox"), field("displayEntityId", "Display Ein/Aus: Entität"), field("displayInputEnabled", "Ein/Aus-Koppelpunkt aktivieren", "checkbox"), field("dockAlwaysVisible", "Koppelpunkte immer anzeigen", "checkbox")]},
            {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox")]},
            {"label": "Größe", "fields": [field("width", "Breite (px)", "number", min=256, max=4096), field("height", "Höhe (px)", "number", min=128, max=4096)]}],
        "render": {"kind": "industrial-weather", "valueKey": "entityId"}})
    data["widgets"].append({"type": "ugso.industrial/section", "label": "Blindelement", "icon": "icons/section.svg",
        "defaults": {"sectionCount": "1", "sectionRows": "1", "width": 64, "height": 64, "cssZIndex": -1,
                     "industrialStyle": True, "industrialScrewsEnabled": True, "backgroundColor": "transparent", "borderWidth": 0, "padding": 0},
        "propertyGroups": [
            {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox")]},
            {"label": "Größe", "fields": [field("sectionCount", "Abschnitte", "select", options=["1", "2", "3", "4"]),
                field("sectionRows", "Abschnitte senkrecht", "select", options=["1", "2", "3", "4"]),
                field("width", "Breite (px)", "number", min=64, max=4096), field("height", "Höhe (px)", "number", min=64, max=4096)]}],
        "render": {"kind": "industrial-section", "valueKey": "sectionCount"}})
    defaults = {"width": 518, "height": 778, "industrialStyle": True, "industrialScrewsEnabled": True,
                "backgroundColor": "transparent", "borderWidth": 0, "padding": 0, "heatingDemo": False,
                "statusLegend": "ein-aus", "statusOnColor": "#39ed1b", "statusOffColor": "#39433d", "statusOffTextColor": "#a4b1ad", "alertColor": "#ffcf28", "tankColor": "#ed9829"}
    groups = [{"label": "Heizung", "fields": [field("heatingDemo", "Beispieldaten ohne Entitäten", "checkbox"),
              field("statusLegend", "Statusbeschriftung", "select", options=["ein-aus", "on-off", "one-zero"]),
              field("statusOnColor", "Statusfarbe Ein", "color"), field("statusOffColor", "LED-Farbe Aus", "color"), field("statusOffTextColor", "Statusfarbe Aus", "color")] }]
    for key, label in (("heating", "Heizkreistemperatur"), ("boiler", "Kesseltemperatur"), ("hot", "Warmwassertemperatur"), ("cold", "Kaltwassertemperatur")):
        defaults.update({f"{key}EntityId": "", f"{key}Visible": True, f"{key}Color": "#229dff" if key == "cold" else "#ff3932"})
        groups.append({"label": label, "fields": [field(f"{key}EntityId", "Entität"), field(f"{key}Visible", "Anzeige sichtbar", "checkbox"), field(f"{key}Color", "Textfarbe", "color")]})
    for key, label in (("pump", "Heizkreispumpenstatus"), ("circulation", "Zirkulationspumpenstatus"), ("burner", "Brennerstatus"), ("alert", "Störungsanzeige")):
        defaults.update({f"{key}EntityId": "", f"{key}Visible": True})
        groups.append({"label": label, "fields": [field(f"{key}EntityId", "Boolean-Entität"), field(f"{key}Visible", "Anzeige sichtbar", "checkbox")]})
    defaults["tankEntityId"] = ""
    groups.append({"label": "Tankfüllstand", "fields": [field("tankEntityId", "Numerische Entität (0–100 %)"), field("tankColor", "Füllstandsfarbe", "color")]})
    arrows = []
    for key, label in (("heating", "Heizkreis"), ("circulation", "Zirkulation"), ("hot", "Warmwasser"), ("cold", "Kaltwasser"), ("oil", "Öl zum Brenner")):
        defaults[f"{key}Arrow"] = True
        arrows.append(field(f"{key}Arrow", label, "checkbox"))
    groups.extend([{"label": "Flusspfeile", "fields": arrows},
                   {"label": "Gehäuse und Farben", "fields": [field("industrialStyle", "Industriestyle", "checkbox"), field("alertColor", "Störungsfarbe", "color")]},
                   {"label": "Größe", "fields": [field("width", "Breite (px)", "number", min=256, max=4096), field("height", "Höhe (px)", "number", min=384, max=4096)]}])
    data["widgets"].append({"type": "ugso.industrial/heating", "label": "Heizung – Kessel und Öltank", "icon": "icons/heating.svg", "defaults": defaults,
                            "propertyGroups": groups, "render": {"kind": "industrial-heating", "valueKey": "tankEntityId"}})
    return data


def build():
    data = validate_manifest(manifest())
    entries = {"manifest.json": json.dumps(data, ensure_ascii=False, indent=2), "icons/gauge.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="2" fill="#263238" stroke="#879097"/><path d="M6 18A8 8 0 1 1 18 18" fill="none" stroke="#4caf50" stroke-width="2"/><path d="M12 5L10 10H14Z" fill="#f2f5f6"/></svg>', "README.md": (ROOT / "README.md").read_text(encoding="utf-8"), "LICENSE.txt": (ROOT / "LICENSE.txt").read_text(encoding="utf-8")}
    entries["icons/switch.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="2" fill="#263238" stroke="#879097"/><circle cx="12" cy="5" r="2" fill="#4caf50"/><circle cx="12" cy="15" r="5" fill="#92999d" stroke="#11181c"/><path d="M12 16L12 10" stroke="#e1e7e9" stroke-width="3"/></svg>'
    entries["icons/lcd.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="2" fill="#263238" stroke="#879097"/><rect x="3" y="7" width="18" height="10" fill="#193ae5"/><path d="M5 9h5m-5 3h12m-12 3h9" stroke="#fff" stroke-dasharray="1 1"/></svg>'
    entries["icons/linear.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="2" fill="#263238" stroke="#879097"/><path d="M4 12h16M4 12v4m4-4v3m4-3v4m4-4v3m4-3v4" stroke="#dce5e9"/><path d="M10 8h4l-2 3Z" fill="#42a5f5"/></svg>'
    entries["icons/odometer.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="2" fill="#263238" stroke="#879097"/><path d="M4 8h4v8H4Zm6 0h4v8h-4Zm6 0h4v8h-4Z" fill="#11181c" stroke="#dce5e9"/><path d="M2 12h20" stroke="#879097"/></svg>'
    for color, fill in (("gray", "#c7cbd1"),):
        entries[f"icons/rocker-{color}.svg"] = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="5" y="1" width="14" height="22" rx="3" fill="#17191b"/><rect x="7" y="3" width="10" height="18" rx="2" fill="{fill}"/><circle cx="12" cy="8" r="2" fill="none" stroke="#ffffff"/><path d="M12 14V18" stroke="#ffffff" stroke-width="2"/></svg>'
    entries["icons/section.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" fill="#263238" stroke="#879097"/><path d="M4 7h1m14 0h1M4 17h1m14 0h1" stroke="#92999d" stroke-width="2"/></svg>'
    target = ROOT / "ugso.industrial.wg"
    entries["icons/heating.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="8" width="11" height="14" rx="1" fill="#b82222"/><rect x="4" y="11" width="7" height="5" fill="#90999d"/><path d="M7 8V3H3" fill="none" stroke="#90999d" stroke-width="3"/><rect x="16" y="3" width="6" height="19" rx="3" fill="#c5824d"/><path d="M19 8v10" stroke="#ffbd4b" stroke-width="2"/></svg>'
    entries["icons/weather.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="3" width="22" height="18" rx="2" fill="#263238" stroke="#879097"/><path d="M5 9h4v4H5Zm5 3h8v4h-8Z" fill="#8a9b61"/><path d="M11 18h9m-9-8h9" stroke="#42a5f5"/></svg>'
    entries["icons/clock.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="3" width="22" height="18" rx="2" fill="#263238" stroke="#879097"/><rect x="4" y="5" width="6" height="14" rx="3" fill="#b6c1c522" stroke="#b6c1c5"/><rect x="14" y="5" width="6" height="14" rx="3" fill="#b6c1c522" stroke="#b6c1c5"/><path d="M7 8v8m9-8h2l-2 8" stroke="#ff9b36"/><path d="M12 10v1m0 2v1" stroke="#ff9b36"/></svg>'
    entries["icons/segment.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="2" fill="#11181c" stroke="#879097"/><path d="M4 8h4m-4 4h4m-4 4h4m-4-7v2m4-2v2m-4 2v2m4-2v2m4-7h4m-4 4h4m-4 4h4m-4-7v2m4-2v2m-4 2v2m4-2v2" stroke="#ff3b30"/></svg>'
    with ZipFile(target, "w") as archive:
        for name, body in entries.items():
            info = ZipInfo(name, (2026, 10, 6, 0, 0, 0)); info.compress_type = ZIP_DEFLATED
            archive.writestr(info, body.encode("utf-8"))
    read_package_zip(target.read_bytes())
    return target


if __name__ == "__main__":
    print(build())
