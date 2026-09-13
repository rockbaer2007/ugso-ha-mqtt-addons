# MQTT-Client

Version **0.1.6**. Zusätzlicher MQTT-Client für einen externen Broker, beispielsweise
den ioBroker-MQTT-Adapter im Modus **Server/Broker**. Dein HA-Broker und die vorhandene
MQTT-Integration bleiben bestehen. Die App verbindet sich direkt mit der HA-API und
dem externen Broker; sie ist keine Broker-Bridge.

## Installation und Einrichtung

1. Dieses Repository im Home-Assistant-App-Store hinzufügen:
   `https://github.com/rockbaer2007/ugso-ha-mqtt-addons`.
2. **MQTT-Client** installieren (amd64 oder aarch64).
3. **Open Web UI** öffnen und IP/Hostname, Port, Username und Passwort des
   ioBroker-Brokers eintragen. Port `1883` ist voreingestellt.
4. Links ein Gerät öffnen und darin eine HA-Entität anklicken. Zusammengehörige
   Switches, Sensorwerte, Updates, States und Attribute stehen wie in
   HA-Gerätedetails in einer Gruppe. Jede Entität zeigt den Namen zuerst und die Entity-ID
   klein darunter. Im Popup wählst du State, Attribute, den erkannten
   ioBroker-Zieltyp und bei unterstützten Domains optional
   **Bidirektional / Werte schreiben**.
   Rechts siehst du die aktuell ausgewählten Übertragungen.
5. Speichern. Die Weboberfläche zeigt rot **Keine Verbindung** und grün
   **Verbunden**. Änderungen an den Broker-Zugangsdaten werden sofort angewendet.

Beispiel mit Demo-Entitäten, die du durch deine eigenen ersetzen musst:

```yaml
broker_host: "192.168.1.20"
broker_port: 1883
username: "ha_client"
password: "DEIN_MQTT_PASSWORT"
tls: false
client_id: ugso-ha-mqtt-client
topic_prefix: ha_external
poll_interval: 5
entities:
  - sensor.wohnzimmer_temperatur
  - input_boolean.dashboard_christmas
entity_attributes:
  - sensor.wohnzimmer_temperatur:unit_of_measurement
  - sensor.wohnzimmer_temperatur:friendly_name
command_entities:
  - input_boolean.dashboard_christmas
```

## Daten und Befehle

| Topic | Inhalt / Richtung |
| --- | --- |
| `ha_external/sensor.wohnzimmer_temperatur/state` | HA → ioBroker, beispielsweise `21.5` |
| `ha_external/sensor.wohnzimmer_temperatur/attribute/unit_of_measurement` | HA → ioBroker, beispielsweise `°C` |
| `ha_external/input_boolean.dashboard_christmas/state` | HA → ioBroker: `on` oder `off` |
| `ha_external/input_boolean.dashboard_christmas/set` | ioBroker → HA: `ON` oder `OFF` |
| `ha_external/availability` | `online` nach erfolgreichem HA-Abgleich, sonst `offline` |

## ioBroker-Zuordnung

| HA-Erkennung | ioBroker-Ziel |
| --- | --- |
| `device_class: press` / `press` | `button` |
| `state_boolean` | `switch` |
| `device_class: text` / `state` | `state` |
| Zahlwert | `number` |

Zustände werden standardmäßig alle fünf Sekunden abgefragt und nur bei Änderungen
gesendet; nach einer MQTT-Neuverbindung erneut vollständig. Kurze Zustandswechsel
zwischen zwei Abfragen können fehlen. Übertragen werden der State und die
ausgewählten Attribute der freigegebenen Entitäten, aber keine automatische
MQTT-Discovery.
Fehlende Entitäten erhalten `unavailable`; HA-Zustände `unknown` und `unavailable`
werden unverändert weitergegeben.

Die App sendet mit QoS 1 und Retain. Beim Entfernen einer Entität oder Ändern des
Topic-Präfixes bleiben alte Retain-Nachrichten auf dem Broker bestehen, bis du sie
dort löschst. Verwende pro App-Instanz eine eigene Client-ID und ein eigenes Präfix.
Automatische Wiederverbindung, Last Will und ein sauberer Offline-Status beim
Beenden sind enthalten. `online` bezeichnet den letzten erfolgreichen Abgleich;
Verbindungsfehler werden nach Timeout beziehungsweise MQTT-Keepalive erkannt.

Befehle sind standardmäßig deaktiviert (`command_entities: []`). Freigaben müssen
auch in `entities` stehen und können in der Weboberfläche über **Bidirektional /
Werte schreiben** gesetzt werden. `switch`, `light`, `input_boolean` und `fan`
akzeptieren `ON` oder `OFF`. `input_number` und `number` akzeptieren Zahlen,
`input_select` und `select` akzeptieren den Optionsnamen, `input_text` und `text`
akzeptieren Text. `button` und `input_button` akzeptieren `PRESS`. Sensorwerte
bleiben nur ausgehend. In ioBroker Befehle **ohne Retain** senden. Gespeicherte
Retain-Befehle bei der Anmeldung, ungültige Payloads und alte Warteschlangenbefehle
werden verworfen. Keine beliebigen HA-Serviceaufrufe.

TLS verwendet die Zertifikatsprüfung des Systems; für TLS auch den Broker-Port
anpassen (häufig 8883). Eigene CA-Dateien und Client-Zertifikate sind noch nicht
konfigurierbar. Der HA-Zugang erfolgt über den Supervisor-Token; ein manueller
HA-Token ist nicht erforderlich. Die App legt keine HA-Konfigurationsdateien an.

## Entwicklung

```sh
python -m pip install -r mqtt_client/requirements.txt
python -m unittest discover -s mqtt_client/tests -v
docker build -t ugso-mqtt-client:0.1.6 mqtt_client
```

[English documentation](DOCS.en.md)
