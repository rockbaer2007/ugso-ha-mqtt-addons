"""Build the data-only Industrial widget set (Studio >= 0.1.223)."""
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / "app"))
from widget_packages import validate_manifest, read_package_zip


def manifest():
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


def build():
    data = validate_manifest(manifest())
    entries = {"manifest.json": json.dumps(data, ensure_ascii=False, indent=2), "icons/gauge.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="2" fill="#263238" stroke="#879097"/><path d="M6 18A8 8 0 1 1 18 18" fill="none" stroke="#4caf50" stroke-width="2"/><path d="M12 5L10 10H14Z" fill="#f2f5f6"/></svg>', "README.md": (ROOT / "README.md").read_text(encoding="utf-8"), "LICENSE.txt": (ROOT / "LICENSE.txt").read_text(encoding="utf-8")}
    entries["icons/switch.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="2" fill="#263238" stroke="#879097"/><circle cx="12" cy="5" r="2" fill="#4caf50"/><circle cx="12" cy="15" r="5" fill="#92999d" stroke="#11181c"/><path d="M12 16L12 10" stroke="#e1e7e9" stroke-width="3"/></svg>'
    target = ROOT / "ugso.industrial.wg"
    with ZipFile(target, "w") as archive:
        for name, body in entries.items():
            info = ZipInfo(name, (2026, 10, 6, 0, 0, 0)); info.compress_type = ZIP_DEFLATED
            archive.writestr(info, body.encode("utf-8"))
    read_package_zip(target.read_bytes())
    return target


if __name__ == "__main__":
    print(build())
