# ioBroker: automatische Rollenzuordnung {#iobroker-role-mapping}

Das optionale JavaScript gehört zu MQTT-Client **0.1.33** und läuft im ioBroker-JavaScript-Adapter. Es verwendet die übertragenen Metadaten `device_class` und `unit_of_measurement`. Es ordnet nur eindeutige Fälle zu; weder MQTT-Werte noch Datentypen, Einheiten, Zugangsdaten oder Rückkanäle werden umgeschrieben.



## Neu in 0.1.33: flache VIS-2-Struktur mit kurzen Namen {#flat-layout-0133}

**Den vollständigen JavaScript-Helfer 0.1.33 ersetzen und eigene Einstellungen übernehmen.** Im Einstellungsblock wählt `virtualLayout: 'nested'` die bisherige Struktur (Standard); `virtualLayout: 'flat'` legt kurze Datenpunkte direkt unter dem Geräteordner an, etwa `schalter`, `energie`, `leistung`, `spannung`, `stromstaerke`. Bei Lampen kommen passende Werte wie `helligkeit`, `farbe`, `effekt` und `farbtemperatur` hinzu. Gleichartige oder belegte Namen erhalten eindeutige Zusätze wie `leistung_2`; einmal vergebene Zuordnungen bleiben im Sicherungsjournal erhalten.

Zuerst im Vorschaumodus prüfen, anschließend `mode: 'apply'` wählen. Ein Layoutwechsel löscht oder verschiebt keine vorhandenen Datenpunkte. Bereits vom Helfer angelegte alte und neue IDs werden weiter aktualisiert und behalten ihre freigegebenen Rückkanäle; vorhandene VIS-2-Verknüpfungen können bleiben. Deshalb bleiben alte Ordner zunächst auch sichtbar. Fremde Objekte und manuelle Rollen werden nicht überschrieben, MQTT-Topics bleiben unverändert. Zur Rückkehr die Option mit dem neuen Helfer auf `nested` stellen; die alte Helferdatei 0.1.27 kann Journale mit flachen Einträgen nicht lesen.

## Neu in 0.1.32: zusätzliche Messwerte deutlich markieren {#readings-highlight-0132}

Die Option **„Zugehörige Mess- und Batteriewerte desselben Geräts automatisch einbeziehen“** ist gelb hervorgehoben. Die Markierung aktiviert den Haken nicht: Gewünschte Auswahl setzen und **„Speichern und verbinden“** drücken. Bestehende Einstellungen bleiben erhalten. TLS und Zertifikate sind weiterhin separat einklappbar.

## Neu in 0.1.31: TLS und Zertifikate separat einklappen {#tls-0131}

**TLS und Zertifikate** ist jetzt ein eigener, per Maus und Tastatur bedienbarer Klappbereich. Die Schaltfläche zeigt auch geschlossen, ob TLS ausgewählt ist. Beim Auf-/Zuklappen werden weder TLS noch gespeicherte Zertifikate oder Zugangsdaten verändert. Nach Laden und Speichern bleibt der Bereich geschlossen; Übertragungseinstellungen und die beiden Aktionsschaltflächen bleiben sichtbar. Der [neue Blogeintrag zum JavaScript-Helfer](https://opensource.ugso-software.de/blog/snippets/iobroker-blockly#mqtt-vis2-helper) erklärt Zweck, Einrichtung, Status/Rückkanal und Sicherung und enthält das vollständige unveränderte Skript 0.1.27 mit Kopierbutton und Download.

## Neu in 0.1.30: Zugangsdaten einklappen {#credentials-0130}

**Zugangsdaten** besitzt jetzt eine eigene Auf-/Zuklapp-Schaltfläche, auch per Tastatur bedienbar. Bei vorhandenem Broker bleiben IP, Port, Benutzername und Passwort nach Laden und Speichern eingeklappt. Fehlen Pflichtangaben, wird der Bereich zur Eingabe geöffnet. **Übertragung und TLS**, **Speichern und verbinden** und **Aktuell übertragene Werte** bleiben sichtbar. Einstellungen und Zugangsdaten werden nicht verändert. Die Priorisierung aus 0.1.29 und Helfer 0.1.27 bleiben erhalten. Der Nutzer hat die Schalt-Rückmeldung mit ungefähr einer halben Sekunde Verzögerung als erfolgreich bestätigt. Auch die Zigbee-Lampe wurde erfolgreich geprüft: Rückmeldung funktioniert, die Helligkeit folgt HA auf 100 %.

## Neu in 0.1.29: Schaltwerte vor Messwerten {#priority-0129}

**Die HA-MQTT-Client-App auf 0.1.29 aktualisieren; der ioBroker-Helfer 0.1.27 bleibt unverändert.** Schaltzustände, Kontakte und Befehlsrückmeldungen werden vor Messwerten behandelt. Ihre Veröffentlichung wartet nicht auf die Publish-Pause. Bereits laufende Übertragungen werden abgeschlossen; zwischen Nachrichten geben Messwert-/Attributpakete für dringende Zustände und Schaltbefehle nach. Wenn mindestens 32 Ereignisse warten, werden Sensor-Zwischenstände in begrenzten Paketen auf den jeweils letzten Zustand zusammengefasst. Normale Schaltfolgen bleiben erhalten. Zusätzlich liest der Kontrollabgleich auch bei bestehender Live-Verbindung den tatsächlichen HA-Zustand im vorhandenen `poll_interval` (Standard 5 Sekunden). Unveränderte Werte werden nicht erneut veröffentlicht. **Übertragung und TLS** sowie die **Publish-Pause für Messwerte und Attribute** sind direkt sichtbar; Zugangsdaten bleiben separat einklappbar. Die Statuszeile unterscheidet **Wartend**, **Zusammengefasst**, **HA-Eingang** und den fortlaufenden Zähler **Gesendet**. Bestehende Einstellungen und Werte bleiben erhalten. Für die Prüfung den Kontrollabgleich auf 5 Sekunden lassen und ein unkritisches Relais in HA schalten. Erst eine tatsächliche HA-Rückmeldung führt zu `ack: true`; die Broker-Übergabe allein genügt nicht. Lokal geprüft, Bestätigung der Verzögerung auf dem Nutzersystem steht noch aus.

Schalter werden über die Domain `switch.*` erkannt und benötigen weder Geräteklasse noch Einheit. Lampen verwenden `light.*`. Die aktivierte automatische Messwertauswahl bleibt auf dieselbe HA-Gerätezuordnung beschränkt. Für Sensoren gilt zuerst `device_class`; fehlt sie, werden eindeutige Einheiten aus `unit_of_measurement` wie W/kW/MW, V/mV/kV, A/mA und Wh/kWh/MWh verwendet. Vorhandene Klassen werden nicht überschrieben; ähnliche Namen oder ein mehrdeutiges Prozentzeichen genügen nicht. Unter **Zugehörige Messwerte prüfen** zeigt eine schreibgeschützte Prüfung die erkannten Sensoren und Ausschlussgründe, etwa fehlende Gerätezuordnung, deaktivierte Entität oder ungeeignete Klasse/Einheit. Messwerte dürfen hinter Schaltwerten warten. Einstellungen, Zugangsdaten und bestehende Werte bleiben erhalten.

## Neu in 0.1.28: HA-Live-Rückmeldungen ohne fremde Ereignisflut {#live-0128}

Diese Korrektur betrifft die **MQTT-Client-App in Home Assistant**: auf 0.1.28 aktualisieren und die App neu starten. Der ioBroker-Helfer 0.1.27 kann unverändert bleiben; sein Austausch allein behebt den Empfang von HA-Ereignissen nicht. Bei aktiver Label-Auswahl werden nur noch Ereignisse tatsächlich ausgewählter Entitäten und ihrer aktivierten Gerätemesswerte eingereiht. Ereignisse des übrigen HA-Bestands können die Warteschlange nicht mehr füllen. Wenn Labels oder Gerätezuordnungen geändert werden, lädt der Client frische HA-Zustände. Ältere gepufferte Zustände mit überholtem `last_updated` werden nach einem Abgleich verworfen; normale zeitlich geordnete Änderungen bleiben erhalten. Der Überlastzähler zählt seit dem App-Start und meldet weiterhin echte Überläufe ausgewählter Ereignisse. Die eingestellte Publish-Pause und alle Zugangsdaten/Auswahlen bleiben erhalten; ein großer erster Abgleich kann weiterhin länger dauern. Nach abgeschlossenem Erstabgleich ein unkritisches Relais in HA schalten und prüfen, ob MQTT und der virtuelle ioBroker-Status zeitnah folgen. Live-Bestätigung auf dem Nutzersystem steht noch aus.

## Neu in 0.1.27: Rückkanal ohne Retain {#commands-0127}

Schaltbefehle werden jetzt gezielt über die ioBroker-MQTT-Schnittstelle `sendMessage2Client` mit **`retain: false`** veröffentlicht. Normale Schreibzugriffe auf MQTT-`set`-Datenpunkte können im Servermodus mit gesetztem Retain-Flag beim Client ankommen. Der HA-Client verwirft solche Befehle weiterhin, damit beim Verbinden keine alten Schaltaufträge ausgeführt werden. Globale Broker-Einstellungen und MQTT-Datenpunktwerte bleiben erhalten. Der Helfer prüft den Befehlstopic gegen den zugehörigen Statustopic und verwendet `native.topic`, nicht aus Objekt-IDs erratene Pfade. In VIS 2 weiterhin ausschließlich den virtuellen Datenpunkt unter `0_userdata.0.ugso_mqtt` mit `ack: false` bedienen und `mode: 'apply'` verwenden. Die Logzeile `Command handed to MQTT adapter (retain=false)` bestätigt nur die Übergabe; erst ein neuer HA-Status bestätigt den Vorgang. Der rohe MQTT-`set`-Wert muss dabei nicht wechseln. Keine automatischen Wiederholungen; Fehler oder fehlende HA-Bestätigung bleiben als unbestätigt erkennbar. Für diese Korrektur die vollständige Helferdatei ersetzen und eigene Einstellungen übernehmen.

## Neu in 0.1.26: automatische Basisanlage {#setup-0126}

Fehlende eigene Basisordner (`virtualRoot`, `aliasRoot`) und beide Sicherungsdatenpunkte (`virtualBackupId`, `backupId`) werden jetzt beim Start in **jedem Modus** automatisch angelegt, auch in `preview` und `restore`. Vorhandene Ordner, Sicherungen, Werte und manuelle Rollen werden nicht überschrieben. Neue Journale enthalten gültige leere Strukturen. Für die Basisanlage muss `setObject` in der JavaScript-Instanz auch in der Vorschau erlaubt sein. Fehlende Freigaben oder kollidierende Pfade werden als Fehler gemeldet. Die Vorschau legt keine steuerbaren VIS-2-Datenpunkte an und ändert keine MQTT-Rollen oder Gerätewerte; dafür nach Prüfung `mode: 'apply'` verwenden. Die ereignisgesteuerte Verarbeitung aus 0.1.25 bleibt erhalten.

## Korrektur 0.1.25: fehlende Objekte ohne Warnungen {#fix-0125}

In JavaScript-Adapter **10.4.10** warnt auch `getObject` bei fehlenden IDs. Der Helfer prüft jetzt mit `existsObject` und `existsState`, bevor er Objekte oder Zustände liest. Das gilt für Journal, optionale Metadaten, Ordner und noch nicht angelegte virtuelle Datenpunkte. Die vorherige Prüfung über `getObject` allein reichte nicht aus.

In der Vorschau erscheinen `Preview VIS 2`-Zeilen, aber es werden nur fehlende Basisordner und Sicherungen angelegt. Für die automatische Anlage nach der Prüfung `mode: 'apply'` setzen. In der JavaScript-Instanz `setObject` erlauben und **Do not subscribe to all states on start** deaktivieren, weil der Helfer synchron aus den Zustands-Caches liest. Eine abgebrochene eigene Neuanlage kann nach der Freigabe erneut versucht werden; fremde oder bearbeitete Datenpunkte bleiben geschützt.

MQTT-Client **ab 0.1.24** liefert den benötigten Auswahlkatalog; für diese Korrektur genügt der Austausch der vollständigen Helferdatei. Alte nicht mehr ausgewählte Retain-Topics ohne aktuelle Entitätskennung werden ausgelassen. Fehlende HA-Metadaten werden nicht vom Helfer erfunden. Die Startmeldung nennt jetzt Version und Betriebsmodus.

Der Helfer bündelt echte MQTT-Änderungen für eine Sekunde. Im virtuellen Modus werden nur die betroffenen Quellen verarbeitet; unveränderte Wiederholungen und fremde Attribute lösen keinen Durchlauf aus. Eine Vollprüfung erfolgt beim Start und bei Änderungen des Auswahlkatalogs oder der Verfügbarkeit. Die Befehls-Zeitprüfung betrifft nur ausstehende Quellen und endet nach Bestätigung oder Zeitablauf. Der Client abonniert pro Entität nur noch den zum Status passenden Rückkanal; alte ioBroker-Objekte werden nicht gelöscht.

## Neu in 0.1.24: ein VIS-2-Datenpunkt für Status und Befehl {#vis2}

Das Skript richtet jetzt automatisch virtuelle Datenpunkte und Ordner unter `0_userdata.0.ugso_mqtt` ein. Es ist für die APIs des ioBroker-JavaScript-Adapters **10.4.10** ausgelegt. Zuerst **MQTT-Client auf 0.1.24 aktualisieren** und den Client neu verbinden: Der neue Auswahlkatalog bindet Entität, aktuellen Topic-Pfad und Befehlsfreigabe eindeutig zusammen. Alte Retain-Topics dürfen dadurch keine zusätzlichen Steuerungen erzeugen.

Oben im vollständigen Skript bleiben zunächst diese Einstellungen:

```js
outputMode: 'virtual',
mode: 'preview',
mqttRoot: 'mqtt.0.ha_external',
virtualRoot: '0_userdata.0.ugso_mqtt',
virtualBackupId: '0_userdata.0.ugso_mqtt_helper.backup',
```

Nach Prüfung der Vorschau auf `mode: 'apply'` wechseln und neu starten. **Sicherungsdatenpunkt, Ordner und neue VIS-2-Datenpunkte werden automatisch angelegt.** Auch die Vorschau legt fehlende Basisordner und Sicherungen an; neue VIS-2-Nutzdatenpunkte benötigen `apply`. Vorhandene fremde Datenpunkte, Aliase und manuelle Rollen werden nicht überschrieben. Deinen bisherigen Alias, zum Beispiel unter `alias.0.HA`, musst du nicht entfernen.

Beispiel: Aus `mqtt.0.ha_external.claudia_pc.switch.state` und dem zugehörigen `mqtt.0.ha_external.claudia_pc.switch.set` entsteht `0_userdata.0.ugso_mqtt.claudia_pc.switch.state`. **Nur diesen virtuellen Datenpunkt in VIS 2 verwenden.**

| Richtung/Funktion | Verhalten |
|---|---|
| MQTT-Status → VIS 2 | Bestätigter Zustand mit `ack: true` |
| VIS-2-Bedienung → MQTT-Befehl | Nur aktuelle Bedienungen mit `ack: false` gehen an `/set` |
| Schalter | `on`/`off` werden virtuell Boolean; zurück werden `ON`/`OFF` gesendet |
| Helligkeit | Prozentwert 0–100, Grenzen geprüft |
| RGB | MQTT-JSON-Array ↔ virtuelle Hexfarbe `#RRGGBB` |
| Effekt | Nur Einträge der aktuellen Effektliste |
| Farbtemperatur | Ganze Kelvinzahl innerhalb der aktuellen Grenzen |
| Zahlen, Selects und Text | Vorhandene Grenzen beziehungsweise Optionen geprüft |
| Datum, Messwerte und Batterie | Lesend; vorhandene MQTT-Werte bleiben unverändert |

Es gibt keine Schaltbefehle beim Anlegen, Starten oder Neustarten und keine automatische Wiederholung alter Bedienungen. Eine neue HA-Rückmeldung bestätigt den Wert; die Brokerannahme allein ist keine Ausführungsbestätigung. Fehlt eine neue Rückmeldung etwa 30 Sekunden lang, bleibt der Auftrag unbestätigt und erhält Fehlerqualität `q: 128`. Bei fehlender Auswahl, unbekanntem Wert oder Offline-Zustand bleibt der letzte Wert mit `q: 130` erhalten. Befehle werden dann gesperrt. Keine Ersatzwerte wie Null oder Aus erfinden.

Das Journal unter `virtualBackupId` wird vor jeder Neuanlage gespeichert und geprüft. Es enthält Zuordnungen und Objektdefinitionen, keine MQTT-Zugangsdaten oder aktuellen Messwerte. Vorhandene MQTT-Datenpunkte werden im virtuellen Modus nicht verändert. Bei `mode: 'restore'` bleiben virtuelle Werte und Dashboard-Verknüpfungen erhalten; eigene virtuelle Befehlsdatenpunkte werden schreibgeschützt und die Synchronisierung endet. Danach das Skript stoppen.

Die bisherige Funktion bleibt über `outputMode: 'roles'` verfügbar. Die folgenden direkten Rollen-/Aliasregeln und deren Wiederherstellung beziehen sich auf diesen Rollenmodus; die Zuordnungstabellen gelten fachlich auch für virtuelle Datenpunkte. **Nur eine Kopie des Helfers gleichzeitig ausführen.** Fehlende optionale Attribute und ein noch nicht angelegtes Journal werden ohne die bisherigen `getState`-Warnungen behandelt.

## Installation und Sicherung {#installation}

1. Vorher im ioBroker-Admin die betroffenen MQTT-Objekte einschließlich Zuständen und vorhandenen Skripten exportieren beziehungsweise eine vollständige Sicherung erstellen.
2. Im MQTT-Client **ioBroker-/VIS-2-Helfer herunterladen** wählen oder [die Skriptdatei laden](../app/iobroker/ugso-mqtt-role-mapper.js).
3. Im ioBroker unter **Skripte** ein neues **JavaScript** anlegen und den gesamten Dateiinhalt einfügen. Es genügt ein Skript in einer JavaScript-Instanz.
4. Oben `mqttRoot` auf den eigenen MQTT-Pfad einstellen, zum Beispiel `mqtt.0.ha_external`. Der Pfad darf keine Platzhalter enthalten.
5. Zunächst `mode: 'preview'` beibehalten, starten und das JavaScript-Protokoll prüfen. Die Vorschau legt nur fehlende eigene Basisordner und Sicherungen an.
6. Manuell als `state` verwendete Datenpunkte in `excludeIds` eintragen. Eine solche manuelle Standardrolle ist von der automatisch vergebenen Rolle nicht unterscheidbar.
7. Nach der Kontrolle `mode: 'apply'` setzen und das Skript neu starten. In den Einstellungen der JavaScript-Instanz muss die Verwendung von `setObject` erlaubt sein. Die Instanz muss die MQTT-Zustände lesen können.

Vor jeder Änderung wird die ursprüngliche Rolle im JSON-Datenpunkt `0_userdata.0.ugso_mqtt_roles.backup` gespeichert und die Speicherung bestätigt. Der Datenpunkt enthält keine Zählerwerte oder Zugangsdaten. Bei einem Sicherungsfehler erfolgt keine nachfolgende Rollenänderung. Den Sicherungsdatenpunkt zusätzlich exportieren und nicht löschen.

Spezialrollen wie `date`, `text` oder `value.temperature` werden nicht ersetzt. Nach einer späteren manuellen Rollenänderung übernimmt das Skript diesen Datenpunkt nicht erneut. Vorhandene Aliase werden nie überschrieben.

## Direkte Rollen und schreibgeschützte Aliase {#aliases}

Datum und Zeitstempel erhalten direkt die Rolle `date`. Der gespeicherte Text und die Schreibrechte bleiben erhalten; auch `uptime` ist in HA ein Startzeitpunkt, keine Laufzeitdauer.

Messwert- und Binärsensorrollen sind in ioBroker schreibgeschützt. Ist das MQTT-Original bereits schreibgeschützt, wird nur seine allgemeine Rolle ersetzt. Ist es schreibbar, entsteht stattdessen ein lesender Alias unter `alias.0.ugso_mqtt_roles`; Rolle und Schreibrechte des MQTT-Originals bleiben erhalten. Den Alias für Visualisierung und Auswertung verwenden. Seine Werte stammen weiterhin aus dem ursprünglichen MQTT-Datenpunkt.

Das Skript prüft Metadaten und tatsächlichen Werttyp. Aus Gerätenamen oder `on`/`off`-Texten werden keine Typen geraten. Fehlende Metadaten, abweichende Einheiten, ungültige Datumswerte und unbekannte Klassen werden ausgelassen. Es erzeugt keine Umrechnungen oder Steuerbefehle. `device_class` muss übertragen werden, bei Messwerten zusätzlich die Einheit; bei manueller Auswahl diese vorhandenen Attribute mit auswählen. Die Label-Funktion liefert vorhandene Standardattribute automatisch.

| HA-Geräteklasse | ioBroker-Rolle | Prüfung |
|---|---|---|
| `date` | `date` | Gültiges `YYYY-MM-DD` |
| `timestamp`, `uptime` | `date` | ISO-Zeitstempel mit Zeitzone |

## Umgesetzte numerische Zuordnungen {#numeric}

Diese Tabelle nennt die tatsächlich akzeptierten Einheiten. Andere Einheiten bleiben unverändert; auch beispielsweise mA oder mV werden nicht stillschweigend umgerechnet.

| HA-Geräteklasse | ioBroker-Rolle | Akzeptierte Einheiten |
|---|---|---|
| `temperature` | `value.temperature` | `°C`, `°F`, `K` |
| `humidity` | `value.humidity` | `%` |
| `absolute_humidity` | `value.humidity.absolute` | `g/m³`, `mg/m³` |
| `battery` | `value.battery` | `%` |
| `voltage` | `value.voltage` | `V` |
| `current` | `value.current` | `A` |
| `power` | `value.power` | `W`, `kW` |
| `energy` | `value.energy` | `Wh`, `kWh` |
| `energy_storage` | `value.energy` | `Wh`, `kWh` |
| `reactive_power` | `value.power.reactive` | `var`, `kvar`, `kVar` |
| `reactive_energy` | `value.energy.reactive` | `varh`, `kvarh`, `kVarh` |
| `frequency` | `value.frequency` | `Hz` |
| `pressure` | `value.pressure` | `hPa`, `mbar` |
| `atmospheric_pressure` | `value.pressure` | `hPa`, `mbar` |
| `illuminance` | `value.brightness` | `lx`, `lux` |
| `distance` | `value.distance` | `m`, `km`, `cm`, `mm`, `mi`, `nmi`, `yd`, `ft`, `in` |
| `duration` | `value.interval` | `s`, `ms`, `h`, `d` |
| `wind_speed` | `value.speed` | `m/s`, `km/h`, `mph`, `kn` |
| `volume_flow_rate` | `value.flow` | `m³/h` |
| `signal_strength` | `value.rssi` | `dBm` |
| `aqi` | `value.airquality` | — |
| `carbon_dioxide` | `value.co2` | `ppm` |
| `carbon_monoxide` | `value.co` | `ppm` |
| `nitrogen_monoxide` | `value.no` | `ppm`, `µg/m³`, `μg/m³` |
| `nitrogen_dioxide` | `value.no2` | `ppm`, `µg/m³`, `μg/m³` |
| `ozone` | `value.o3` | `ppm`, `µg/m³`, `μg/m³` |
| `sulphur_dioxide` | `value.so2` | `ppm`, `µg/m³`, `μg/m³` |
| `pm1` | `value.pm1` | `µg/m³`, `μg/m³` |
| `pm25` | `value.pm25` | `µg/m³`, `μg/m³` |
| `pm10` | `value.pm10` | `µg/m³`, `μg/m³` |
| `radon` | `value.rn` | `Bq/m³` |
| `volatile_organic_compounds` | `value.tvoc` | `µg/m³`, `μg/m³` |
| `volatile_organic_compounds_parts` | `value.tvoc` | `ppb` |

## Binärsensoren {#binary}

Nur bei echten booleschen Werten und passendem Objekttyp. Die üblichen HA-Texte `on` und `off` bleiben unverändert und bekommen durch dieses Skript keine boolesche Rolle. Bei `battery` bedeutet wahr Batterie schwach; bei `lock` bedeutet wahr entriegelt.

| HA-Geräteklasse | ioBroker-Rolle |
|---|---|
| `battery` | `indicator.lowbat` |
| `connectivity` | `indicator.reachable` |
| `door` | `sensor.door` |
| `garage_door` | `sensor.door` |
| `window` | `sensor.window` |
| `opening` | `sensor.contact` |
| `lock` | `sensor.lock` |
| `motion` | `sensor.motion` |
| `moisture` | `sensor.alarm.flood` |
| `smoke` | `sensor.alarm.fire` |
| `carbon_monoxide` | `sensor.alarm.co` |
| `light` | `sensor.light` |
| `sound` | `sensor.noise` |
| `problem` | `indicator.error` |
| `running` | `indicator.working` |

## Weitere Zuordnungen aus dem Vergleich {#conditional}

Im reinen Rollenmodus werden diese Fälle nicht automatisch umgesetzt. Der virtuelle Modus übernimmt die unten genannten Light- und Schaltfunktionen mit den beschriebenen Prüfungen; Füllstand, Verbrauch/Einspeisung und mehrdeutige Messklassen werden weiterhin nicht geraten.

| HA-Klasse/Funktion | Mögliche Rolle | Noch erforderlich |
|---|---|---|
| `volume_storage` | `value.fill` | Tatsächlichen Behälterfüllstand bestätigen |
| `water`, `gas` | Allgemeiner Messwert | Verbrauch ist kein Füllstand |
| `energy` | `value.energy.consumed` / `value.energy.produced` | Verbrauch/Einspeisung ausdrücklich feststellen |
| `speed` | `value.speed` | Nicht pauschal als Windgeschwindigkeit behandeln |
| `moisture` als Zahl | Allgemeiner Messwert | Nicht mit binärem Wasseralarm verwechseln |
| Helligkeitsrückmeldung | `value.dimmer` | Prozentwert und Light-Funktion bestätigen |
| Helligkeitsvorgabe | `level.dimmer` | Separaten Rückkanal korrekt anbinden |
| Schaltzustand | `sensor.switch` | Booleschen Wert normalisieren |
| Schaltbefehl | `switch` / `switch.light` | `/set` anbinden; keinen Befehl zur Einrichtung senden |
| Farbtemperaturvorgabe | `level.color.temperature` | Kelvin, Grenzen und Rückkanal |
| Effektauswahl | `level.effect` | Effektliste und Rückkanal |
| RGB-Steuerung | `level.color.rgb` | JSON-Array in Hexfarbe umwandeln |

Für `occupancy`, `presence`, `moving`, `plug`, binäres `power`, `battery_charging`, `cold`, `heat`, binäres `gas`, `glass_break`, `safety`, `tamper`, `update` und `vibration` wird keine Spezialrolle geraten. Allgemeine `sensor`-/`indicator`-Rollen oder eigene Regeln sind möglich, gehören aber nicht zur sicheren Automatik. Auch alle weiteren nicht aufgeführten Klassen bleiben unverändert.

## Wiederherstellung {#restore}

Skript stoppen, `mode: 'restore'` einstellen und erneut starten. Das Skript stellt nur eigene Rollenänderungen wieder her, wenn die aktuelle Rolle und der Datentyp noch zu seinem Sicherungseintrag passen. Nachträgliche manuelle Rollenänderungen bleiben bestehen. Eigene unveränderte Aliase werden entfernt; bearbeitete oder fremde Aliase bleiben erhalten. MQTT-Originalwerte werden nicht gelöscht.

Danach das Skript stoppen. Sicherung und Ausnahmeliste aufbewahren. Bereits protokollierte Datenpunkte werden im selben Journal nicht erneut übernommen; ein neuer Durchgang benötigt bewusst einen neuen `backupId` und bei Aliasen einen freien `aliasRoot`.

Lokal mit simulierten ioBroker-APIs auf Vorschau, Sicherungsfehler, Typen, Einheiten, manuelle Änderungen, Aliase und Wiederherstellung geprüft. Noch kein Installationstest auf einem realen ioBroker-System.

[Home Assistant: Sensor](https://www.home-assistant.io/integrations/sensor/#device-class) · [Home Assistant: Binary sensor](https://www.home-assistant.io/integrations/binary_sensor/#device-class) · [ioBroker: State roles](https://www.iobroker.com/docs/dev/stateroles.md) · [ioBroker: JavaScript API](https://github.com/ioBroker/ioBroker.javascript/blob/v10.4.10/docs/en/javascript.md)
