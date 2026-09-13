# MQTT-Client einrichten

Öffne nach dem Start **Open Web UI** und trage dort deinen externen Broker ein,
zum Beispiel ioBroker im Modus Server/Broker. Die Oberfläche enthält Felder für
IP oder Hostname, Port, Benutzername und Passwort. Port `1883` ist als
ioBroker-Standardport voreingestellt. Rot bedeutet **Keine Verbindung**, grün
bedeutet **Verbunden**.

Füge in der App-Konfiguration unter `entities` die gewünschten HA-Entity-IDs hinzu.
Der bestehende HA-Broker bleibt erhalten. Die App benötigt keinen manuellen HA-Token.
Änderungen an IP, Port, Benutzer und Passwort aus der Weboberfläche werden sofort
angewendet.

Die Standard-Topics sind `ha_external/<entity_id>/state` und
`ha_external/availability`. Die Abfrage erfolgt alle fünf Sekunden. Nur explizit
ausgewählte Zustandstexte werden exportiert; keine Attribute oder Discovery.

Optional erlaubst du unter `command_entities` eine Teilmenge dieser Entitäten für
Ein/Aus-Befehle: `switch`, `light`, `input_boolean` und `fan`. Sende `ON` oder `OFF`
ohne Retain an `ha_external/<entity_id>/set`. Leere Liste bedeutet keine Befehle.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
