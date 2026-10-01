"""Validate a source folder and export inert Studio package archives."""

import argparse
import os
import sys
import tempfile
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

from widget_packages import ICON_PATH, MAX_ICON_BYTES, MAX_MANIFEST_BYTES, MAX_ZIP_BYTES, read_package_zip  # noqa: E402
from tool_packages import read_tool_package_zip  # noqa: E402

KINDS = {
    "widget": (".wg", read_package_zip),
    "tool": (".tp", read_tool_package_zip),
}


def build_package(source, kind):
    """Return the validated manifest and ZIP bytes for one source folder."""
    if kind not in KINDS:
        raise ValueError("Paketart muss widget oder tool sein.")
    source = Path(source)
    if not source.is_dir() or source.is_symlink():
        raise ValueError("Quellordner ist nicht lesbar oder ist ein symbolischer Link.")
    files = {}
    for entry in source.iterdir():
        if entry.is_symlink():
            raise ValueError(f"Symbolische Links sind nicht erlaubt: {entry.name}")
        if entry.name == "manifest.json" and entry.is_file():
            if entry.stat().st_size > MAX_MANIFEST_BYTES:
                raise ValueError("Manifest ist größer als 200 KB.")
            files[entry.name] = entry.read_bytes()
        elif entry.name == "icons" and entry.is_dir():
            for icon in entry.iterdir():
                name = f"icons/{icon.name}"
                if icon.is_symlink() or not icon.is_file() or not ICON_PATH.fullmatch(name):
                    raise ValueError(f"Unzulässige Bilddatei: {name}")
                if icon.stat().st_size > MAX_ICON_BYTES:
                    raise ValueError(f"Bild ist größer als 50 KB: {name}")
                files[name] = icon.read_bytes()
        else:
            raise ValueError(f"Unzulässige Paketdatei: {entry.name}")
    if "manifest.json" not in files:
        raise ValueError("manifest.json fehlt im Quellordner.")
    stream = BytesIO()
    with ZipFile(stream, "w", compression=ZIP_STORED) as archive:
        for name, body in sorted(files.items()):
            archive.writestr(name, body)
    body = stream.getvalue()
    if len(body) > MAX_ZIP_BYTES:
        raise ValueError("Paket ist größer als 2 MB.")
    manifest = KINDS[kind][1](body)
    return manifest, body


def export_package(source, destination, kind):
    """Create a validated package without replacing an existing file."""
    manifest, body = build_package(source, kind)
    destination = Path(destination)
    if not destination.is_dir():
        raise ValueError("Exportordner ist nicht vorhanden oder nicht lesbar.")
    target = destination / f"{manifest['id']}{KINDS[kind][0]}"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination, prefix=".studio-packer-", delete=False) as temp:
            temp_path = Path(temp.name)
            temp.write(body)
            temp.flush()
            os.fsync(temp.fileno())
        os.link(temp_path, target)
    except FileExistsError as error:
        raise ValueError(f"Zieldatei existiert bereits: {target.name}") from error
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
    return target


def main():
    parser = argparse.ArgumentParser(description="HA Grafik Visual Studio Paketprüfung und Export")
    parser.add_argument("kind", choices=KINDS)
    parser.add_argument("source", type=Path, help="Quellordner mit manifest.json")
    parser.add_argument("destination", type=Path, help="Vorhandener Exportordner")
    parser.add_argument("--check", action="store_true", help="Nur prüfen, nicht exportieren")
    args = parser.parse_args()
    try:
        if args.check:
            manifest, body = build_package(args.source, args.kind)
            print(f"OK: {manifest['id']} ({len(body)} Bytes)")
        else:
            print(export_package(args.source, args.destination, args.kind))
    except (OSError, ValueError) as error:
        parser.exit(1, f"Fehler: {error}\n")


if __name__ == "__main__":
    main()
