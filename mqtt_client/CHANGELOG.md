# Changelog

## 0.1.3

- Entity list now shows the friendly name first and the entity ID as secondary text.
- Added explicit bidirectional command checkbox for supported domains only.
- Sensor-like entities remain outgoing-only unless their domain supports commands.

## 0.1.2

- Added entity browser in the web UI with available Home Assistant entities on the left and selected transmissions on the right.
- Added entity detail dialog with checkboxes for state and selectable attributes.
- Added retained MQTT publishing for selected attributes on `attribute/<name>` topics.

## 0.1.1

- Added Home Assistant Ingress web UI for broker IP/hostname, port, username and password.
- Added red/green connection status text in the web UI.
- The app now starts the web UI even before a broker host is configured.
- Broker connection changes from the web UI are applied immediately without a full app restart.

## 0.1.0

- Initial independent MQTT client for external brokers alongside the existing HA broker.
- Selected HA state export, configurable polling, TLS, automatic reconnect and availability.
- Optional ON/OFF commands for explicitly allowed entities; retained command rejection.
- German/English documentation and regression tests.
