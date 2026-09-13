# MQTT-Client einrichten

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
ausgewählte States und Attribute werden exportiert; keine Discovery.

Optional erlaubst du unter `command_entities` eine Teilmenge dieser Entitäten für
Schreibbefehle. Sende ohne Retain an `ha_external/<gerät>/<wert>/set`: `ON`
oder `OFF` für Schalter-ähnliche Domains, Zahlen für Slider/Zahlwerte,
Optionsnamen für Selects, Text für Textfelder und `PRESS` für Buttons. Alte
Entity-ID-Topics wie `ha_external/switch.stecker_garten/set` werden als
Kompatibilität weiter angenommen. Die Weboberfläche zeigt diese Option nur bei
steuerbaren Domains. Leere Liste bedeutet keine Befehle.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
