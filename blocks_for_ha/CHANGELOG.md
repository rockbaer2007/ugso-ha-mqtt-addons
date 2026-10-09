# Changelog

## 0.1.9

- Kategorie Logik mit Vergleich (=, ≠, <, ≤, >, ≥), kompaktem UND/ODER, NICHT, wahr/falsch, null und bedingter Wertauswahl.
- Boolean-/null-Variablen bleiben echte YAML-Typen; Logikwerte können als Variablen-Templates verwendet werden.
- Jinja-Ausdrücke werden geklammert, Textwerte maskiert und ungültige/leere Ausdruckseingänge abgelehnt. Numerische HA-Bedingungen in Wertauswahlen prüfen auf verfügbare Zahlen.
- JSON-Projekte erhalten die neuen Blockformen; YAML-Import erhält Ausdrücke als Template-Blocks und native Gruppen als Bedingungsgruppen.
- 33 Blocks im DE/EN-Katalog mit Bildern und ioBroker-Gegenüberstellung.

## 0.1.8

- Eigene Kategorie Variablen mit nativem Blockly-Dialog zum Erstellen sowie Umbenennen/Löschen im Variablen-Dropdown.
- Setzen- und Lesen-Blocks erzeugen native HA-Variablen-Aktionen und Jinja-Referenzen; keine dauerhaften Helfer.
- Eigene mehrzeilige Template-Wert- und Template-Bedingungsblocks. Auswertung erfolgt ausschließlich in HA.
- YAML- und Projektimport behalten Templates und Variablen. Eine Zahl oder ein Text/Template pro Variablen-Aktion; komplexe Variablen-Mappings werden ausdrücklich abgelehnt.
- 27 Blocks mit Bildern und DE/EN-Dokumentation; Umbenennen aktualisiert Variablen-Blocks, freie Jinja-Texte müssen manuell angepasst werden.

## 0.1.7

- Suchfeld über der Toolbox mit deutschen Hinweisen; Suchtreffer behalten Auswahlfelder und Shadows.
- Mehrzeiliger Text (Enter neue Zeile, Shift+Enter übernehmen), maximal drei sichtbare Zeilen.
- Prozent-Wertblock mit Slider, Farb-Wertblock und Lichtaktion mit RGB-Farbe und Helligkeit.
- Datum-Bedingung mit Browser-Datumswahl und Vergleich in der HA-Zeitzone.
- Helferaktion mit abhängiger Auswahl für input_boolean, counter und timer; IDs weiterhin manuell.
- Plus/Minus für Bedingungen und Falls-Zweige, Sonst-Schalter S; Zahnrad bleibt zum Umordnen.
- Eigenes Haus/Puzzle-Icon für Oberfläche, Browser und HA-App.
- Sechs Original-Blockly-Plugins lokal gebündelt; dynamische automatische Anschlüsse, Farbmischung und Live-Auswahl bleiben geplant.

## 0.1.6

- Kategorie System mit Log-Ausgabe, Script-Steuerung und Entität aktualisieren.
- Text-Wertblock mit String-Anschluss und editierbarem Shadow für Logmeldungen.
- Script starten ohne Warten, stoppen oder direkt aufrufen und warten.
- YAML-Import erkennt passende Systemaktionen; zusätzliche Parameter bleiben in der generischen HA-Aktion erhalten.
- Deutsche und englische Gegenüberstellung sowie öffentliche Dokumentation aktualisiert.

## 0.1.1

- Blocks for HA liegt unter `blocks_for_ha/` im gemeinsamen Repository mit HA Grafik Visual Studio.
- Start, Dateiaustausch und Lizenzhinweise bleiben erhalten; Version wird aus package.json angezeigt.

## 0.1.0

- Erste lokale Blocks-Oberfläche für native HA-Automationen.
- Einfache Auslöser, Bedingungen, Aktionen und Wenn/Dann/Sonst.
- YAML-Vorschau mit Kopieren, Download und Öffnen unterstützter YAML-Dateien vom Rechner.
- Drei Beispiele, Projektdateien und automatische Browsersicherung.
- Original-Blockly-Verweis, Apache-2.0-/ISC-Lizenztexte und unabhängiges Erscheinungsbild.
- HA-Verbindung, Plugins und Katalog sind noch nicht implementiert.
# 0.1.2

- Falls-Block mit Zahnrad: zusätzliche sonst-falls-Zweige und optionaler sonst-Zweig.
- Native HA-choose-Ausgabe, YAML-Import und Projektserialisierung für Verzweigungen.
- Vorhandene Projektdateien behalten ihre bisherigen Sonst-Aktionen.
- Eigene Open-Source-Dokumentationsseite unter HA Apps; Gegenüberstellung aktualisiert.

# 0.1.3

- HA-App-Paket mit config.yaml, Docker-Build und Nginx-Ingress auf Port 8099.
- Relative Pfade für Skripte, Blockly-Medien und Lizenzhinweise hinter HA-Ingress.
- Installationsanleitung für den gemeinsamen UGSo-HA-App-Store.

# 0.1.4

- Kompaktere Blocks mit normaler 12-Punkt-Schrift und 80-Prozent-Startansicht.
- Klassischer Blockly-Geras-Renderer mit Puzzle-Andockformen und Statement-Aussparungen.
- Einpassen und Laden vergrößern kleine Automationen nicht mehr automatisch über 80 Prozent; manuelles Zoomen bleibt möglich.

# 0.1.5

- Dunkles Kategorienmenü und helle Blockauswahl mit getrennten Gruppenfarben für bessere Erkennbarkeit.

- Bedingungen sind typisierte Boolean-Wertblocks; Falls und Nur-wenn besitzen seitliche Werteingänge.
- UND/ODER/NICHT mit Zahnrad für 1–100 Bedingungseingänge.
- Zahlen-Wertblock und ersetzbare Shadow-Zahlen für Grenzen und Wartezeiten.
- Alte Projektdateien werden auf die neue Anschlussstruktur migriert; YAML bleibt kompatibel.
- Deaktivierte Blocks werden nicht exportiert, Hilfe verlinkt auf die Dokumentation.

