"""Validate editor input and local image paths without trusting the browser."""
from copy import deepcopy
from pathlib import Path
from urllib.parse import unquote

from .catalog import COUNTRIES, EVENTS, REGIONS, country_events
from .engine import DEFAULTS, bounds, custom_date, validate_channel

DEFAULT_IMAGE_FOLDER = "/local/weihnachtssteuerung/bilder"


def card_effects(value, image_folder=DEFAULT_IMAGE_FOLDER):
    if not isinstance(value, dict):
        raise ValueError("Ungültige Hintergrundeinstellungen / invalid background settings")
    result = {"mode": value.get("mode", "off"),
              "folder": value.get("folder", image_folder.rsplit("/", 1)[0] + "/background")}
    if result["mode"] not in {"off", "image", "snow", "image_snow"}:
        raise ValueError("Ungültiger Hintergrundmodus / invalid background mode")
    result["folder"] = "/local/" + "/".join(folder_parts(result["folder"]))
    for key in ("background_file", "decoration_file"):
        result[key] = image_filename(value[key]) if value.get(key) else ""
    enabled = value.get("decoration_enabled", False)
    if not isinstance(enabled, bool):
        raise ValueError("Ungültige Dekorationsoption / invalid decoration option")
    result["decoration_enabled"] = enabled
    for key, default, low, high in (("background_transparency",40,0,100),("background_size",100,50,200),
                                   ("background_x",50,0,100),("background_y",50,0,100),
                                   ("decoration_transparency",30,0,100),("decoration_size",30,5,100),
                                   ("decoration_x",80,0,100),("decoration_y",100,0,100),
                                   ("darkness",25,0,90),("snow_count",12,6,40)):
        number = value.get(key, default)
        if isinstance(number, bool) or not isinstance(number, (int, float)) or not low <= number <= high:
            raise ValueError(f"Ungültiger Wert für {key} / invalid effect value")
        result[key] = round(number)
    return result


def folder_parts(folder):
    if not isinstance(folder, str) or len(folder) > 240:
        raise ValueError("Ungültiger Bilderordner / invalid image folder")
    decoded = unquote(folder).rstrip("/")
    if not decoded.startswith("/local/") or any(c in decoded for c in ("\\", "\x00", "?", "#", ":")):
        raise ValueError("Bilderordner muss unter /local/ liegen / use /local/")
    parts = decoded[len("/local/"):].split("/")
    if not all(p and p not in (".", "..") for p in parts):
        raise ValueError("Ungültiger Bilderpfad / invalid image path")
    return parts


def image_filename(value):
    if not isinstance(value, str) or not value or len(value) > 160 or any(c in value for c in ("/", "\\", "\x00", "?", "#", ":")):
        raise ValueError("Nur ein Dateiname ohne Pfad / filename only")
    if value in (".", "..") or Path(value).suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}:
        raise ValueError("Ungültige Bilddatei / invalid image file")
    return value


def period(config):
    for prefix in ("start", "end"):
        rule = config[f"{prefix}_rule"]
        if rule == "custom":
            custom_date(config[f"{prefix}_date"], 2001)
        elif rule not in EVENTS:
            raise ValueError("Ungültige Datumsregel / invalid date rule")
    bounds(config, 2026)


def editor_config(payload):
    """Keep only recognized settings; reject malformed targets, rules and paths."""
    if not isinstance(payload, dict):
        raise ValueError("Ungültige Einstellungen / invalid settings")
    result = deepcopy(DEFAULTS)
    for key in ("region", "country", "tradition", "start_rule", "start_date", "end_rule", "end_date"):
        if key in payload:
            if not isinstance(payload[key], str):
                raise ValueError("Ungültiges Feld / invalid field")
            result[key] = payload[key]
    if result["region"] not in REGIONS or result["country"] not in COUNTRIES or COUNTRIES[result["country"]][0] != result["region"]:
        raise ValueError("Land passt nicht zur Region / country and region mismatch")
    if result["tradition"] not in {"western", "julian", "both"}:
        raise ValueError("Ungültige Tradition / invalid tradition")
    period(result)
    raw = payload.get("channels", [])
    if not isinstance(raw, list) or len(raw) > 5:
        raise ValueError("Maximal fünf Steuerungen / maximum five controls")
    targets = set()
    for channel in raw:
        if not isinstance(channel, dict):
            raise ValueError("Ungültige Steuerung / invalid control")
        if not channel.get("entity_id"):
            result["channels"].append({})
            continue
        allowed = {"entity_id", "name", "mode", "on_time", "off_time", "holidays", "start_rule", "start_date", "end_rule", "end_date", "show_status_icon"}
        clean = {k: v for k, v in channel.items() if k in allowed}
        if not all(isinstance(clean.get(k, ""), str) for k in allowed - {"holidays", "show_status_icon"}):
            raise ValueError("Ungültiges Feld / invalid field")
        if not isinstance(clean.get("show_status_icon", False), bool):
            raise ValueError("Ungültige Statussymbol-Option / invalid status icon option")
        if not isinstance(clean.get("holidays", []), list) or not all(isinstance(k, str) for k in clean.get("holidays", [])):
            raise ValueError("Ungültige Festtage / invalid observances")
        if len(clean.get("name", "")) > 100 or len(clean["entity_id"]) > 255:
            raise ValueError("Feld zu lang / field too long")
        validate_channel(clean)
        if clean["mode"] == "holidays" and not set(clean.get("holidays", [])).issubset(country_events(result["country"], result["tradition"])):
            raise ValueError("Festtagsauswahl passt nicht zu Land/Tradition; Auswahl prüfen / review observances for this country/tradition")
        period(result | clean)
        if clean["entity_id"] in targets:
            raise ValueError("Entität mehrfach verwendet / duplicate target")
        targets.add(clean["entity_id"])
        result["channels"].append(clean)
    folder = payload.get("image_folder", DEFAULT_IMAGE_FOLDER)
    result["image_folder"] = "/local/" + "/".join(folder_parts(folder))
    result["effects"] = card_effects(payload.get("effects", {}), result["image_folder"])
    images = payload.get("country_images", {})
    if not isinstance(images, dict) or len(images) > len(COUNTRIES):
        raise ValueError("Ungültige Bildzuordnungen / invalid image mappings")
    result["country_images"] = {}
    if not isinstance(payload.get("show_images", False), bool):
        raise ValueError("Ungültige Bildoption / invalid image option")
    result["show_images"] = payload.get("show_images", False)
    for country, mapping in images.items():
        if country not in COUNTRIES or not isinstance(mapping, dict) or len(mapping) > len(EVENTS):
            raise ValueError("Ungültige Bildzuordnung / invalid image mapping")
        result["country_images"][country] = {}
        for event, filename in mapping.items():
            if event not in EVENTS:
                raise ValueError("Unbekannter Festtag / unknown observance")
            result["country_images"][country][event] = image_filename(filename)
    return result
