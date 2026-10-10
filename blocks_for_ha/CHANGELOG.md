# Changelog

## 0.1.24

- HA-Ausgabepanel nach rechts einklappbar; Blockly nutzt die frei werdende Breite.
- Zugänglicher Auf-/Zuklappknopf, lokal gespeicherter Zustand und kompakte mobile Zeile.
- Ausgabe und Projekte bleiben beim Umschalten unverändert; DE/EN-Dokumentation ergänzt.

## 0.1.23

- Einleitung und Automationseinstellungen in der Höhe verkleinert: kompaktere Überschrift, Abstände und 32-Pixel-Bedienelemente.
- HA-Verbindungsstatus und Entitätsanzahl in die Automationseinstellungen verschoben; auch auf schmalen Bildschirmen sichtbar.
- Mobile Umbrüche und Hell-/Dunkel-Darstellung bleiben erhalten.

## 0.1.22

- App-weite Darstellung Hell/Dunkel/System mit lokaler Speicherung und Live-Systemumschaltung.
- Dunkle Farben für Formulare, Dialoge, Entitätsauswahl, eigenen Editor und Arbeitsbereichssuche; passendes originales Blockly-Badge.
- Blockly-Palette bleibt unabhängig; DE/EN-Dokumentation ergänzt.

## 0.1.21

- Originale Arbeitsbereichssuche für platzierte Blocks, deutsche Beschriftung und kompakte Suchleiste.
- Zusätzliche Blockly-Navigationstasten aktiviert; Tastaturhilfe in der Werkzeugleiste.
- DE/EN-Dokumentation und Lizenzhinweise ergänzt.

## 0.1.20

- Home-Assistant-Seitenleiste: einfarbiges Baustein-Icon `mdi:toy-brick-outline` statt des allgemeinen Puzzle-Symbols.
- Aktivierung, Aktualisierung und Abgrenzung zum farbigen App-Icon dokumentiert.

## 0.1.19

- Offizielles, unverändertes Built-with-Blockly-Badge im Fußbereich und Lizenzdialog; lokal ausgeliefert, 32 Pixel hoch und mit Abstand.
- Beide SVG-Varianten und Originalquelle dokumentiert; DE/EN-Dokumentation berücksichtigt helle und dunkle Ansicht.

## 0.1.18

- Eigener Block-/Template-Editor mit Blockly-Vorschau im 95%-Dialog.
- Deklarative Wert-, Bedingungs-, Aktions- und Auslöserpakete mit mehreren Blocks. Kein importierter JavaScript-Generator.
- Kategorie Benutzerdefiniert vor der Suche; lokale Paketbibliothek und Projektformat 3 mit eingebetteten verwendeten Paketen.
- JSON-Code kopieren/einfügen und ZIP importieren/exportieren, Format-/Abhängigkeitsprüfung, Konfliktschutz und transaktionaler Projektimport.
- Öffentliches Beispiel Sensor und Licht, zweisprachige Anleitung und Katalogseiten.
- fflate 0.8.3 (MIT) lokal eingebunden.

## 0.1.17

- Entitätsfelder mit Suchdialog, Name/ID-Suche, Zustandsvorschau und passenden Licht-/Script-/Helferfiltern. Auswahl erst bei Übernehmen; manuelle IDs und leeres generisches Ziel bleiben verfügbar.
- Lesende HA-Supervisor-Anbindung mit serverseitigem Token. Docker startet Python-Bridge und nginx gemeinsam; lokale Entwicklung über Vite-Proxy. Keine HA-Aktionsaufrufe, Browser-Zugangsdaten oder vollständigen Entity-Attribute.
- Projekte/YAML speichern weiterhin nur IDs; Ladefehler verwerfen den Katalog und bewahren Blocks. Browser-/Backend-/Dockerprüfungen gegen simuliertes HA, DE/EN-Dokumentation. Echter HA-Installationstest noch offen.

## 0.1.16

- Gespeicherte Theme-Auswahl: UGSo Standard, originale Dark-/Modern-/Tritanopia-Themes mit eigenen UGSo-Erweiterungsstilen. Anzeigewechsel bewahrt Blocks, Verbindungen und YAML.
- Eigene Block- und Kategorienfarben folgen Theme-Stilen; adaptive Beschriftungskontraste und lesbare Auswahlhervorhebung. Feste CSS-Hintergründe überdecken die Themes nicht mehr.
- Originaler Zoom-to-fit-Knopf zusätzlich zum bisherigen kompakten Einpassen-Button. Vier weitere Originalplugins lokal auf 13.3.0 festgelegt, Apache-2.0-Hinweise aktualisiert.
- Kompakte Theme-Werkzeugleiste mit mobilem Umbruch; Browser-/Speicher-/Palettenprüfungen und DE/EN-Dokumentation mit Bildern und Originalquellen.

## 0.1.15

- Eigene Kategorie Farbe: Zufallsfarbe, RGB-Prozentanteile und RGB-Mischung mit HA/Jinja-Ausgabe. Berechnete Farben und RGB-Variablen an Lichtaktionen anschließbar.
- Originale Blockly-Wertfunktionen mit dynamischen Aufrufblocks und bis zu acht Parametern. Jinja-Expansion, keine Rekursion/Aktionskörper. JSON erhält Definitionen, YAML expandierte Ausdrücke.
- 111 unterstützte Blocktypen mit echten Blockbildern. Standardkategorien-Abgleich unterscheidet Registrierung, ioBroker-Menü und eigene HA-Unterstützung.
- DE/EN-Dokumentation, Export-/Sandbox-Tests und Browserprüfung für originales Zahnrad, dynamische Aufrufe, Farben und Projekt-Neuladen.

## 0.1.14

- 37 weitere Blocks, insgesamt 105: Mathematik, Text, Listen, Zählschleifen und Für-jeden-Schleifen mit benannter Variable.
- Eigene HA/Jinja-Generatoren für Rechenoperationen, Grad-Trigonometrie einschließlich atan2, Statistik, Runden, Zufall, Unicode-Text und unveränderliche Listenänderungen.
- Mathematik/Text als kontrastreiche eigene Kategorien, Suche weiterhin zuletzt; Textverknüpfung mit Zahnrad und +/−.
- Feste ganzzahlige Zählschleifen mit inklusiver Grenze, automatischer Richtung und höchstens 10000 Werten; Schleifenvariablen pro Durchlauf aus repeat.item.
- JSON-/YAML-Rundlauf für alle neuen Blocks, strikte Jinja-Grenzfalltests und Browserkontrolle. Öffentliche DE/EN-Gegenüberstellung und 105 echte Blockbilder.
- Dokumentierte Unterschiede zu JavaScript und offene Varianten: lokales break/continue, Primzahl, Modalwert, Standardabweichung, dynamische Zählgrenzen und kombinierte Lesen-/Entfernen-Blocks.

## 0.1.13

- 18 zusätzliche Blocks: Pause mit Dauereinheit/Laufzeitwert, Warten bis mit Timeout, Lauf stoppen, Wiederhole Anzahl/solange/bis/für jeden Eintrag, Objekt erstellen/lesen/prüfen/Schlüssel/ändern/entfernen, Bereichsvergleich, Ersatzwert, Fallauswahl und Listen erstellen/Länge/leer.
- Native HA-delay/wait_template/repeat/stop/choose statt JavaScript-Timer-Handles. Bestehende Script- und Timer-Helferaktionen bleiben für abbrechbare Abläufe verfügbar.
- Objektzuweisungen verwenden neue Dictionaries statt Mutation in der unveränderlichen HA-Jinja-Sandbox. Zahnrad und Plus/Minus für Objekt-, Listen- und Fall-Einträge, einschließlich Undo der Attributnamen.
- Projekt-JSON erhält die Formen; YAML importiert HA-Wiederholungen/Warte-/Stop-Aktionen direkt, komplexe Werte als Templates und Fallauswahl als Falls/choose.
- 68 Blocktypen mit tatsächlichen Editorbildern; öffentliche deutsche/englische Gegenüberstellung einschließlich Grenzen und offener Erweiterungen.

## 0.1.12

- Kategorie Konvertierung mit neun HA-Blocks: Zahl, Boolean, Text, Typ, ISO-/Unix-Datumswert, Datumsformat/-bestandteile, Dauerformatierung, JSON lesen und schreiben.
- Ausgabe nach HA/Jinja-Regeln statt JavaScript-Konvertierung. Keine stillen Ersatzwerte bei ungültiger Zahl, Boolean oder JSON.
- Datumsformat-Auswahl passt den Ausgangstyp an; eigenes strftime-Format blendet ein Textfeld ein. JSON-Formatierung per Checkbox.
- Laufzeitzahlen passen in Vergleiche, Variablen und Zeitrechnung; feste Grenzwerte/Verzögerungen bleiben von dynamischen Zahlen getrennt.
- 50 Blocktypen mit Bildern und DE/EN-Gegenüberstellung. JSONata als offene Erweiterung vorgemerkt.

## 0.1.11

- Sieben Datum-/Zeit-Blocks mit typisierten Datumswert-Anschlüssen und dynamischen Uhrzeitvergleichsfeldern.
- Feste/andockbare Uhrzeitvergleiche einschließlich Zeiträumen über Mitternacht, aktuelle HA-Zeit, Kalenderbeginn, nächste Sonnenereignisse mit Minutenoffset, Addition/Subtraktion und Formatierung.
- HA-Jinja-Ausgabe nutzt die HA-Zeitzone. JSON erhält die Blockformen; YAML-Zeittemplates werden als allgemeine Template-Blocks wieder geöffnet.
- DE/EN-Doku mit ioBroker-Gegenüberstellung, Grenzen und Bildern; Katalog auf 41 Blocktypen erweitert.

## 0.1.10

- Erhöhen-Block in der dynamischen Variablen-Kategorie zwischen Setzen und Lesen, Standard-Zahlen-Shadow `1`.
- Negative Schritte verringern; Null und Dezimalschritte unterstützt. Zahlenvariable vorher setzen; keine automatische Umwandlung von Text, Boolean, null oder fehlenden Werten.
- Erzeugt native HA-Variablenzuweisung mit Jinja. Eigenes Ausgabeformat wird beim YAML-Import wieder als Erhöhen-Block erkannt; JSON erhält Blockform und Variablenauswahl.
- DE/EN-Katalog mit Bild, Beispiel und ioBroker-Gegenüberstellung auf 34 Blocktypen aktualisiert.

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

