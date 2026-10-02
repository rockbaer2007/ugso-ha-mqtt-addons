# UGSo Colorpicker 1.0.0

Install `ugso-colorpicker-1.0.0.tp` under Settings > Tools in HA Grafik Visual Studio **0.1.109 or newer**. Open the installed wheel icon or click Run in the Tools tab.

Choose hue and saturation on the wheel; use the brightness slider or enter a six-digit HEX value. Arrow keys on the wheel change hue (left/right) and saturation (up/down). Select HEX or Color name and click Copy. If browser clipboard access is unavailable, select the output and copy it manually.

Color names come from the locally bundled meodai/color-names list (31,918 entries at revision e47b4d8049bdad78d2d6bd05fa1855fceb94c948). Matching uses RGB distance and distinguishes exact and nearest names. Names are labels, not valid CSS color values; paste HEX into widget color fields.

The tool requires no internet connection, Home Assistant credentials or project permissions. It does not modify projects. The data and dialog are provided by Studio; the data-only package activates the color-picker action. Older Studio versions cannot install this action.

The package contains only a checked manifest and the supplied wheel icon. MIT license. Color-name attribution and license are bundled in Studio and accessible from the dialog.
