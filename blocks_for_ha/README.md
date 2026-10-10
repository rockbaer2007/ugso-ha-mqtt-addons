# UGSo Blocks for HA

Neu in **0.1.33**: numerische Auslöser mit Entitätslisten und optionaler Haltezeit `for`. Kombinierte Dauereinheiten und Nulleinträge bleiben erhalten. Die Hyper-2000-Lüfter-Automation mit vier IDs/Zweigen wird vollständig importiert.

Neu in **0.1.32**: Kalendertermine beginnen/enden mit optionalem Offset und mehreren Entitäten. HA-Aktionen erhalten `response_variable`. Das vollständige Feiertage-/Ferien-Beispiel inklusive Jinja und queued-Modus wird importiert. 116 Blocktypen.

Neu in **0.1.31**: nativer Auslöser **Temperatur geändert** (temperature.changed) mit mehreren Zielentitäten, optionaler Trigger-ID und fünf Schwelltypen. AWTRIX-MQTT-Payloads und Templates bleiben erhalten. 115 Blocktypen.

Neu in **0.1.30**: mehrere feste Uhrzeiten je Zeitauslöser, Zustandsauslöser für jede Änderung und mehrere Entitäten, Ereignis-Auslöser mit optionalem JSON-Datenfilter sowie native HA-Zeitbedingungen. Vollständige Poolpumpen-Automation als Import-/Projekt-/YAML-Regressionstest. 114 Blocktypen.

Neu in **0.1.28**: Zustandslisten, optionale Trigger-IDs und der Block **Ausgelöst durch ID**; allgemeine HA-Aktionen mit mehreren Zielentitäten, Metadaten und erhaltenen leeren Datenobjekten. Die PC/TV-Vierfach-Tasterautomation wird vollständig importiert. **Einzelne Automation · HA-Editor** gibt keine oberste Automations-ID aus; Trigger-IDs bleiben erhalten. Gespeicherte Projekt-IDs und IDs im Dateilistenformat bleiben erhalten. Jetzt 112 Blocktypen mit DE/EN/FR-Bildern.

Neu in **0.1.26**: **Blocks-Sprache → Systemsprache / Deutsch / English / Français**. Übersetzte Blocktexte, Dropdowns, Hilfetexte, Kategorien und originale Blockly-Dialoge; übrige App-Oberfläche und Diagnosen weiterhin deutsch. Regionale Browsersprachen werden erkannt, nicht unterstützte Sprachen fallen auf Englisch zurück. Der Wechsel sichert ein gültiges Projekt und lädt Blockly neu; bei unvollständigen Blocks oder gesperrtem Speicher bleibt die Ansicht erhalten. IDs, Nutzereingaben, Variablen, Templates und YAML bleiben unverändert. Benutzerdefinierte Pakete behalten ihre Autorenbeschriftung. [Französische Dokumentation](https://opensource.ugso-software.de/fr/projects/blocks-for-ha/). 111 Blockbilder je Sprache; reproduzierbar mit `tests/render-localized-docs.mjs` und `BLOCK_DOC_IMAGES` als Ausgabeordner.

Neu in **0.1.18**: eigener Block-/Template-Editor als 95%-Dialog, mehrere Blocks pro deklarativem HA-/Jinja-Paket, Kategorie Benutzerdefiniert, JSON-/ZIP-Import und Export. Projektdateien sichern verwendete Definitionen mit. [Editor und Grenzen](https://opensource.ugso-software.de/projects/blocks-for-ha/custom-blocks), [Paketkatalog mit Code und Downloads](https://opensource.ugso-software.de/projects/blocks-for-ha/catalog/).

Neu in **0.1.17**: Suchdialog in allen Entitätsfeldern, lesende Supervisor-Anbindung, passende Licht-/Script-/Helferfilter und manuelle IDs als Rückfall. [Entitätsauswahl](https://opensource.ugso-software.de/projects/blocks-for-ha/entities).

Neu in **0.1.16**: gespeicherte Theme-Auswahl UGSo Standard/Dark/Modern/Tritanopia und originaler Zoom-to-fit-Knopf. Eigene Blocks und Kategorien folgen den Theme-Paletten; Beschriftungen erhalten passende Kontraste. [Bedienung und Originalquellen](https://opensource.ugso-software.de/projects/blocks-for-ha/themes). Weiterhin 111 Blocktypen; YAML und Projekt bleiben beim Wechsel erhalten.

Neu in 0.1.10: **Erhöhe Variable um …** steht im Variablen-Menü zwischen Setzen und Lesen. Standard-Schritt `1`, negative Schritte verringern, Dezimalschritte und `0` sind möglich. Die Variable vorher als Zahl setzen. Fehlende Werte, Text, Boolean und null führen bei der Jinja-Auswertung in HA zu einem Fehler; keine automatische Umwandlung oder Null-Initialisierung. Eigenes YAML-Ausgabeformat wird wieder als Erhöhen-Block importiert, JSON erhält die Blockform.

Neu in 0.1.9: **Logik** mit Vergleich (=, ≠, <, ≤, >, ≥), kompaktem UND/ODER, NICHT, wahr/falsch, null und bedingter Wertauswahl. Zahl/Text/Variable/Template an die Werteingänge, Boolean an die Bedingungseingänge anschließen. Variablenzuweisungen unterstützen jetzt Boolean und null. JSON bewahrt Blockformen; YAML-Import erhält komplexe Ausdrücke als Template-Blocks. Vergleiche konvertieren Typen nicht automatisch. Ausdruckseingänge akzeptieren einzelne Jinja-Ausgaben; dynamische Werte sind nicht als feste Grenzen oder Wartezeiten vorgesehen.

Version 0.1.33: experimentelle HA-App für native Home-Assistant-Automationen aus visuellen Blocks im gemeinsamen Repository mit UGSo Visual Studio unter `blocks_for_ha/`. Home Assistant führt das erzeugte YAML aus; dieser Editor enthält keine JavaScript-Script-Engine und schreibt keine HA-Systemdateien.

Seit **0.1.27**: gut lesbare weiße Beschriftung der UGSo-Blocks in Standard/Dark mit mindestens 4,5:1 Kontrast. Mittlere blaue und braune Flächen werden leicht abgedunkelt; originale helle Modern-/Tritanopia-Farben behalten dunkle, kontrastreiche Labels. Die Dokumentationsbilder DE/EN/FR werden mit einer Prüfung der tatsächlich gerenderten Beschriftungen erzeugt.

Seit 0.1.25 rechts **YAML → Code importieren** wählen, YAML einfügen und **Importieren** klicken. Ohne Haken werden Auslöser, Bedingungen und Aktionen ergänzt; Name, Einstellungen und vorhandene Blockdefinitionen bleiben erhalten. Mit **Aktuelle Automation vollständig ersetzen** erfolgt nach einer Bestätigung ein kompletter Ersatz. Eine unterstützte Automation als Objekt oder Liste mit einem Eintrag, maximal 1 MB. Ungültiger Code oder Abbruch lässt den aktuellen Stand erhalten. Einfügetext bleibt beim Moduswechsel für diese Seite erhalten; nach Erfolg erscheint wieder die Ausgabe. Für Ergänzen muss die aktuelle Automation gültig sein.

Neu in 0.1.12: **Konvertierung** mit neun Blocks für Zahl, Logikwert, String, Typ, Datumswert, Datumsformat/-bestandteile, Zeitdifferenz, JSON lesen und JSON schreiben mit Formatierungs-Haken. HA-Konvertierungsregeln, ausdrückliche Unix-/Dauereinheiten, dynamischer Format-Eingang und typisierter Laufzeitzahlen-Anschluss für Vergleiche, Variablen und Zeitrechnung. Feste Auslösergrenzen und Wartezeiten bleiben Konstanten. JSONata ist als offene Erweiterung dokumentiert. [Gegenüberstellung und Beispiele](https://opensource.ugso-software.de/projects/blocks-for-ha/conversion).

Neu in 0.1.11: sieben Datum-/Zeit-Blocks: feste und andockbare Uhrzeitvergleiche, aktueller Datumswert, Kalenderbeginn, nächste Sonnenzeit mit Offset, Zeitaddition/-subtraktion und Formatierung. Zeiträume funktionieren über Mitternacht. Eigener typisierter Time-Anschluss für Datumswerte; Jinja wird in HA ausgewertet. JSON erhält die Blockformen, YAML-Import erhält Zeittemplates als allgemeine Template-Blocks. [Anleitung und ioBroker-Gegenüberstellung](https://opensource.ugso-software.de/projects/blocks-for-ha/time).

Die kompakte Ansicht verwendet den klassischen Blockly-Geras-Renderer und seine Puzzle-Andockformen. Startansicht und Einpassen bleiben für kleine Automationen bei höchstens 80 Prozent; manuelles Zoomen ist weiterhin möglich.

## Installation als HA-App

Neu in **0.1.13**: 18 Blocks für Timeouts, Objekt, Logik, Schleifen und Listen. Pausen mit Einheiten/Laufzeitwerten, Warten bis mit Timeout, Lauf stoppen, native Wiederholungen, lokale Objektzugriffe/-zuweisungen, Fallauswahl, Bereichsvergleich, Ersatzwert und Listen. [Gegenüberstellung, Originalquellen und Grenzen](https://opensource.ugso-software.de/projects/blocks-for-ha/flow). Benannte JavaScript-Timer werden nicht nachgebildet; HA-Scripts und Timer-Helfer bleiben verfügbar.

Im HA-App-Store das gemeinsame Repository aktualisieren, **UGSo Blocks for HA** installieren, starten und über **Weboberfläche öffnen** verwenden. [Installationsanleitung](DOCS.md). Das Paket unterstützt amd64 und aarch64 und stellt den Editor über Ingress bereit. Entitätsauswahl aus HA ist seit 0.1.17 vorhanden; die Live-Aktionsauswahl folgt später.

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

Entitätsfelder öffnen seit 0.1.17 eine Suche nach Name und ID. Die HA-App lädt die Zustandsliste lesend über den Supervisor; Licht, Scripts und Helfer erhalten passende Filter. Ohne Verbindung bleiben manuelle IDs verfügbar. Tokens bleiben im Server und werden nicht in Blockprojekte oder YAML exportiert. [Bedienung, lokale Anbindung und Grenzen](https://opensource.ugso-software.de/projects/blocks-for-ha/entities).

Suche steht am Ende des Menüs. Plus/Minus ergänzt und entfernt die letzten Bedingungseingänge oder Falls-Zweige; S schaltet Sonst um. Das Zahnrad bleibt zum Umordnen. [Liste aller 111 Blocks mit Bildern und Originalplugin-Links](https://opensource.ugso-software.de/projects/blocks-for-ha/blocks).

Variablen: im Menü **Variablen → Variable erstellen** einen Namen anlegen, beispielsweise `leistung`. **Setze** in die Aktionskette hängen und Zahl, Text oder Template anschließen; der Lesen-Block erzeugt `{{ leistung }}` für eine spätere Log-Meldung oder Variablenzuweisung. Im Dropdown sind Umbenennen und Löschen verfügbar. Freie Template-Texte werden beim Umbenennen nicht verändert. Namen benötigen ASCII-Buchstaben, Ziffern und `_`, keine führende Ziffer. Variablen gelten für den jeweiligen HA-Lauf und sind keine persistenten Helfer.

Die Kategorie **Templates** bietet eigene Wert- und Boolean-Bedingungsblocks mit mehrzeiliger Jinja-Eingabe. Vorlagen einschließlich `{{ ... }}`/`{% ... %}` eingeben. Blocks prüft Anschlussformen und YAML, führt Jinja aber nicht lokal aus und prüft keine HA-Entitäten oder Jinja-Syntax. Variablen erst setzen, dann in späteren Aktionen verwenden; Aktionsvariablen stehen nicht in den vorgelagerten Automationsbedingungen bereit. Der Import unterstützt eine Zahl, einen Text/Template, Boolean oder null pro Variablen-Aktion; mehrere Einträge, Listen/Objekte und Automationsvariablen auf oberster Ebene werden ausdrücklich abgelehnt. Native Syntax: [HA Define variables](https://www.home-assistant.io/docs/scripts/#define-variables).

## Dateien auf dem Rechner

**Kopieren** kopiert die YAML-Ausgabe. **Speichern** lädt sie als `.yaml` herunter. **Öffnen** lädt eine YAML-Datei vom Rechner und übersetzt unterstützte Strukturen zurück in Blocks. Nicht unterstützte Felder werden mit einem Hinweis zurückgewiesen; die aktuelle Automation bleibt dabei erhalten. Eine Datei darf genau eine Automation als Objekt oder als Liste mit einem Eintrag enthalten.

Unter **Projekt & Beschreibung** lässt sich zusätzlich das Blocks-Projekt als JSON mit Blockpositionen sichern und öffnen. Der letzte Stand wird automatisch lokal im Browser gespeichert. Zum Öffnen und Laden eines Beispiels erscheint vor dem Ersetzen eine Bestätigung.

Für den nativen HA-Editor das Format „Einzelne Automation“ wählen, Beispiel-Entitäten ersetzen und die Ausgabe in „Als YAML bearbeiten“ übernehmen. Vor Verwendung Aktionen und Zielentitäten in HA prüfen. Eine Prüfung in diesem Prototyp bestätigt nur die unterstützte Struktur, nicht die tatsächliche HA-Installation.

## Geplante Erweiterungen

Live-Aktionsauswahl, Entitäts-Wertblocks, deklarative Blockpakete und Katalog, weitere native HA-Strukturen. Die Roadmap liegt im ATLAS-Repository unter `docs/UGSO_BLOCKS_FOR_HA_ROADMAP.md`. Die HA-App ist ein eigenständiges Projekt und kein bereits integriertes ATLAS-Plugin.

## Original und Lizenzen

Built with [Blockly](https://www.blockly.com/), der Open-Source-Bibliothek der Raspberry Pi Foundation, ursprünglich entwickelt bei Google. Eigene HA-Blocks auf Basis von Blockly 13.3.0; kein Fork des ioBroker-Adapters.

Eigener Code: Apache-2.0. Blockly: Apache-2.0. YAML-Bibliothek: ISC. ZIP-Bibliothek fflate: MIT. Original-Lizenztexte liegen unter `public/licenses/` und werden beim Build mitgeliefert. Das Projekt verwendet ein eigenes Erscheinungsbild und ist kein offizielles Produkt von Home Assistant oder Blockly.

## Built with Blockly

Blockly ist eine Open-Source-Entwicklerbibliothek der Raspberry Pi Foundation, ursprünglich bei Google entwickelt. Das unveränderte offizielle Badge erscheint im Fußbereich und Lizenzdialog, mit Link zu Blockly, 32 Pixel Höhe und Freiraum. Beide Original-SVGs werden lokal ausgeliefert. [Attributionshinweise](https://docs.blockly.com/guides/app-integration/attribution/).

## Home-Assistant-Seitenleiste

Seit 0.1.20 zeigt der HA-Seitenleisteneintrag das einfarbige Baustein-Symbol `mdi:toy-brick-outline`. Nach dem App-Update und Neustart „In der Seitenleiste anzeigen“ einschalten; bei alter Anzeige die HA-Seite neu laden. Die native App-Konfiguration verwendet MDI-Icons statt einer eigenen farbigen SVG-Datei. Das farbige UGSo-Icon bleibt im App-Store und Editor. [HA-Konfiguration](https://developers.home-assistant.io/docs/apps/configuration/) · [Originalicon](https://pictogrammers.com/library/mdi/icon/toy-brick-outline/).

Seit 0.1.21: **Suchen** in der Arbeitsbereichsleiste findet platzierte Blocks, auch eigene HA- und Benutzerdefiniert-Blocks. Strg/Cmd+F gilt im Arbeitsbereich; Enter und Umschalt+Enter wechseln Treffer, Escape schließt. Die Suche am Menüende bleibt zum Hinzufügen neuer Blocks. **?** öffnet die Tastaturhilfe. Blockly 13.3 bringt Tastaturnavigation mit; zusätzliche Pos1/Ende-, Bild-auf/ab- und Scroll-Tastenkürzel sind aktiviert. Original: https://github.com/raspberrypifoundation/blockly-samples/tree/main/plugins/workspace-search · https://docs.blockly.com/guides/configure/keyboard-nav/

Seit 0.1.22: **Darstellung** im Kopfbereich bietet **Hell**, **Dunkel** und **System** für die gesamte App-Oberfläche, einschließlich Dialogen, Entitätsauswahl und Block-/Template-Editor. Standard ist System; Änderungen der Betriebssystem-Farbpräferenz werden live übernommen. Die Auswahl wird lokal gespeichert. Das Blockly-Theme bleibt unabhängig wählbar. Originale Built-with-Blockly-Badges wechseln passend zur Darstellung.

Seit 0.1.23 ist der obere Einleitungs-/Einstellungsbereich kompakter: kleinere Überschrift, weniger Abstände und 32 Pixel hohe Projektfelder/-knöpfe lassen mehr Platz für die Arbeitsfläche. HA-Verbindungsstatus und Entitätsanzahl stehen ebenfalls in der Einstellungsleiste und bleiben auf schmalen Bildschirmen sichtbar.

Seit 0.1.24 lässt sich die HA-Ausgabe mit dem Pfeil rechts oben nach rechts einklappen. Der Editor erhält die freie Breite; die schmale HA-Ausgabe-Leiste öffnet das Panel wieder. Der Zustand wird lokal gespeichert. Auf Mobilgeräten bleibt eine kompakte Zeile unter dem Editor. YAML und Projekte bleiben unverändert.
