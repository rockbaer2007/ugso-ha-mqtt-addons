# HA Logic Studio Pro

HA Logic Studio Pro ist eine Home-Assistant-App zum Erstellen, Prüfen und Ausführen von Automationen und Logik. Projekte und Ordner werden pro Home-Assistant-Benutzer gespeichert. Die Oberfläche gibt es auf Deutsch, Englisch und Französisch.

**Lokaler Teststand 0.1.133** · Noch nicht veröffentlicht. [Bisheriges GitHub-Release 0.1.132](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/releases/tag/ha-logic-studio-pro-v0.1.132)

## Neu im lokalen Teststand

**Sensorzustand setzen** steht unter System in Blocks A und Blocks JS bereit. Wähle einen vorhandenen `sensor.*` und verbinde einen Zahlen-, Text- oder Berechnungsbaustein. Einheit, Geräteklasse und andere Attribute bleiben erhalten. Der Sensor benötigt WRITE-Freigabe in den App-Einstellungen. Eine Integration kann den gesetzten Wert wieder überschreiben; es wird kein Gerät geschaltet und kein dauerhafter Sensor angelegt.

Blocks JS verwendet `ha.setSensorState("sensor.beispiel", 42)`. Blocks A erzeugt das native Ereignis `logic_studio_set_sensor_state`; die laufende Studio-App verarbeitet es mit denselben WRITE-Freigaben. Ohne laufende App wird dieses Ereignis nicht verarbeitet. YAML-Vorschau und JS-Testlauf führen keine echten Schreibzugriffe aus. Fehler der Blocks-A-Brücke stehen im App-Protokoll.

**Neuer Funktionsplan** öffnet jetzt immer die Namens- und Ordnerauswahl. Jeder Plan startet leer und wird unabhängig gespeichert. Vorhandene Funktionspläne und ihre Zuordnung bleiben erhalten. Angehaltene Pläne lassen sich wie andere Projekte löschen.

English and French usage notes: [Sensor state and function plans](docs/sensor-state.md).

## Installation und Update

1. In Home Assistant **Einstellungen → Apps → App-Store → ⋮ → Repositorys** öffnen und `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` hinzufügen.
2. **HA Logic Studio Pro** auswählen, **Installieren** und anschließend **Starten** wählen. Die App unterstützt `amd64` und `aarch64`.
3. **Benutzeroberfläche öffnen** wählen. Über **+** ein Projekt und den gewünschten Editor auswählen.

Für eine bestehende Installation aus dem Sammelrepo in der App-Übersicht **Nach Updates suchen** und bei HA Logic Studio Pro **Aktualisieren** wählen.

## Welcher Editor passt?

| Editor | Wofür er gedacht ist |
| --- | --- |
| **Funktionsplan** | Logik mit verbundenen Bausteinen wie Timern, Zählern und Merkern aufbauen, simulieren und im Betrieb Ein- und Ausgänge beobachten. |
| **Rules** | Automationen aus Auslösern, Bedingungen und Aktionen mit DANN- und SONST-Zweigen erstellen und als HA-YAML exportieren. |
| **Blocks A** | Native Home-Assistant-Automationen mit visuellen Blöcken aufbauen und als YAML ausgeben. |
| **Blocks JS** | JavaScript-Logik mit Blöcken erstellen, testen und auf dem HA-Server ausführen. Beim ioBroker-Blockly-Import lassen sich Entitäten zuordnen und nötige Anpassungen am Block nachlesen. |
| **JavaScript** | Skripte mit Autovervollständigung und Funktionssignaturen für die HA-Skript-API schreiben und testen. |
| **TypeScript** | Skripte mit Typprüfung schreiben. Fehler werden an der betroffenen Codezeile angezeigt. |
| **HA-YAML** | Automationen und Skripte als YAML bearbeiten, prüfen und exportieren. Die grafische Vorschau zeigt den Ablauf der Automation. |

## ioBroker-Import in Blocks JS

Blockly-XML lässt sich in den Expertenwerkzeugen importieren. Die Importprüfung zeigt, welche Entitäten du zuordnen und welche Blöcke du anpassen musst. Seit 0.1.129 kann `state_exists_var` auch berechnete ioBroker-IDs prüfen. Eine vorhandene zugeordnete HA-Entität liefert `true`, eine fehlende `false`. Ohne Zuordnung nennt das Protokoll die berechnete ID. [Anleitung für Blocks JS](https://opensource.ugso-software.de/projects/logic-studio/user-guide/blocks-js#berechnete-iobroker-id-auf-existenz-prufen)

Beim Import von `control_instance` bleiben Adapterinstanz und Aktion sichtbar. Im Blockly-Importtest auf dem Testsystem PC (64) zeigte der Block `admin.0 · Neustart` und nannte die passenden HA-Aktionen für Apps und Integrationen. Play blockierte den Platzhalter. Der Test löste keinen Neustart aus.

## Testlauf und Live-Ausführung

### Entitäten auswählen

Funktionsplan, Rules, Blocks A, Blocks JS, HA-YAML, JavaScript und TypeScript verwenden dieselbe durchsuchbare Entitätenauswahl. Auch die Zuordnung beim ioBroker-Import nutzt sie. Tippe einen Namen oder eine Entitäts-ID ein; verfügbare Bereiche und Gerätenamen lassen sich ebenfalls suchen. Treffer zeigen Symbol, Anzeigename, Bereich/Gerät, Entitäts-ID und Zustand. Weitere Treffer können nachgeladen werden. Pfeiltasten und Eingabe wählen einen Treffer, Escape klappt die Liste ein. Gespeicherte IDs bleiben auch dann erhalten, wenn eine Entität gerade nicht verfügbar ist.

Attribut-, Ausgangsmodus-, Mehrfachauswahl- und manuelle ID-Eingaben bleiben erhalten. Die Auswahl liest nur den Katalog: Sie erteilt **keine** Runtime-Berechtigungen. Für einen HA-Eingang die genaue ID unter `runtime_read_entities` freigeben; schreibende Ziele gehören nach gesonderter Prüfung unter `runtime_write_entities`. Vorhandene Freigaben nicht ersetzen.

**Testlauf** verwendet simulierte Werte und Ereignisse. **Play** startet gespeicherte Projekte aus Funktionsplan, Blocks JS, JavaScript und TypeScript in der App auf dem HA-Server. Für die Live-Ausführung werden die benötigten Entitäten, Ereignisse und MQTT-Themen in der App-Konfiguration freigegeben. YAML-Exporte aus Rules, Blocks A und HA-YAML lassen sich in Home Assistant übernehmen.

### Vier getrennte „Alle“-Freigaben

Unter **App → Konfiguration** stehen ab 0.1.132 vier separate Schalter:

| Schalter | Zugehörige Liste | Wirkung bei Ein |
| --- | --- | --- |
| READ – alle Entitäten lesen (`runtime_read_all`) | `runtime_read_entities` | Alle gültigen HA-Entitäts-IDs lesbar, einschließlich neuer Entitäten. |
| WRITE – alle Ziele freigeben (`runtime_write_all`) | `runtime_write_entities` | Alle Ziel-IDs für die bereits unterstützten Runtime-Aktionen erlaubt. |
| EVENT – alle Ereignistypen freigeben (`runtime_events_all`) | `runtime_events` | Alle unterstützten Ereignistypen erlaubt; abonnierte Ereignisse werden empfangen. |
| TOPICS – alle MQTT-Topics freigeben (`runtime_mqtt_all`) | `runtime_mqtt_topics` | Publizieren auf allen konkreten MQTT-Topics erlaubt. |

Alle Schalter sind standardmäßig **aus**. Bei **Ein** wird nur die zugehörige Liste ignoriert, nicht gelöscht. Bei **Aus** gelten ihre gespeicherten Einträge wieder. Die HA-Standardmaske lässt die Liste weiterhin bearbeiten; sie wird dort nicht automatisch grau geschaltet. Die Namen und Beschreibungen sind in DE/EN/FR verfügbar.

Für den Solarleistungssensor genügt **READ**. WRITE, EVENT und TOPICS müssen dafür nicht aktiviert werden. Laufende Projekte nach einer Änderung neu starten; bei Bedarf die App neu starten. ID-/Aktionsprüfung, konkrete MQTT-Topics ohne `+`/`#` und die bestehende Begrenzung gesendeter Ereignisse auf `logic_studio_*` bleiben bestehen. Es werden keine Rechte an HA-Benutzern oder anderen Apps geändert.

## Bedienungsanleitung und Entwicklung

- **Bedienungsanleitung mit Beispielen und Screenshots** · [Deutsch](https://opensource.ugso-software.de/projects/logic-studio/user-guide) · [English](https://opensource.ugso-software.de/en/projects/logic-studio/user-guide) · [Français](https://opensource.ugso-software.de/fr/projects/logic-studio/user-guide)
- [Changelog](CHANGELOG.md)
- [Roadmap](ROADMAP.md)
