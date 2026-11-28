# Logic Studio Pro 0.1.133 – Prüfstand 28.11.2026

## Sicherungen

- PC: `M:\backups\logic-studio-sensor-20261128-091901` – vorherige veröffentlichte App, interne Frontendquellen und bisher installierte Quelldateien von .193 gesichert.
- HA .193: Backup `b54011cd`, „Vor Logic Studio Pro 0.1.133 – Sensor und Funktionsplan“, 302,96 MB, 28.11.2026 09:23. Enthält Einstellungen/Verlauf, lokalen App-Ordner und Apps einschließlich Logic Studio Pro 0.1.130.
- Vorhandene Projekte, Optionen und andere Apps werden nicht durch Paketdateien ersetzt.

## Lokale Tests

- 50 Node-Tests und 12 Python-Server-Tests erfolgreich.
- Vorhandene Tests für Entitätenauswahl, Runtime-Freigaben, Wiederverbindung, Quelltextfehler, Rules/YAML, gemeinsame Skripte und FBD-Speicher erfolgreich.
- Sensor: WRITE-Prüfung, ungültige Ziele/Werte, fehlender Sensor, HTTP-Fehler, gleichzeitige Anfragen, Attributerhaltung und simulierte Berechnung geprüft.
- Tatsächlich ausgeliefertes Blockly-Bundle: JS-Generierung und native HA-Ereignisausgabe für Blocks A geprüft. Bisherige Import-Erweiterungen bleiben erhalten.
- Neue Funktionspläne: zwei unabhängige leere Pläne, Name/Ordner/ID und Abbrechen geprüft.
- Bridge-Lebenszyklus bei Freigabeänderung und ungültiger Konfiguration geprüft.
- ZIP enthält keine Benutzerkonfiguration, Zugangsdaten oder node_modules; CRC und Versionskonsistenz werden bei Erstellung geprüft.

## Test auf HA .193

HTTP-Port 80 bestätigt und als lokales Testziel festgehalten. Teststand 0.1.133 ist installiert und läuft.

- Blocks JS: importiertes Beispiel mit dem neuen Baustein berechnet `40 + 2`; Play schreibt `42` in `sensor.ugso_sensor_state_133`.
- Blocks A: importiertes Beispiel enthält denselben Sensor-Baustein mit Wert `43`. „Als HA-YAML öffnen“ erzeugt `event: logic_studio_set_sensor_state` mit `entity_id` und `state: 43`.
- Die exakt erzeugten Ereignisdaten wurden in den HA-Ereigniswerkzeugen ausgelöst; die laufende Brücke schrieb `43`. Es wurde keine Start-Automation aktiviert und kein HA-Neustart ausgelöst.
- `unit_of_measurement: W`, `device_class: power` und Anzeigename blieben bei beiden Schreibwegen erhalten.
- Die HA-typische Sensorauswahl zeigt den Testsensor mit `43 W` und beschränkt Treffer auf Sensoren. Englische und französische Blockbeschriftung im Browser geprüft, anschließend Deutsch wiederhergestellt.
- Zwei neue Funktionspläne mit eigenen Namen angelegt (Plan A im Ordner „test“, Plan B im Hauptordner), gespeichert und nach Neuladen unabhängig vorhanden. Beide starten mit null Bausteinen. Der bestehende „FBD Persistenztest 0.1.66“ hat weiterhin vier Bausteine und zwei Verbindungen.
- Temporäre WRITE-Freigabe für den Testsensor anschließend entfernt und App neu gestartet. Wiederholter Ereignis-Schreibversuch mit Wert `99` wurde abgewiesen; Sensor blieb `43`, App-Protokoll meldete die fehlende Schreibfreigabe.
- Ursprüngliche READ/WRITE/EVENT/TOPICS-Listen erhalten. Alle vier allgemeinen Freigabeschalter bleiben aus. Die neue Konfiguration ergänzt lediglich ihre ausgeschalteten Standardwerte.
- Auf ausdrücklichen Nutzerwunsch bleiben die sieben eigenen Beispielprojekte und der Template-Testhelfer erhalten. Alle Beispielprojekte gespeichert, Runtime gestoppt und Autostart aus. Test-Sensor ist nicht mehr zum Schreiben freigegeben.

Beispiele: `UGSO 133 Plan A`, `UGSO 133 Plan B`, `UGSO 133 Blocks A`, `UGSO 133 Blocks JS`, `UGSO-133-Sensor-A`, `UGSO-133-Sensor-JS` und `UGSO-133-Sensor-A · YAML`.

## Verhalten

Blocks A benötigt die aktive Studio-App und passende WRITE-Freigaben. Brückenfehler erscheinen im App-Protokoll. Sensorwerte sind Zustandsänderungen wie in den HA-Entwicklerwerkzeugen und können von der zuständigen Integration ersetzt werden. Attribute bleiben erhalten; keine permanenten Sensoren und keine Gerätebefehle.

Nicht veröffentlicht.
