# Changelog

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
