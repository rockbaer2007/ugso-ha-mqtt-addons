# Studio 0.1.299: Zuletzt benutzt

Prüfung am 8. November 2026. Enthält außerdem die bisher lokal vorbereitete Palette und Inline-Runtime aus 0.1.298.

## Sicherung und Erhalt

- Vollständiger PC-Arbeitsstand vor der Änderung: `Studio-Arbeitsstand-0.1.298-vor-Zuletzt-benutzt-20261108.zip` im Downloadordner.
- Frische abgeschlossene HA-Vollsicherungen vor Deployment: .177 `32b2aedd`, .193 `bb0cfd18`.
- Nur App-Code aktualisiert; vorhandene Projekte und Einstellungen erhalten. Studio bleibt auf beiden Hosts installiert.
- Browserpräferenzen liegen separat unter `gvs-recent-widgets-v1`: maximal zwölf eindeutige Widgettypen, zuletzt eingefügter zuerst, eigener Einklappzustand. Keine Synchronisierung oder Änderung an Projektdateien. Ohne verfügbaren Browserspeicher funktioniert die Liste für die Sitzung.

## Reale Tests

Auf .177 (HA 2026.11.0, ARM64) und .193 (HA 2026.10.4, amd64), jeweils Port 80:

- App auf 0.1.299 aktualisiert und gestartet.
- Gauge und Note über die Palette eingefügt, sofort mit Undo entfernt. Bestehende Widgetzahlen danach 13 auf .177 und 11 auf .193; Projekte gespeichert.
- Miniaturen erscheinen unter der Suche in der Reihenfolge Note, Gauge. Wiederholte Gauge-Nutzung auf .177 erzeugt keinen doppelten Eintrag; Einfügen aus Zuletzt benutzt funktioniert.
- Bereich eingeklappt, Seite neu geladen: Einklappzustand und Reihenfolge auf beiden Hosts erhalten. Wieder aufgeklappt.
- Auf .177 normale Geräte-Gruppe geöffnet: Zuletzt benutzt bleibt unabhängig offen. Suche nach Gauge filtert auch den Bereich; Suche anschließend geleert.
- Inline-Runtime auf beiden Hosts gestartet: Palette einschließlich Zuletzt benutzt gesperrt. Gestoppt und zum Editor zurückgekehrt.
- Eigene Testeinfügungen bereinigt; keine Geräte geschaltet.

Screenshots: `images/0.1.299/recent-177.jpg`, `recent-193.jpg`, `recent-local.jpg`.

## Automatische Prüfungen

- 23 JavaScript-Tests für Recent Widgets, Inline-Runtime, Geräte-Lifecycle, Paketaktualisierung und Messanzeigen bestanden.
- 17 Python-Tests zur Widget-Paketverwaltung bestanden.
- JavaScript-Syntaxprüfung bestanden.
- Fehlende Pakettypen werden ausgeblendet und nach erneuter Installation wieder angeboten. Beschädigter oder gesperrter Browserspeicher wird abgefangen.

## EN / FR

Verified on both hosts: thumbnails, unique recent ordering, insertion, independent collapse and persistence after reload, and runtime locking. Existing projects and settings preserved; test insertions undone. 23 JavaScript and 17 Python tests passed.

Vérifié sur les deux hôtes : miniatures, ordre récent sans doublons, insertion, repli indépendant conservé après rechargement et verrouillage pendant la runtime. Projets et réglages conservés ; insertions de test annulées. 23 tests JavaScript et 17 tests Python réussis.
