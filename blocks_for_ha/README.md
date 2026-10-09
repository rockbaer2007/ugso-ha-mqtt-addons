# UGSo Blocks for HA

Version 0.1.1: lokaler Prototyp für native Home-Assistant-Automationen aus visuellen Blocks, jetzt im gemeinsamen Repository mit UGSo Visual Studio unter `blocks_for_ha/`. Home Assistant führt das erzeugte YAML aus; dieser Editor enthält keine JavaScript-Script-Engine und schreibt keine HA-Systemdateien.

## Starten

Im Verzeichnis `blocks_for_ha/` Node.js 22.12 oder neuer verwenden. `npm install`, dann `npm run dev`. Oberfläche: http://127.0.0.1:4180/. `npm test` prüft die Erzeugung und den Import; `npm run build` erstellt die auslieferbare Weboberfläche. Noch kein installierbares HA-Add-on.

## Unterstützte Blocks

- Auslöser: Zustand, Zahl über/unter Grenze, Uhrzeit, Sonne und HA-Start.
- Bedingungen: Zustand, Zahlenvergleich, UND/ODER/NICHT.
- Aktionen: Ein/Aus/Umschalten, generische HA-Aktion mit optionalem Entitätsziel und JSON-Daten, Wartezeit und Wenn/Dann/Sonst.
- Metadaten: Name, Beschreibung, ID sowie single/restart/queued/parallel; maximale Anzahl bei queued/parallel.

Entitäten zunächst als IDs eingeben. Eine Live-HA-Verbindung ist noch nicht implementiert. Die backendseitige Supervisor-/Token-Verbindung von UGSo Visual Studio ist als Vorlage für eine spätere Anbindung vorgesehen; hinzu kommen die HA-Aktionsbeschreibungen. Tokens dürfen nicht in Blockprojekte oder YAML exportiert werden.

## Dateien auf dem Rechner

**Kopieren** kopiert die YAML-Ausgabe. **Speichern** lädt sie als `.yaml` herunter. **Öffnen** lädt eine YAML-Datei vom Rechner und übersetzt unterstützte Strukturen zurück in Blocks. Nicht unterstützte Felder werden mit einem Hinweis zurückgewiesen; die aktuelle Automation bleibt dabei erhalten. Eine Datei darf genau eine Automation als Objekt oder als Liste mit einem Eintrag enthalten.

Unter **Projekt & Beschreibung** lässt sich zusätzlich das Blocks-Projekt als JSON mit Blockpositionen sichern und öffnen. Der letzte Stand wird automatisch lokal im Browser gespeichert. Zum Öffnen und Laden eines Beispiels erscheint vor dem Ersetzen eine Bestätigung.

Für den nativen HA-Editor das Format „Einzelne Automation“ wählen, Beispiel-Entitäten ersetzen und die Ausgabe in „Als YAML bearbeiten“ übernehmen. Vor Verwendung Aktionen und Zielentitäten in HA prüfen. Eine Prüfung in diesem Prototyp bestätigt nur die unterstützte Struktur, nicht die tatsächliche HA-Installation.

## Geplante Erweiterungen

Eigenständige HA-App, Entitäts-/Aktionsauswahl, deklarative Blockpakete und Katalog, weitere native HA-Strukturen. Die Roadmap liegt im ATLAS-Repository unter `docs/UGSO_BLOCKS_FOR_HA_ROADMAP.md`. Der Prototyp ist ein eigenständiges Projekt und kein bereits integriertes ATLAS-Plugin.

## Original und Lizenzen

Built with [Blockly](https://www.blockly.com/), der Open-Source-Bibliothek der Raspberry Pi Foundation, ursprünglich entwickelt bei Google. Eigene HA-Blocks auf Basis von Blockly 13.3.0; kein Fork des ioBroker-Adapters.

Eigener Code: Apache-2.0. Blockly: Apache-2.0. YAML-Bibliothek: ISC. Original-Lizenztexte liegen unter `public/licenses/` und werden beim Build mitgeliefert. Das Projekt verwendet ein eigenes Erscheinungsbild und ist kein offizielles Produkt von Home Assistant oder Blockly.
