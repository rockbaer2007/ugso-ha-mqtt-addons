"""Generate complete HA form translations and the installable local ZIP."""
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "custom_components" / "weihnachtssteuerung"


def forms(de):
    def text(a, b):
        return a if de else b
    fields = {
        "region": text("Region", "Region"), "country": text("Land", "Country"),
        "tradition": text("Weihnachtstradition", "Christmas tradition"), "name": text("Name", "Name"),
        "start_rule": text("Beginn am", "Start on"), "start_date": text("Eigenes Anfangsdatum (TT.MM.)", "Custom start date (DD.MM.)"),
        "end_rule": text("Ende am (einschließlich)", "End on (inclusive)"), "end_date": text("Eigenes Enddatum (TT.MM.)", "Custom end date (DD.MM.)"),
        "entity_id": text("Gesteuerte Entität", "Controlled entity"), "mode": text("Betriebsart", "Mode"),
        "on_time": text("Einschalten um", "Turn on at"), "off_time": text("Ausschalten um", "Turn off at"),
        "holidays": text("Ausgewählte Festtage (nur im Festtagsmodus)", "Selected observances (observance mode only)"),
        "use_default_period": text("Standardzeitraum der Saison übernehmen", "Use the default season date range"),
    }
    period = ["start_rule", "start_date", "end_rule", "end_date"]
    def step(title, keys, description=""):
        return {"title": title, "description": description, "data": {k: fields[k] for k in keys}}
    countries = step(text("Land und Tradition", "Country and tradition"), ["country", "tradition"],
                     text("Ländervorgaben sind Fest- und Brauchtumstermine, keine vollständige Liste gesetzlicher Feiertage. Danach unter Konfigurieren die Saison und bis zu fünf Steuerungen einrichten.",
                          "Country presets are observances and traditions, not a complete statutory holiday calendar. Next, configure the season and up to five controls in the integration options."))
    errors = {"invalid_date": text("Ungültiges Datum. Bitte TT.MM. verwenden; der 29. Februar wird nicht unterstützt.", "Invalid date. Use DD.MM.; February 29 is not supported."),
              "invalid_channel": text("Bitte gültige, unterschiedliche Uhrzeiten ohne Sekunden und im Festtagsmodus mindestens einen Festtag auswählen.", "Use valid, different times with zero seconds and select at least one observance in observance mode."),
              "duplicate_target": text("Diese Entität wird bereits von einer anderen Steuerung verwendet.", "Another control already uses this entity."),
              "recursive_target": text("Die eigenen Aktiv-/Pause-Schalter dürfen nicht als Ziel verwendet werden.", "This integration's own enable/pause switches cannot be targets.")}
    channels = {}
    for n in range(1, 6):
        channels[f"channel_{n}"] = step(text(f"Steuerung {n}", f"Control {n}"),
            ["entity_id", "name", "mode", "on_time", "off_time", "holidays", "use_default_period", *period],
            text("Entität leer lassen, um diesen Platz nicht zu verwenden. Datumsfelder gelten nur für Täglich im Zeitraum. Bei Standardzeitraum werden die Datumsfelder darunter ignoriert. Ein eigenes Datum gilt nur bei Auswahl 'Eigenes Datum'. Ausschaltzeit vor Einschaltzeit bedeutet die folgende Nacht. Pausieren lässt die Entität unverändert; Aktivieren stellt den Zeitplan wieder her.",
                 "Leave the entity empty to leave this slot unused. Date fields apply only to daily-in-range mode. With default season enabled, the date fields below are ignored. Custom dates apply only when 'Custom date' is selected. An earlier off time means the next night. Pause leaves the target untouched; enabling resumes its schedule."))
    return {"title": "Weihnachtssteuerung",
        "config": {"step": {"user": step(text("Region auswählen", "Select region"), ["region"]),
                             "country": {**countries, "data": {**countries["data"], "name": fields["name"]}}},
                   "abort": {"invalid_country": text("Land passt nicht zur ausgewählten Region.", "Country does not belong to this region.")}},
        "options": {"step": {"init": {"title": text("Weihnachtssteuerung konfigurieren", "Configure Christmas controls"),
            "menu_options": {"location": text("Region / Land / Tradition", "Region / country / tradition"),
                             "season": text("Standardzeitraum der Saison", "Default season date range"),
                             **{f"channel_{n}": text(f"Steuerung {n}", f"Control {n}") for n in range(1, 6)}}},
            "location": step(text("Region auswählen", "Select region"), ["region"]), "country": countries,
            "season": step(text("Standardzeitraum der Saison", "Default season date range"), period,
                text("Beispiel: Beginn 1. Advent, Ende Eigenes Datum 10.01. Termine werden jährlich neu berechnet, auch über den Jahreswechsel.",
                     "Example: first Advent Sunday through custom date 10.01. Dates recur annually, including across New Year.")),
            **channels}, "error": errors, "abort": {"invalid_country": text("Ungültiges Land für diese Region.", "Invalid country for this region.")}}}


def build():
    translations = COMPONENT / "translations"
    translations.mkdir(exist_ok=True)
    for lang in ("en", "de"):
        result = json.dumps(forms(lang == "de"), ensure_ascii=False, indent=2) + "\n"
        (translations / f"{lang}.json").write_text(result, encoding="utf-8")
        if lang == "en":
            (COMPONENT / "strings.json").write_text(result, encoding="utf-8")
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    version = json.loads((COMPONENT / "manifest.json").read_text())["version"]
    target = dist / f"Weihnachtssteuerung-{version}.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for folder in ("custom_components", "www", "docs"):
            for path in (ROOT / folder).rglob("*"):
                if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                    archive.write(path, path.relative_to(ROOT).as_posix())
        for name in ("README.md", "LICENSE"):
            if (ROOT / name).is_file():
                archive.write(ROOT / name, name)
    print(target)
    app_target = dist / f"Festtags-Card-Editor-{version}.zip"
    names = ["config.yaml", "Dockerfile", "requirements.txt", "app_server.py", "installer.py", "README.md", "DOCS.md", "CHANGELOG.md", "LICENSE"]
    with zipfile.ZipFile(app_target, "w", zipfile.ZIP_DEFLATED) as archive:
        for folder in ("custom_components", "www", "app_static", "docs"):
            for path in (ROOT / folder).rglob("*"):
                if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                    archive.write(path, "festtags_card_editor/" + path.relative_to(ROOT).as_posix())
        for name in names:
            if (ROOT / name).is_file():
                archive.write(ROOT / name, "festtags_card_editor/" + name)
    print(app_target)


if __name__ == "__main__":
    build()
