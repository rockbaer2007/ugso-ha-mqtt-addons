# ioBroker JavaScript – Quellenvergleich vom 28.11.2026

Geprüfter upstream-master: `d5e91f8eeea96596b996c65b40bfe2963d26df06` vom 28.11.2026. Paketdatei nennt 10.6.0; README kennzeichnet die aktuelle Rezeptfunktion als WORK IN PROGRESS und weist darauf hin, dass 10.6.0 nicht auf npm veröffentlicht wurde. Git-Stand und veröffentlichte Version deshalb nicht gleichsetzen.

Zusätzlich gegen die GitHub-Releases geprüft: jüngste veröffentlichte Version **v10.5.5 vom 17.11.2026**. Der Rezeptkatalog im aktuellen master gehört noch nicht zu diesem Release.

## Reihenfolge und Zustandsspeicher

Die ioBroker-Blockly-Ausgabe für normale Zustandsaktionen verwendet `setState(...)`. Im Sandbox-Code speichert `setStateHelper` bei nicht einzeln abonnierten Zuständen einen Zwischenwert in `interimStateValues`; bei Schreibfehlern wird dieser entfernt. `getState` bevorzugt diesen Zwischenwert. Damit kann ein direkt anschließendes Lesen bereits den neuen Wert zeigen, obwohl der eigentliche Schreibauftrag asynchron ist. `setStateAsync` bietet zusätzlich einen Promise-basierten Schreibabschluss.

Unsere HA-Umsetzung 0.1.136 übernimmt das Ziel einer zuverlässigen Reihenfolge, implementiert es aber mit tatsächlicher HA-Schreibbestätigung. Sensorattribute bleiben erhalten, der bestätigte Zustand wird vor der Fortsetzung in den lesbaren Snapshot übernommen. Ein inzwischen neueres HA-Zustandsereignis wird nicht durch eine ältere HTTP-Antwort überschrieben. Normale HA-Ausgaben warten auf die Annahme des Auftrags; das ist keine Bestätigung einer physischen Gerätebewegung. Timer und ausdrücklich asynchrone Callback-Blöcke bleiben eigenständige Fortsetzungen.

## Editor und Protokoll

ioBrokers BlocklyEditor hört auf Workspace-Änderungen und übergibt sie zeitlich gebündelt nach etwa 200 ms. Ein zusätzlicher Enter-Zwang ist in dieser Übergabe nicht vorgesehen. Unsere Eingabeübernahme beim Verlassen des Floating-Felds erhält die vorhandenen Workspace-Ereignisse und speichert den aktuellen Feldwert vor weiteren Toolbar-Aktionen.

ioBrokers Protokoll leert sowohl dargestellte Zeilen als auch den zugehörigen Textpuffer für die gewählte Ansicht. Unsere Protokollfunktion leert darüber hinaus die gespeicherten Runtime-Meldungen des aktuellen Benutzers/Projekts und verwirft bereits laufende alte Poll-Antworten. Neue Meldungen nach dem Leeren bleiben erhalten.

## Neuere upstream-Änderungen – Optionen für später

- Rezeptkatalog: fertige Automationen, Such-/Tag-Ansicht, Geräte-/Zustandszuordnung, Vorschau, Vergleich bei Updates und Schutz vor Überschreiben lokaler Änderungen. Eine HA-eigene Vorlagenbibliothek wäre sinnvoll; nicht den ioBroker-Katalog ungeprüft ausführen oder importieren.
- Protokollerhalt beim Aus-/Einblenden der Oberfläche und Erhalt ungespeicherter Editoränderungen: als Regressionstests für unsere Oberfläche geeignet; bestehende Projekte und Protokolle nicht beiläufig löschen.
- FBD-Ausgänge: extern geänderte Werte sichtbar markieren, optionales gedrosseltes Zurückschreiben. Für HA nur opt-in; keine unbemerkte Rückkopplungsschleife einführen.
- FBD-Zahlenvergleich: Float-Toleranz bei der Anzeige externer Abweichungen statt exakter Gleichheit. Nicht mit den bewusst exakt gewählten neuen Zustandszweigen verwechseln.
- Enum-/Kategorie-Trigger: Mitgliedsauswahl und Änderungsfilter. Bestehende HA-Zuordnungen und manuelle Auswahl sind die passende Grundlage; ioBroker-ack-Filter haben keine identische HA-Bedeutung.

## Quellen

- [Sandbox, setStateHelper/getState/setStateAsync](https://github.com/ioBroker/ioBroker.javascript/blob/d5e91f8eeea96596b996c65b40bfe2963d26df06/src/lib/sandbox.ts)
- [Blockly-Systembausteine](https://github.com/ioBroker/ioBroker.javascript/blob/d5e91f8eeea96596b996c65b40bfe2963d26df06/src-editor/src/Components/blockly-plugins/blocks/blocks_system.ts)
- [BlocklyEditor](https://github.com/ioBroker/ioBroker.javascript/blob/d5e91f8eeea96596b996c65b40bfe2963d26df06/src-editor/src/Components/BlocklyEditor.tsx)
- [Protokoll](https://github.com/ioBroker/ioBroker.javascript/blob/d5e91f8eeea96596b996c65b40bfe2963d26df06/src-editor/src/Log.tsx)
- [Changelog](https://github.com/ioBroker/ioBroker.javascript/blob/d5e91f8eeea96596b996c65b40bfe2963d26df06/README.md)

Nur als Referenz ausgewertet; keine upstream-Dateien oder neuen Bibliotheken in das Paket kopiert.
