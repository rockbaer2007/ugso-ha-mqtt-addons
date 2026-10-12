# MQTT-Client 0.1.16

An independent Home Assistant app for sending selected Home Assistant devices and values to ioBroker or another external MQTT broker. Instead of mirroring the whole Home Assistant inventory through ioBroker's HASS adapter, you choose the devices and values that should appear in ioBroker. This follows the familiar idea of ioBroker → Home Assistant via MQTT, but in the opposite direction and with explicit selection. Your existing HA broker and MQTT integration remain in place. This is a direct HA API client, not a broker bridge.

Add `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` to the HA app store and
install **MQTT-Client** (amd64/aarch64). Open **Open Web UI** to configure the
external broker IP/hostname, port, username and password. Port `1883` is the
default for ioBroker's MQTT adapter. The web UI shows red **No connection** and
green **Connected**. It shows a compact device list on the left; the search also
matches entities inside each device, for example all plugs. Clicking a device
opens a popup with **Control**, **Sensors**, **Configuration** and **Diagnostics**
sections. Each entity shows its friendly name, state, target type and attribute
count. Selected transmissions appear on the right. Use the checkbox on the right side of a value row to send that value state plus all of its attributes. **Send all states for this device** selects every value of the device including attributes. Sensor-like domains remain outgoing-only.

The entity list shows an ioBroker-style target type: `press` maps to `button`,
`state_boolean` maps to `switch`, and text/state values map to `state`.

Broker settings and selected states/attributes from the web UI are applied
immediately. No manual HA token is needed: access uses the Supervisor token and
HA Core API proxy.

States are received live after an initial snapshot. On WebSocket failure, polling
uses the existing interval (default five seconds, `poll_interval`: 1–300 seconds).
Changes are published as plain state strings to
`<topic_prefix>/<device>/<value>/state` and selected attributes to
`<topic_prefix>/<device>/<value>/attribute/<attribute>` with QoS 1 and Retain.
This creates one ioBroker device folder with all values below it. During the first
sync, states and attributes are published before `/set` return-command topics are
subscribed, with a default 50 ms delay between new MQTT values so ioBroker can
create objects in small batches. After MQTT reconnection, all selected values are resent. The default prefix is
`ha_external`. Only selected states and attributes are exported, with no MQTT
Discovery. Transitions during an outage or between fallback polls may be missed. Missing entities
produce `unavailable`; `unknown`/`unavailable` are passed through.

For selected controllable states, return commands are enabled automatically.
Publish without Retain to `<topic_prefix>/<device>/<value>/set`: `ON` or `OFF`
for toggle-like domains, numbers for `input_number`/`number`, option names for
`input_select`/`select`, text for `input_text`/`text`, and `PRESS` for
`button`/`input_button`, including button-style values such as up, down or stop.
Legacy entity-ID command topics such as `<topic_prefix>/switch.plug/set` remain
accepted for compatibility. Sensor-like domains remain outgoing-only.
Retained messages received on subscription, invalid payloads and stale queued
commands are discarded. Arbitrary HA service calls are unsupported.

`<topic_prefix>/availability` is `online` after a successful HA synchronization and
`offline` on failure, shutdown or MQTT Last Will. Failure detection is subject to
API timeout and MQTT keepalive. Reconnection is automatic. Use a unique client ID
and prefix for each instance. Retained states from removed entities or old topic
prefixes can be selected and explicitly cleared using **Veraltete Retain-Topics prüfen**
(Review obsolete retained topics). Only acknowledged topics recorded by this app on
the current broker are eligible; active and foreign topics are protected. Unrecorded
obsolete values from before the update still require manual broker cleanup.

TLS verifies certificates and hostnames using system trust or a custom PEM CA;
adjust the broker port accordingly (often 8883). **Übertragung und TLS** supports
PEM file uploads or pasted CA, client certificate and matching private key.
The app does not edit HA configuration files or export authentication credentials.

## Live updates, status and compatibility

After a complete initial snapshot, HA WebSocket `state_changed` events are processed
in order. Reconnect includes a fresh snapshot; MQTT reconnect resends selected values.
The existing `poll_interval` remains the polling fallback (default 5 seconds). Transitions
missed during an outage cannot be reconstructed. Queue overload requests a resync and
is reported. Status shows MQTT/HA connectivity, live/polling mode, last sync/publish,
publish count and sanitized error types.

Existing 0.1.15 credentials, selection, topic prefix, client ID, polling interval and
publish delay remain valid. Startup does not rewrite settings or delete retained data.
New TLS material defaults to empty and system trust remains the default.

Additional `/set` commands: covers accept `OPEN`, `CLOSE`, `STOP` and `{"position":45}`;
lights accept `{"brightness_pct":75}`; fans accept `{"percentage":50}`. JSON commands
permit only the named field and a finite number from 0 to 100. The HA device must
support the requested function. Existing commands and legacy entity-ID topics remain
supported; retained/stale/invalid commands remain rejected.

**Einstellungen sichern** downloads a JSON backup of broker settings, custom CA and
selection, excluding passwords, client certificate/private key and HA tokens.
**Sicherung öffnen** validates and asks before replacing settings. Local credentials
and client certificate/key are retained only for the same broker. On another broker,
enter these separately. This is not a full HA app backup and contains no retained payloads.

PEM options: `tls_ca`, `tls_cert`, `tls_key`. Blank Web UI fields retain stored values;
the explicit clear checkbox removes stored TLS material on Save. The retained topic
inventory persists at `/data/mqtt-topics.json` and cleanup requires explicit selection
and confirmation, at most 100 topics per request.

[HA WebSocket API](https://developers.home-assistant.io/docs/api/websocket/) ·
[Cover actions](https://www.home-assistant.io/integrations/cover/) ·
[Light actions](https://www.home-assistant.io/integrations/light/).

See the [German README](README.md) for a complete sample configuration and tests.
