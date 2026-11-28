# Logic Studio Pro 0.1.134 – lokaler Prüfstand 28.11.2026

## Sicherung

Quellstand 0.1.133 vor Änderungen als ZIP lokal gesichert. Vor dem HA-Update eine neue abgeschlossene HA-Sicherung mit Einstellungen/Verlauf, Apps und lokalem App-Ordner geprüft (303 MB). Zusätzlich bisherige App-Quellen vom Testsystem als ZIP gesichert und CRC geprüft. Vorhandene Projekte und Optionen bleiben erhalten.

## Lokale Prüfungen

- 60 Node-Tests und 12 Python-Server-Tests erfolgreich.
- Tatsächlich ausgeliefertes Blockly-Bundle: zusätzliche Dezimalblöcke für Blocks A und JS getestet, einschließlich 0.5, 33.25 und -0.125.
- Numerische HA-Ereignisdaten aus Blocks A sowie JS-/TS-Testläufe ohne Rundung geprüft.
- Direkte Blockly-Zahlenfelder: Vorgabe 0.5, Änderung auf 33.25, Serialisieren und Wiederherstellen in DE/EN/FR geprüft.
- Ungültige Zahlen werden zurückgewiesen. Generierter Quelltext und HA-Schreibdaten behalten die Dezimalwerte; Sensorattribute bleiben erhalten.
- Beide Toolboxen behalten den vorhandenen Sensor-Baustein und ergänzen die neue Variante daneben.
- Bestehende Prüfungen für Freigaben, Runtime, Projekte, FBD, Entitätenauswahl und Import unverändert erfolgreich.

## HA-Liveprüfung auf Home Assistant 2026.11.3

- Nach Sicherung auf 0.1.134 aktualisiert, erfolgreichen Appstart und Versionsanzeige geprüft.
- Vorhandenen Beispiel-Sensor verwendet, ursprünglicher Zustand 43 W. Keine neue HA-Entität angelegt und keine neuen Freigaben erteilt.
- Blocks JS: neuer Baustein mit direktem Feld 0.5 importiert, gespeichert und per Play ausgeführt. HA-Zustand exakt 0.5. Danach im direkten Zahlenfeld 33.25 eingegeben, gespeichert und erneut gestartet: HA-Zustand exakt 33.25.
- Blocks A: neuer Baustein mit 0.5 importiert und als YAML geöffnet. Aktion enthält `state: 0.5` als Zahl. Genau diese Ereignisdaten in den HA-Ereigniswerkzeugen ausgelöst: HA-Zustand 0.5.
- Blocks-A-Feld auf 33.25 geändert und gespeichert. Erzeugtes YAML enthält `state: 33.25`. Ereignisdaten ausgelöst: HA-Zustand 33.25. Es wurde keine Start-Automation aktiviert.
- Einheit W, Geräteklasse power und Anzeigename bleiben bei allen Schreibvorgängen erhalten.
- Beide Beispielprojekte nach Neuladen wieder geöffnet: direkte Zahlenfelder behalten 33.25.
- Ausgangszustand des vorhandenen Sensors abschließend auf 43 W zurückgesetzt und Attribute erneut geprüft.
- Vorhandene READ-all-, WRITE-all-, EVENT-all- und TOPICS-all-Schalter bleiben wie vor dem Test eingeschaltet; bestehende Einzellisten unverändert. Keine Änderung an den Nutzerfreigaben.
- Auf bestätigten Nutzerwunsch bleiben ausschließlich die beiden neuen gespeicherten Beispiele `UGSO-134-Decimal-JS` und `UGSO-134-Decimal-A` erhalten. JS-Lauf gestoppt, kein Autostart. Nicht gespeicherte Import-Hilfsprojekte und YAML-Entwürfe abgebrochen.

Nicht veröffentlicht.
