# UGSo Logic Studio

**0.1.12 · DE/EN/FR interface / public experimental update.**

Choose German, English or French in the header. Menus, block descriptions,
entity picker, import/export dialogs and documentation help switch without
reloading. Language is saved with browser/app preferences. Custom names,
entity IDs, parameter values and generated YAML/JavaScript remain unchanged.

Documentation shows implemented keyboard shortcuts and the selected block's
description and ports. Entity selection is available through the icon beside
the HA entity ID in STATE_IN/STATE_OUT properties. Toolbar groups separate
undo/redo, project actions, simulation and output; simulation buttons retain
equal dimensions and individual borders. Project includes New project and
Load example entries, in addition to the direct New button.

Verified on .193 after a full backup and local update from 0.1.8: DE/EN/FR,
documentation, real HA entity reads, browser reload and app restart. Project
JSON is identical except for the version; generated YAML is identical between
languages. See PRUEFBERICHT-0.1.12.txt and docs/images/0.1.12/.

The canvas now uses React Flow with custom Logic Studio nodes, typed handles,
smooth-step connections, panning, zoom and a pannable/zoomable MiniMap. React,
React DOM and React Flow are bundled locally with their license texts. No CDN
or browser internet connection is needed. Existing project JSON, app workspace,
preferences, HA entity mapping and import/export contracts remain unchanged.
BOOL connects only to BOOL; INT may widen to REAL and explicit ANY remains universal.
Menus, keyboard connections, undo/redo and simulation use the existing logic.
The existing app ID, settings and project storage are preserved during updates.

Local 0.1.8 update verified on HA test host .193: typed mouse connections,
move/undo, duplicate, zoom/MiniMap, entity picker and native script round-trip.
Original plan and palette preferences survived reload. Docker build and container
HTTP smoke test passed. See `PRUEFBERICHT-0.1.8.txt` for the pre-release tests.

A visual function-block editor for Home Assistant. Build typed dataflow plans
or import native automations, scripts and blueprints as nested flow diagrams.
Independent editor and exporters; extracted ioBroker JavaScript block metadata
is attributed in [THIRD-PARTY.txt](THIRD-PARTY.txt). MIT license.

[DE documentation](https://opensource.ugso-software.de/projects/logic-studio/) ·
[EN documentation](https://opensource.ugso-software.de/en/projects/logic-studio/) ·
[FR documentation](https://opensource.ugso-software.de/fr/projects/logic-studio/) ·
[Downloads](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/releases/tag/logic-studio-v0.1.12)

## Home Assistant test installation

[![Add repository to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Frockbaer2007%2Fugso-ha-mqtt-addons)

Add `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` under
**Settings → Apps → App store → Repositories**, then install **UGSo Logic Studio**.
This is a Supervisor app for HA OS/Supervised, not a HACS dashboard card.
Enable advanced mode in your HA profile if experimental apps are hidden.
Supported build architectures: **amd64 / aarch64**. The first build can take time.

Start the app and open its web UI. HA entity reads use the backend Supervisor
token; it is not sent to the editor. The HA configuration mount is **read-only**.
Source files are backed up under `/data/ha-source-backups/` before parsing.
Projects/preferences persist in `/data`; existing local test installations remain
separate because HA assigns repository-specific app IDs. Export their project JSON
before switching. No automatic migration, uninstall or replacement.

## Available in this test release

- Palette, search, favorites, recent blocks, typed wires, properties and undo/redo.
- Per-block **⋮ → Properties / Duplicate / Delete**, with DE/EN/FR UI labels.
- 33 implemented dataflow types: logical/math/selection operations plus persistent
  latches, edges, timers and counters. Other reference types are marked templates.
- Dataflow output: HA automation YAML, HA script YAML or a JavaScript function
  using an explicit host interface. Not an ioBroker script or browser execution.
- 53 native HA flow types: triggers, branches, loops, waits, variables, blueprint
  inputs and original/unknown segments. Import YAML/JSON from file, text or HA.
- Native flow export preserves structure and `!input` references, and is YAML-only.

Native detail properties currently use **JSON**. The editor UI and documentation
support **DE/EN/FR**. No automatic HA write-back or
device control. Exports require manual review/installation; native HA flows are
not simulated or automatically translated into JavaScript. Comments, formatting
and YAML anchors are not preserved. Full HA semantic validation remains in HA.
See [import guide](HA-IMPORT-ANLEITUNG.txt), [export guide](HA-EXPORT-ANLEITUNG.txt)
and the [0.1.5 functional test report](PRUEFBERICHT-0.1.5.txt).

## Local test

Inside the `logic_studio` directory: Python 3.10+ and Node.js 22+ for development tests:

```sh
python -m pip install -r requirements.txt
python server.py --demo-entities
```

Open `http://127.0.0.1:4180/`. Demo mode does not connect to HA.
On Windows, use `Install-Abhaengigkeiten.cmd`, then `Start-Demo.cmd`.
The release ZIP includes both source and `addon/logic_studio/` for local app tests.

```sh
python -m pip install -r requirements-dev.txt
npm ci
npm run build
npm test
python -m unittest discover -s tests -p 'test_*.py'
python tools/package.py
docker build -t logic-studio:test output/ha-app/logic_studio
```

## Rückmeldungen / feedback / retours

Please report reproducible issues with app version, HA version, architecture,
expected behavior and a minimal anonymized plan. Do not upload tokens, secrets,
personal automations or full backups to public issues.

**DE:** Testversion zuerst auf einem Testsystem installieren und vorher sichern.
**FR :** Installer d’abord sur un système de test et effectuer une sauvegarde.
