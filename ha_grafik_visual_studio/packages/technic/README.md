# UGSo Technic 1.1.0

Inspiriert von den ioBroker-Technic-Widgets von Sefina-DS:
https://github.com/Sefina-DS/ioBroker.vis-2-widgets-technic

Eigene Umsetzung für Home Assistant. Enthält Window – Wall und Switch – Boolean.
Die weiteren fünf Widgets des Originalsets sind noch nicht enthalten.
Requires Studio 0.1.198 or newer. Install ugso.technic.wg through Settings > Widget packages.

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
