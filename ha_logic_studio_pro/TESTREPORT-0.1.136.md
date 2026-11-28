# Logic Studio Pro 0.1.136 – Prüfbericht vom 28.11.2026

## Sicherung und Erhalt

Vollständiger Quellstand 0.1.135 vor Änderungen als `before-0136.zip` lokal gesichert. Kein HA-System kontaktiert oder aktualisiert. Vorhandene Projekte, Optionen und Freigaben nicht geändert. Freigegebener Release-Prüfstand mit ZIP und SHA-256-Prüfsumme.

## Geprüfter Fehler und Reihenfolge

Der vollständige Nutzerexport `entitäten_fake (3).json` ist als Testfixture erhalten. Er wird mit dem tatsächlich ausgelieferten Blockly-Generator übersetzt und im echten QuickJS-Liverunner ausgeführt. HA-WebSocket und REST sind vollständig lokal nachgebildet; es werden keine Netzwerkverbindungen aufgebaut.

Die simulierte Schreibantwort kommt verzögert. Danach muss die Reihenfolge exakt stimmen:

- `on` → Sensor auf `1.5` bestätigt → Debug `on` → Debug `1.5`.
- `off` → Sensor auf `0` bestätigt → Debug `off` → Debug `0`.
- Nochmals `on` → erneut bestätigter Sensorwert `1.5`.

HTTP-403 wird als Runtime-Fehler gemeldet und die nachfolgenden Debug-Schritte laufen nicht weiter. Normale HA-Ausgaben sind zusätzlich gegen verzögerte WebSocket-Annahme getestet. Eine Geräte-Annahme bestätigt nicht automatisch eine spätere physische Bewegung.

## Editor und Zustandstrigger

- Direkte Dezimalfelder beim Klick auf nächste Aktion und bei Fokuswechsel/Tab ohne Enter: 0.5 → 1.5 → 33.25, gespeicherte Snapshots geprüft. Kein Zugriff auf Eingaben anderer Workspaces; Listener werden beim Schließen entfernt.
- Vorheriger Runtime-Stand wird bei ungespeichertem Entwurf sowie nach Speichern ohne Runtime-Neustart angezeigt.
- Zahnrad-Zweige: on/off, freier Text `halb`, Attribut `current_position`, Zahl 50, optional Sonst, doppelte Werte und ungültige Zahlen. Umordnen erhält verbundene Aktionen; Serialisierung DE/EN/FR erhält alle Werte und Optionen.
- Direkte on/off-Vergleiche ergeben Textwerte; vorhandene wahr/falsch-Werte bleiben echte Booleans.
- Explizit verzögerte Ausgaben behalten ihre eigenen asynchronen Timer-Fortsetzungen.

## Protokoll

Leeren entfernt die gepufferten und gespeicherten Meldungen des aktuellen Projekts ohne Prozess-/Statusänderung. Nach Neustart des Servers erscheinen alte Zeilen nicht wieder. Neu eintreffende Meldungen werden weiterhin gespeichert. Bereits laufende alte Browser-Polls dürfen das geleerte Protokoll nicht überschreiben.

## Abschluss der lokalen Prüfung

85 Node-Tests und 14 Python-Server-Tests erfolgreich (99 insgesamt). JavaScript-Syntax, Python-Kompilierung und git diff --check erfolgreich. Mit dem neuen Trigger wurden 289 registrierte aktuelle Bausteine und 52 direkte Entitätsfelder geprüft. Neuer-/Alter-Wert-Blöcke sind in Zustands- und Attributzweigen geprüft. ZIP enthält diesen Bericht und die Testfälle.

## Grenzen

Dies sind lokale Unit-, DOM- und Offline-Integrationstests, kein HA-Livetest. Blocks-A-YAML behält die native Ereignisbrücke; die neue automatische Await-Reihenfolge betrifft Blocks JS und ausdrückliche `await`-Aufrufe in JS/TS. Startauslöser, Timer und Callback-Blöcke bleiben eigenständige Fortsetzungen.
