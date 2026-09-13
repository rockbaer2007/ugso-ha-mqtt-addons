# MQTT-Client einrichten

Trage in der App-Konfiguration deinen externen Broker (z. B. ioBroker im Modus
Server/Broker), Port, Benutzer und Passwort ein. Füge unter `entities` die gewünschten
HA-Entity-IDs hinzu. Speichern, dann die App starten beziehungsweise neu starten.
Der bestehende HA-Broker bleibt erhalten. Die App benötigt keinen manuellen HA-Token.

Die Standard-Topics sind `ha_external/<entity_id>/state` und
`ha_external/availability`. Die Abfrage erfolgt alle fünf Sekunden. Nur explizit
ausgewählte Zustandstexte werden exportiert; keine Attribute oder Discovery.

Optional erlaubst du unter `command_entities` eine Teilmenge dieser Entitäten für
Ein/Aus-Befehle: `switch`, `light`, `input_boolean` und `fan`. Sende `ON` oder `OFF`
ohne Retain an `ha_external/<entity_id>/set`. Leere Liste bedeutet keine Befehle.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
