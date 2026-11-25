# Prüfung auf HA .193 – 25. November 2026

## Sicherung und Datenerhalt

- Vollsicherung **Vor Weihnachtssteuerung 0.1.0 – 2026-11-25**, erfolgreich in
  HA sichtbar, 278,75 MB, alle Apps und Ordner eingeschlossen.
- Vorhandene `configuration.yaml`, `automations.yaml`, `scripts.yaml` und
  `scenes.yaml` anhand ihrer SHA256-Werte vor/nach Erstinstallation unverändert.
- Vorhandene Integrationsordner erhalten. Andere Apps nicht angehalten oder geändert.
- Eigenes Dashboard **Weihnachtssteuerung**, in der Seitenleiste sichtbar,
  ohne Administratorbeschränkung. Eigener Demo-Helfer
  `input_boolean.weihnachtssteuerung_demo`; keine realen Geräte geschaltet.

## Bereits live geprüft: Integration und Card

- HA Core 2026.11.2, Zeitzone Europe/Berlin.
- Integration 0.1.0 angelegt: Region zuerst, danach nur Länder dieser Region.
  Mitteleuropa zeigt DE/AT/CH/LI/PL/CZ/SK/HU.
- Zehn Entitäten vorhanden: vier Sensoren, Saison-Binärsensor, fünf Steuerschalter.
- Aktueller Festtag: Kein Festtag; nächster Festtag: 1. Advent, 29.11.2026.
- Eigene Card-Ressource hinzugefügt und Card im separaten Dashboard gespeichert.
- Eigener Zeittest am 25.11.: Einschalten 15:25, Ausschalten 15:27 nach HA-Zeit.
  Beide Zustandswechsel auf der Card bestätigt; nächste Schaltung wechselte jeweils.
- Pausieren während eingeschaltetem Demo-Ziel ließ das Ziel eingeschaltet.
  Fortsetzen stellte den laufenden Zeitplan wieder her.
- Nach dem Test Standardzeitraum **1. Advent bis 10.01.** wiederhergestellt,
  16:00–23:00. Card bestätigt **29.11.2026, 16:00** als nächste Schaltung.
- Vorübergehend benutztes Diagnose-Template im HA-Templateeditor anschließend
  exakt auf den vorgefundenen Inhalt zurückgesetzt.

Die HA-Uhr lag während der Prüfung einige Minuten hinter der PC-Uhr. Maßgeblich
für den Test war die in HA gerenderte Systemzeit; keine Uhr wurde verändert.

## Lokale App-Prüfung

- 37 Python-Tests erfolgreich: Kalender, Laufzeit, Pause/Wiederanlauf,
  Nichtverfügbarkeit und Fehlerwiederholung, fünf getrennte Ziele,
  Ablehnung eigener Steuerschalter, Konfigurations-/Pfadvalidierung,
  Bildinhaltsprüfung, GIF-Erhalt, Überschreibschutz, Installer-Datenerhalt,
  Ingress-Administratorprüfung, CSRF und Einrichtung eines frischen Systems
  über den nativen Konfigurationsablauf (isolierter Protokolltest).
- Sechs JavaScript-Tests erfolgreich: Bildoption, länderspezifische Metadaten,
  Festtagsüberschneidungen, Adventswochen, lokale Pfade und unveränderte Bildknoten
  bei fremden HA-Änderungen.
- Python-Kompilierung, JavaScript-Syntaxprüfung und ZIP-Integrität erfolgreich.
- Keine Bilddateien in den Frontend-Quellen oder Distributionspaketen.

## Live-Prüfung der App 0.1.2

- Lokale App im HA-App-Store erkannt, Docker-Abbild erfolgreich gebaut,
  installiert und gestartet. Seitenleisteneintrag sichtbar.
- Editor über Ingress geöffnet; vorhandene Saison und Demo-Steuerung übernommen.
- Speichern und erneutes Laden erfolgreich. Card-Ressource über die App eingerichtet.
- Eigenes kleines PNG hochgeladen und für Deutschland/1. Advent sowie
  Frankreich/Weihnachten zugeordnet. Beide Zuordnungen nach erneutem Laden erhalten.
  Die Bild-Länderauswahl änderte das aktive Steuerungsland Deutschland nicht.
- Beide Testzuordnungen wieder gelöst und gespeichert. Ausschließlich die eigene
  Testdatei nach SHA256-Abgleich entfernt; keine Nutzerbilder gelöscht.
- App anschließend mit dem finalen Quellstand neu aufgebaut und gestartet.
  Aktualisierte eigene Dateien im HA-Ordner stimmen mit den Quellen überein.
- Das bloße Durchsehen anderer Bildländer lässt den Status auf Gespeichert.
- Abschließender HA-Neustart erfolgreich. Editor erneut erreichbar, Einstellungen
  gespeichert; Card zeigt weiterhin 29.11.2026, 16:00 als nächste Schaltung.
  Die vier vorhandenen YAML-Dateien auch abschließend SHA256-identisch.
- Die Einrichtung auf einem vollständig leeren zweiten HA-System wurde nicht
  live durchgeführt; dafür ist der isolierte Protokolltest vorhanden.
- Lokal war kein Docker-Daemon verfügbar. Der reale Docker-Build auf HA .193
  funktionierte; der Repository-Workflow prüft zusätzlich den Docker-Build.

## Lokales Folgeupdate 0.1.4

- Quellstand 0.1.3 vor Änderung separat als ZIP gesichert.
- 38 Python- und 8 JavaScript-Tests erfolgreich, einschließlich Bereich-/Geräte-
  Metadaten sowie Öffnen, Filtern, Auswählen, Entfernen und Tastaturbedienung
  des neuen Dropdowns in einer isolierten DOM-Testumgebung.
- Keine HA-Installation oder Änderung an vorhandenen Einstellungen für dieses Update.
- Eine visuelle Prüfung der lokalen HTML-Vorschau war nicht möglich, weil die
  Browsersteuerung Datei-URLs blockierte. Die DOM-Tests ersetzen keinen echten
  Browser-/Tablet-Test; die Darstellung auf dem Zielsystem ist noch zu prüfen.
