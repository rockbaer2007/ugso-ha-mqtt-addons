# ioBroker / UGSo Blocks for HA

## Theme selection and zoom in 0.1.16

UGSo Standard, Dark, Modern and Tritanopia with locally saved selection. Own blocks/categories follow palettes; display changes preserve HA output. Original zoom-to-fit control supplements Fit. Ten original plugins in total. [Themes](https://opensource.ugso-software.de/en/projects/blocks-for-ha/themes).

## Colours, value functions and standard comparison in 0.1.15

111 supported types: random/RGB/blend and original value functions with up to eight parameters. Own HA templates instead of JavaScript; JSON retains definitions, YAML expanded expressions. Text reverse is in the current ioBroker menu too; atan2 is registered but not offered. Typed variables, local action functions and documented standard variants remain pending. [Complete standard comparison](https://opensource.ugso-software.de/en/projects/blocks-for-ha/blockly-audit).

## Math, text, lists and counting loops since 0.1.14

37 additional blocks, 105 in total. Original Blockly/ioBroker comparison including atan2 and text reverse, original native HA/Jinja output and immutable list editing. [Public mapping, examples and pending variants](https://opensource.ugso-software.de/en/projects/blocks-for-ha/collections). JSON preserves shapes; YAML preserves meaning. Local break/continue, prime test, mode, standard deviation and dynamic counting bounds remain pending.

## Timeouts, objects, logic, loops and lists since 0.1.13

18 new types: pause with units/runtime values, wait until with timeout, stop this run, counted/while/until/for-each repeats, new object, get/has attribute, object keys, set/remove attribute in a variable, range comparison, null/empty fallback, case selection, create list, list length and list empty. Project JSON preserves shapes and keys; YAML preserves semantics.

ioBroker timeout/interval handles have no direct HA equivalent. Loops are sequential and Stop ends this run. Separately started scripts and timer helpers remain accessible under System. Object updates are new local HA variable assignments, not JavaScript mutation. Core Blockly logic already exists; loops/lists now extend its coverage. Fixed integer from/to/step loops and list editing follow in 0.1.14; local break/continue remains pending. [Complete public comparison and upstream sources](https://opensource.ugso-software.de/en/projects/blocks-for-ha/flow).

As of October 10, 2026, experimental HA app 0.1.16. This inventory describes the existing code. Similar blocks do not imply identical behavior: UGSo generates native HA automations; ioBroker generates JavaScript for its script engine.

Every new feature must update its counterpart, behavior, YAML output and implementation status here and in the German version. Categories will be reviewed progressively, starting with **System**. Planned means not implemented.

## All existing blocks

There are **105 block types**, including the automation root. Dropdown choices within one block count as one type. Time and conversion are compared separately below.

| ioBroker concept | Our block | Native HA output / behavior |
| --- | --- | --- |
| Change variable by | Increment with numeric step | Native HA variable assignment using Jinja; default `1`, negative steps decrease. Initialize the variable as a number first. |
| Compare | Six-operator comparison | Boolean Jinja result; two value inputs, no automatic type conversion |
| Compact AND / OR / NOT | Two-input AND/OR, single-input NOT | Native HA condition groups; Jinja when assigned as variable value |
| true / false | Boolean constant | Native YAML Boolean assignment or template condition |
| null | No value | YAML `null` / Jinja `none`; not a Boolean condition |
| test / if true / if false | If → value → otherwise value | Conditional Jinja value for variables, log messages and comparisons |
| Create / set variable | Variables menu and Set block | Native `variables` action, number, text/template, Boolean or null; scoped to the HA run, not a persistent state |
| Read variable | Variable value block | `{{ name }}` for log messages or subsequent assignments |
| Expression / calculation | Template value block | Free-form Jinja template evaluated in HA instead of JavaScript |
| Expression as condition | Template condition | `condition: template`, `value_template`; Boolean connector |
| Script container | Automation | `triggers`, `conditions`, `actions` |
| State-change trigger | State reached | `trigger: state` with `to` |
| Trigger with numeric check | Number above/below threshold | `trigger: numeric_state`; fires on threshold crossing |
| Schedule | Time | `trigger: time` |
| Astro trigger | Sunrise/sunset | `trigger: sun` |
| Script/system start, different lifecycle | HA start | `trigger: homeassistant`, `event: start` |
| State comparison | State is | `condition: state` |
| Numeric comparison | Number above/below threshold | `condition: numeric_state` |
| AND / OR / NOT | All / at least one / none of the conditions | Nested `condition: and`, `or`, `not` |
| Control / toggle | On / off / toggle | `<domain>.turn_on`, `.turn_off`, `.toggle`; target must support action |
| Adapter action, not the same sendTo interface | HA action | `action`, optional `target.entity_id`, JSON object for action data |
| Wait/pause | Wait seconds | `delay`; integer seconds from 0 to 86400 |
| If / else if / else | Extensible if block with gear icon | `if`/`then`/`else` or multiple `choose` branches with optional `default`; first matching branch wins |
| Number | Number value block and shadow default | Constant threshold or delay |
| Percentage | Percentage value block with slider | Number value 0–100 |
| Colour | Colour value block | Colour value for light action |
| Light colour | Light with colour and brightness | `light.turn_on` with `rgb_color` and `brightness_pct` |
| Date comparison | Today equals/on-or-after/on-or-before | Supported HA template condition in HA time zone |
| Control helper | Dependent helper action | Switch, counter or timer; matching action dropdown |
| Text | Text value block and shadow default | String value for log message |
| Debug output | Log with severity dropdown | `system_log.write` with message and level |
| Control script | Start/stop HA script or call and wait | `script.turn_on`, `script.turn_off` or direct `script.name` call |
| Update state, different semantics | Refresh entity | `homeassistant.update_entity`; requests refresh, does not set state |

Conditions have Boolean outputs for if and automation condition value inputs. AND/OR/NOT supports expandable value inputs via its gear. Disabled blocks are omitted from export; required content remains required. Context menu, trash recovery, help and zoom are available. Text is implemented; entity and sensor value blocks will follow later.

## System: comparison and next steps

| ioBroker System feature | UGSo Blocks for HA | Status |
| --- | --- | --- |
| Control state | On/off or generic HA action | Available; other values require manual action data |
| Toggle state | Toggle | Available where supported by HA domain |
| Delayed write | Wait block before action | Existing combination; no dedicated delayed write or expiry field |
| Universal write | Generic HA action with target and JSON data | Basic support available; no ioBroker `ack` semantics |
| Comment | Explanation block with preserved export representation | Planned |
| Debug output | Dedicated log block | Available; message as text shadow or text block, severity dropdown |
| Object ID | Entity value block and picker | Planned; IDs currently entered as text |
| Get value, fixed/dynamic/asynchronous variants | State and attributes as usable values | Planned; no dedicated value blocks or callback execution |
| Object / object attribute | Entity attributes and selected metadata | Planned |
| State exists | Separate existence and availability checks | Planned |
| Update state | Refresh entity | Available; requests refresh, no `ack: true` equivalent; controlling helpers available; setting number/text helpers remains planned |
| Bind states | Source trigger and appropriate target action | Convenience block planned; dynamic value forwarding not available yet |
| Control script | Start/stop HA script or call and wait | Available; parameters still use generic HA action |
| Selector IDs | Select by domain/area/device/label | Planned |
| RegExp | Text matching | Planned |
| Script name | Automation metadata | Name available; no dedicated value block |
| Create state, both variants | Configure HA helpers | Future setup flow; no direct ioBroker datapoint creation |
| Object ID meta/script | HA-specific selection filters | Planned; ioBroker types will not be copied unchanged |
| Control instance | Adapter instances have no direct HA equivalent | Not planned for the initial expansion |
| Read credentials | Managed integration settings/secret references | No secret value block planned; no tokens in exports |

## Existing editor features

- YAML preview, clipboard copy and local YAML download.
- Open a supported YAML automation as Blocks, either one object or a list with one entry. Unsupported structures are rejected.
- Open/save JSON projects including block positions; automatic local browser persistence.
- Three examples: light, battery and evening.
- Name, description and ID; `single`, `restart`, `queued`, `parallel` execution modes, with a maximum count for the last two.
- Structural validation and errors. Installed HA actions are not verified.

Version 0.1.3 adds the experimental HA app package with ingress. No live HA entity/action selection or execution inside the editor yet. Catalog and plugins are planned. The if block already supports a mutator; additional mutators will follow where needed. HA runs the exported automations. [Public documentation](https://opensource.ugso-software.de/en/projects/blocks-for-ha/).

References: [ioBroker System documentation](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/blockly.md#system-blocks), [System block definitions](https://github.com/ioBroker/ioBroker.javascript/blob/master/src-editor/src/Components/blockly-plugins/blocks/blocks_system.ts), [HA actions](https://www.home-assistant.io/docs/scripts/perform-actions/), [HA script syntax](https://www.home-assistant.io/docs/scripts/).

## New original plugins and controls

Since **0.1.12**: nine conversion blocks for number, Boolean, string, type, datetime, date format/components, duration and JSON parsing/serialization. HA conversion rules differ from parseFloat/JavaScript truthiness; JSONata remains pending. [Full comparison with images](https://opensource.ugso-software.de/en/projects/blocks-for-ha/conversion).

Since **0.1.11**: seven additional time blocks. ioBroker `time_compare` → fixed clock comparison; `time_compare_ex` → plugged-in boundaries and optional datetime; `time_get` → current datetime plus formatter; calculated time → calendar start; astro time → next HA sun event with offset; time calculation → addition/subtraction. Runs as HA Jinja. [Comparison with images](https://opensource.ugso-software.de/en/projects/blocks-for-ha/time). Total: 41 block types.

Ten original plugins are bundled locally. Search at the end of the menu, multiline text, percentage slider, colour/date fields and dependent helper dropdowns are available. Plus/minus on HA blocks is our own implementation of the interaction; automatic dynamic connections remain pending. [Block catalog with images and direct links to all original plugins](https://opensource.ugso-software.de/en/projects/blocks-for-ha/blocks).
