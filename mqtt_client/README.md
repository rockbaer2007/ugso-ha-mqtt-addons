# MQTT-Client

Version **0.1.16**. Zusätzlicher MQTT-Client für einen externen Broker, beispielsweise den ioBroker-MQTT-Adapter im Modus **Server/Broker**. Die App ist für gezielte Home-Assistant-zu-ioBroker-Übertragungen gedacht: Du wählst einzelne Geräte oder Werte aus, statt mit dem ioBroker-HASS-Adapter pauschal den gesamten Home-Assistant-Bestand zu spiegeln. Das ist ähnlich zum bekannten Weg ioBroker → Home Assistant per MQTT, nur in Gegenrichtung und bewusst selektiv. Dein HA-Broker und die vorhandene MQTT-Integration bleiben bestehen. Die App verbindet sich direkt mit der HA-API und dem externen Broker; sie ist keine Broker-Bridge.

## Installation und Einrichtung

1. Dieses Repository im Home-Assistant-App-Store hinzufügen:
   `https://github.com/rockbaer2007/ugso-ha-mqtt-addons`.
2. **MQTT-Client** installieren (amd64 oder aarch64).
3. **Open Web UI** öffnen und IP/Hostname, Port, Username und Passwort des
   ioBroker-Brokers eintragen. Port `1883` ist voreingestellt.
4. Links nach einem Gerät suchen, zum Beispiel nach einem Stecker, und das Gerät
   anklicken. In einem Geräte-Popup stehen zusammengehörige Switches,
   Sensorwerte, Updates, States und Attribute in Bereichen wie **Steuerung**,
   **Sensoren**, **Konfiguration** und **Diagnose**. Rechts in jeder Wert-Zeile aktivierst du die Checkbox; dadurch werden State und alle Attribute dieses Werts übernommen. Mit **Alle States dieses Geräts übertragen** aktivierst du alle Werte des gewählten Geräts inklusive Attribute auf einmal.
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
publish_delay_ms: 50
entities:
  - sensor.wohnzimmer_temperatur
  - input_boolean.dashboard_christmas
entity_attributes:
  - sensor.wohnzimmer_temperatur:unit_of_measurement
  - sensor.wohnzimmer_temperatur:friendly_name
command_entities: []
```

## Daten und Befehle

| Topic | Inhalt / Richtung |
| --- | --- |
| `ha_external/wohnzimmer/temperatur/state` | HA → ioBroker, beispielsweise `21.5` |
| `ha_external/wohnzimmer/temperatur/attribute/unit_of_measurement` | HA → ioBroker, beispielsweise `°C` |
| `ha_external/dashboard/christmas/state` | HA → ioBroker: `on` oder `off` |
| `ha_external/dashboard/christmas/set` | ioBroker → HA: `ON` oder `OFF` |
| `ha_external/availability` | `online` nach erfolgreichem HA-Abgleich, sonst `offline` |

Die Struktur ist nach Gerät und Wert aufgebaut:

```text
ha_external
└── stecker_garten
    ├── switch
    │   └── state
    ├── energie
    │   └── state
    └── firmware
        └── state
```

## ioBroker-Zuordnung

| HA-Erkennung | ioBroker-Ziel |
| --- | --- |
| `device_class: press` / `press` | `button` |
| `state_boolean` | `switch` |
| `device_class: text` / `state` | `state` |
| Zahlwert | `number` |

Zustände werden nach einem vollständigen Erstabgleich live über HA-WebSocket-Ereignisse
übernommen und nur bei Änderungen gesendet; nach einer MQTT-Neuverbindung erneut
vollständig. Bei WebSocket-Ausfall gilt das vorhandene Abfrageintervall, standardmäßig
fünf Sekunden. Während eines Verbindungsabbruchs verpasste Zwischenzustände können
nicht nachträglich rekonstruiert werden. Übertragen werden der State und die
ausgewählten Attribute der freigegebenen Entitäten, aber keine automatische
MQTT-Discovery.
Fehlende Entitäten erhalten `unavailable`; HA-Zustände `unknown` und `unavailable`
werden unverändert weitergegeben.

Die App sendet mit QoS 1 und Retain. Beim ersten Abgleich werden States und
Attribute vor den `/set`-Rückkanälen gesendet und mit `publish_delay_ms` in kleinen
Häppchen gedrosselt, damit ioBroker die Objekte sauber anlegen kann. Beim Entfernen
einer Entität oder Ändern des Topic-Präfixes bleiben alte Retain-Nachrichten zunächst
erhalten. Unter **Veraltete Retain-Topics prüfen** kannst du von der App erfasste
veraltete Topics auswählen und nach Bestätigung löschen. Aktive und fremde Topics
werden abgewiesen. Vor dem Update nicht erfasste, inzwischen unbenutzte Topics
müssen weiterhin manuell auf dem Broker entfernt werden. Verwende pro App-Instanz
eine eigene Client-ID und ein eigenes Präfix.
Automatische Wiederverbindung, Last Will und ein sauberer Offline-Status beim
Beenden sind enthalten. `online` bezeichnet den letzten erfolgreichen Abgleich;
Verbindungsfehler werden nach Timeout beziehungsweise MQTT-Keepalive erkannt.

Rückbefehle werden für ausgewählte steuerbare Entitäten automatisch aktiviert,
sobald ihr State übertragen wird. `switch`, `light`, `input_boolean` und `fan`
akzeptieren `ON` oder `OFF`. `input_number` und `number` akzeptieren Zahlen,
`input_select` und `select` akzeptieren den Optionsnamen, `input_text` und `text`
akzeptieren Text. `button` und `input_button` akzeptieren `PRESS`, zum Beispiel
für Taster wie `taster_auf`, `taster_ab` oder `taster_stop`. Sensorwerte bleiben
nur ausgehend. In ioBroker Befehle **ohne Retain** senden. Gespeicherte
Retain-Befehle bei der Anmeldung, ungültige Payloads und alte Warteschlangenbefehle
werden verworfen. Keine beliebigen HA-Serviceaufrufe.
Alte Befehls-Topics mit Entity-ID, zum Beispiel
`ha_external/switch.stecker_garten/set`, werden als Kompatibilität weiter
angenommen.

TLS verwendet die Zertifikatsprüfung des Systems oder deine eigene CA (PEM).
Unter **Übertragung und TLS** lassen sich CA-Dateien und ein Client-Zertifikat mit
passendem privatem Schlüssel hochladen oder als PEM-Text eintragen. Serverzertifikat
und Hostname werden immer geprüft; für TLS auch den Broker-Port anpassen
(häufig 8883). Der HA-Zugang erfolgt über den Supervisor-Token; ein manueller
HA-Token ist nicht erforderlich. Die App legt keine HA-Konfigurationsdateien an.

## Neue Funktionen und bestehende Einstellungen

Version 0.1.16 erhält die vorhandenen Broker-Zugangsdaten, Client-ID, Topic-Präfix,
Entitäts-/Attributauswahl, Publish-Pause und das Abfrageintervall. Beim Start erfolgt
keine automatische Umschreibung der Konfiguration und keine Retain-Löschung.
Neue TLS-Optionen sind leer; ohne eigene CA gilt weiterhin der System-Vertrauensspeicher.

Die Statuszeile zeigt MQTT- und HA-Verbindung getrennt, Live-/Polling-Modus,
letzten Abgleich, letzte Übertragung, Sendezähler und Fehlerart ohne Zugangsdaten.
Bei einer vollen Ereigniswarteschlange werden ein Neuabgleich und ein Hinweis ausgelöst.

Zusätzlich zu den bisherigen `/set`-Befehlen gelten:

| Entität | Payload | HA-Aktion |
| --- | --- | --- |
| `cover` | `OPEN`, `CLOSE`, `STOP` | `open_cover`, `close_cover`, `stop_cover` |
| `cover` | `{"position":45}` | `set_cover_position`, 0–100 |
| `light` | `{"brightness_pct":75}` | `turn_on`, 0–100 |
| `fan` | `{"percentage":50}` | `set_percentage`, 0–100 |

Das konkrete HA-Gerät muss die Funktion unterstützen. Zusätzliche JSON-Felder,
Werte außerhalb 0–100, Retain-Befehle und veraltete Warteschlangenbefehle werden
verworfen. Es gibt weiterhin keine beliebigen HA-Serviceaufrufe.
[HA-WebSocket](https://developers.home-assistant.io/docs/api/websocket/) ·
[Rollläden](https://www.home-assistant.io/integrations/cover/) ·
[Lampen](https://www.home-assistant.io/integrations/light/).

**Einstellungen sichern** speichert Broker-Einstellungen, eigene CA und Auswahl als
JSON, ohne MQTT-Passwort, Client-Zertifikat/privaten Schlüssel oder HA-Token.
**Sicherung öffnen** prüft das Format und fragt vor dem Ersetzen nach. Beim gleichen
Broker bleiben lokal vorhandene Zugangsdaten und Client-Zertifikate erhalten;
auf einem anderen Broker müssen diese separat eingetragen werden. Die Sicherung
ersetzt keine vollständige HA-App-Sicherung und enthält keine Retain-Inhalte.

TLS-PEM-Texte: `tls_ca`, `tls_cert`, `tls_key`; leere Webfelder behalten gespeicherte
Werte. **Gespeicherte TLS-Zertifikate und Schlüssel entfernen** löscht diese nur
beim bestätigten Speichern. Veränderte MQTT-Einstellungen lassen sich ebenfalls
vorher sichern. Die Retain-Inventarliste liegt persistent in `/data/mqtt-topics.json`.

## Entwicklung

```sh
python -m pip install -r mqtt_client/requirements.txt
python -m unittest discover -s mqtt_client/tests -v
docker build -t ugso-mqtt-client:0.1.16 mqtt_client
```

Für die echten MQTT-/WebSocket-Integrationstests einen separaten lokalen Testbroker
verwenden (keinen produktiven Broker). Optional `websockets==15.0.1` in der
Testumgebung installieren und `MQTT_TEST_PORT` setzen. Eine ausschließlich lokale
Mosquitto-Testkonfiguration liegt in `tests/mosquitto.conf`. Ohne Testbroker werden
die Integrationstests übersprungen. Die UI-Prüfung `tests/test_ui.mjs` verwendet
Playwright/Edge und die temporäre Vorschau `python mqtt_client/tests/preview.py 4186`.

[English documentation](DOCS.en.md)
