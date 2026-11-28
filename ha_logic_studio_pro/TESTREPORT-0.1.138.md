# Logic Studio Pro 0.1.138 – Autostart-Prüfung vom 28.11.2026

Vor Änderung: vollständiges Paket 0.1.137 als `logic-studio-before-autostart-0138.zip` lokal gesichert, 185 Dateien, CRC geprüft. Keine HA-Einstellungen oder Projekte verändert.

## Ursache und Korrektur

Blocks JS fehlte in der UI-Freigabe sowie in der serverseitigen Validierung der Autostart-Option. Zusätzlich erhielt die Runtime den generierten JavaScript-Code bislang nur vom offenen Browser. Beim App-Start konnte sie deshalb keinen gespeicherten Blocks-JS-Arbeitsbereich übersetzen.

Die bestehende Checkbox „Beim Start der App ausführen“ gilt nun auch für Blocks JS. Die gespeicherte Option wird beim App-Start ausgewertet. Der serverseitige Generator verwendet dasselbe ausgelieferte Blockly-Modul, erzeugt nur Quelltext und führt keine Aktionen aus. Erst die bisherige Runtime führt ihn mit bestehenden HA-Freigaben aus. Größen-/Zeitgrenzen bleiben geprüft; ungültige Blöcke werden als Startfehler protokolliert.

## Lokale Verifikation

- 88 Node-Tests und 17 Python-Server-Tests erfolgreich (105 insgesamt).
- Echte UI-Toolbar im DOM: Checkbox bei Blocks JS vorhanden, gespeichertes true/false angezeigt, Änderung im Projekt übernommen. Native Blocks-A-YAML erhält keinen Runtime-Autostart.
- Projektdatei gespeichert und über neue ProjectStore-Instanz geladen: genau das aktivierte Blocks-JS-Projekt bleibt für Autostart vorgesehen, ausgeschaltetes Beispiel bleibt aus, übriger Projektbaum unverändert.
- Neue Serverinstanz liest die Projektdatei; der echte Node-Generator übersetzt die gespeicherten Blöcke. Die abgefangene Runtime-Ausführung erhält den erwarteten Code, ursprüngliche Berechtigungen, Benutzer/Projekt-ID, startupRetry und Projektsnapshot. Keine HA-Verbindung oder reale Ausgabe.
- Ungültiger Blockly-Typ erzeugt einen Startfehler und keinen Runtime-Start.
- Bestehende 289 Bausteine, 52 direkte Entitätsfelder sowie bisherige Sensor-, Trigger-, Protokoll- und Rasterprüfungen weiterhin erfolgreich.

## Nutzung und Grenzen

Pro gewünschtem Blocks-JS-Projekt einmal die Checkbox aktivieren und speichern. Ein manuell gestartetes Projekt ohne gespeicherte Autostart-Option bleibt nach einem App-Neustart gestoppt. Bestehende Projekte werden nicht automatisch aktiviert. Funktionsplan-/JS-/TS-Autostart bleibt erhalten.

Kein HA-Update und kein HA-Livetest für 0.1.138. Die Neustartprüfung ist ein lokaler Server-/Speichertest mit echter Blockly-Codeerzeugung und abgefangenem Runtime-Start.
