# UGSo Blocks for HA

Version 0.1.5: experimentelle HA-App für native Home-Assistant-Automationen aus visuellen Blocks im gemeinsamen Repository mit UGSo Visual Studio unter `blocks_for_ha/`. Home Assistant führt das erzeugte YAML aus; dieser Editor enthält keine JavaScript-Script-Engine und schreibt keine HA-Systemdateien.

Die kompakte Ansicht verwendet den klassischen Blockly-Geras-Renderer und seine Puzzle-Andockformen. Startansicht und Einpassen bleiben für kleine Automationen bei höchstens 80 Prozent; manuelles Zoomen ist weiterhin möglich.

## Installation als HA-App

Im HA-App-Store das gemeinsame Repository aktualisieren, **UGSo Blocks for HA** installieren, starten und über **Weboberfläche öffnen** verwenden. [Installationsanleitung](DOCS.md). Das Paket unterstützt amd64 und aarch64 und stellt den Editor über Ingress bereit. Direkte Entitäts-/Aktionsauswahl aus HA folgt später.

[Open-Source-Dokumentation](https://opensource.ugso-software.de/projects/blocks-for-ha/): Falls-Blocks lassen sich über das Zahnrad um sonst-falls-Zweige und einen optionalen sonst-Zweig erweitern. Mehrere Zweige erzeugen native HA-`choose`-Aktionen.

## Starten

Im Verzeichnis `blocks_for_ha/` Node.js 22.12 oder neuer verwenden. `npm install`, dann `npm run dev`. Oberfläche: http://127.0.0.1:4180/. `npm test` prüft die Erzeugung und den Import; `npm run build` erstellt die auslieferbare Weboberfläche.

## Unterstützte Blocks

Die vollständige Gegenüberstellung zu ioBroker einschließlich Umsetzungsstatus steht in [ioBroker / UGSo Blocks für HA](docs/iobroker-comparison.de.md). Bei jeder Erweiterung wird diese Liste zusammen mit der [englischen Fassung](docs/iobroker-comparison.en.md) aktualisiert.

- Auslöser: Zustand, Zahl über/unter Grenze, Uhrzeit, Sonne und HA-Start.
- Bedingungen: Zustand, Zahlenvergleich, UND/ODER/NICHT.
- Werte: Zahl mit seitlichem Output; Grenzen und Wartezeiten nutzen ersetzbare Shadow-Zahlen.
- Aktionen: Ein/Aus/Umschalten, generische HA-Aktion mit optionalem Entitätsziel und JSON-Daten, Wartezeit und Wenn/Dann/Sonst.
- Metadaten: Name, Beschreibung, ID sowie single/restart/queued/parallel; maximale Anzahl bei queued/parallel.

Bedingungen sind Boolean-Wertblocks für seitliche Werteingänge bei Falls und Nur wenn. UND/ODER/NICHT besitzt ein Zahnrad für weitere Bedingungen. Aktionen bleiben vertikale Statement-Ketten. Alte Projekte werden automatisch umgestellt. Deaktivierte Blocks werden beim Export übersprungen; fehlende Pflichtinhalte verhindern den Export. Das Kontextmenü verlinkt Hilfe, der Papierkorb erlaubt das Zurückholen gelöschter Blocks innerhalb der Sitzung.

Entitäten zunächst als IDs eingeben. Eine Live-HA-Verbindung ist noch nicht implementiert. Die backendseitige Supervisor-/Token-Verbindung von UGSo Visual Studio ist als Vorlage für eine spätere Anbindung vorgesehen; hinzu kommen die HA-Aktionsbeschreibungen. Tokens dürfen nicht in Blockprojekte oder YAML exportiert werden.

## Dateien auf dem Rechner

**Kopieren** kopiert die YAML-Ausgabe. **Speichern** lädt sie als `.yaml` herunter. **Öffnen** lädt eine YAML-Datei vom Rechner und übersetzt unterstützte Strukturen zurück in Blocks. Nicht unterstützte Felder werden mit einem Hinweis zurückgewiesen; die aktuelle Automation bleibt dabei erhalten. Eine Datei darf genau eine Automation als Objekt oder als Liste mit einem Eintrag enthalten.

Unter **Projekt & Beschreibung** lässt sich zusätzlich das Blocks-Projekt als JSON mit Blockpositionen sichern und öffnen. Der letzte Stand wird automatisch lokal im Browser gespeichert. Zum Öffnen und Laden eines Beispiels erscheint vor dem Ersetzen eine Bestätigung.

Für den nativen HA-Editor das Format „Einzelne Automation“ wählen, Beispiel-Entitäten ersetzen und die Ausgabe in „Als YAML bearbeiten“ übernehmen. Vor Verwendung Aktionen und Zielentitäten in HA prüfen. Eine Prüfung in diesem Prototyp bestätigt nur die unterstützte Struktur, nicht die tatsächliche HA-Installation.

## Geplante Erweiterungen

Entitäts-/Aktionsauswahl, deklarative Blockpakete und Katalog, weitere native HA-Strukturen. Die Roadmap liegt im ATLAS-Repository unter `docs/UGSO_BLOCKS_FOR_HA_ROADMAP.md`. Die HA-App ist ein eigenständiges Projekt und kein bereits integriertes ATLAS-Plugin.

## Original und Lizenzen

Built with [Blockly](https://www.blockly.com/), der Open-Source-Bibliothek der Raspberry Pi Foundation, ursprünglich entwickelt bei Google. Eigene HA-Blocks auf Basis von Blockly 13.3.0; kein Fork des ioBroker-Adapters.

Eigener Code: Apache-2.0. Blockly: Apache-2.0. YAML-Bibliothek: ISC. Original-Lizenztexte liegen unter `public/licenses/` und werden beim Build mitgeliefert. Das Projekt verwendet ein eigenes Erscheinungsbild und ist kein offizielles Produkt von Home Assistant oder Blockly.
