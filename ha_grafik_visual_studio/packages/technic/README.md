# UGSo Technic 1.4.0

Inspiriert von den ioBroker-Technic-Widgets von Sefina-DS:
https://github.com/Sefina-DS/ioBroker.vis-2-widgets-technic

Eigene Umsetzung für Home Assistant. Enthält Window – Wall, Switch – Boolean, Dimmer – Light, Room – Overlay und Clock – Date.
Die weiteren zwei Widgets des Originalsets sind noch nicht enthalten.
Requires Studio 0.1.201 or newer. Install ugso.technic.wg through Settings > Widget packages.

Clock – Date uses the browser's current local time and timezone, without HA bindings.
Time: 12/24 hours, optional seconds, color, size and bold. Date: DE/EN/FR/ES/IT/NL,
DMY/MDY/YMD, separators, numeric/short/long month, full/short year, leading day zero
and weekday off/short/long. Date text uses the browser's Intl locale data.
Layout: row/column, left/center/right, gap, optional background, corner radius
and padding. One host ticker updates text each second without rebuilding widgets.
All settings are retained in project and widget exports.

Room – Overlay: room name, alignment, colors, padding and up to ten status rows.
Each row reads an HA entity; numbers support units and decimals. Boolean rows
support ON/OFF text/colors and comma-separated additional entities with AND/OR.
Unknown inputs remain unknown. Vertical or horizontal layout is selectable.
Select an existing Studio page to open as a popup or switch to that page.
Popup size, fixed X/Y position, colors, border, outside-click closing, close button
and automatic closing are configurable. Escape always closes the modal.
Self references, recursive embedding and chains longer than eight are blocked.
The editor only selects; runtime opens the page. Polling preserves the open popup.
All row and popup settings are retained in widget and project exports.

Dimmer – Light: bind power to light/switch/input_boolean and brightness to a
dimmable light (brightness 0–255 converted to %) or input_number (0–100).
The same light may be bound to both fields. Link power and brightness means
ON=100%, OFF=0%, dimming above zero=ON. With linking off, independent bindings
stay independent; HA light.turn_on with brightness inherently turns the light on.
Drag the radial arc or use the keyboard-accessible range. One write occurs on
release. Unknown, unbound, unsupported and read-only controls never write.
Separate HA targets are sequential; a provider failure may partially apply.
Check the live state before retrying. The caption remains visible.

Switch – Boolean: switch/light/input_boolean with bool mode; input_number with
number mode (exact 0/1). Sensors are display-only. Sixteen original geometric
symbols, ON/OFF colors, scale, caption position, preview and read-only are included.
Runtime clicks toggle the selected entity; captions stay visible. Unknown or
unbound runtime states never write. Failed writes show retry status.

- Contact: binary_sensor or another Boolean state; optional inversion.
- Blind: cover entity, current_position attribute (0 closed, 100 open).
  Position control requires supported_features SET_POSITION (4).
- Mode: optional input_boolean/switch (off automatic, on manual), invertible.
  This helper represents the mode; configure the actual automation in HA.
- Runtime click opens a keyboard-accessible dialog with position slider,
  quick positions 0/25/50/75/100 and a mode toggle. Read-only disables writes.
- Unbound preview values apply only in the editor. Missing live states stay unknown.
- Caption, caption position, icon scale/color and handle side are configurable.
  All settings remain in project and widget exports.

Build: python build.py. MIT license and original attribution are in LICENSE.txt.
