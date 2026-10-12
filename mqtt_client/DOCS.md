# MQTT-Client einrichten

Seit **0.1.16**: Live-Zustände mit vollständigem Erstabgleich und Polling-Rückfall,
getrennter MQTT-/HA-Status, bestätigte Bereinigung erfasster alter Retain-Topics,
Rollladen-/Helligkeits-/Lüfterbefehle, Einstellungssicherung und eigene TLS-PEM-Zertifikate.
Bestehende Einstellungen aus 0.1.15 bleiben gültig; beim Start werden weder
Zugangsdaten oder Auswahl überschrieben noch Retain-Werte gelöscht.

**Übertragung und TLS** enthält das bisherige Abfrageintervall als Rückfall sowie
CA und Client-Zertifikat/Schlüssel. Leere Zertifikatsfelder behalten gespeicherte Werte.
**Einstellungen sichern** exportiert ohne Passwort oder Client-Zertifikat/privaten
Schlüssel; **Sicherung öffnen** prüft das Format und fragt vor dem Ersetzen nach.
**Veraltete Retain-Topics prüfen** löscht nur ausgewählte und bestätigte, von dieser
App erfasste unbenutzte Topics. Aktive Werte und fremde Topics bleiben geschützt.

Rollläden akzeptieren `OPEN`, `CLOSE`, `STOP`, `{"position":45}`, Lampen
`{"brightness_pct":75}` und Lüfter `{"percentage":50}`. Die Prozentwerte liegen
zwischen 0 und 100; das Gerät muss die HA-Funktion unterstützen.

Der MQTT-Client überträgt ausgewählte Home-Assistant-Geräte und Werte gezielt an ioBroker oder einen anderen externen MQTT-Broker. Er ist eine schlanke Alternative dazu, über den ioBroker-HASS-Adapter den kompletten Home-Assistant-Bestand zu spiegeln. Du bestimmst, welche Geräte und Werte exportiert werden; daraus entsteht in ioBroker ein übersichtlicher Gerätebaum.

Öffne nach dem Start **Open Web UI** und trage dort deinen externen Broker ein,
zum Beispiel ioBroker im Modus Server/Broker. Die Oberfläche enthält Felder für
IP oder Hostname, Port, Benutzername und Passwort. Port `1883` ist als
ioBroker-Standardport voreingestellt. Rot bedeutet **Keine Verbindung**, grün
bedeutet **Verbunden**.

Darunter zeigt die Oberfläche links eine kompakte Geräteliste. Die Suche findet
Geräte auch über enthaltene Entitäten, zum Beispiel alle Stecker. Beim Klick auf
ein Gerät öffnet sich ein Popup mit den Bereichen **Steuerung**, **Sensoren**,
**Konfiguration** und **Diagnose**. Dort stehen die zugehörigen
Home-Assistant-Entitäten mit State, Zieltyp und Attributanzahl. Rechts stehen die
ausgewählten Übertragungen. Setze im Geräte-Popup rechts an einer Wert-Zeile die Checkbox, um den State und alle Attribute dieses Werts freizugeben. **Alle States dieses Geräts übertragen** aktiviert alle Werte eines Geräts inklusive Attribute auf einmal. Sensorwerte
bleiben nur ausgehend. Der bestehende HA-Broker bleibt erhalten. Die App benötigt keinen
manuellen HA-Token. Änderungen aus der Weboberfläche werden sofort angewendet.

Die ioBroker-Zuordnung in der Liste folgt diesen Regeln: `press` wird als `button`
angezeigt, `state_boolean` als `switch`, `text`/`state` als `state`.

Die Standard-Topics sind gerätebasiert: `ha_external/<gerät>/<wert>/state`,
`ha_external/<gerät>/<wert>/attribute/<attribut>` und
`ha_external/availability`. So erscheint in ioBroker ein Geräteordner mit den
Werten darunter. Die Abfrage erfolgt alle fünf Sekunden. Nur explizit
ausgewählte States und Attribute werden exportiert; keine Discovery. Beim ersten
Abgleich sendet die App States und Attribute vor den `/set`-Rückkanälen und
drosselt neue MQTT-Werte standardmäßig mit 50 ms Pause, damit ioBroker die Objekte
in kleinen Häppchen anlegen kann.

Für ausgewählte steuerbare States aktiviert die App Rückbefehle automatisch.
Sende ohne Retain an `ha_external/<gerät>/<wert>/set`: `ON` oder `OFF` für
Schalter-ähnliche Domains, Zahlen für Slider/Zahlwerte, Optionsnamen für Selects,
Text für Textfelder und `PRESS` für Buttons oder Taster. Alte Entity-ID-Topics
wie `ha_external/switch.stecker_garten/set` werden als Kompatibilität weiter
angenommen. Sensorwerte bleiben nur ausgehend.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
