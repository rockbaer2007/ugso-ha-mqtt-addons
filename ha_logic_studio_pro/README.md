# HA Logic Studio Pro 0.1.33

**Blocks JS → Sendto** enthält zwei neue violette AWTRIX-NG-Blöcke. **Benachrichtigung** bietet Nachricht, Farbe, Ton, Icon, Wiederholungen, Dauer, Stapeln, Aufwecken und Halten. **Sound abspielen** akzeptiert einen gespeicherten Tonnamen oder RTTTL.

Das MQTT-Präfix aus AWTRIX-NG in den Block eintragen und die verwendeten Topics unter `runtime_mqtt_topics` freigeben, etwa `awtrixNG/cmd/notify` und `awtrixNG/cmd/audio/play`. Die HA-MQTT-Integration und AWTRIX-NG müssen denselben Broker verwenden. Die Blöcke senden ohne Retain. [AWTRIX-NG-MQTT-Dokumentation](https://ang.blueforcer.de/esp32/reference/mqtt/)

**Blocks JS → Sendto** enthält MQTT-Nachricht senden, HA-Benachrichtigung senden und HA-Ereignis senden. Der Testlauf zeigt die Aufrufe im Protokoll. Für **Play** gelten die Freigaben in der App-Konfiguration.

- **MQTT:** MQTT-Integration in HA einrichten und das genaue Topic unter `runtime_mqtt_topics` eintragen. **Retain** ist standardmäßig aus.
- **Benachrichtigung:** Die gewünschte `notify.*`-Entität unter `runtime_write_entities` eintragen. Der Block verwendet `notify.send_message` mit Nachricht und optionalem Titel.
- **Ereignis:** Einen eigenen Namen mit Präfix `logic_studio_` unter `runtime_events` eintragen. Ein Datenobjekt ist optional. Derselbe Ereignisname kann im Trigger „Bei Ereignis“ oder in einer HA-Automation verwendet werden.

**Blocks JS → Aktionen** bietet HA-Aktion, HA-Aktion mit Daten, Taster drücken und Option auswählen. Die rosafarbenen Blöcke orientieren sich bei Form und Feldanordnung an ioBroker.

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
