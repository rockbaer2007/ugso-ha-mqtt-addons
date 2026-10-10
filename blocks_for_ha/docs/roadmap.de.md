# UGSo Blocks für HA – vorgemerkte Erweiterungen

## Vorgemerkt: eigene Blocks und Template-Pakete

Am **10. Oktober 2026** vorgemerkt; noch nicht umgesetzt. Die originalen [Blockly Developer Tools](https://raspberrypifoundation.github.io/blockly-samples/examples/developer-tools/index.html) sollen zum Gestalten eigener Blocks dienen.

- Vier UGSo-Vorlagen: **Wertblock**, **Boolean-Bedingung**, **HA-Aktion** und **Container mit Aktionskörper**.
- JSON-Definitionen für Felder, Dropdowns, Checkboxen, Variablen, Zahlenbegrenzungen, Bilder, Farben und Value-/Statement-/Dummy-/Zeilenumbruch-Inputs übernehmen.
- Feld-/Eingangszuordnung zum eigenen **HA-YAML-/Jinja-Generator** ergänzen. Die Auswahl JavaScript/Python/PHP/Dart/Lua liefert nur ein Generatorgerüst, keine fertige HA-Funktion.
- Anschlüsse explizit auf Boolean, Number, String, Value, RuntimeNumber, Time, Action und Trigger abbilden; Array-/Objektanschlüsse mit dem vorhandenen Typmodell abstimmen. Andockprüfung und HA-Laufzeitprüfung getrennt behandeln.
- **Importdialog mit Block- und Ausgabevorschau**, Feld-/Eingangszuordnung und Validierung planen. Importierte JavaScript-Generatoren nicht ungeprüft ausführen.
- Mehrere Blocks als **versioniertes Katalog-/Pluginpaket** bündeln: eindeutige Paket-/Block-IDs, Kategorie, Beschreibung, Hilfe, Lizenz, Beispiele und Dokumentation. Abhängigkeiten, Namenskonflikte, Updates, Import/Export und Projektmigration berücksichtigen.
- Zahnrad/Mutatoren und dynamische Eingänge benötigen zusätzliche Implementierung. Der Originaleditor gestaltet jeweils einen Blocktyp; Pakete bündeln separat erstellte Definitionen.
- Bei späterer Umsetzung bestehende Projekte erhalten, JSON-/YAML-Verhalten prüfen, passende Paketversion anheben und öffentliche DE/EN-Dokumentation mit Originalquellen aktualisieren.

## Nach Timeouts, Objekt und Logik (0.1.13)

18 Blocks sind umgesetzt, siehe [öffentliche Gegenüberstellung](https://opensource.ugso-software.de/projects/blocks-for-ha/flow). Seit 0.1.14 folgen 37 Mathematik-/Text-/Listen-/Schleifenblocks: feste ganzzahlige Zählschleife, benannte Für-jeden-Variable, Listenindex/Zufall/Subliste und unveränderliche Listenbearbeitung sind ergänzt. [Umsetzung und Grenzen](https://opensource.ugso-software.de/projects/blocks-for-ha/collections).

Offen bleiben persistente Timer mit timer.finished-Auslöser, periodische HA-Auslöser, parallele Zweige und lokales break/continue. Lauf stoppen beendet die ganze HA-Ausführung und ersetzt kein break. Benannte JavaScript-Timer-Handles nicht als HA-Runtimefunktion vortäuschen.

Weitere Varianten: dynamische/gebrochene Zählgrenzen, Primzahlprüfung, Standardabweichung und Modalwert als Liste aller häufigsten Werte, Lesen-und-Entfernen-Wertblock, Änderung/Teilbereiche vom Ende sowie zufälliges Entfernen. Browser-Prompt nicht als Eingabe zur späteren HA-Ausführung ausgeben. Standard-Textumkehr und atan2 sind bereits umgesetzt; Blockly print ist durch die vorhandene Log-Aktion abgedeckt.

## JSONata und Objekt-/Listenfunktionen

Vorgemerkt am 10. Oktober 2026 anhand der ioBroker-Kategorie Konvertierung. Die übrigen neun Konvertierungs-Blocks sind in 0.1.12 umgesetzt.

- JSONata ist keine native HA-Jinja-Funktion. Keine JSONata-Engine im Browser als Ersatz für die spätere HA-Ausführung ausgeben.
- Objekt-/Listen-Zugriffe und Jinja-Ausdrücke sind seit 0.1.13 ergänzt; anschließend einen optionalen Runtime-/Integrationsadapter prüfen, falls echte JSONata-Auswertung benötigt wird.
- Ausdruck und Eingangsdaten getrennt vorsehen, YAML-Ausführung, Ergebnis-/Fehlerverhalten, Plugins und Lizenzen vor Umsetzung klären.
- Referenz: [ioBroker-Konvertierungsblocks](https://github.com/ioBroker/ioBroker.javascript/blob/master/src-editor/src/Components/blockly-plugins/blocks/blocks_convert.ts).

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
- Ablauf laut ergänzter Bildreferenz: Der graue Button **Variable erstellen …** öffnet den Namensdialog (später mit Typauswahl). Erst Bestätigen über OK/Haken/Anwenden legt die Variable an und aktualisiert das Flyout dynamisch mit ihren Setzen-, Erhöhen- und Lesen-Blocks. Keine Blocks automatisch auf der Arbeitsfläche platzieren.
- Erneutes Erstellen mit einem weiteren gültigen Namen ergänzt weitere Variablen-Blocks im Menü und erhält vorhandene Variablen. Abbrechen verändert nichts; leere oder doppelte Namen dürfen keine zusätzlichen Variablen erzeugen.
- Erstellen, Setzen und Lesen sind bereits vorhanden. Erhöhen ist seit 0.1.10 (10. Oktober 2026) umgesetzt, standardmäßig mit Zahlen-Shadow `1`.
- Variable in Setzen-, Erhöhen- und Lesen-Blocks per Dropdown wählen; kompakte Darstellung und passende Blockly-Anschlussformen wie im Bild beibehalten.
- Erhöhen setzt eine zuvor gesetzte Zahlenvariable voraus; negative Schritte verringern. Fehlende Werte, Text, Boolean oder null werden nicht automatisch umgewandelt; die Jinja-Auswertung schlägt in HA fehl.
- In native HA-Variablenzuweisung mit Jinja-Rechnung übersetzen; keine JavaScript-Script-Engine einführen. YAML- und JSON-Wiederöffnen sowie typisierte Variablen berücksichtigen.

## Farbige SVG-Icons für die Seitenleiste

Vorgemerkt am 9. Oktober 2026. Noch nicht umgesetzt.

- Farbige Icons im SVG-Format für die Kategorien der Blocks-Seitenleiste vorsehen.
- Falls farbige Icons technisch nicht möglich sind, einfarbige SVG-Icons mit gutem Kontrast als Alternative verwenden.
- Kompakte, einheitliche Größen und gut unterscheidbare Motive verwenden; Farben und Kontrast auf den Menü-Hintergrund abstimmen.
- Kategorienamen neben den Icons beibehalten, damit die Navigation eindeutig bleibt.
