# Changelog

## 0.1.32

- Kalender-Auslöser calendar.event_started/event_ended mit entity_id als Text/Liste und optionalem Offset vor/nach dem Termin.
- HA-Aktion mit optionaler Antwortvariable response_variable, auch für calendar.get_events.
- Feiertage-/Ferien-Beispiel als Regression: Jinja, Variablen, choose/default und queued bleiben erhalten. DE/EN/FR-Dokumentation und Blockbilder aktualisiert.

## 0.1.31

- Nativen HA-Auslöser temperature.changed mit entity_id-Zielen, optionaler Trigger-ID und fünf Schwelltypen ergänzt.
- Zahlen mit °C/°F und Sensor-/Zahlenhelfer-Referenzen; JSON-Ziel und Schwelle im Block bearbeitbar.
- AWTRIX-Pooltemperaturen-Automation mit unveränderten MQTT-Daten und Jinja-Payloads als Regressionstest.
- 115 Blocktypen; DE/EN/FR-Dokumentation und Bilder aktualisiert.

## 0.1.30

- Zeit-Auslöser akzeptiert eine JSON-Liste fester Uhrzeiten. Zustandsauslöser unterstützen Entitätslisten und jede Änderung ohne to-Filter.
- Neue Blocks für HA-Ereignisse mit optionalem JSON-Datenfilter und native Zeitbedingungen mit before/after.
- Vollständige Poolpumpen-Automation inklusive mehrzeiligem Timer-Template und verschachtelten Zweigen verlustfrei importieren.
- 114 Blocktypen, übersetzte DE/EN/FR-Beschriftungen, Dokumentation und Bilder.

## 0.1.29

- Blockly-Arbeitsfläche füllt die gesamte verfügbare Höhe des Editorbereichs bis zur kompakten Legende. Kein ungenutzter Leerraum unterhalb des Editors bei höherer YAML-Spalte.
- Größenanpassung der Blockly-SVG-Fläche, Einklappen der Ausgabe und mobile Breite im Browser geprüft.

## 0.1.28

- Zustandslisten, optionale Trigger-IDs und native Trigger-ID-Bedingung ergänzt (112 Blocktypen).
- HA-Aktionen mit mehreren Zielentitäten, leeren Datenobjekten und Metadaten verlustfrei importieren.
- HA-Editor-Ausgabe ohne oberste Automations-ID; Trigger-IDs und Projekt-/Dateilisten-ID bleiben erhalten.
- PC/TV-Tasterautomation als Regressionstest, aktualisierte DE/EN/FR-Dokumentation und Blockbilder.

## 0.1.27

- Kontrastberechnung verwendet das tatsächliche Verhältnis zwischen Schrift und Blockfarbe statt eines ungeeigneten Helligkeitsgrenzwerts.
- Blockly-13-Feldselektor korrigiert: editierbare Felder erhalten dunkle Schrift auf ihrer hellen Fläche, einschließlich Dropdown-Pfeilen und Blockvorschau.
- Eingebettete Schattenblöcke verwenden ihre tatsächlich gerenderte hellere Hintergrundfarbe zur Wahl der Schriftfarbe.
- UGSo Standard/Dark: mittlere blaue/braune Farben leicht abdunkeln und weiße Labels mit mindestens 4,5:1 Kontrast verwenden. Originale Modern-/Tritanopia-Paletten bleiben erhalten; dort weiße oder ausreichend kontrastreiche dunkle Labels.
- Dokumentationsbilder für DE/EN/FR neu erzeugt; der Renderer prüft den Kontrast der gerenderten Blockbeschriftungen vor jeder Aufnahme.

## 0.1.26

- Blockly-Sprachauswahl Systemsprache/Deutsch/Englisch/Französisch, regionaler Browserabgleich und Englisch-Fallback.
- Eigene Blocktexte, Dropdowns, Hilfetexte, dynamische Anschlüsse, Kategorien und originale Blockly-Dialoge übersetzt. Technische IDs und Nutzerdaten unverändert; App-Chrome und Diagnosen bleiben deutsch.
- Gültiges Projekt vor Sprachwechsel sichern und neu laden; bei unvollständigen Blocks oder blockiertem Speicher ohne Datenverlust in aktueller Sprache bleiben.
- Französische Open-Source-Anleitungen und Katalog; 111 echte Blockbilder sowie Theme-Bilder je DE/EN/FR. Benutzerdefinierte Pakete behalten die vom Autor definierten Texte.

## 0.1.25

- YAML-Ausgabe/Code-Import umschaltbar: Einfügefeld und Importieren statt Speichern.
- Ergänzen erhält aktuelle Einstellungen und Blockformen; vollständiges Ersetzen über Checkbox mit Bestätigung.
- Geprüfter Import mit Größenlimit und Fehlermeldung am Feld; Rückkehr zur Ausgabe nach Erfolg.

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

