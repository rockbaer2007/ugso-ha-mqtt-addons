# Funktionsplan

- [x] Zählerstände (CTU, CTD, CTUD) und Merker (RS, SR) werden optional pro Projekt gespeichert. 0.1.97 bestätigte auf dem Testsystem PC (64), dass Zähler `1` und Merker `true` nach einem App-Neustart erhalten blieben.
- [x] Änderungen an Parametern und Verbindungen verwerfen den alten Speicher. Timer beginnen neu, und beim ersten Scan wird der Eingangspegel ohne künstliche Flanke übernommen. Die 0.1.97-Tests prüfen die Speicherdatei und den Runtime-Runner mit simulierter HA-Verbindung.
- [x] Der Funktionsplan schreibt nur nach einem erfolgreichen Scan mit validierten Ausgaben. 0.1.97 nutzt eine eindeutige temporäre Datei für den atomaren Austausch.
