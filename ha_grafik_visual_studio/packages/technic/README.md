# UGSo Technic 1.0.0

Inspiriert von den ioBroker-Technic-Widgets von Sefina-DS:
https://github.com/Sefina-DS/ioBroker.vis-2-widgets-technic

Eigene Umsetzung für Home Assistant. Dieses erste Paket enthält Window – Wall.
Die weiteren sechs Widgets des Originalsets sind noch nicht enthalten.
Requires Studio 0.1.197 or newer. Install ugso.technic.wg through Settings > Widget packages.

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
