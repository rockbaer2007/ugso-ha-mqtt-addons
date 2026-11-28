# Logic Studio Pro 0.1.137 – Prüfung vom 28.11.2026

Vor Änderungen wurde der vollständige Stand als `logic-studio-before-grid-0137.zip` lokal gesichert (181 Dateien, CRC geprüft). Keine HA-Nutzdaten oder Projekte geändert.

## Änderung

Beide Blockly-Editoren erhalten dieselben nativen Arbeitsflächenoptionen: Punkteraster mit Abstand 20 und Länge 1, kein Einrasten, Scrollleisten, Ziehen und Mausradverschiebung. Native Blockly-Bedienung: Shift + Mausrad horizontal, Strg + Mausrad Zoom (auf macOS auch Meta), Pinch und Zoomtasten. Die Maßstabsgrenzen sind 0.25 bis 2.

## Verifikation

- 87 Node-Tests und 14 Python-Server-Tests erfolgreich (101 insgesamt).
- Echte Blockly-Optionsverarbeitung prüft kombinierte Verschiebe-/Zoomoptionen. Gemeinsame Optionsobjekte sind je Editor unabhängig.
- Lokaler Chrome-Test mit isoliertem Demo-Datenordner, ohne HA-Verbindung: Punkteraster in Blocks JS sichtbar und als SVG-Muster 20 × 20 bestätigt; dasselbe Muster in Blocks A bestätigt.
- Echter Mausradtest änderte die Arbeitsflächenverschiebung von Y=0 auf Y=-8, ohne Maßstabsänderung. Zoomtaste änderte anschließend den Maßstab von 1 auf 1.2.
- Bestehende 289 Bausteine und 52 direkte Entitätsfelder weiterhin geprüft. Runtime- und Projektformat unverändert.

Kein HA-Livetest von 0.1.137 und kein Update auf .193. Der ergänzende erfolgreiche HA-Livetest von 0.1.136 steht separat in dessen Prüfbericht. Lokale Testprojekte wurden nie als Runtime gestartet.
