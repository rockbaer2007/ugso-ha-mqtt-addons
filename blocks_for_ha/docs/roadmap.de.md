# UGSo Blocks für HA – vorgemerkte Erweiterungen

## Typisierte Variablen

Vorgemerkt am 9. Oktober 2026. Noch nicht umgesetzt; der Nutzer hat die Arbeit für heute beendet.

- Originalplugin [typed-variable-modal](https://github.com/raspberrypifoundation/blockly-samples/tree/main/plugins/typed-variable-modal) prüfen und einbinden. Lizenz: Apache-2.0.
- Deutschen Erstellen-Dialog mit Name und Typauswahl anbieten: Automatisch, Zahl, Text und Boolean.
- Variablen-Lesen- und Setzen-Blocks anhand des Typs prüfen und passende Anschlusschecks verwenden. Boolean-Variablen sollen direkt an UND/ODER/NICHT anschließbar sein.
- Bestehende untypisierte Variablen als Automatisch erhalten; keine automatische Änderung vorhandener Projekte.
- Typinformationen im JSON-Projekt erhalten. Native HA-YAML-Ausgabe und YAML-Import weiterhin ohne Bedeutungsverlust unterstützen; YAML enthält keine Blockly-Typmetadaten.
- Editor-Typprüfung klar von der tatsächlichen HA-Template-Auswertung zur Laufzeit unterscheiden.
- Bei Umsetzung Tests, passenden Versionsschritt sowie DE/EN-Dokumentation und Originalplugin-Verweis ergänzen.

### Variablen-Kategorie nach Bildreferenz

Vorgemerkt am 9. Oktober 2026 anhand des vom Nutzer gezeigten ioBroker-Menüs.

- Reihenfolge im Flyout: **Variable erstellen …**, **setze [Variable] auf [Wert]**, **erhöhe [Variable] um [Zahl]**, **[Variable] lesen**.
- Erstellen, Setzen und Lesen sind bereits vorhanden; den zusätzlichen Erhöhen-Block ergänzen, standardmäßig mit Zahlen-Shadow `1`.
- Variable in Setzen-, Erhöhen- und Lesen-Blocks per Dropdown wählen; kompakte Darstellung und passende Blockly-Anschlussformen wie im Bild beibehalten.
- Erhöhen für numerische Variablen vorsehen; negative Schritte sollen entsprechend verringern. Verhalten bei nicht initialisierten oder nicht numerischen Werten ausdrücklich festlegen und dokumentieren.
- In native HA-Variablenzuweisung mit Jinja-Rechnung übersetzen; keine JavaScript-Script-Engine einführen. YAML- und JSON-Wiederöffnen sowie typisierte Variablen berücksichtigen.

## Farbige SVG-Icons für die Seitenleiste

Vorgemerkt am 9. Oktober 2026. Noch nicht umgesetzt.

- Farbige Icons im SVG-Format für die Kategorien der Blocks-Seitenleiste vorsehen.
- Falls farbige Icons technisch nicht möglich sind, einfarbige SVG-Icons mit gutem Kontrast als Alternative verwenden.
- Kompakte, einheitliche Größen und gut unterscheidbare Motive verwenden; Farben und Kontrast auf den Menü-Hintergrund abstimmen.
- Kategorienamen neben den Icons beibehalten, damit die Navigation eindeutig bleibt.
