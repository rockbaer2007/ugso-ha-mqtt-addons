# ioBroker: automatic role mapping {#iobroker-role-mapping}

The optional JavaScript ships with MQTT-Client **0.1.32** and runs in the ioBroker JavaScript adapter. It uses transmitted `device_class` and `unit_of_measurement` metadata. Only unambiguous cases are mapped; MQTT values, types, units, credentials and return channels are not rewritten.



## New in 0.1.32: highlight additional measurements {#readings-highlight-0132}

The **“Automatically include related measurements and battery values from the same device”** option is highlighted in amber. Highlighting does not enable the checkbox: make your selection and click **“Save and connect”**. Existing settings are preserved. TLS and certificates remain separately collapsible.

## New in 0.1.31: collapse TLS and certificates separately {#tls-0131}

**TLS and certificates** now has its own collapsible section, operable by mouse or keyboard. Its button shows whether TLS is selected even while closed. Expanding/collapsing changes neither TLS nor stored certificates or credentials. The section stays closed after loading and saving; transmission settings and both action buttons remain visible. The [new JavaScript helper blog entry](https://opensource.ugso-software.de/en/blog/snippets/iobroker-blockly#mqtt-vis2-helper) explains purpose, setup, status/commands and backups and includes the complete unchanged script 0.1.27 with copy button and download.

## New in 0.1.30: collapsible credentials {#credentials-0130}

**Credentials** now has a dedicated expand/collapse button with keyboard support. With a configured broker, IP, port, username and password remain collapsed after loading and saving. Missing required credentials open the section for correction. **Transmission and TLS**, **Save and connect** and **Currently transmitted values** stay visible. Settings and credentials are not changed. The 0.1.29 priority logic and helper 0.1.27 are preserved. The user confirmed successful control feedback with a delay of approximately half a second. The Zigbee light was also tested successfully: feedback works and brightness follows HA to 100%.

## New in 0.1.29: control states before measurements {#priority-0129}

**Update the HA MQTT-Client app to 0.1.29; the ioBroker helper 0.1.27 remains unchanged.** Control/contact states and command feedback take priority over measurements and bypass the configured artificial publish pause. In-flight transmissions finish normally; between messages, measurement/attribute batches yield to urgent states or commands. With at least 32 events waiting, bounded sensor batches collapse intermediate values to the latest state per source. Ordinary control transitions are preserved. A periodic check reads actual HA states even with an active live connection, using the existing `poll_interval` (default 5 seconds). Unchanged values are not republished. **Übertragung und TLS** and the measurement/attribute publish delay are directly visible; credentials still collapse separately. The status line distinguishes waiting events (**Wartend**), collapsed events (**Zusammengefasst**), the last HA event (**HA-Eingang**) and the cumulative sent count (**Gesendet**). Existing settings and values are preserved. For validation, keep the check interval at 5 seconds and toggle a non-critical relay in HA. Only actual HA feedback produces `ack: true`; broker handoff is insufficient. Locally verified; end-to-end latency on the user's system still needs confirmation.

Switches are recognized by the `switch.*` domain and require neither a device class nor a unit. Lights use `light.*`. Enabled automatic measurement selection remains restricted to the same HA device association. Sensors first use `device_class`; when it is missing, unambiguous `unit_of_measurement` values such as W/kW/MW, V/mV/kV, A/mA and Wh/kWh/MWh are used. Existing classes are never overridden; similar names or an ambiguous percent sign are insufficient. **Check related measurements** (German UI: **Zugehörige Messwerte prüfen**) provides a read-only report of detected sensors and exclusion reasons, including missing device associations, disabled entities or unsuitable classes/units. Measurements may wait behind control states. Settings, credentials and existing values are preserved.

## New in 0.1.28: HA live feedback without unrelated event floods {#live-0128}

This fix is in the **MQTT-Client app in Home Assistant**: update it to 0.1.28 and restart the app. The ioBroker helper 0.1.27 can remain unchanged; replacing only that script does not fix HA event reception. Label forwarding now queues events only for selected entities and their enabled same-device readings. Events from the rest of HA cannot fill that queue. When labels or device assignments change, the client fetches fresh HA states. Buffered states with an older `last_updated` are ignored after a resync; normal ordered transitions are preserved. The overload counter is cumulative since app startup and still reports actual selected-event overflows. The configured publish delay, credentials and selections are preserved; a large initial sync may still take longer. After initial sync, toggle a non-critical relay in HA and check that MQTT and the virtual ioBroker state follow promptly. Confirmation on the user's live system is still pending.

## New in 0.1.27: return channel without retain {#commands-0127}

Commands now use the ioBroker MQTT adapter's `sendMessage2Client` API with **`retain: false`**. Normal writes to MQTT `set` states may reach the client with RETAIN enabled in server mode. The HA client continues rejecting retained commands so reconnecting cannot execute old requests. Global broker settings and MQTT state values are preserved. The helper validates the command topic against its state topic using `native.topic`, rather than guessing paths from object IDs. In VIS 2, keep controlling the virtual state below `0_userdata.0.ugso_mqtt` with `ack: false` and use `mode: 'apply'`. The log line `Command handed to MQTT adapter (retain=false)` confirms handoff only; a new HA state is required to confirm execution. The raw MQTT `set` value need not change. No automatic retry; errors or missing HA feedback remain unconfirmed. Replace the complete helper file while retaining your own settings.

## New in 0.1.26: automatic helper setup {#setup-0126}

Missing helper base folders (`virtualRoot`, `aliasRoot`) and both backup states (`virtualBackupId`, `backupId`) are now created automatically at startup in **every mode**, including `preview` and `restore`. Existing folders, backups, values and manual roles are not overwritten. New journals contain valid empty structures. Allow `setObject` in the JavaScript instance even for preview. Missing permissions or conflicting paths are reported as errors. Preview does not create controllable VIS-2 states or change MQTT roles or device values; use `mode: 'apply'` after review for those operations. Event-driven processing from 0.1.25 is retained.

## Fix 0.1.25: missing objects without warnings {#fix-0125}

JavaScript adapter **10.4.10** also warns when `getObject` reads a missing ID. The helper now checks `existsObject` and `existsState` before reading objects or states. This covers the journal, optional metadata, folders and virtual states not created yet. The previous `getObject`-only guard was insufficient.

Preview logs `Preview VIS 2` lines but creates only missing helper base folders and backups. After checking, set `mode: 'apply'` for automatic creation. Allow `setObject` in the JavaScript instance and disable **Do not subscribe to all states on start**, because the helper reads state caches synchronously. Interrupted own creations can retry after permissions are corrected; unrelated or edited states remain protected.

MQTT-Client **0.1.24 or later** provides the required selection catalog; replacing the complete helper file is enough for this fix. Old deselected retained topics without current entity identity are skipped. Missing HA metadata is never invented. The startup message now identifies the version and operating mode.

The helper batches actual MQTT changes for one second. Virtual mode processes only affected sources; unchanged repeats and unrelated attributes do not trigger a pass. Full scans run at startup and when the selection catalog or availability changes. Timeout checks cover pending sources only and stop after confirmation or timeout. Each entity uses only the return channel matching its state; existing ioBroker objects are not deleted.

## New in 0.1.24: one VIS-2 state for feedback and commands {#vis2}

The script now creates virtual states and folders automatically below `0_userdata.0.ugso_mqtt`. It targets the APIs of ioBroker JavaScript adapter **10.4.10**. First **update MQTT-Client to 0.1.24** and reconnect: its new selection catalog binds each entity to its current topic and command permission. Old retained topics must not create duplicate controls.

Initially keep these settings at the top of the complete script:

```js
outputMode: 'virtual',
mode: 'preview',
mqttRoot: 'mqtt.0.ha_external',
virtualRoot: '0_userdata.0.ugso_mqtt',
virtualBackupId: '0_userdata.0.ugso_mqtt_helper.backup',
```

After checking preview, change to `mode: 'apply'` and restart. **The backup state, folders and new VIS-2 states are created automatically.** Preview creates only missing helper base folders and backups; new VIS-2 data points require `apply`. Existing unrelated states, aliases and manual roles are not overwritten. Your existing alias, for example below `alias.0.HA`, need not be removed.

Example: `mqtt.0.ha_external.claudia_pc.switch.state` and its `mqtt.0.ha_external.claudia_pc.switch.set` return channel become `0_userdata.0.ugso_mqtt.claudia_pc.switch.state`. **Use only this virtual state in VIS 2.**

| Direction/function | Behaviour |
|---|---|
| MQTT feedback → VIS 2 | Confirmed state with `ack: true` |
| VIS-2 operation → MQTT command | Only current requests with `ack: false` go to `/set` |
| Switch | Virtually normalize `on`/`off` to booleans; send `ON`/`OFF` back |
| Brightness | Percentage 0–100 with checked limits |
| RGB | MQTT JSON array ↔ virtual hexadecimal `#RRGGBB` |
| Effect | Only options in the current effect list |
| Color temperature | Integer Kelvin within current limits |
| Numbers, selects and text | Validate available limits or options |
| Dates, measurements and battery | Read-only; original MQTT values remain unchanged |

Creation, startup and restart send no control commands and never replay old requests. A new HA state update confirms the value; broker acceptance alone does not confirm execution. Without a fresh response for approximately 30 seconds, the request remains unacknowledged with error quality `q: 128`. When deselected, unknown or offline, the last value is preserved with `q: 130` and commands are blocked. No artificial zero/off values are used.

The `virtualBackupId` journal is saved and verified before each new state is created. It holds mappings and object definitions, not MQTT credentials or current measurements. Virtual mode leaves original MQTT objects unchanged. With `mode: 'restore'`, virtual values and dashboard references are preserved; own virtual command states become read-only and synchronization ends. Stop the script afterwards.

The previous functionality remains available through `outputMode: 'roles'`. The direct-role/alias rules and restore instructions below apply to that role mode; the mapping tables also describe virtual states semantically. **Run only one helper copy at a time.** Missing optional attributes and a journal not yet created no longer generate the previous `getState` warnings.

## Installation and backup {#installation}

1. First export the affected MQTT objects with their states and existing scripts in ioBroker Admin, or create a complete backup.
2. In MQTT-Client choose **ioBroker-/VIS-2-Helfer herunterladen**, or [download the script](../app/iobroker/ugso-mqtt-role-mapper.js).
3. Under **Scripts** in ioBroker, create a **JavaScript** and paste the complete file. Run only one copy in one JavaScript instance.
4. Set `mqttRoot` to your MQTT path, for example `mqtt.0.ha_external`. Wildcards are not allowed.
5. Keep `mode: 'preview'`, start the script and inspect its log. Preview creates only missing helper base folders and backups.
6. Add manually assigned generic `state` roles to `excludeIds`. Such manual roles cannot be distinguished from automatically assigned defaults.
7. After checking, set `mode: 'apply'` and restart the script. Allow `setObject` in the JavaScript instance settings. The instance must be able to read MQTT states.

Before each change, the original role is saved in the JSON state `0_userdata.0.ugso_mqtt_roles.backup` and persistence is verified. This journal contains no meter values or credentials. A backup failure prevents the subsequent role change. Export this backup state too and keep it.

Specific roles such as `date`, `text` or `value.temperature` are not replaced. A later manual role change prevents automatic reapplication to that state. Existing aliases are never overwritten.

## Direct roles and read-only aliases {#aliases}

Dates and timestamps receive `date` directly. Stored text and write permissions are preserved; HA `uptime` represents a startup timestamp, not elapsed duration.

Measurement and binary sensor roles in ioBroker are read-only. If the MQTT source is already read-only, only its generic role is replaced. If it is writable, a read-only alias is created below `alias.0.ugso_mqtt_roles` instead; the original MQTT role and permissions remain unchanged. Use the alias for visualization and analysis. Its values continue to come from the original MQTT state.

The script checks metadata and actual value types. It does not guess types from device names or `on`/`off` strings. Missing metadata, incompatible units, invalid dates and unknown classes are skipped. There are no conversions or control commands. Transmit `device_class` and, for measurements, the unit; include these available attributes when selecting manually. Label forwarding includes available standard metadata automatically.

| HA device class | ioBroker role | Validation |
|---|---|---|
| `date` | `date` | Valid `YYYY-MM-DD` |
| `timestamp`, `uptime` | `date` | ISO timestamp including timezone |

## Implemented numeric mappings {#numeric}

The table lists the units actually accepted. Other units are preserved and skipped; mA or mV, for example, are not silently converted.

| HA device class | ioBroker role | Accepted units |
|---|---|---|
| `temperature` | `value.temperature` | `°C`, `°F`, `K` |
| `humidity` | `value.humidity` | `%` |
| `absolute_humidity` | `value.humidity.absolute` | `g/m³`, `mg/m³` |
| `battery` | `value.battery` | `%` |
| `voltage` | `value.voltage` | `V` |
| `current` | `value.current` | `A` |
| `power` | `value.power` | `W`, `kW` |
| `energy` | `value.energy` | `Wh`, `kWh` |
| `energy_storage` | `value.energy` | `Wh`, `kWh` |
| `reactive_power` | `value.power.reactive` | `var`, `kvar`, `kVar` |
| `reactive_energy` | `value.energy.reactive` | `varh`, `kvarh`, `kVarh` |
| `frequency` | `value.frequency` | `Hz` |
| `pressure` | `value.pressure` | `hPa`, `mbar` |
| `atmospheric_pressure` | `value.pressure` | `hPa`, `mbar` |
| `illuminance` | `value.brightness` | `lx`, `lux` |
| `distance` | `value.distance` | `m`, `km`, `cm`, `mm`, `mi`, `nmi`, `yd`, `ft`, `in` |
| `duration` | `value.interval` | `s`, `ms`, `h`, `d` |
| `wind_speed` | `value.speed` | `m/s`, `km/h`, `mph`, `kn` |
| `volume_flow_rate` | `value.flow` | `m³/h` |
| `signal_strength` | `value.rssi` | `dBm` |
| `aqi` | `value.airquality` | — |
| `carbon_dioxide` | `value.co2` | `ppm` |
| `carbon_monoxide` | `value.co` | `ppm` |
| `nitrogen_monoxide` | `value.no` | `ppm`, `µg/m³`, `μg/m³` |
| `nitrogen_dioxide` | `value.no2` | `ppm`, `µg/m³`, `μg/m³` |
| `ozone` | `value.o3` | `ppm`, `µg/m³`, `μg/m³` |
| `sulphur_dioxide` | `value.so2` | `ppm`, `µg/m³`, `μg/m³` |
| `pm1` | `value.pm1` | `µg/m³`, `μg/m³` |
| `pm25` | `value.pm25` | `µg/m³`, `μg/m³` |
| `pm10` | `value.pm10` | `µg/m³`, `μg/m³` |
| `radon` | `value.rn` | `Bq/m³` |
| `volatile_organic_compounds` | `value.tvoc` | `µg/m³`, `μg/m³` |
| `volatile_organic_compounds_parts` | `value.tvoc` | `ppb` |

## Binary sensors {#binary}

Only actual boolean values with a matching object type are accepted. Standard HA `on` and `off` strings remain untouched and are not given boolean roles. For `battery`, true means low battery; for `lock`, true means unlocked.

| HA device class | ioBroker role |
|---|---|
| `battery` | `indicator.lowbat` |
| `connectivity` | `indicator.reachable` |
| `door` | `sensor.door` |
| `garage_door` | `sensor.door` |
| `window` | `sensor.window` |
| `opening` | `sensor.contact` |
| `lock` | `sensor.lock` |
| `motion` | `sensor.motion` |
| `moisture` | `sensor.alarm.flood` |
| `smoke` | `sensor.alarm.fire` |
| `carbon_monoxide` | `sensor.alarm.co` |
| `light` | `sensor.light` |
| `sound` | `sensor.noise` |
| `problem` | `indicator.error` |
| `running` | `indicator.working` |

## Further mappings considered {#conditional}

Role-only mode does not apply these cases automatically. Virtual mode now implements the Light and switch functions below with the described checks; fill levels, consumption/production and ambiguous measurement classes are still not guessed.

| HA class/function | Possible role | Additional requirement |
|---|---|---|
| `volume_storage` | `value.fill` | Confirm an actual container fill level |
| `water`, `gas` | Generic measurement | Consumption is not a fill level |
| `energy` | `value.energy.consumed` / `value.energy.produced` | Explicit consumption/production information |
| `speed` | `value.speed` | Do not assume every speed is wind |
| Numeric `moisture` | Generic measurement | Distinguish from a binary water alarm |
| Brightness feedback | `value.dimmer` | Confirm percentage and Light function |
| Brightness command | `level.dimmer` | Correctly connect a separate return channel |
| Switch feedback | `sensor.switch` | Normalize a boolean value |
| Switch command | `switch` / `switch.light` | Connect `/set`; send no setup command |
| Color-temperature command | `level.color.temperature` | Kelvin, limits and return channel |
| Effect selection | `level.effect` | Effect list and return channel |
| RGB control | `level.color.rgb` | Convert JSON array to hexadecimal color |

No specific role is guessed for `occupancy`, `presence`, `moving`, `plug`, binary `power`, `battery_charging`, `cold`, `heat`, binary `gas`, `glass_break`, `safety`, `tamper`, `update` or `vibration`. Generic `sensor`/`indicator` roles or custom rules are possible but excluded from this conservative automatic mapping. All other unlisted classes remain unchanged too.

## Restore {#restore}

Stop the script, set `mode: 'restore'` and start it again. Only the script's own role changes are restored, provided the current role and type still match its backup entry. Later manual role changes are preserved. Own unmodified aliases are removed; edited or unrelated aliases remain. Original MQTT values are never deleted.

Stop the script afterwards. Keep the journal and exclusions. Already recorded states are not processed again with the same journal; a new run requires a deliberately new `backupId` and, for aliases, an unused `aliasRoot`.

Verified locally with simulated ioBroker APIs for preview, backup failures, types, units, manual edits, aliases and restore. Not yet installation-tested on a real ioBroker system.

[Home Assistant: Sensor](https://www.home-assistant.io/integrations/sensor/#device-class) · [Home Assistant: Binary sensor](https://www.home-assistant.io/integrations/binary_sensor/#device-class) · [ioBroker: State roles](https://www.iobroker.com/docs/dev/stateroles.md) · [ioBroker: JavaScript API](https://github.com/ioBroker/ioBroker.javascript/blob/v10.4.10/docs/en/javascript.md)
