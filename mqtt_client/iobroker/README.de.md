# ioBroker: automatische Rollenzuordnung {#iobroker-role-mapping}

Das optionale JavaScript gehört zu MQTT-Client **0.1.23** und läuft im ioBroker-JavaScript-Adapter. Es verwendet die übertragenen Metadaten `device_class` und `unit_of_measurement`. Es ordnet nur eindeutige Fälle zu; weder MQTT-Werte noch Datentypen, Einheiten, Zugangsdaten oder Rückkanäle werden umgeschrieben.

## Installation und Sicherung {#installation}

1. Vorher im ioBroker-Admin die betroffenen MQTT-Objekte einschließlich Zuständen und vorhandenen Skripten exportieren beziehungsweise eine vollständige Sicherung erstellen.
2. Im MQTT-Client **ioBroker-Rollenskript herunterladen** wählen oder [die Skriptdatei laden](../app/iobroker/ugso-mqtt-role-mapper.js).
3. Im ioBroker unter **Skripte** ein neues **JavaScript** anlegen und den gesamten Dateiinhalt einfügen. Es genügt ein Skript in einer JavaScript-Instanz.
4. Oben `mqttRoot` auf den eigenen MQTT-Pfad einstellen, zum Beispiel `mqtt.0.ha_external`. Der Pfad darf keine Platzhalter enthalten.
5. Zunächst `mode: 'preview'` beibehalten, starten und das JavaScript-Protokoll prüfen. Die Vorschau schreibt nichts.
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

Diese Fälle sind dokumentiert, werden aber **nicht automatisch umgesetzt**:

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

[Home Assistant: Sensor](https://www.home-assistant.io/integrations/sensor/#device-class) · [Home Assistant: Binary sensor](https://www.home-assistant.io/integrations/binary_sensor/#device-class) · [ioBroker: State roles](https://www.iobroker.com/docs/dev/stateroles.md) · [ioBroker: JavaScript API](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md)
