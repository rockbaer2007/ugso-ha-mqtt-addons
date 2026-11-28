# Logic Studio Pro 0.1.136 – Prüfbericht vom 28.11.2026

## Sicherung und Erhalt

Vollständiger Quellstand 0.1.135 vor Änderungen als `before-0136.zip` lokal gesichert. Die ursprüngliche Release-Prüfung erfolgte ohne HA-Zugriff. Anschließend wurde das veröffentlichte Paket auf ausdrücklichen Nutzerwunsch auf .193 live geprüft; der ergänzende Nachweis steht unten. ZIP und SHA-256-Prüfsumme des veröffentlichten Releases bleiben unverändert.

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

Die oben beschriebenen automatisierten Prüfungen sind lokale Unit-, DOM- und Offline-Integrationstests. Blocks-A-YAML behält die native Ereignisbrücke; die neue automatische Await-Reihenfolge betrifft Blocks JS und ausdrückliche `await`-Aufrufe in JS/TS. Startauslöser, Timer und Callback-Blöcke bleiben eigenständige Fortsetzungen.

## Ergänzender HA-Livetest am 28.11.2026

Auf Home Assistant 2026.11.3 unter .193 (Port 80) wurde die vorhandene App nach frischer Vollsicherung und separater PC-Quellsicherung von 0.1.134 auf das veröffentlichte 0.1.136-Paket aktualisiert. Die App startete erfolgreich. Die HA-Vollsicherung umfasst 303.04 MB, einschließlich aller Apps und des lokalen Apps-Ordners.

- Neuer Blocks-JS-Zustandstrigger mit dem vorhandenen Testschalter: Anfangszustand löste beim Start keinen Zweig aus; `on` schrieb `1.5`, `off` schrieb `0`. Der direkt folgende Lese-/Debug-Block zeigte jeweils den neuen Wert.
- Dezimalfeld ohne Enter auf `33.25` geändert und gespeichert. Der vorherige laufende Code wurde sichtbar gekennzeichnet. Nach Runtime-Neustart bestätigten HA-Entitätentabelle und Debug `33.25`; der Feldwert blieb nach vollständigem Neuladen erhalten.
- Protokoll bei laufendem Skript geleert. Alte Meldungen blieben auch nach Neuladen entfernt; der nächste Wechsel erzeugte eine neue Meldung `0`.
- Attributtrigger mit `current_position`: Zahl `50` nahm den Zahlenzweig, Text `halb` den Textzweig, `25` den Sonst-Zweig.
- Beide eigenen Beispiele `UGSO-136-On-Off` und `UGSO-136-Attribute` bleiben gespeichert und gestoppt. Kein Autostart aktiviert.
- Testsensor auf ursprüngliche `43` W und exakt seine ursprünglichen Attribute zurückgesetzt; temporäres Attribut entfernt. Testschalter wieder `off`. Bestehende Projekte, vier Freigabeschalter und gespeicherte Einzellisten unverändert.

Es wurden ausschließlich vorhandene Testhelfer verwendet, keine realen Geräte geschaltet. Der ergänzende Live-Test ist kein neuer Blocks-A- oder physischer Gerätetest. Das ursprüngliche Release-ZIP enthält den zum Veröffentlichungszeitpunkt gültigen lokalen Prüfbericht; dieser nachträgliche Nachweis steht im Repository und in der veröffentlichten Dokumentation.
