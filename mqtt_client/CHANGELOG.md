# Changelog

## 0.1.29

- Recognize switches by domain without requiring a device class or unit. Add same-device power/voltage/current/energy unit fallback when HA device_class is missing; never override explicit classes or guess device relationships from names. Add read-only label-reading diagnostics showing inclusion/exclusion reasons without state values or credentials.
- Prioritize control/contact states over sensor events. Publish control and Light feedback before measurement/metadata traffic and without the configured artificial publish pause. Measurement batches yield to waiting control feedback or return commands between messages.
- Coalesce duplicate sensor intermediate states in batches when at least 32 events wait, while preserving ordinary control transitions. Keep recovery/snapshot priority and stale timestamp protection.
- Reconcile actual HA states periodically even with a live WebSocket, using the existing poll_interval (default 5 seconds). Unchanged values and availability are not repeatedly published. A successful command prompts a fresh HA check; broker handoff alone never confirms execution.
- Show waiting/coalesced events and the last selected HA event in the status line. Move Publish-Pause into always-visible transmission settings; credentials still collapse independently.
- Preserve settings, credentials, topic paths, values and the unchanged ioBroker helper 0.1.27. Update the HA app for these changes. DE/EN/FR documentation updated.

## 0.1.28

- Filter incoming HA state events against an immutable selection of manual, labeled and optional same-device entities before enqueueing. Label forwarding no longer queues the whole HA installation, preventing unrelated event bursts from overflowing and delaying selected states.
- Fetch fresh HA states when label/device selections change; newly selected values do not depend on stale unselected caches. Ignore older or duplicate HA last_updated timestamps after snapshots/resync, preserving normal ordered transitions.
- Add regression tests for a 12,000-event unrelated burst, latest-state ordering and optional same-device event selection. Existing selected-event overflow recovery remains available.
- Update the HA MQTT-Client app for this fix. The ioBroker helper 0.1.27 remains unchanged; replacing the helper alone does not update HA-to-MQTT event reception. DE/EN/FR instructions updated.

## 0.1.27

- Send virtual commands through the ioBroker MQTT adapter's sendMessage2Client API with retain false. Normal raw set-state writes may be delivered with RETAIN in broker/server mode and are correctly rejected by the HA client's stale-command protection.
- Resolve and validate the command topic against the source's native topic. Preserve raw MQTT set values and global broker settings; no automatic retry. Broker API errors and timeouts remain unconfirmed commands.
- Log command handoff separately from HA feedback. DE/EN/FR guides explain the new route and why raw set values need not change.

## 0.1.26

- Automatically create missing helper base folders and both valid backup journals in every mode, including preview and restore. Preserve existing objects, journal entries and values; reject conflicting paths. Preview still does not create virtual controls or change source roles/values.
- Clarify the startup message and DE/EN/FR instructions. Object creation permission is required even in preview. Retain event-driven selective processing from 0.1.25.

## 0.1.25

- Process virtual MQTT source updates selectively, ignore unchanged repeats and unrelated attributes, and stop timeout checks after confirmation/expiry. Full enumeration only at startup or selection/availability changes. Subscribe only to the command topic matching each entity's state, without deleting existing MQTT objects.
- Fix missing-object warnings in JavaScript adapter 10.4.10: both getObject and getState are guarded by silent existsObject/existsState checks. Regression tests reproduce warnings from either API, including preview without a journal or optional metadata.
- Identify helper version/mode at startup. Retry interrupted own virtual point creations after permissions are corrected, without overwriting existing objects or replaying commands.
- Clarify preview versus apply and required adapter permissions/cache settings in DE/EN/FR. MQTT-Client 0.1.24 remains sufficient for the helper catalog.

## 0.1.24

- Combined ioBroker helper: automatically create virtual VIS-2 states and folders, normalize switch/battery on/off and Light RGB, and bridge current ack-false requests to the corresponding set channel. Source updates use ack true; no startup/restart command or feedback loop.
- Explicit, versioned source catalog binds HA identity, current topic, metadata, capabilities and command permissions. Removed labels, renamed topics and unsupported values cannot create stale controls. Original MQTT values, roles, credentials and existing aliases remain unchanged.
- Preserve last values with error quality when offline/unknown; unconfirmed commands are marked after approximately 30 seconds without automatic retries. Preview, verified journal, collision protection and non-destructive virtual restore included.
- Fix getState warnings for missing journals and optional attributes. API-compatible with ioBroker JavaScript adapter 10.4.10; tests include adapter-style execution. Previous role/alias mode remains available through outputMode roles.

## 0.1.23

- Optional ioBroker JavaScript for conservative device-class-to-role mapping, with read-only preview, verified role journal and guarded restore. Includes strict ISO date/timestamp validation and explicit numeric unit allowlists.
- Preserve manual specific roles, source values, types, permissions and credentials. Writable measurements get own read-only aliases; raw on/off strings and ambiguous classes are skipped.
- Script download in the app; DE/EN/FR installation guides and complete implemented/conditional mapping tables. JavaScript tests cover failed backups, manual edits, aliases and restore.

## 0.1.22

- Label-selected controllable entities automatically receive return channels. Validate queued commands again before execution; ignore retained, empty and invalid commands.
- Capability-aware Light channels for brightness (0–100%), RGB, effect and Kelvin color temperature, including supported modes, effects and temperature limits. Existing manually selected raw attributes retain their paths and units.
- Optional same-device measurements and battery readings using HA device IDs; disabled by default. Only standard metadata and supported measurement classes are included automatically.
- Show automatic attributes, Light values and return topics in the transmission popup. Preserve manual selections, credentials and settings backups; protect active automatic topics during retained-topic cleanup.

## 0.1.21

- Keep transmission/TLS settings and save controls outside the collapsible credentials section. Equal-size save and transmission-list buttons share one row.
- Searchable, scrollable live transmission popup includes manually selected states/attributes and label-selected states without duplicates. Origin badges: blue Label, green Manual, purple Both; attributes remain manually selected.
- Show current values/topics, last broker-acknowledged value/time and sanitized per-value errors. Confirmation means broker acknowledgement, not delivery to a destination application. Runtime history is not persisted; settings and credentials remain unchanged.

## 0.1.20

- Collapsible connection settings named Zugangsdaten. Opens for initial setup; automatically collapses when a saved broker address is loaded or successfully saved. Existing settings and credentials are preserved.

## 0.1.19

- Separate entity names and selection details in the transmission list. Long names wrap beside the edit action without merging with the State/attribute summary.

## 0.1.18

- Device popup rows show the name, entity ID and target type/attribute count on three separate lines, including after selection changes. Long names and entity IDs wrap within their column.

## 0.1.17

- Optional Home Assistant entity label selects additional states for MQTT forwarding. Label selection refreshes at the configured polling interval and grants no MQTT command permissions.

## 0.1.16

- Live HA state_changed events with authenticated WebSocket, initial snapshot, heartbeat, reconnect and the existing poll_interval as fallback. Short transitions are processed in order; overload requests a fresh synchronization.
- MQTT/HA connection status, live/polling mode, last synchronization/publish timestamps, publish count and sanitized error details in the Web UI.
- Persistent inventory of acknowledged retained topics. Explicit selection and confirmation remove only recorded obsolete topics on the current broker; active topics are protected. Old unrecorded topics are never deleted automatically.
- Cover OPEN/CLOSE/STOP and JSON position, light brightness_pct and fan percentage commands (0–100), alongside the existing commands. Retained, stale and malformed commands remain rejected.
- JSON settings backup/restore with validation and confirmation. Passwords, client certificates/private keys and HA tokens are excluded. Existing local credentials are retained only for the same broker on explicit restore.
- Custom PEM CA certificates and client certificate/private key with mandatory certificate/hostname verification, file upload, validation and explicit clearing.
- Existing 0.1.15 settings, credentials, selections, topic prefix, client ID and polling interval remain valid without an automatic configuration rewrite. New TLS settings default to empty; retained data is preserved until explicitly confirmed for deletion.

## 0.1.15

- MQTT.org symbol added as Home Assistant app icon/logo, web header icon and favicon.
- Relative icon URL supports Home Assistant Ingress; source attribution included.

## 0.1.14

- Published states and attributes before subscribing device/value `/set` command topics, so ioBroker receives the value tree before return-command branches.
- Added `publish_delay_ms` with a 50 ms default to send new retained MQTT values in small batches.
- Added the publish-delay setting to the Web UI.

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
