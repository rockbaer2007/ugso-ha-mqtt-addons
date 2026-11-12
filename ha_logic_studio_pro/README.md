# HA Logic Studio Pro 0.1.30

**Blocks JS → System** enthält die Lese- und Steuerblöcke in der vertrauten ioBroker-Anordnung. Schalten und Umschalten unterstützen eine optionale Verzögerung. Aktionen für HA-Skripte unterliegen der Liste freigegebener Schreibziele.

Alle Editoren übernehmen Entwürfe erst mit **Speichern**. **Abbrechen** verwirft die Änderungen seit dem letzten Speichern. Bei einem neuen Projekt verwirft es den ganzen Entwurf. **Play** und **Neustart** sind bei ungespeicherten Änderungen gesperrt. Laufende Skripte lassen sich weiterhin stoppen. Testläufe können den aktuellen Entwurf verwenden.

Die Werkzeugleisten und Dialoge der Editoren wurden in Deutsch, Englisch und Französisch ergänzt. Der Funktionsplan startet über **Play** auf dem HA-Server. **Automatisch** reagiert auf freigegebene Eingänge. **Fester Zyklus** wertet den Plan alle 100 bis 60.000 ms aus. **Speichern** übernimmt den Entwurf. **Abbrechen** lädt den zuletzt gespeicherten Stand.

Der Projektbaum liegt pro Home-Assistant-Benutzer im App-Datenspeicher.
Zur Übernahme vorhandener Browserprojekte beim ersten Start den bisherigen
Browser mit demselben Home-Assistant-Benutzer öffnen. Das Projektmenü bietet
einen JSON-Download für lokale Entwürfe.

Blocks JS ergänzt HA-Auslöser, Attribute, parametrisierte Aktionen, Helferwerte,
Timer und Programmstruktur. Der JS-/TS-Testlauf simuliert Ereignisse und Timer.

Blocks A verwendet den Katalog von Blocks for HA 0.1.66 und exportiert native Home-Assistant-Automationen. Entitäten lassen sich direkt im jeweiligen Blockfeld auswählen. Blocks JS bietet eine eigene Palette für JavaScript mit HA-Entitäten, Aktionen und Auslösern.

**Play** startet JavaScript, TypeScript und den von Blocks JS erzeugten Code in einem serverseitigen QuickJS-Prozess. **Stopp** beendet ihn. Browserwechsel und geschlossene Tabs beenden ihn nicht. Nach einem App-Neustart müssen Skripte erneut gestartet werden. TypeScript wird transpiliert.

Die Live-Runtime verwendet die HA-WebSocket-API. In der App-Konfiguration stehen `runtime_read_entities`, `runtime_write_entities` und `runtime_events` anfangs leer. Entitäten für Aktionen sind zugleich lesbar. Änderungen an den Freigaben gelten nach einem Neustart der App.

- `ha.readState` und `ha.readAttribute` lesen die zuletzt bestätigten Werte. `ha.onState` und `ha.onAttribute` reagieren auf Änderungen. `ha.onEvent` verarbeitet freigegebene Ereignistypen.
- `ha.callAction` sendet Aktionen an einzeln freigegebene Ziele. Unterstützt werden Schaltaktionen für Licht, Lüfter, Schalter und Umschalt-Helfer, Wertänderungen für Zahlen-, Text- und Auswahlhelfer sowie Taster. HA bestätigt die Aktion asynchron. Bei einer Ablehnung oder einem Verbindungsverlust stoppt das Skript mit einer Meldung im Protokoll.
- `ha.schedule` verarbeitet die von Blocks JS erzeugten Zeitmuster und festen Uhrzeiten samt Wochentagen in der HA-Zeitzone. Verpasste Ausführungen werden nicht nachgeholt. Astro-Auslöser sind noch offen.
- Der **Testlauf** verwendet weiterhin Demo-Zustände und simulierte Ereignisse. **Play** verwendet die Live-Verbindung in Home Assistant.

- **Blocks A** exportiert HA-Automationen als YAML. Vorhandene Blockly-Projekte öffnen sich weiterhin in diesem Modus. HA-Skripte und HA-Automationen haben in der Projektliste kein Play-Symbol.
- **Blocks JS** erzeugt JavaScript und testet es mit Demo-Zuständen. HA-Aktionen erscheinen im Protokoll und werden nicht ausgeführt.
- Der ioBroker-Import liest den gespeicherten Blockly-Plan aus dem Export. Unbekannte Bausteine bleiben als rote Platzhalter sichtbar und blockieren die Ausgabe, bis sie ersetzt sind. Entitäten müssen auf HA-IDs angepasst werden.

Interner Entwicklungsstand mit eigenem App-Slug ha_logic_studio_pro. Die App startet manuell und verwendet ihren eigenen Datenspeicher.

Nach dem Start **Weboberfläche öffnen**. Über **＋ → HA-YAML** ein Skript oder eine Automation erstellen. Vorhandene YAML-Dateien können geöffnet, bearbeitet, auf Syntax und Grundstruktur geprüft und exportiert werden. Die Ausführung einer exportierten Konfiguration übernimmt Home Assistant nach dem manuellen Übernehmen.

Rules und Blocks erzeugen über **Als HA-YAML öffnen** einen separaten bearbeitbaren Tab. Der Funktionsplan bringt den bisherigen Editor mit Import, Export, Simulation und Entitätsauswahl mit.

JavaScript-Testläufe verwenden Demo-Zustände und protokollieren simulierte HA-Aktionen im Editor. Projekte und Ordner werden serverseitig gespeichert. Zum Verschieben die Sortierpfeile anklicken, Skripte in einen Ordner oder vor einen anderen Eintrag ziehen und mit den roten Pfeilen speichern.

Der HA-Konfigurationsordner ist für den Funktionsplan lesend eingebunden. Die Importfunktion sichert gelesene Quelldateien vor dem Parsen unter /data/ha-source-backups/.
