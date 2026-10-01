"""Version 0.1 declarative widget-package contract with restricted SVG icons."""

import json
import re
from base64 import b64encode
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

API_VERSION = "0.1"
MAX_ZIP_BYTES = 2_000_000
MAX_MANIFEST_BYTES = 200_000
MAX_ICON_BYTES = 50_000
PACKAGE_ID = re.compile(r"^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$")
SLUG = re.compile(r"^[a-z][a-z0-9-]*$")
VERSION = re.compile(r"^\d+\.\d+\.\d+$")
KEY = re.compile(r"^[a-z][a-zA-Z0-9]*$")
FIELD_TYPES = {"text", "number", "checkbox", "color", "range", "select"}
ICON_PATH = re.compile(r"^icons/[a-z][a-z0-9-]*\.svg$")
SVG_NS = "http://www.w3.org/2000/svg"
SVG_TAGS = {"svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "title"}
SVG_ATTRIBUTES = {"viewBox", "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "transform", "d", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2", "rx", "ry", "points"}
SVG_VALUE = re.compile(r"^[a-zA-Z0-9#.,%+\-\s()]*$")
ElementTree.register_namespace("", SVG_NS)


def _short_text(value, limit=120):
    return isinstance(value, str) and 0 < len(value.strip()) <= limit


def validate_manifest(manifest):
    """Reject unknown executable features and malformed widget definitions."""
    if not isinstance(manifest, dict) or set(manifest) != {"format", "apiVersion", "id", "name", "version", "license", "widgets"}:
        raise ValueError("Das Paketmanifest hat ungültige oder fehlende Felder.")
    package_id = manifest["id"]
    if manifest["format"] != "ha-grafik-widget-package" or manifest["apiVersion"] != API_VERSION:
        raise ValueError("Paketformat oder Widget-Schnittstellenversion wird nicht unterstützt.")
    if not isinstance(package_id, str) or len(package_id) > 80 or not PACKAGE_ID.fullmatch(package_id):
        raise ValueError("Ungültige Paket-ID.")
    if not _short_text(manifest["name"]) or not _short_text(manifest["license"]):
        raise ValueError("Paketname oder Lizenz fehlt.")
    if not isinstance(manifest["version"], str) or not VERSION.fullmatch(manifest["version"]):
        raise ValueError("Ungültige Paketversion.")
    widgets = manifest["widgets"]
    if not isinstance(widgets, list) or not 1 <= len(widgets) <= 30:
        raise ValueError("Ein Paket benötigt 1 bis 30 Widgets.")
    seen = set()
    for widget in widgets:
        if not isinstance(widget, dict) or not {"type", "label", "defaults", "propertyGroups", "render"} <= set(widget) or set(widget) - {"type", "label", "defaults", "propertyGroups", "render", "icon"}:
            raise ValueError("Ungültige Widget-Definition.")
        if "icon" in widget and (not isinstance(widget["icon"], str) or not ICON_PATH.fullmatch(widget["icon"])):
            raise ValueError("Widget-Icon muss eine SVG-Datei unter icons/ sein.")
        widget_type = widget["type"]
        prefix, _, slug = widget_type.partition("/") if isinstance(widget_type, str) else ("", "", "")
        if prefix != package_id or not SLUG.fullmatch(slug) or widget_type in seen:
            raise ValueError("Widget-Typ muss eindeutig und im Paket-Namensraum liegen.")
        seen.add(widget_type)
        if not _short_text(widget["label"]) or not isinstance(widget["defaults"], dict):
            raise ValueError("Widget-Name oder Standardwerte sind ungültig.")
        render = widget["render"]
        if not isinstance(render, dict) or set(render) != {"kind", "valueKey"} or render["kind"] != "text":
            raise ValueError("Derzeit ist nur die deklarative Text-Darstellung unterstützt.")
        value_key = render["valueKey"]
        if not isinstance(value_key, str) or not KEY.fullmatch(value_key):
            raise ValueError("Ungültiger Anzeigeschlüssel.")
        if value_key not in widget["defaults"] or not isinstance(widget["defaults"][value_key], (str, int, float)):
            raise ValueError("Für den Anzeigeschlüssel fehlt ein Text- oder Zahlenwert.")
        if not isinstance(widget["propertyGroups"], list) or not 1 <= len(widget["propertyGroups"]) <= 20:
            raise ValueError("Ungültige Eigenschaftsgruppen.")
        field_keys = set()
        for group in widget["propertyGroups"]:
            if not isinstance(group, dict) or set(group) != {"label", "fields"} or not _short_text(group["label"]):
                raise ValueError("Ungültige Eigenschaftsgruppe.")
            if group["label"] in {"Generell", "Sichtbarkeit"} or not isinstance(group["fields"], list) or not 1 <= len(group["fields"]) <= 30:
                raise ValueError("Reservierte oder leere Eigenschaftsgruppe.")
            for field in group["fields"]:
                if not isinstance(field, dict) or not {"key", "label", "type"} <= set(field) or set(field) - {"key", "label", "type", "min", "max", "step", "options"}:
                    raise ValueError("Ungültiges Eigenschaftsfeld.")
                key = field["key"]
                if not isinstance(key, str) or not KEY.fullmatch(key) or key in field_keys or key not in widget["defaults"] or not _short_text(field["label"]):
                    raise ValueError("Eigenschaftsschlüssel fehlt, ist doppelt oder hat keinen Standardwert.")
                field_keys.add(key)
                kind = field["type"]
                if kind not in FIELD_TYPES:
                    raise ValueError("Eigenschaftstyp wird nicht unterstützt.")
                if kind == "checkbox" and not isinstance(widget["defaults"][key], bool):
                    raise ValueError("Checkbox benötigt einen booleschen Standardwert.")
                if kind == "select":
                    options = field.get("options")
                    if not isinstance(options, list) or not 1 <= len(options) <= 50 or not all(_short_text(option) for option in options) or widget["defaults"][key] not in options:
                        raise ValueError("Auswahlwerte sind ungültig.")
                elif "options" in field:
                    raise ValueError("Auswahlwerte sind nur für Select-Felder erlaubt.")
                if kind in {"number", "range"}:
                    if not isinstance(widget["defaults"][key], (int, float)) or isinstance(widget["defaults"][key], bool):
                        raise ValueError("Zahlenfeld benötigt einen numerischen Standardwert.")
                    for option in ("min", "max", "step"):
                        if option in field and (not isinstance(field[option], (int, float)) or isinstance(field[option], bool)):
                            raise ValueError("Zahlenbereich ist ungültig.")
                elif set(field) & {"min", "max", "step"}:
                    raise ValueError("Zahlenbereiche sind nur für Zahlenfelder erlaubt.")
        if value_key not in field_keys:
            raise ValueError("Anzeigeschlüssel muss als Eigenschaft bearbeitbar sein.")
        if any(not KEY.fullmatch(key) or isinstance(value, (dict, list)) for key, value in widget["defaults"].items()):
            raise ValueError("Standardwerte dürfen nur einfache Werte enthalten.")
    return manifest


def sanitize_svg(body):
    """Accept only inert SVG geometry and serialize it without active content."""
    if not 0 < len(body) <= MAX_ICON_BYTES or b"<!" in body or b"<?" in body:
        raise ValueError("SVG-Icon ist leer, zu groß oder enthält aktive XML-Deklarationen.")
    try:
        root = ElementTree.fromstring(body)
    except ElementTree.ParseError as error:
        raise ValueError("SVG-Icon ist ungültig.") from error
    if root.tag != f"{{{SVG_NS}}}svg":
        raise ValueError("Icon muss ein SVG-Wurzelelement besitzen.")
    for element in root.iter():
        if element.tag not in {f"{{{SVG_NS}}}{tag}" for tag in SVG_TAGS}:
            raise ValueError("SVG-Icon enthält nicht unterstützte Elemente.")
        if element.tag != f"{{{SVG_NS}}}title" and (element.text or "").strip():
            raise ValueError("SVG-Icon darf keinen eingebetteten Text enthalten.")
        for attribute, value in element.attrib.items():
            if attribute not in SVG_ATTRIBUTES or not SVG_VALUE.fullmatch(value) or "url(" in value.lower():
                raise ValueError("SVG-Icon enthält nicht unterstützte Attribute oder Referenzen.")
    return ElementTree.tostring(root, encoding="utf-8")


def read_package_zip(body):
    if not 0 < len(body) <= MAX_ZIP_BYTES:
        raise ValueError("Widget-Paket ist leer oder größer als 2 MB.")
    try:
        with ZipFile(BytesIO(body)) as archive:
            entries = archive.infolist()
            names = [entry.filename for entry in entries]
            if not entries or names.count("manifest.json") != 1 or any(name != "manifest.json" and not ICON_PATH.fullmatch(name) for name in names) or len(set(names)) != len(names):
                raise ValueError("Paket darf nur manifest.json und referenzierte SVG-Icons enthalten.")
            manifest_info = archive.getinfo("manifest.json")
            if manifest_info.file_size > MAX_MANIFEST_BYTES:
                raise ValueError("Manifest ist größer als 200 KB.")
            with archive.open(manifest_info) as source:
                manifest_bytes = source.read(MAX_MANIFEST_BYTES + 1)
            if len(manifest_bytes) > MAX_MANIFEST_BYTES:
                raise ValueError("Manifest ist größer als 200 KB.")
            manifest = json.loads(manifest_bytes.decode("utf-8"), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
            validate_manifest(manifest)
            icon_names = {widget["icon"] for widget in manifest["widgets"] if "icon" in widget}
            if set(names) != {"manifest.json", *icon_names}:
                raise ValueError("SVG-Icon fehlt oder wird im Manifest nicht verwendet.")
            icons = {}
            for name in icon_names:
                info = archive.getinfo(name)
                if info.file_size > MAX_ICON_BYTES:
                    raise ValueError("SVG-Icon ist größer als 50 KB.")
                with archive.open(info) as source:
                    icons[name] = b64encode(sanitize_svg(source.read(MAX_ICON_BYTES + 1))).decode("ascii")
            for widget in manifest["widgets"]:
                if "icon" in widget:
                    widget["iconData"] = "data:image/svg+xml;base64," + icons[widget["icon"]]
    except (BadZipFile, UnicodeDecodeError, json.JSONDecodeError, RuntimeError) as error:
        raise ValueError("Widget-Paket ist kein gültiges ZIP mit UTF-8-Manifest.") from error
    return manifest


def list_packages(directory):
    result = []
    for path in sorted(Path(directory).glob("*.json")):
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
            validate_manifest({**manifest, "widgets": [{key: value for key, value in widget.items() if key != "iconData"} for widget in manifest["widgets"]]})
            result.append(manifest)
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    return result
