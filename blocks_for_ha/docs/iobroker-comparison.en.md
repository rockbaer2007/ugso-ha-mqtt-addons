# ioBroker / UGSo Blocks for HA

As of October 9, 2026, prototype 0.1.2. This inventory describes the existing code. Similar blocks do not imply identical behavior: UGSo generates native HA automations; ioBroker generates JavaScript for its script engine.

Every new feature must update its counterpart, behavior, YAML output and implementation status here and in the German version. Categories will be reviewed progressively, starting with **System**. Planned means not implemented.

## All existing blocks

There are **13 block types**, including the automation root. Dropdown choices within one block count as one type.

| ioBroker concept | Our block | Native HA output / behavior |
| --- | --- | --- |
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

## System: comparison and next steps

| ioBroker System feature | UGSo Blocks for HA | Status |
| --- | --- | --- |
| Control state | On/off or generic HA action | Available; other values require manual action data |
| Toggle state | Toggle | Available where supported by HA domain |
| Delayed write | Wait block before action | Existing combination; no dedicated delayed write or expiry field |
| Universal write | Generic HA action with target and JSON data | Basic support available; no ioBroker `ack` semantics |
| Comment | Explanation block with preserved export representation | Planned |
| Debug output | Dedicated log block | Planned; manual HA action already possible |
| Object ID | Entity value block and picker | Planned; IDs currently entered as text |
| Get value, fixed/dynamic/asynchronous variants | State and attributes as usable values | Planned; no dedicated value blocks or callback execution |
| Object / object attribute | Entity attributes and selected metadata | Planned |
| State exists | Separate existence and availability checks | Planned |
| Update state | Set helper or refresh entity | Dedicated blocks planned; no direct equivalent of `ack: true` |
| Bind states | Source trigger and appropriate target action | Convenience block planned; dynamic value forwarding not available yet |
| Control script | Start/stop HA script | Dedicated block planned; generic HA action already usable |
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
