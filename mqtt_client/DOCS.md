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
du zusätzlich **Bidirektional / Befehle erlauben** aktivieren. Sensorwerte bleiben
nur ausgehend. Der bestehende HA-Broker bleibt erhalten. Die App benötigt keinen
manuellen HA-Token. Änderungen aus der Weboberfläche werden sofort angewendet.

Die Standard-Topics sind `ha_external/<entity_id>/state`,
`ha_external/<entity_id>/attribute/<attribut>` und `ha_external/availability`.
Die Abfrage erfolgt alle fünf Sekunden. Nur explizit ausgewählte States und
Attribute werden exportiert; keine Discovery.

Optional erlaubst du unter `command_entities` eine Teilmenge dieser Entitäten für
Ein/Aus-Befehle: `switch`, `light`, `input_boolean` und `fan`. Sende `ON` oder `OFF`
ohne Retain an `ha_external/<entity_id>/set`. Die Weboberfläche zeigt diese Option
nur bei steuerbaren Domains. Leere Liste bedeutet keine Befehle.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
