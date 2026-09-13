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
ausgewählten Übertragungen. Klicke im Geräte-Popup eine Entität an, um den State
und einzelne Attribute per Checkbox freizugeben. Bei `switch`, `light`,
`input_boolean` und `fan` kannst
du zusätzlich **Bidirektional / Werte schreiben** aktivieren. Dasselbe gilt für
Eingabewerte wie `input_number`, `number`, `input_select`, `select`, `input_text`
und `text` sowie für `button` und `input_button`. Sensorwerte bleiben nur ausgehend. Der bestehende HA-Broker bleibt erhalten. Die App benötigt keinen
manuellen HA-Token. Änderungen aus der Weboberfläche werden sofort angewendet.

Die ioBroker-Zuordnung in der Liste folgt diesen Regeln: `press` wird als `button`
angezeigt, `state_boolean` als `switch`, `text`/`state` als `state`.

Die Standard-Topics sind `ha_external/<entity_id>/state`,
`ha_external/<entity_id>/attribute/<attribut>` und `ha_external/availability`.
Die Abfrage erfolgt alle fünf Sekunden. Nur explizit ausgewählte States und
Attribute werden exportiert; keine Discovery.

Optional erlaubst du unter `command_entities` eine Teilmenge dieser Entitäten für
Schreibbefehle. Sende ohne Retain an `ha_external/<entity_id>/set`: `ON` oder
`OFF` für Schalter-ähnliche Domains, Zahlen für Slider/Zahlwerte, Optionsnamen
für Selects, Text für Textfelder und `PRESS` für Buttons. Die Weboberfläche zeigt diese Option nur bei
steuerbaren Domains. Leere Liste bedeutet keine Befehle.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
