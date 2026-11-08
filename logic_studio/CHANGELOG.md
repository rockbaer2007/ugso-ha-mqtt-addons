# Changelog

## 0.1.12

- German, English and French interface with a persisted live language selector.
- Translated menus, descriptions, entity picker, import/export and documentation.
- Documentation tab lists implemented keyboard shortcuts and selected block ports.
- Entity picker icon beside the HA entity field in STATE_IN/STATE_OUT properties.
- Grouped project, simulation and output actions; separate equal-sized simulation buttons.
- Project menu includes New project and Load example.
- Preserve project format, app ID, /data, custom names, entity IDs and generated code.
- Verified update on .193: original five-block/three-wire plan unchanged except version;
  language survives browser reload and app restart, YAML is identical across languages.
- 31 Node tests and 9 Python tests pass, including preference persistence tests.
- Release container build and HTTP/locale-asset smoke test pass.

## 0.1.8

- Replace the canvas with React Flow and custom Logic Studio blocks and typed ports.
- Bundle React, React DOM, React Flow and their licenses locally; no CDN required.
- Pannable/zoomable MiniMap, viewport panning, zoom and fit-to-view.
- Preserve legacy project JSON, app ID, /data, preferences and entity assignments.
- Preserve shared type checks, keyboard connections, menus, undo and import/export.
- Verified existing 0.1.7 installation on .193; original plan and palette unchanged
  after test cleanup and reload. Docker build and container smoke test passed.
- 29 Node tests and 8 Python tests pass, including security checks.

## 0.1.7

- Public experimental update after real pointer tests on .193 (HA Core 2026.10.4).
- Original five-block/three-wire plan and all palette preferences preserved.

- Bottom-right overview shows block positions and the visible editor region.
- Click overview or use arrow/Home/End keys to navigate; reference opens React Flow in a new tab.

- Drag connections with the mouse held down, crosshair cursor and wire preview.
- Highlight valid and incompatible or occupied target pins; explain rejected links.
- Shared validation for pointer and keyboard connections, including cycles and limits.
- Preserve explicit signal types: BOOL to BOOL, INT to REAL widening and ANY pins.
- Escape and cancelled drags leave the plan unchanged; connections support undo.
- Independent implementation informed by ioBroker FBD's documented interaction.

## 0.1.6

- First public experimental release in the UGSo HA Apps shared repository.
- HA OS/Supervised installation, amd64/aarch64 source build and ingress.
- Publishes the locally tested 0.1.5 functional baseline without changing plans.
- Initial DE/EN/FR documentation, installation badge and local test ZIP.
- Editor language currently German; native HA details currently JSON.

## 0.1.5 (local testing)

- Native automation, script and blueprint imports, nested flows and input references.
- Properties, duplicate and delete in the per-block menu, with undo support.
- Read-only configuration mount and source backups before parsing.
