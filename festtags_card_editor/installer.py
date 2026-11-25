"""Install only our payload; keep user pictures, HA files and backups intact."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import zipfile


def install_payload(source, config_root, data_root):
    source, root, data = Path(source), Path(config_root), Path(data_root)
    if not root.is_dir():
        raise RuntimeError("Home-Assistant-Konfigurationsordner fehlt.")
    component = root / "custom_components" / "weihnachtssteuerung"
    frontend = root / "www" / "weihnachtssteuerung"
    for path in (component, frontend):
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
            raise RuntimeError("Zielpfad muss innerhalb der HA-Konfiguration liegen.")
    pairs = []
    for start, dest in ((source / "custom_components" / "weihnachtssteuerung", component), (source / "www", frontend)):
        for path in start.rglob("*"):
            if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                target = dest / path.relative_to(start)
                if target.is_symlink() or not target.resolve().is_relative_to(root.resolve()):
                    raise RuntimeError("Unsicherer Zieldateipfad.")
                pairs.append((path, target))
    changed = [(src, dest) for src, dest in pairs if not dest.is_file() or hashlib.sha256(src.read_bytes()).digest() != hashlib.sha256(dest.read_bytes()).digest()]
    backup_path = None
    if changed and any(dest.exists() for _, dest in changed):
        backup_dir = data / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"festtags-before-update-{datetime.now(timezone.utc):%Y%m%d-%H%M%S-%f}.zip"
        with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for _, path in pairs:
                if path.is_file():
                    archive.write(path, path.relative_to(root).as_posix())
        with zipfile.ZipFile(backup_path) as archive:
            if archive.testzip() is not None:
                raise RuntimeError("Sicherungsprüfung fehlgeschlagen.")
    for src, dest in changed:
        dest.parent.mkdir(parents=True, exist_ok=True)
        temporary = dest.with_name(dest.name + ".festtags-tmp")
        with temporary.open("wb") as output:
            output.write(src.read_bytes())
        temporary.replace(dest)
    version = json.loads((component / "manifest.json").read_text(encoding="utf-8"))["version"]
    return {"version": version, "changed_files": len(changed), "restart_required": bool(changed),
            "backup_created": backup_path is not None}
