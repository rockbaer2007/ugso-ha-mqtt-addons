# MQTT-Client

Version **0.1.34**. Zusätzlicher MQTT-Client für einen externen Broker, beispielsweise den ioBroker-MQTT-Adapter im Modus **Server/Broker**. Die App ist für gezielte Home-Assistant-zu-ioBroker-Übertragungen gedacht: Du wählst einzelne Geräte oder Werte aus, statt mit dem ioBroker-HASS-Adapter pauschal den gesamten Home-Assistant-Bestand zu spiegeln. Das ist ähnlich zum bekannten Weg ioBroker → Home Assistant per MQTT, nur in Gegenrichtung und bewusst selektiv. Dein HA-Broker und die vorhandene MQTT-Integration bleiben bestehen. Die App verbindet sich direkt mit der HA-API und dem externen Broker; sie ist keine Broker-Bridge.

**Neu in 0.1.24:** Der Helfer legt virtuelle Datenpunkte unter `0_userdata.0.ugso_mqtt`
automatisch an. Für VIS 2 genügt je Wert ein Datenpunkt: Status mit `ack: true`,
Bedienung mit `ack: false` an den passenden `/set`-Kanal. Unterstützt werden Switches,
Light-Werte und weitere freigegebene Zahl-/Auswahl-/Textkanäle. Datum und Messwerte
bleiben lesend. Zuerst die App aktualisieren und den Helfer in der Vorschau prüfen.
Die APIs des JavaScript-Adapters 10.4.10 sind berücksichtigt.

Kombinierter [ioBroker-/VIS-2-Helfer](app/iobroker/ugso-mqtt-role-mapper.js)
mit Vorschau, bestätigter Rollensicherung und Wiederherstellung. Datum/Zeitstempel
und eindeutige Messwerte werden typgeprüft zugeordnet. Schreibbare MQTT-Messwerte
erhalten lesende Aliase; vorhandene Werte und Spezialrollen bleiben erhalten.
Anleitung und vollständige Zuordnung: [DE](iobroker/README.de.md) ·
[EN](iobroker/README.en.md) · [FR](iobroker/README.fr.md).

Die Label-Auswahl aktiviert jetzt passende Rückkanäle und Standardattribute.
Lampen bekommen unterstützte Helligkeits-, RGB-, Effekt- und Kelvin-Kanäle.
Mess- und Batteriewerte desselben HA-Geräts sind optional zuschaltbar und bleiben
rein lesend. Bestehende manuelle Topics und Zugangsdaten bleiben erhalten.

**Aktuell übertragene Werte** neben **Speichern und verbinden** zeigt States und
ausgewählte Attribute mit Topic, Wert, Brokerbestätigung und farbiger Herkunft:
Label (blau), Manuell (grün), Beides (violett). Die Liste ist durchsuchbar und
scrollbar. Nur Zugangsdaten klappen automatisch ein; Übertragung/TLS und beide
Buttons bleiben erreichbar. Details stehen in [der Anleitung](DOCS.md).


## Neu in 0.1.34: flache MQTT-Pfade nur für neue Entitäten {#mqtt-layout-0134}

Unter **Übertragung und TLS → MQTT-Struktur für neue Entitäten** kann **Flach mit kurzen Namen** gewählt werden. Standard bleibt die bisherige Struktur. Danach **Speichern und verbinden**. Die Einstellung gilt für erstmals ausgewählte manuelle Entitäten und neue Label-Mitglieder, einschließlich optionaler Gerätemesswerte.

Bereits bekannte Entitäten behalten ihre bisherigen Pfade. Die Zuordnung wird dauerhaft in `/data/mqtt-routes.json` gespeichert und ist in der exportierten Einstellungssicherung enthalten. Auch nach Entfernen und erneutem Auswählen eines Labels, Umbenennen, Neustart oder Update wird derselbe Pfad verwendet. Beim ersten Upgrade werden vorhandene Auswahlen und erfasste Topics als Bestand übernommen; die bestehende Label-Auswahl wird beim ersten erfolgreichen Abgleich gesichert. Diese Datei nicht löschen. Eine Rückstellung auf die bisherige Struktur migriert keine bereits zugeordneten Entitäten.

Beispiel für neue flache MQTT-Topics:

```text
ha_external/geraet/schalter
ha_external/geraet/schalter_set
ha_external/geraet/schalter_attribute/device_class
ha_external/geraet/energie
ha_external/geraet/leistung
ha_external/geraet/licht_brightness
ha_external/geraet/licht_brightness_set
```

Alte Topics wie `ha_external/geraet/switch/state` und `…/switch/set` bleiben parallel gültig. Vergebene kurze Namen werden bei Kollisionen eindeutig ergänzt. Vorhandene Datenpunkte, Werte, Aliase und VIS-2-Verknüpfungen werden weder umbenannt noch gelöscht.

**Vor Aktivierung den vollständigen JavaScript-Helfer 0.1.34 installieren und eigene Einstellungen übernehmen.** Er liest beide MQTT-Strukturen anhand des übertragenen Auswahlkatalogs mit exakten Status- und Rückkanalpfaden. Erst Vorschau prüfen, dann `mode: 'apply'`. Ältere Helfer erkennen die neuen flachen MQTT-Pfade nicht. `virtualLayout: 'flat'` ist davon unabhängig: Diese Helferoption bestimmt nur die Darstellung unter `0_userdata.0.ugso_mqtt`. Die bisherigen manuellen Rollen und Verknüpfungen bleiben geschützt.


## Neu in 0.1.33: flache VIS-2-Struktur mit kurzen Namen

**Den vollständigen JavaScript-Helfer 0.1.33 ersetzen und eigene Einstellungen übernehmen.** Im Einstellungsblock wählt `virtualLayout: 'nested'` die bisherige Struktur (Standard); `virtualLayout: 'flat'` legt kurze Datenpunkte direkt unter dem Geräteordner an, etwa `schalter`, `energie`, `leistung`, `spannung`, `stromstaerke`. Bei Lampen kommen passende Werte wie `helligkeit`, `farbe`, `effekt` und `farbtemperatur` hinzu. Gleichartige oder belegte Namen erhalten eindeutige Zusätze wie `leistung_2`; einmal vergebene Zuordnungen bleiben im Sicherungsjournal erhalten.

Zuerst im Vorschaumodus prüfen, anschließend `mode: 'apply'` wählen. Ein Layoutwechsel löscht oder verschiebt keine vorhandenen Datenpunkte. Bereits vom Helfer angelegte alte und neue IDs werden weiter aktualisiert und behalten ihre freigegebenen Rückkanäle; vorhandene VIS-2-Verknüpfungen können bleiben. Deshalb bleiben alte Ordner zunächst auch sichtbar. Fremde Objekte und manuelle Rollen werden nicht überschrieben, MQTT-Topics bleiben unverändert. Zur Rückkehr die Option mit dem neuen Helfer auf `nested` stellen; die alte Helferdatei 0.1.27 kann Journale mit flachen Einträgen nicht lesen.

## Neu in 0.1.32: zusätzliche Messwerte deutlich markieren

Die Option **„Zugehörige Mess- und Batteriewerte desselben Geräts automatisch einbeziehen“** ist gelb hervorgehoben. Die Markierung aktiviert den Haken nicht: Gewünschte Auswahl setzen und **„Speichern und verbinden“** drücken. Bestehende Einstellungen bleiben erhalten. TLS und Zertifikate sind weiterhin separat einklappbar.

## Neu in 0.1.31: TLS und Zertifikate separat einklappen

**TLS und Zertifikate** ist jetzt ein eigener, per Maus und Tastatur bedienbarer Klappbereich. Die Schaltfläche zeigt auch geschlossen, ob TLS ausgewählt ist. Beim Auf-/Zuklappen werden weder TLS noch gespeicherte Zertifikate oder Zugangsdaten verändert. Nach Laden und Speichern bleibt der Bereich geschlossen; Übertragungseinstellungen und die beiden Aktionsschaltflächen bleiben sichtbar. Der [neue Blogeintrag zum JavaScript-Helfer](https://opensource.ugso-software.de/blog/snippets/iobroker-blockly#mqtt-vis2-helper) erklärt Zweck, Einrichtung, Status/Rückkanal und Sicherung und enthält das vollständige unveränderte Skript 0.1.27 mit Kopierbutton und Download.

## Neu in 0.1.30: Zugangsdaten einklappen

**Zugangsdaten** besitzt jetzt eine eigene Auf-/Zuklapp-Schaltfläche, auch per Tastatur bedienbar. Bei vorhandenem Broker bleiben IP, Port, Benutzername und Passwort nach Laden und Speichern eingeklappt. Fehlen Pflichtangaben, wird der Bereich zur Eingabe geöffnet. **Übertragung und TLS**, **Speichern und verbinden** und **Aktuell übertragene Werte** bleiben sichtbar. Einstellungen und Zugangsdaten werden nicht verändert. Die Priorisierung aus 0.1.29 und Helfer 0.1.27 bleiben erhalten. Der Nutzer hat die Schalt-Rückmeldung mit ungefähr einer halben Sekunde Verzögerung als erfolgreich bestätigt. Auch die Zigbee-Lampe wurde erfolgreich geprüft: Rückmeldung funktioniert, die Helligkeit folgt HA auf 100 %.

## Neu in 0.1.29: Schaltwerte vor Messwerten

**Die HA-MQTT-Client-App auf 0.1.29 aktualisieren; der ioBroker-Helfer 0.1.27 bleibt unverändert.** Schaltzustände, Kontakte und Befehlsrückmeldungen werden vor Messwerten behandelt. Ihre Veröffentlichung wartet nicht auf die Publish-Pause. Bereits laufende Übertragungen werden abgeschlossen; zwischen Nachrichten geben Messwert-/Attributpakete für dringende Zustände und Schaltbefehle nach. Wenn mindestens 32 Ereignisse warten, werden Sensor-Zwischenstände in begrenzten Paketen auf den jeweils letzten Zustand zusammengefasst. Normale Schaltfolgen bleiben erhalten. Zusätzlich liest der Kontrollabgleich auch bei bestehender Live-Verbindung den tatsächlichen HA-Zustand im vorhandenen `poll_interval` (Standard 5 Sekunden). Unveränderte Werte werden nicht erneut veröffentlicht. **Übertragung und TLS** sowie die **Publish-Pause für Messwerte und Attribute** sind direkt sichtbar; Zugangsdaten bleiben separat einklappbar. Die Statuszeile unterscheidet **Wartend**, **Zusammengefasst**, **HA-Eingang** und den fortlaufenden Zähler **Gesendet**. Bestehende Einstellungen und Werte bleiben erhalten. Für die Prüfung den Kontrollabgleich auf 5 Sekunden lassen und ein unkritisches Relais in HA schalten. Erst eine tatsächliche HA-Rückmeldung führt zu `ack: true`; die Broker-Übergabe allein genügt nicht. Lokal geprüft, Bestätigung der Verzögerung auf dem Nutzersystem steht noch aus.

Schalter werden über die Domain `switch.*` erkannt und benötigen weder Geräteklasse noch Einheit. Lampen verwenden `light.*`. Die aktivierte automatische Messwertauswahl bleibt auf dieselbe HA-Gerätezuordnung beschränkt. Für Sensoren gilt zuerst `device_class`; fehlt sie, werden eindeutige Einheiten aus `unit_of_measurement` wie W/kW/MW, V/mV/kV, A/mA und Wh/kWh/MWh verwendet. Vorhandene Klassen werden nicht überschrieben; ähnliche Namen oder ein mehrdeutiges Prozentzeichen genügen nicht. Unter **Zugehörige Messwerte prüfen** zeigt eine schreibgeschützte Prüfung die erkannten Sensoren und Ausschlussgründe, etwa fehlende Gerätezuordnung, deaktivierte Entität oder ungeeignete Klasse/Einheit. Messwerte dürfen hinter Schaltwerten warten. Einstellungen, Zugangsdaten und bestehende Werte bleiben erhalten.

## Neu in 0.1.28: HA-Live-Rückmeldungen ohne fremde Ereignisflut

Diese Korrektur betrifft die **MQTT-Client-App in Home Assistant**: auf 0.1.28 aktualisieren und die App neu starten. Der ioBroker-Helfer 0.1.27 kann unverändert bleiben; sein Austausch allein behebt den Empfang von HA-Ereignissen nicht. Bei aktiver Label-Auswahl werden nur noch Ereignisse tatsächlich ausgewählter Entitäten und ihrer aktivierten Gerätemesswerte eingereiht. Ereignisse des übrigen HA-Bestands können die Warteschlange nicht mehr füllen. Wenn Labels oder Gerätezuordnungen geändert werden, lädt der Client frische HA-Zustände. Ältere gepufferte Zustände mit überholtem `last_updated` werden nach einem Abgleich verworfen; normale zeitlich geordnete Änderungen bleiben erhalten. Der Überlastzähler zählt seit dem App-Start und meldet weiterhin echte Überläufe ausgewählter Ereignisse. Die eingestellte Publish-Pause und alle Zugangsdaten/Auswahlen bleiben erhalten; ein großer erster Abgleich kann weiterhin länger dauern. Nach abgeschlossenem Erstabgleich ein unkritisches Relais in HA schalten und prüfen, ob MQTT und der virtuelle ioBroker-Status zeitnah folgen. Live-Bestätigung auf dem Nutzersystem steht noch aus.

## Neu in 0.1.27: Rückkanal ohne Retain

Schaltbefehle werden jetzt gezielt über die ioBroker-MQTT-Schnittstelle `sendMessage2Client` mit **`retain: false`** veröffentlicht. Normale Schreibzugriffe auf MQTT-`set`-Datenpunkte können im Servermodus mit gesetztem Retain-Flag beim Client ankommen. Der HA-Client verwirft solche Befehle weiterhin, damit beim Verbinden keine alten Schaltaufträge ausgeführt werden. Globale Broker-Einstellungen und MQTT-Datenpunktwerte bleiben erhalten. Der Helfer prüft den Befehlstopic gegen den zugehörigen Statustopic und verwendet `native.topic`, nicht aus Objekt-IDs erratene Pfade. In VIS 2 weiterhin ausschließlich den virtuellen Datenpunkt unter `0_userdata.0.ugso_mqtt` mit `ack: false` bedienen und `mode: 'apply'` verwenden. Die Logzeile `Command handed to MQTT adapter (retain=false)` bestätigt nur die Übergabe; erst ein neuer HA-Status bestätigt den Vorgang. Der rohe MQTT-`set`-Wert muss dabei nicht wechseln. Keine automatischen Wiederholungen; Fehler oder fehlende HA-Bestätigung bleiben als unbestätigt erkennbar. Für diese Korrektur die vollständige Helferdatei ersetzen und eigene Einstellungen übernehmen.

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
docker build -t ugso-mqtt-client:0.1.29 mqtt_client
```

Für die echten MQTT-/WebSocket-Integrationstests einen separaten lokalen Testbroker
verwenden (keinen produktiven Broker). Optional `websockets==15.0.1` in der
Testumgebung installieren und `MQTT_TEST_PORT` setzen. Eine ausschließlich lokale
Mosquitto-Testkonfiguration liegt in `tests/mosquitto.conf`. Ohne Testbroker werden
die Integrationstests übersprungen. Die UI-Prüfung `tests/test_ui.mjs` verwendet
Playwright/Edge und die temporäre Vorschau `python mqtt_client/tests/preview.py 4186`.

[English documentation](DOCS.en.md)
