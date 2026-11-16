# Blocks A und Blocks JS

## Blocks A

- [x] Die gemeinsamen HA-Auswahlfelder in 0.1.96 mit eigenem Testbereich, Testlabel, Loopback-Gerät und Testetage geprüft. Der YAML-Export enthielt die vier passenden Zielschlüssel und IDs.
- [x] Aus Blocks A erzeugte HA-YAML-Entwürfe zeigen den Namen des Quellprojekts. In 0.1.96 auf dem Testsystem PC (64) geprüft.
- [x] Aktions- und Entitätsauswahl aus einem bestehenden Blocks-A-Projekt in 0.1.96 auf dem Testsystem PC (64) geprüft.

## Blocks JS

- [ ] Neue Importfälle aufnehmen, sobald ein echter Export mit einem noch fehlenden oder unvollständig übernommenen Block vorliegt.
- [x] In 0.1.115 wurde der Hinweis am Dateiänderungs-Trigger `onFile` mit einem echten Export auf dem Testsystem PC (64) geprüft. Dateimuster und Dateinamenblock blieben erhalten.
- [x] In 0.1.114 wurde der Hinweis am alten GET-Block `request` auf dem Testsystem PC (64) mit einem echten Export geprüft. Der Antwortzweig mit `result` blieb erhalten.
- [x] In 0.1.113 wurde der Hinweis für „Datei lesen“ mit einem echten ioBroker-Blockly-Export auf dem Testsystem PC (64) geprüft. Die native HA-Aktion lieferte `data.probe = 42`.
- [x] In 0.1.112 wurde der Hinweis für „Datei schreiben“ mit einem echten ioBroker-Blockly-Export auf dem Testsystem PC (64) geprüft.
- [x] In 0.1.111 wurde der Hinweis für temporäre HTTP-Antwortdateien mit einem echten ioBroker-Blockly-Export auf dem Testsystem PC (64) geprüft.
- Der erneute Importtest zu 0.1.100 bestätigte Zustandsauslöser, Aktualisieren, Steuern und Zustandsabfrage anhand vorhandener XML- und JS-Exporte.
- [x] In 0.1.101 blieb der Vergleich „aktuelle Zeit vor 12:00“ beim Import des `exec`-Testexports erhalten. Auf dem Testsystem PC (64) erschien der Hinweis in der Importübersicht und direkt am Platzhalter. Er erklärt, wie der Zeitvergleich mit „falls“ verbunden und die gewünschte HA-Aktion unter „mache“ eingefügt wird.
- [x] Importübersicht mit Originalblöcken, HA-Zuordnungen und Codehinweisen ist vorhanden. Skriptnachrichten mit berechnetem Ziel und Antwort wurden in 0.1.72 live getestet. 0.1.97 prüfte die Importübersicht erneut mit `test33.xml` und `test33.js`.
- [x] OID-Anzeige und Austausch eines ausgewählten Blocks samt Wertanschluss per JSON-Text und Datei in 0.1.97 auf dem Testsystem PC (64) geprüft.
