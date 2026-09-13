# MQTT-Client einrichten

Öffne nach dem Start **Open Web UI** und trage dort deinen externen Broker ein,
zum Beispiel ioBroker im Modus Server/Broker. Die Oberfläche enthält Felder für
IP oder Hostname, Port, Benutzername und Passwort. Port `1883` ist als
ioBroker-Standardport voreingestellt. Rot bedeutet **Keine Verbindung**, grün
bedeutet **Verbunden**.

Darunter zeigt die Oberfläche links die verfügbaren Home-Assistant-Entitäten mit
Namen als Hauptzeile und Entity-ID als Detail. Rechts stehen die ausgewählten
Übertragungen. Klicke eine Entität an, um im Popup den State und einzelne Attribute
per Checkbox freizugeben. Bei `switch`, `light`, `input_boolean` und `fan` kannst
du zusätzlich **Bidirektional / Werte schreiben** aktivieren. Dasselbe gilt für
Eingabewerte wie `input_number`, `number`, `input_select`, `select`, `input_text`
und `text`. Sensorwerte bleiben nur ausgehend. Der bestehende HA-Broker bleibt erhalten. Die App benötigt keinen
manuellen HA-Token. Änderungen aus der Weboberfläche werden sofort angewendet.

Die Standard-Topics sind `ha_external/<entity_id>/state`,
`ha_external/<entity_id>/attribute/<attribut>` und `ha_external/availability`.
Die Abfrage erfolgt alle fünf Sekunden. Nur explizit ausgewählte States und
Attribute werden exportiert; keine Discovery.

Optional erlaubst du unter `command_entities` eine Teilmenge dieser Entitäten für
Schreibbefehle. Sende ohne Retain an `ha_external/<entity_id>/set`: `ON` oder
`OFF` für Schalter-ähnliche Domains, Zahlen für Slider/Zahlwerte, Optionsnamen
für Selects und Text für Textfelder. Die Weboberfläche zeigt diese Option nur bei
steuerbaren Domains. Leere Liste bedeutet keine Befehle.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
