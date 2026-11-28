# HA Logic Studio Pro

HA Logic Studio Pro is a Home Assistant app for creating, checking and running automations and logic. Projects and folders are stored per Home Assistant user. The interface supports German, English and French.

**Version 0.1.136** · [GitHub release with ZIP and changelog](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/releases/tag/ha-logic-studio-pro-v0.1.136) · [Deutsch](README.md)

## New in 0.1.136

Both JS sensor blocks wait for HA write confirmation before subsequent read/debug blocks run. Normal HA outputs wait for request acceptance. Timers and explicitly asynchronous callback blocks remain separate continuations. In handwritten JS/TS, use `await ha.setSensorState(...)` or `await ha.callAction(...)` for ordered execution. HA acceptance does not confirm a physical device movement.

**Trigger → When entity value changes** selects one entity and its **State** or an **Attribute**. Edit the default on/off branches. Use the gear editor to add **another state** and an optional **else** branch. Choose **Text** (such as `half`) or **Number** (such as `50` for `current_position`) for each branch. A change runs the matching branch; duplicate values are rejected before starting. Initial startup does not itself trigger a branch.

The comparison dropdown now includes on/off strings beside true/false booleans. Field edits commit on leaving without Enter. A warning marks running code that needs **Save → Restart runtime**. **Clear log** removes this project's messages without stopping the process; new messages are retained.

**Verified:** 85 Node tests and 14 server tests passed (99 total), with 289 registered blocks and 52 direct entity fields checked. A live test on 28 November 2026, after a full backup, additionally confirmed the published 0.1.136 package on Home Assistant 2026.11.3 (.193, port 80): `on → 1.5`, `off → 0`, each immediately followed by the correct debug value. The number field accepted `33.25` without Enter and retained it after reloading. The previous-runtime-code warning and clearing the log while the script kept running worked. Attribute branches for number `50`, text `halb` and the fallback were confirmed. Test values and attributes were restored; existing projects, options and permissions were preserved. Both new examples remain saved and stopped. [Test report](TESTREPORT-0.1.136.md) · [Guide DE/EN/FR](docs/state-branches.md) · [ioBroker source comparison](docs/iobroker-review-2026-11-28.md).

## New in 0.1.135

**“If entities … changed”** now has an HA-style multi-entity selector: search by name or ID, select or deselect entities, then **Apply**. Existing comma/whitespace-separated lists remain readable and retain their saved IDs.

Single-entity, multiple-entity and attribute change triggers use compact vertical rows inspired by ioBroker. Long captions are shortened only visually. Field names, conditions, connections and saved mappings are retained. The ioBroker acknowledgement filter is not offered because HA state events do not implement the ioBroker ack model.

**Verified:** 285 registered blocks and all 51 direct entity fields in Blocks A/JS; 68 Node tests and 12 server tests passed. Selection, searching, deselection, applying, cancelling, save/load and trigger layout were checked locally in DE/EN/FR. No HA installation or live test for 0.1.135. [Test report](TESTREPORT-0.1.135.md).

For automatic reactions, put the logic and debug output inside the change trigger, save and start **Play**. Standalone blocks run once at startup. Selecting entities grants no runtime permissions; existing READ/WRITE options are unchanged.

## New in 0.1.134

**System** in Blocks A and Blocks JS now also includes **Set sensor state · Decimal number**. A direct number field beside the sensor selector defaults to `0.5`. Enter values such as `33.25` using a decimal point. Fractions are retained through saving and reopening.

The existing value-input block remains available. Both variants use the same WRITE permission and retain sensor attributes. Blocks A requires the running Studio app. [Test report 0.1.134](TESTREPORT-0.1.134.md).

**Verified:** 60 Node tests and 12 server tests passed. After backup on Home Assistant 2026.11.3, Blocks JS wrote exactly `0.5` and `33.25` W. Blocks A generated both values as YAML numbers; its event data was executed through the Studio bridge and the HA states were confirmed. Both number fields retained `33.25` after saving and reloading. Sensor attributes, projects and user permissions were preserved; the original sensor value was restored. Both saved examples remain stopped. No startup automation was enabled.

## New in 0.1.133

**Set sensor state** is available under **System** in both Blocks A and Blocks JS. Select an existing `sensor.*` and connect a number, text or calculation block. Unit, device class and other attributes are retained. The sensor requires WRITE permission in the app configuration. Its owning integration may overwrite the value. This sets a Home Assistant state; it does not control a device or create a persistent sensor.

Blocks JS uses `ha.setSensorState("sensor.example", 42)`. Blocks A exports the native event `logic_studio_set_sensor_state` with `entity_id` and `state`. The running Studio app receives this event and checks the same WRITE permission. No general EVENT permission is required for this internal input. Without the running app, the event is not processed. Bridge errors appear in the app log. Firing an event does not itself confirm that the write succeeded. YAML previews and JS test runs do not perform live writes.

**New function plan** now always opens the name and folder dialog. Each new plan starts empty and is saved independently. Existing plans and their folder assignments remain intact. Stopped plans can be deleted like other projects.

**Verified:** 50 Node tests and 12 server tests, plus a live test on Home Assistant 2026.11.3 after backup. Blocks JS wrote 40 + 2 as 42 W. The event data generated by Blocks A set 43 W. Attributes were preserved. After revoking WRITE permission, a subsequent write was rejected. Two new function plans remained separate after reloading.

[Usage notes DE/EN/FR](docs/sensor-state.md) · [Test report](TESTREPORT-0.1.133.md)

## Installation and updates

1. Open **Settings → Apps → App store → ⋮ → Repositories** in Home Assistant and add `https://github.com/rockbaer2007/ugso-ha-mqtt-addons`.
2. Select **HA Logic Studio Pro**, install it and start it. Supported architectures: `amd64` and `aarch64`.
3. Open the app's web interface and choose **New project** and an editor.

For an existing installation, create a backup, check for app updates and update HA Logic Studio Pro. Projects, settings and existing permission lists are preserved.

## Editors

| Editor | Purpose |
| --- | --- |
| Function plan | Connect logic blocks, simulate signals, timers and counters, and run plans on the HA server. |
| Rules | Build trigger, condition, THEN and ELSE sequences and export HA YAML. |
| Blocks A | Build native Home Assistant automations visually and export YAML. |
| Blocks JS | Build JavaScript logic with blocks, simulate it and run it on the HA server. |
| JavaScript | Edit scripts with completion and HA API signatures. |
| TypeScript | Write typed scripts with diagnostics at the relevant source line. |
| HA YAML | Edit, check and export automations and scripts with a visual preview. |

## Entity selection

All seven editors and ioBroker import mappings use searchable HA-style entity selection. Search by name or ID, and by area or device name when available. Results show an icon, name, area/device, ID and state. Keyboard navigation and additional result pages are supported. Saved IDs remain visible when an entity is unavailable. Attribute selection, output modes, multiple selections and manual IDs remain supported.

Selecting an entity does not grant runtime permissions.

## Runtime permissions

Under **App → Configuration**, four independent switches are available:

| Switch | List used when the switch is off |
| --- | --- |
| READ: `runtime_read_all` | `runtime_read_entities` |
| WRITE: `runtime_write_all` | `runtime_write_entities` |
| EVENT: `runtime_events_all` | `runtime_events` |
| TOPICS: `runtime_mqtt_all` | `runtime_mqtt_topics` |

All switches default to off. Enabling one ignores only its corresponding list; saved entries remain intact and apply again when disabled. HA's standard form keeps these lists editable. The switches are labeled and described in DE/EN/FR.

READ grants reading, WRITE grants supported output operations, EVENT grants supported event types, and TOPICS grants publishing to concrete MQTT topics. They do not enable each other. Identifier, action and format validation still applies. MQTT wildcards `+` and `#` remain unsupported for publishing, and script-generated events remain restricted to `logic_studio_*`.

Save configuration changes and restart the affected project, or restart the app when required by Home Assistant.

## Simulation and live execution

**Test run** uses simulated states and events. **Play** starts a saved function plan, Blocks JS, JavaScript or TypeScript project on the HA server with the configured permissions. YAML exported from Rules, Blocks A and HA YAML can be installed in Home Assistant after review.

## ioBroker imports

Blockly XML can be imported from the expert tools. The import review lists entity mappings and required changes. Unsupported blocks remain visible and prevent execution until replaced. Computed `state_exists_var` IDs are checked against their mapped HA entities. Imported `control_instance` retains the adapter and action but requires migration to the appropriate HA operation; it does not restart an ioBroker adapter.

## Documentation

- [Deutsch](https://opensource.ugso-software.de/projects/logic-studio/user-guide)
- [English](https://opensource.ugso-software.de/en/projects/logic-studio/user-guide)
- [Français](https://opensource.ugso-software.de/fr/projects/logic-studio/user-guide)
- [Changelog](CHANGELOG.md)
- [Roadmap](ROADMAP.md)
