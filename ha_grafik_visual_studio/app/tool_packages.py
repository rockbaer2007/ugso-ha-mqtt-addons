"""Data-only tool package contract 0.1 for controlled editor actions."""

import json
import re
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from widget_packages import MAX_MANIFEST_BYTES, MAX_ZIP_BYTES, PACKAGE_ID, SLUG, VERSION

COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
CAPABILITIES = ["project.read", "project.write"]


def validate_tool_manifest(manifest):
    if not isinstance(manifest, dict) or set(manifest) != {"format", "apiVersion", "id", "name", "version", "license", "tools"}:
        raise ValueError("Tool-Paketmanifest hat ungültige oder fehlende Felder.")
    if manifest["format"] != "ha-grafik-tool-package" or manifest["apiVersion"] != "0.1":
        raise ValueError("Tool-Paketformat oder Schnittstellenversion wird nicht unterstützt.")
    package_id = manifest["id"]
    if not isinstance(package_id, str) or len(package_id) > 80 or not PACKAGE_ID.fullmatch(package_id):
        raise ValueError("Ungültige Tool-Paket-ID.")
    if not isinstance(manifest["name"], str) or not 0 < len(manifest["name"].strip()) <= 120:
        raise ValueError("Tool-Paketname fehlt.")
    if not isinstance(manifest["license"], str) or not 0 < len(manifest["license"].strip()) <= 120:
        raise ValueError("Tool-Paketlizenz fehlt.")
    if not isinstance(manifest["version"], str) or not VERSION.fullmatch(manifest["version"]):
        raise ValueError("Ungültige Tool-Paketversion.")
    tools = manifest["tools"]
    if not isinstance(tools, list) or not 1 <= len(tools) <= 20:
        raise ValueError("Ein Tool-Paket benötigt 1 bis 20 Tools.")
    seen = set()
    for tool in tools:
        if not isinstance(tool, dict) or set(tool) != {"id", "definitionVersion", "label", "description", "context", "capabilities", "action"}:
            raise ValueError("Ungültige Tool-Definition.")
        tool_id = tool["id"]
        prefix, _, slug = tool_id.partition("/") if isinstance(tool_id, str) else ("", "", "")
        if prefix != package_id or not SLUG.fullmatch(slug) or tool_id in seen:
            raise ValueError("Tool-ID muss eindeutig und im Paket-Namensraum liegen.")
        seen.add(tool_id)
        if tool["definitionVersion"] != "0.1" or tool["context"] != "page" or tool["capabilities"] != CAPABILITIES:
            raise ValueError("Tool-Vertragsversion, Kontext oder Fähigkeiten werden nicht unterstützt.")
        if any(not isinstance(tool[key], str) or not 0 < len(tool[key].strip()) <= 240 for key in ("label", "description")):
            raise ValueError("Tool-Name oder Beschreibung fehlt.")
        action = tool["action"]
        if not isinstance(action, dict) or set(action) != {"kind", "defaultColor"} or action["kind"] != "set-page-background":
            raise ValueError("Nur die deklarative Aktion set-page-background ist unterstützt.")
        if not isinstance(action["defaultColor"], str) or not COLOR.fullmatch(action["defaultColor"]):
            raise ValueError("Ungültige Standard-Hintergrundfarbe.")
    return manifest


def read_tool_package_zip(body):
    if not 0 < len(body) <= MAX_ZIP_BYTES:
        raise ValueError("Tool-Paket ist leer oder größer als 2 MB.")
    try:
        with ZipFile(BytesIO(body)) as archive:
            entries = archive.infolist()
            if len(entries) != 1 or entries[0].filename != "manifest.json" or entries[0].file_size > MAX_MANIFEST_BYTES:
                raise ValueError("Tool-Paket darf nur manifest.json (maximal 200 KB) enthalten.")
            with archive.open(entries[0]) as source:
                data = source.read(MAX_MANIFEST_BYTES + 1)
            if len(data) > MAX_MANIFEST_BYTES:
                raise ValueError("Tool-Paketmanifest ist größer als 200 KB.")
            manifest = json.loads(data.decode("utf-8"), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    except (BadZipFile, UnicodeDecodeError, json.JSONDecodeError, RuntimeError) as error:
        raise ValueError("Tool-Paket ist kein gültiges ZIP mit UTF-8-Manifest.") from error
    return validate_tool_manifest(manifest)


def list_tool_packages(directory):
    result = []
    for path in sorted(Path(directory).glob("*.json")):
        try:
            result.append(validate_tool_manifest(json.loads(path.read_text(encoding="utf-8"))))
        except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
            continue
    return result
