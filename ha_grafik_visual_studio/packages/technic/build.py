"""Build UGSo Technic as a declarative installable Studio package."""
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
    defaults = {"heading": "", "showName": False, "namePosition": "bottom", "iconScale": 80, "handle": "left", "iconColor": "#13c540", "contactEntityId": "", "invertContact": False, "coverEntityId": "", "invertCover": False, "modeEntityId": "", "invertMode": False, "readOnly": False, "contactPreview": False, "positionPreview": 0, "modePreview": False, "width": 120, "height": 160, "backgroundColor": "#0d1820", "textColor": "#c8e6e3", "borderWidth": 0, "padding": 4}
    groups = [
        {"label": "Allgemein", "fields": [field("heading", "Bezeichnung"), field("showName", "Bezeichnung anzeigen", "checkbox"), field("namePosition", "Position der Bezeichnung", "select", options=["top", "bottom"]), field("iconScale", "Icon-Größe (%)", "number", min=10, max=100), field("handle", "Griff", "select", options=["left", "right"]), field("iconColor", "Icon-Farbe", "color"), field("readOnly", "Schreibgeschützt", "checkbox")]},
        {"label": "Datenpunkte", "fields": [field("contactEntityId", "Öffnungskontakt: Entität"), field("invertContact", "Kontakt invertieren", "checkbox"), field("coverEntityId", "Rollo: cover-Entität"), field("invertCover", "Rollo invertieren", "checkbox"), field("modeEntityId", "Modus: Entität (aus = Auto, ein = Manuell)"), field("invertMode", "Modus invertieren", "checkbox")]},
        {"label": "Vorschau", "fields": [field("contactPreview", "Fenster offen (Vorschau)", "checkbox"), field("positionPreview", "Rolloposition (Vorschau)", "number", min=0, max=100), field("modePreview", "Manuell (Vorschau)", "checkbox")]},
        {"label": "Größe und Position", "fields": [field("width", "Breite (px)", "number", min=64, max=2000), field("height", "Höhe (px)", "number", min=64, max=2000)]},
    ]
    switch_defaults = {"heading": "Device", "showName": True, "namePosition": "bottom", "entityId": "", "valueType": "bool", "iconKey": "Knopf-AN", "iconScale": 80, "colorAN": "#2dd4b0", "colorAUS": "#5f8f8a", "previewOn": False, "readOnly": False, "width": 120, "height": 160, "backgroundColor": "#0d1820", "textColor": "#c8e6e3", "borderWidth": 0, "padding": 4}
    switch_groups = [
        {"label": "Allgemein", "fields": [field("heading", "Bezeichnung"), field("showName", "Bezeichnung anzeigen", "checkbox"), field("namePosition", "Position der Bezeichnung", "select", options=["top", "bottom"]), field("readOnly", "Schreibgeschützt", "checkbox")]},
        {"label": "Datenpunkte", "fields": [field("entityId", "Datenpunkt (EIN/AUS)"), field("valueType", "Werttyp", "select", options=["bool", "number"])]},
        {"label": "Icon", "fields": [field("iconKey", "Icon auswählen", "select", options=["Auswahl-AN", "Desktop-PC-AN", "Knopf-AN", "Lampe-Bett-AN", "Lampe-Hängend-AN", "Lampe-Hängend-Rund-AN", "Lampe-Schreibtisch-AN", "Lampe-Spots-AN", "Lampe-Stripe-RGB-AN", "Lampe-Tisch-AN", "Link-AN", "Lüfter-WC-AN", "Schluessel-AN", "Smartphone-AN", "Steckdose-AN", "TV-AN"]), field("iconScale", "Icon-Größe (%)", "number", min=10, max=100), field("colorAN", "Farbe EIN", "color"), field("colorAUS", "Farbe AUS", "color")]},
        {"label": "Vorschau", "fields": [field("previewOn", "EIN (Vorschau)", "checkbox")]},
        groups[-1],
    ]
    light_defaults = {"heading": "Light", "showName": True, "namePosition": "bottom", "iconScale": 80, "powerEntityId": "", "brightnessEntityId": "", "linkPowerDimmer": True, "colorAN": "#2ecfbf", "colorAUS": "#5f8f8a", "colorBg": "#0d1820", "readOnly": False, "powerPreview": False, "brightnessPreview": 0, "width": 160, "height": 200, "backgroundColor": "#0d1820", "textColor": "#c8e6e3", "borderWidth": 0, "padding": 4}
    light_groups = [
        {"label": "Allgemein", "fields": [field("heading", "Bezeichnung"), field("showName", "Bezeichnung anzeigen", "checkbox"), field("namePosition", "Position der Bezeichnung", "select", options=["top", "bottom"]), field("iconScale", "Icon-Größe (%)", "number", min=10, max=100), field("readOnly", "Schreibgeschützt", "checkbox")]},
        {"label": "Datenpunkte", "fields": [field("powerEntityId", "Ein/Aus: Entität"), field("brightnessEntityId", "Helligkeit: Entität (0–100)"), field("linkPowerDimmer", "Ein/Aus mit Helligkeit verknüpfen", "checkbox")]},
        {"label": "Farben", "fields": [field("colorAN", "Farbe EIN", "color"), field("colorAUS", "Farbe AUS", "color"), field("colorBg", "Regler-Hintergrund", "color")]},
        {"label": "Vorschau", "fields": [field("powerPreview", "EIN (Vorschau)", "checkbox"), field("brightnessPreview", "Helligkeit (Vorschau)", "number", min=0, max=100)]},
        groups[-1],
    ]
    room_defaults = {"roomName": "", "nameColor": "#e8f4f3", "nameFontSize": 14, "nameBold": False, "nameAlign": "left", "nameVerticalAlign": "top", "paddingTop": 8, "paddingRight": 8, "paddingBottom": 8, "paddingLeft": 8, "rowCount": 0, "rowFontSize": 13, "rowLabelColor": "#c8e6e3", "horizontalLayout": False, "rowSeparator": "|", "rowGap": 12, "clickMode": "popup", "targetPage": "", "popupWidth": 800, "popupHeight": 600, "popupUseOffset": False, "popupOffsetX": 0, "popupOffsetY": 0, "closeOnOutsideClick": True, "showCloseButton": True, "autoCloseSeconds": 0, "popupBackgroundColor": "#0d1820", "popupBorderColor": "#2ecfbf", "popupBorderWidth": 1, "popupBorderRadius": 8, "width": 160, "height": 100, "backgroundColor": "#0d1820", "borderWidth": 0, "padding": 0}
    room_groups = [
        {"label": "Allgemein", "fields": [field("roomName", "Raumname"), field("nameColor", "Namensfarbe", "color"), field("nameFontSize", "Namens-Schriftgröße", "number", min=8, max=100), field("nameBold", "Name fett", "checkbox"), field("nameAlign", "Name horizontale Ausrichtung", "select", options=["left", "center", "right"]), field("nameVerticalAlign", "Name vertikale Ausrichtung", "select", options=["top", "middle", "bottom"]), *[field(f"padding{side}", f"Innenabstand {label}", "number", min=0, max=100) for side, label in [("Top", "oben"), ("Right", "rechts"), ("Bottom", "unten"), ("Left", "links")]]]},
        {"label": "Statuszeilen", "fields": [field("rowCount", "Anzahl Zeilen", "number", min=0, max=10), field("rowFontSize", "Zeilen-Schriftgröße", "number", min=8, max=100), field("rowLabelColor", "Farbe Zeilenbezeichnung", "color"), field("horizontalLayout", "Zeilen waagerecht anordnen", "checkbox"), field("rowSeparator", "Trennzeichen"), field("rowGap", "Abstand zwischen Zeilen", "number", min=0, max=100)]},
        {"label": "Klickverhalten / Popup", "fields": [field("clickMode", "Klickmodus", "select", options=["popup", "switchView"]), field("targetPage", "Zielseite"), field("popupWidth", "Popup-Breite", "number", min=160, max=3000), field("popupHeight", "Popup-Höhe", "number", min=100, max=3000), field("popupUseOffset", "Feste Position verwenden", "checkbox"), field("popupOffsetX", "Popup-Position X", "number", min=0, max=10000), field("popupOffsetY", "Popup-Position Y", "number", min=0, max=10000), field("closeOnOutsideClick", "Bei Klick außerhalb schließen", "checkbox"), field("showCloseButton", "Schließen-Button anzeigen", "checkbox"), field("autoCloseSeconds", "Automatisch schließen (Sekunden, 0 = aus)", "number", min=0, max=86400), field("popupBackgroundColor", "Popup-Hintergrundfarbe", "color"), field("popupBorderColor", "Popup-Rahmenfarbe", "color"), field("popupBorderWidth", "Popup-Rahmenbreite", "number", min=0, max=20), field("popupBorderRadius", "Popup-Eckenradius", "number", min=0, max=100)]},
        groups[-1],
    ]
    for i in range(1, 11):
        row = {"rowLabel": "", "rowEntityId": "", "valueType": "number", "unit": "", "decimals": 1, "numberColor": "#c8e6e3", "trueText": "", "trueColor": "#c8e6e3", "falseText": "", "falseColor": "#c8e6e3", "extraEntityIds": "", "logic": "and"}
        room_defaults.update({f"{key}{i}": value for key, value in row.items()})
        room_groups.append({"label": f"Statuszeile [{i}]", "fields": [field(f"rowLabel{i}", "Zeilenbezeichnung"), field(f"rowEntityId{i}", "Entität"), field(f"valueType{i}", "Werttyp", "select", options=["number", "bool"]), field(f"unit{i}", "Einheit"), field(f"decimals{i}", "Dezimalstellen", "number", min=0, max=6), field(f"numberColor{i}", "Zahlenfarbe", "color"), field(f"trueText{i}", "Text EIN"), field(f"trueColor{i}", "Farbe EIN", "color"), field(f"falseText{i}", "Text AUS"), field(f"falseColor{i}", "Farbe AUS", "color"), field(f"extraEntityIds{i}", "Weitere Entitäten (kommagetrennt)"), field(f"logic{i}", "Verknüpfung", "select", options=["and", "or"])]})
    return {"format": "ha-grafik-widget-package", "apiVersion": "0.2", "id": "ugso.technic", "name": "UGSo Technic", "version": "1.3.0", "license": "MIT", "icon": "icons/window.svg", "widgets": [{"type": "ugso.technic/window-wall", "label": "Window – Wall", "icon": "icons/window.svg", "defaults": defaults, "propertyGroups": groups, "render": {"kind": "technic-window", "valueKey": "heading"}}, {"type": "ugso.technic/switch-boolean", "label": "Switch – Boolean", "icon": "icons/switch.svg", "defaults": switch_defaults, "propertyGroups": switch_groups, "render": {"kind": "technic-switch", "valueKey": "heading"}}, {"type": "ugso.technic/dimmer-light", "label": "Dimmer – Light", "icon": "icons/light.svg", "defaults": light_defaults, "propertyGroups": light_groups, "render": {"kind": "technic-light", "valueKey": "heading"}}, {"type": "ugso.technic/room-overlay", "label": "Room – Overlay", "icon": "icons/room.svg", "defaults": room_defaults, "propertyGroups": room_groups, "render": {"kind": "technic-room", "valueKey": "roomName"}}]}


def build():
    data = validate_manifest(manifest())
    target = ROOT / "ugso.technic.wg"
    entries = {"manifest.json": json.dumps(data, ensure_ascii=False, indent=2), "icons/window.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="1" fill="#0d1820" stroke="#2ecfbf"/><rect x="7" y="4" width="10" height="16" fill="none" stroke="#2ecfbf"/><path d="M9 11V14M7 7H17M7 10H17" fill="none" stroke="#2ecfbf"/></svg>', "README.md": (ROOT / "README.md").read_text(encoding="utf-8"), "LICENSE.txt": (ROOT / "LICENSE.txt").read_text(encoding="utf-8")}
    entries["icons/switch.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2dd4b0" stroke-width="2" stroke-linecap="round"><path d="M12 2V11M7 5A8 8 0 1 0 17 5"/></svg>'
    entries["icons/light.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2ecfbf" stroke-width="2"><path d="M6 19A9 9 0 1 1 18 19M12 7V12"/><circle cx="12" cy="12" r="4"/></svg>'
    entries["icons/room.svg"] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2ecfbf"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M5 8H19M5 12H12M5 16H16"/></svg>'
    with ZipFile(target, "w") as archive:
        for name, body in entries.items():
            info = ZipInfo(name, (2026, 10, 3, 0, 0, 0)); info.compress_type = ZIP_DEFLATED
            archive.writestr(info, body.encode("utf-8"))
    read_package_zip(target.read_bytes())
    return target


if __name__ == "__main__":
    print(build())
