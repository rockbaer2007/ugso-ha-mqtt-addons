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
    return {"format": "ha-grafik-widget-package", "apiVersion": "0.2", "id": "ugso.technic", "name": "UGSo Technic", "version": "1.0.0", "license": "MIT", "icon": "icons/window.svg", "widgets": [{"type": "ugso.technic/window-wall", "label": "Window – Wall", "icon": "icons/window.svg", "defaults": defaults, "propertyGroups": groups, "render": {"kind": "technic-window", "valueKey": "heading"}}]}


def build():
    data = validate_manifest(manifest())
    target = ROOT / "ugso.technic.wg"
    entries = {"manifest.json": json.dumps(data, ensure_ascii=False, indent=2), "icons/window.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="1" fill="#0d1820" stroke="#2ecfbf"/><rect x="7" y="4" width="10" height="16" fill="none" stroke="#2ecfbf"/><path d="M9 11V14M7 7H17M7 10H17" fill="none" stroke="#2ecfbf"/></svg>', "README.md": (ROOT / "README.md").read_text(encoding="utf-8"), "LICENSE.txt": (ROOT / "LICENSE.txt").read_text(encoding="utf-8")}
    with ZipFile(target, "w") as archive:
        for name, body in entries.items():
            info = ZipInfo(name, (2026, 10, 3, 0, 0, 0)); info.compress_type = ZIP_DEFLATED
            archive.writestr(info, body.encode("utf-8"))
    read_package_zip(target.read_bytes())
    return target


if __name__ == "__main__":
    print(build())
