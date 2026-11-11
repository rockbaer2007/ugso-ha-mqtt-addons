# HA Logic Studio Pro 0.1.14

- **Blocks A** exportiert HA-Automationen als YAML. Vorhandene Blockly-Projekte öffnen sich weiterhin in diesem Modus. HA-Skripte und HA-Automationen haben in der Projektliste kein Play-Symbol.
- **Blocks JS** erzeugt JavaScript und testet es mit Demo-Zuständen. HA-Aktionen erscheinen im Protokoll und werden nicht ausgeführt.
- Der ioBroker-Import liest den gespeicherten Blockly-Plan aus dem Export. Unbekannte Bausteine bleiben als rote Platzhalter sichtbar und blockieren die Ausgabe, bis sie ersetzt sind. Entitäten müssen auf HA-IDs angepasst werden.

Öffentliche Testversion mit eigenem App-Slug `ha_logic_studio_pro`. Die App startet manuell und verwendet ihren eigenen Datenspeicher.

Die App im UGSo-App-Repository unter **HA Logic Studio Pro** installieren oder aktualisieren. Die GitHub-Ausgabe hat in Home Assistant eine eigene Installationskennung. Bei einem Wechsel aus „Local apps“ die bisherige Installation für browsergespeicherte Entwürfe behalten. YAML und Funktionspläne können als Dateien exportiert werden.

Auf .193 mit Home Assistant 2026.11.1 geprüft: YAML-Automation mit Auslöser und Aktion, JavaScript-Testlauf und ioBroker-Import mit verbundenem Uhrzeitblock und Platzhalter für `exec`. 39 automatisierte Tests bestanden.

Seit 0.1.13 zeigen JavaScript und TypeScript Syntaxfarben und Zeilennummern. Die Projektspalte passt seit 0.1.12 ihre Mindestbreite an die sichtbaren Namen an. Im Funktionsplan lassen sich seit 0.1.11 Verbindungen umhängen; Signalwerte werden direkt am Zieleingang angezeigt. TypeScript-Ausführung ist weiterhin offen.

Nach dem Start **Weboberfläche öffnen**. Über **＋ → HA-YAML** ein Skript oder eine Automation erstellen. Vorhandene YAML-Dateien können geöffnet, bearbeitet, auf Syntax und Grundstruktur geprüft und exportiert werden. Die Ausführung einer exportierten Konfiguration übernimmt Home Assistant nach dem manuellen Übernehmen.

Rules und Blocks erzeugen über **Als HA-YAML öffnen** einen separaten bearbeitbaren Tab. Der Funktionsplan bringt den bisherigen Editor mit Import, Export, Simulation und Entitätsauswahl mit.

JavaScript-Testläufe verwenden Demo-Zustände und protokollieren simulierte HA-Aktionen im Editor. Projekte und Ordner werden im aktuellen Browser gespeichert. Zum Verschieben die Sortierpfeile anklicken, Skripte in einen Ordner oder vor einen anderen Eintrag ziehen und mit den roten Pfeilen speichern.

Der HA-Konfigurationsordner ist für den Funktionsplan lesend eingebunden. Die Importfunktion sichert gelesene Quelldateien vor dem Parsen unter /data/ha-source-backups/.
