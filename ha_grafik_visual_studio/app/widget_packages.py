"""Version 0.1 declarative widget-package contract.

Packages contain only manifest.json. No package-supplied code or assets execute.
"""

import json
import re
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

API_VERSION = "0.1"
MAX_ZIP_BYTES = 2_000_000
MAX_MANIFEST_BYTES = 200_000
PACKAGE_ID = re.compile(r"^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$")
SLUG = re.compile(r"^[a-z][a-z0-9-]*$")
VERSION = re.compile(r"^\d+\.\d+\.\d+$")
KEY = re.compile(r"^[a-z][a-zA-Z0-9]*$")
FIELD_TYPES = {"text", "number", "checkbox", "color", "range", "select"}


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
        if not isinstance(widget, dict) or set(widget) != {"type", "label", "defaults", "propertyGroups", "render"}:
            raise ValueError("Ungültige Widget-Definition.")
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


def read_package_zip(body):
    if not 0 < len(body) <= MAX_ZIP_BYTES:
        raise ValueError("Widget-Paket ist leer oder größer als 2 MB.")
    try:
        with ZipFile(BytesIO(body)) as archive:
            entries = archive.infolist()
            if len(entries) != 1 or entries[0].filename != "manifest.json" or entries[0].file_size > MAX_MANIFEST_BYTES:
                raise ValueError("Version 0.1 erlaubt nur manifest.json (maximal 200 KB).")
            with archive.open(entries[0]) as source:
                manifest_bytes = source.read(MAX_MANIFEST_BYTES + 1)
            if len(manifest_bytes) > MAX_MANIFEST_BYTES:
                raise ValueError("Manifest ist größer als 200 KB.")
            manifest = json.loads(manifest_bytes.decode("utf-8"), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    except (BadZipFile, UnicodeDecodeError, json.JSONDecodeError, RuntimeError) as error:
        raise ValueError("Widget-Paket ist kein gültiges ZIP mit UTF-8-Manifest.") from error
    return validate_manifest(manifest)


def list_packages(directory):
    result = []
    for path in sorted(Path(directory).glob("*.json")):
        try:
            result.append(validate_manifest(json.loads(path.read_text(encoding="utf-8"))))
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    return result
