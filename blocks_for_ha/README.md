# UGSo Blocks for HA

Neu in **0.1.15**: eigene Kategorie Farbe mit Zufall, RGB und Mischung sowie originale Blockly-Wertfunktionen mit Parametern, insgesamt 111 unterstützte Blocktypen. Eigene HA/Jinja-Ausgabe; Funktionen werden beim Export expandiert. [Standardkategorien-Abgleich mit ioBroker, Beispiele und Grenzen](https://opensource.ugso-software.de/projects/blocks-for-ha/blockly-audit). JSON erhält die Formen, YAML die Bedeutung. Echte HA-Ausführung bleibt zu prüfen.

Neu in 0.1.10: **Erhöhe Variable um …** steht im Variablen-Menü zwischen Setzen und Lesen. Standard-Schritt `1`, negative Schritte verringern, Dezimalschritte und `0` sind möglich. Die Variable vorher als Zahl setzen. Fehlende Werte, Text, Boolean und null führen bei der Jinja-Auswertung in HA zu einem Fehler; keine automatische Umwandlung oder Null-Initialisierung. Eigenes YAML-Ausgabeformat wird wieder als Erhöhen-Block importiert, JSON erhält die Blockform.

Neu in 0.1.9: **Logik** mit Vergleich (=, ≠, <, ≤, >, ≥), kompaktem UND/ODER, NICHT, wahr/falsch, null und bedingter Wertauswahl. Zahl/Text/Variable/Template an die Werteingänge, Boolean an die Bedingungseingänge anschließen. Variablenzuweisungen unterstützen jetzt Boolean und null. JSON bewahrt Blockformen; YAML-Import erhält komplexe Ausdrücke als Template-Blocks. Vergleiche konvertieren Typen nicht automatisch. Ausdruckseingänge akzeptieren einzelne Jinja-Ausgaben; dynamische Werte sind nicht als feste Grenzen oder Wartezeiten vorgesehen.

Version 0.1.15: experimentelle HA-App für native Home-Assistant-Automationen aus visuellen Blocks im gemeinsamen Repository mit UGSo Visual Studio unter `blocks_for_ha/`. Home Assistant führt das erzeugte YAML aus; dieser Editor enthält keine JavaScript-Script-Engine und schreibt keine HA-Systemdateien.

Neu in 0.1.12: **Konvertierung** mit neun Blocks für Zahl, Logikwert, String, Typ, Datumswert, Datumsformat/-bestandteile, Zeitdifferenz, JSON lesen und JSON schreiben mit Formatierungs-Haken. HA-Konvertierungsregeln, ausdrückliche Unix-/Dauereinheiten, dynamischer Format-Eingang und typisierter Laufzeitzahlen-Anschluss für Vergleiche, Variablen und Zeitrechnung. Feste Auslösergrenzen und Wartezeiten bleiben Konstanten. JSONata ist als offene Erweiterung dokumentiert. [Gegenüberstellung und Beispiele](https://opensource.ugso-software.de/projects/blocks-for-ha/conversion).

Neu in 0.1.11: sieben Datum-/Zeit-Blocks: feste und andockbare Uhrzeitvergleiche, aktueller Datumswert, Kalenderbeginn, nächste Sonnenzeit mit Offset, Zeitaddition/-subtraktion und Formatierung. Zeiträume funktionieren über Mitternacht. Eigener typisierter Time-Anschluss für Datumswerte; Jinja wird in HA ausgewertet. JSON erhält die Blockformen, YAML-Import erhält Zeittemplates als allgemeine Template-Blocks. [Anleitung und ioBroker-Gegenüberstellung](https://opensource.ugso-software.de/projects/blocks-for-ha/time).

Die kompakte Ansicht verwendet den klassischen Blockly-Geras-Renderer und seine Puzzle-Andockformen. Startansicht und Einpassen bleiben für kleine Automationen bei höchstens 80 Prozent; manuelles Zoomen ist weiterhin möglich.

## Installation als HA-App

Neu in **0.1.13**: 18 Blocks für Timeouts, Objekt, Logik, Schleifen und Listen. Pausen mit Einheiten/Laufzeitwerten, Warten bis mit Timeout, Lauf stoppen, native Wiederholungen, lokale Objektzugriffe/-zuweisungen, Fallauswahl, Bereichsvergleich, Ersatzwert und Listen. [Gegenüberstellung, Originalquellen und Grenzen](https://opensource.ugso-software.de/projects/blocks-for-ha/flow). Benannte JavaScript-Timer werden nicht nachgebildet; HA-Scripts und Timer-Helfer bleiben verfügbar.

Im HA-App-Store das gemeinsame Repository aktualisieren, **UGSo Blocks for HA** installieren, starten und über **Weboberfläche öffnen** verwenden. [Installationsanleitung](DOCS.md). Das Paket unterstützt amd64 und aarch64 und stellt den Editor über Ingress bereit. Direkte Entitäts-/Aktionsauswahl aus HA folgt später.

[Open-Source-Dokumentation](https://opensource.ugso-software.de/projects/blocks-for-ha/): Falls-Blocks lassen sich über das Zahnrad um sonst-falls-Zweige und einen optionalen sonst-Zweig erweitern. Mehrere Zweige erzeugen native HA-`choose`-Aktionen.

## Starten

Im Verzeichnis `blocks_for_ha/` Node.js 22.12 oder neuer verwenden. `npm install`, dann `npm run dev`. Oberfläche: http://127.0.0.1:4180/. `npm test` prüft die Erzeugung und den Import; `npm run build` erstellt die auslieferbare Weboberfläche.

## Unterstützte Blocks

Die vollständige Gegenüberstellung zu ioBroker einschließlich Umsetzungsstatus steht in [ioBroker / UGSo Blocks für HA](docs/iobroker-comparison.de.md). Bei jeder Erweiterung wird diese Liste zusammen mit der [englischen Fassung](docs/iobroker-comparison.en.md) aktualisiert.

- Auslöser: Zustand, Zahl über/unter Grenze, Uhrzeit, Sonne und HA-Start.
- Bedingungen: Zustand, Zahlenvergleich, UND/ODER/NICHT und Datum heute (ist/ab/bis).
- Werte: Zahl, Prozent mit Slider, mehrzeiliger Text und Farbe; typisierte Outputs und ersetzbare Shadows.
- System: Log-Ausgabe, Script-Steuerung, Entität aktualisieren und Helferaktion mit abhängigen Dropdowns.
- Aktionen: Ein/Aus/Umschalten, generische HA-Aktion mit JSON-Daten, Wartezeit, Falls sowie Licht mit Farbe und Helligkeit.
- Metadaten: Name, Beschreibung, ID sowie single/restart/queued/parallel; maximale Anzahl bei queued/parallel.

Bedingungen sind Boolean-Wertblocks für seitliche Werteingänge bei Falls und Nur wenn. UND/ODER/NICHT besitzt ein Zahnrad für weitere Bedingungen. Aktionen bleiben vertikale Statement-Ketten. Alte Projekte werden automatisch umgestellt. Deaktivierte Blocks werden beim Export übersprungen; fehlende Pflichtinhalte verhindern den Export. Das Kontextmenü verlinkt Hilfe, der Papierkorb erlaubt das Zurückholen gelöschter Blocks innerhalb der Sitzung.

Entitäten zunächst als IDs eingeben. Eine Live-HA-Verbindung ist noch nicht implementiert. Die backendseitige Supervisor-/Token-Verbindung von UGSo Visual Studio ist als Vorlage für eine spätere Anbindung vorgesehen; hinzu kommen die HA-Aktionsbeschreibungen. Tokens dürfen nicht in Blockprojekte oder YAML exportiert werden.

Suche steht am Ende des Menüs. Plus/Minus ergänzt und entfernt die letzten Bedingungseingänge oder Falls-Zweige; S schaltet Sonst um. Das Zahnrad bleibt zum Umordnen. [Liste aller 111 Blocks mit Bildern und Originalplugin-Links](https://opensource.ugso-software.de/projects/blocks-for-ha/blocks).

Variablen: im Menü **Variablen → Variable erstellen** einen Namen anlegen, beispielsweise `leistung`. **Setze** in die Aktionskette hängen und Zahl, Text oder Template anschließen; der Lesen-Block erzeugt `{{ leistung }}` für eine spätere Log-Meldung oder Variablenzuweisung. Im Dropdown sind Umbenennen und Löschen verfügbar. Freie Template-Texte werden beim Umbenennen nicht verändert. Namen benötigen ASCII-Buchstaben, Ziffern und `_`, keine führende Ziffer. Variablen gelten für den jeweiligen HA-Lauf und sind keine persistenten Helfer.

Die Kategorie **Templates** bietet eigene Wert- und Boolean-Bedingungsblocks mit mehrzeiliger Jinja-Eingabe. Vorlagen einschließlich `{{ ... }}`/`{% ... %}` eingeben. Blocks prüft Anschlussformen und YAML, führt Jinja aber nicht lokal aus und prüft keine HA-Entitäten oder Jinja-Syntax. Variablen erst setzen, dann in späteren Aktionen verwenden; Aktionsvariablen stehen nicht in den vorgelagerten Automationsbedingungen bereit. Der Import unterstützt eine Zahl, einen Text/Template, Boolean oder null pro Variablen-Aktion; mehrere Einträge, Listen/Objekte und Automationsvariablen auf oberster Ebene werden ausdrücklich abgelehnt. Native Syntax: [HA Define variables](https://www.home-assistant.io/docs/scripts/#define-variables).

## Dateien auf dem Rechner

**Kopieren** kopiert die YAML-Ausgabe. **Speichern** lädt sie als `.yaml` herunter. **Öffnen** lädt eine YAML-Datei vom Rechner und übersetzt unterstützte Strukturen zurück in Blocks. Nicht unterstützte Felder werden mit einem Hinweis zurückgewiesen; die aktuelle Automation bleibt dabei erhalten. Eine Datei darf genau eine Automation als Objekt oder als Liste mit einem Eintrag enthalten.

Unter **Projekt & Beschreibung** lässt sich zusätzlich das Blocks-Projekt als JSON mit Blockpositionen sichern und öffnen. Der letzte Stand wird automatisch lokal im Browser gespeichert. Zum Öffnen und Laden eines Beispiels erscheint vor dem Ersetzen eine Bestätigung.

Für den nativen HA-Editor das Format „Einzelne Automation“ wählen, Beispiel-Entitäten ersetzen und die Ausgabe in „Als YAML bearbeiten“ übernehmen. Vor Verwendung Aktionen und Zielentitäten in HA prüfen. Eine Prüfung in diesem Prototyp bestätigt nur die unterstützte Struktur, nicht die tatsächliche HA-Installation.

## Geplante Erweiterungen

Entitäts-/Aktionsauswahl, deklarative Blockpakete und Katalog, weitere native HA-Strukturen. Die Roadmap liegt im ATLAS-Repository unter `docs/UGSO_BLOCKS_FOR_HA_ROADMAP.md`. Die HA-App ist ein eigenständiges Projekt und kein bereits integriertes ATLAS-Plugin.

## Original und Lizenzen

Built with [Blockly](https://www.blockly.com/), der Open-Source-Bibliothek der Raspberry Pi Foundation, ursprünglich entwickelt bei Google. Eigene HA-Blocks auf Basis von Blockly 13.3.0; kein Fork des ioBroker-Adapters.

Eigener Code: Apache-2.0. Blockly: Apache-2.0. YAML-Bibliothek: ISC. Original-Lizenztexte liegen unter `public/licenses/` und werden beim Build mitgeliefert. Das Projekt verwendet ein eigenes Erscheinungsbild und ist kein offizielles Produkt von Home Assistant oder Blockly.
