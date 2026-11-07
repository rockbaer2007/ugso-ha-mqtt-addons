# MQTT-Client

## New in 0.1.22

Label selection now includes the state, available standard metadata and return
channels for supported controllable entities. Switches automatically receive
`<base>/set` for `ON`/`OFF`; numbers, selects and buttons use their supported
commands. Setup sends no control commands. Retained, empty and invalid commands
are discarded.

Lights receive only channels supported by their HA capabilities:

| Channel below `<base>` | Value and return channel |
| --- | --- |
| `brightness/state`, `brightness/set` | Brightness 0–100% |
| `rgb_color/state`, `rgb_color/set` | JSON `[255,128,0]`, components 0–255 |
| `effect/state`, `effect/set` | Effect name from the reported effect list |
| `color_temp_kelvin/state`, `color_temp_kelvin/set` | Integer Kelvin within the reported limits |

`<base>` is the existing topic without `/state`. Effect lists, supported color
modes and minimum/maximum Kelvin values are read-only attributes. Manually selected
HA attributes retain their paths and units: `attribute/brightness` remains 0–255.

Under **Übertragung und TLS** (Transfer and TLS), enable **Zugehörige Mess- und
Batteriewerte desselben Geräts automatisch einbeziehen** to include related
measurements. `label_device_readings` defaults to `false`. Supported readings
are energy, voltage, current, power, temperature, humidity, battery and an existing
battery-low sensor. Matching uses the same HA device ID, never similar names.
No thresholds are invented. These additional sensors have no return channels.

Automatic metadata includes available names, device classes, units and state
classes, plus required choices and limits. Other attributes remain selectable
manually. `device_class` is transmitted as metadata; this does not automatically
change an ioBroker role such as `date`.

The transmission popup also shows automatic attributes, Light values and active
return topics with their origin. Removing a label revokes automatic values and
return channels at the next sync; queued commands are checked again before
execution. Manual selections and credentials are preserved. Old retained values
are removed only through confirmed topic cleanup.

Verified locally with simulated HA and broker; no new HA device test.
[Release 0.1.22](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/releases/tag/mqtt-client-v0.1.22)

## New in 0.1.21

Only credentials collapse automatically. **Übertragung und TLS** remains separately
accessible. Equal-size **Save and connect** and **Current transmissions** buttons
share a visible row. The searchable, scrollable popup includes manually selected
states/attributes and label-selected states, without duplicate states.

Origin badges are labelled: blue **Label**, green **Manual**, purple **Both**.
Since 0.1.22, automatic standard attributes are included too. Each row shows the name, entity ID, attribute,
current value, topic and last broker-acknowledged value/time. Errors appear separately
in red; unconfirmed values are marked. Refresh runs every three seconds while open
and via the refresh button. Acknowledgement means acceptance by the MQTT broker,
not processing by ioBroker. Runtime history resets when the connection is restarted;
existing settings, credentials and selections are preserved.

Since **0.1.20**, connection settings are collapsible under **Zugangsdaten**
(Credentials). The section opens for initial setup and collapses after loading or
successfully saving a configured broker address. Click the title to reopen it.

Since **0.1.19**, the transmission list also separates the entity name from the
state, attribute-selection and return-command summary. **Edit** remains on the right.

Since **0.1.18**, each entity in the device popup displays its name, entity ID,
and target type with attribute count on three separate lines. The current state
remains on the right; long names and IDs wrap within their column.

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
## Forward entities by HA label

Create an HA label named “Forward to MQTT Client” and enter its ID in the **HA label ID** setting. Assign the label in the entity settings and save. The client checks assignments at the configured polling interval. Leave the setting empty to disable label selection.

The label forwards the state and standard metadata and enables supported return channels. Other attributes remain manually selectable. Removing the label stops automatic forwarding and revokes return channels. Manually selected entities stay active. The existing topic cleanup can remove the last retained value.
