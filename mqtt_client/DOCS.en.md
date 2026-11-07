# MQTT-Client

## New in 0.1.30: collapsible credentials

**Credentials** now has a dedicated expand/collapse button with keyboard support. With a configured broker, IP, port, username and password remain collapsed after loading and saving. Missing required credentials open the section for correction. **Transmission and TLS**, **Save and connect** and **Currently transmitted values** stay visible. Settings and credentials are not changed. The 0.1.29 priority logic and helper 0.1.27 are preserved. The user confirmed successful control feedback with a delay of approximately half a second. The Zigbee light was also tested successfully: feedback works and brightness follows HA to 100%.

## New in 0.1.29: control states before measurements

**Update the HA MQTT-Client app to 0.1.29; the ioBroker helper 0.1.27 remains unchanged.** Control/contact states and command feedback take priority over measurements and bypass the configured artificial publish pause. In-flight transmissions finish normally; between messages, measurement/attribute batches yield to urgent states or commands. With at least 32 events waiting, bounded sensor batches collapse intermediate values to the latest state per source. Ordinary control transitions are preserved. A periodic check reads actual HA states even with an active live connection, using the existing `poll_interval` (default 5 seconds). Unchanged values are not republished. **Übertragung und TLS** and the measurement/attribute publish delay are directly visible; credentials still collapse separately. The status line distinguishes waiting events (**Wartend**), collapsed events (**Zusammengefasst**), the last HA event (**HA-Eingang**) and the cumulative sent count (**Gesendet**). Existing settings and values are preserved. For validation, keep the check interval at 5 seconds and toggle a non-critical relay in HA. Only actual HA feedback produces `ack: true`; broker handoff is insufficient. Locally verified; end-to-end latency on the user's system still needs confirmation.

Switches are recognized by the `switch.*` domain and require neither a device class nor a unit. Lights use `light.*`. Enabled automatic measurement selection remains restricted to the same HA device association. Sensors first use `device_class`; when it is missing, unambiguous `unit_of_measurement` values such as W/kW/MW, V/mV/kV, A/mA and Wh/kWh/MWh are used. Existing classes are never overridden; similar names or an ambiguous percent sign are insufficient. **Check related measurements** (German UI: **Zugehörige Messwerte prüfen**) provides a read-only report of detected sensors and exclusion reasons, including missing device associations, disabled entities or unsuitable classes/units. Measurements may wait behind control states. Settings, credentials and existing values are preserved.

## New in 0.1.28: HA live feedback without unrelated event floods

This fix is in the **MQTT-Client app in Home Assistant**: update it to 0.1.28 and restart the app. The ioBroker helper 0.1.27 can remain unchanged; replacing only that script does not fix HA event reception. Label forwarding now queues events only for selected entities and their enabled same-device readings. Events from the rest of HA cannot fill that queue. When labels or device assignments change, the client fetches fresh HA states. Buffered states with an older `last_updated` are ignored after a resync; normal ordered transitions are preserved. The overload counter is cumulative since app startup and still reports actual selected-event overflows. The configured publish delay, credentials and selections are preserved; a large initial sync may still take longer. After initial sync, toggle a non-critical relay in HA and check that MQTT and the virtual ioBroker state follow promptly. Confirmation on the user's live system is still pending.

## New in 0.1.27: return channel without retain

Commands now use the ioBroker MQTT adapter's `sendMessage2Client` API with **`retain: false`**. Normal writes to MQTT `set` states may reach the client with RETAIN enabled in server mode. The HA client continues rejecting retained commands so reconnecting cannot execute old requests. Global broker settings and MQTT state values are preserved. The helper validates the command topic against its state topic using `native.topic`, rather than guessing paths from object IDs. In VIS 2, keep controlling the virtual state below `0_userdata.0.ugso_mqtt` with `ack: false` and use `mode: 'apply'`. The log line `Command handed to MQTT adapter (retain=false)` confirms handoff only; a new HA state is required to confirm execution. The raw MQTT `set` value need not change. No automatic retry; errors or missing HA feedback remain unconfirmed. Replace the complete helper file while retaining your own settings.

## New in 0.1.26: automatic helper setup

Missing helper base folders (`virtualRoot`, `aliasRoot`) and both backup states (`virtualBackupId`, `backupId`) are now created automatically at startup in **every mode**, including `preview` and `restore`. Existing folders, backups, values and manual roles are not overwritten. New journals contain valid empty structures. Allow `setObject` in the JavaScript instance even for preview. Missing permissions or conflicting paths are reported as errors. Preview does not create controllable VIS-2 states or change MQTT roles or device values; use `mode: 'apply'` after review for those operations. Event-driven processing from 0.1.25 is retained.

## Fix in 0.1.25

Missing journals, optional attributes and virtual targets are checked with
`existsObject`/`existsState` before reads. Adapter 10.4.10 also warns for missing
IDs in `getObject`. All modes create missing helper base folders and backups; `apply` creates VIS-2 data points.
[Updated permission and preview notes](iobroker/README.en.md#fix-0125).

## New in 0.1.24: automatic VIS-2 states

The combined ioBroker helper creates own states below `0_userdata.0.ugso_mqtt` in
`outputMode: 'virtual'`. One state combines feedback and the return channel:
HA updates use `ack: true`, VIS-2 requests use `ack: false` and go to `/set`.
Switches, brightness, RGB, effects and Kelvin are normalized as needed. The journal
and base folders are created automatically in every mode; preview changes
no device values or roles. Startup never switches a device. Uses APIs available in JavaScript adapter
10.4.10. Existing aliases and MQTT objects are preserved. Missing optional attributes
no longer cause warnings. [Full setup and limits](iobroker/README.en.md).

## New in 0.1.23

**ioBroker-Rollenskript herunterladen** downloads an optional JavaScript for the
ioBroker JavaScript adapter. Preview is the default. Original roles are backed up
before changes; values, types, credentials and manual specific roles are preserved.
Writable MQTT measurements use read-only aliases instead.
[Installation, restore and mapping table](iobroker/README.en.md) ·
[Guide français](iobroker/README.fr.md).

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
