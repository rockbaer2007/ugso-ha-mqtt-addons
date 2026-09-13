# Changelog

## 0.1.13

- Enabled return commands automatically for selected controllable states, including switches, inputs, sliders, selects, text fields and buttons/tasters.
- Existing selected controllable entities now receive their device/value `/set` command topics without needing a separate bidirectional checkbox.
- Kept sensor-like values outgoing-only.

## 0.1.12

- Moved value-row checkboxes to the left side before the text.
- Removed bold styling from value-row names and values.
- Stopped reopening the device popup after checkbox changes, so closing the popup stays closed.

## 0.1.11

- Changed device popup rows to right-side checkboxes.
- Selecting one value now includes its state and all attributes.
- The device-level select-all checkbox now selects all values including all attributes.

## 0.1.10

- Added common Entity-ID prefix grouping so `1pm_mini_gen3_res1_*` values are merged into the main `1PM Mini Gen3-Res1` device even when the value suffix is unknown.
- Kept **Alle States dieses Geräts übertragen** inside the device popup where the values are listed.

## 0.1.9

- Improved device grouping for Shelly-style German entity names such as `Neu starten`, `Stromstärke`, `Switch`, `Überhitzung`, `Überlast`, `Überspannung` and `Überstrom`.
- Single-value device hits now open the entity editor directly instead of an extra device popup.

## 0.1.8

- Changed published MQTT topics to a device/value tree for ioBroker, for example `ha_external/stecker_garten/energie/state`.
- Added **Alle States dieses Geräts übertragen** in the device popup.
- Kept legacy entity-ID `/set` command topics as compatibility input while adding device/value `/set` command topics.

## 0.1.7

- Changed the left entity browser into a compact device search list.
- Device clicks now open a device popup with grouped sections for Steuerung, Sensoren, Konfiguration and Diagnose.
- Entity transmission details remain editable from inside the device popup.

## 0.1.6

- Grouped the entity browser by device, similar to Home Assistant device details.
- Related switches, sensors, updates, states and attributes now appear inside one device group when HA metadata or matching friendly-name prefixes allow it.
- Kept the existing entity and attribute selection workflow unchanged inside each device group.

## 0.1.5

- Added ioBroker-style entity mapping in the web UI: `press` maps to `button`, `state_boolean` maps to `switch`.
- Added `button` and `input_button` as bidirectional press-capable domains.
- The entity list now shows the detected ioBroker target type in the secondary line.

## 0.1.4

- Added bidirectional value commands for `input_number`, `number`, `input_select`, `select`, `input_text` and `text`.
- Numeric MQTT `/set` payloads now call `set_value`; select payloads call `select_option`; text payloads call `set_value`.
- Kept sensor-like entities outgoing-only.

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
