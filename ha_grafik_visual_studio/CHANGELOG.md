# Changelog

## 0.1.161

- Bool SVG follows VIS2 defaults: 85 × 85 pixels, two editable star snippets, native SVG coordinates, read-only mode and opacity with a 20% visibility floor in the editor.
- Numeric SVG states and 0/1 switching support suitable Home Assistant helpers. Optional CSS groups start disabled; CSS General remains mandatory.

## 0.1.160

- View in widget 8 uses the HA entity as a read-only Studio page index in editor and runtime. Highest index 0..50 includes index zero; 1 creates two page slots. Empty, unavailable, fractional and out-of-range states show no selected page.
- New widgets start at 300x200 with only CSS General enabled. Optional migration hints explain index mapping and Studio page dependencies for future project exports.
- Stateful embedded pages remain mounted while their target is unchanged; target changes replace the frame. Missing pages and recursive embedding are rejected.

## 0.1.159

- Dashboard in widget always displays its HA dependency and external-runtime export limitation in the widget settings, independently of optional migration hints.
- Exporting widgets containing a dashboard, including dashboards in their own tab surfaces, shows the affected widgets and offers Export anyway or Cancel. Dashboard contents and browser authentication are not included in the JSON export.

## 0.1.158

- New Dashboard in widget under Special embeds HA dashboards at 32..800 by 32..640px. Dashboard selection reads Lovelace panel titles/paths; optional view and HA base URL support ingress and direct access.
- Runtime embeds use the normal HA browser session without storing tokens. Frames remain mounted during state refreshes; editor previews avoid loading interactive dashboards.
- View in widget remains a separate Studio page container with 300x200 defaults. Both widgets start with only CSS General enabled and optional migration hints.

## 0.1.157

- Input val supports numeric min/max, configurable auto-set delay (1000ms default), Enter submission and an optional confirmation button. Auto-set also works with withEnter; leaving the field alone no longer writes.
- Styled inputs use prefix as label and suffix as helper text; No style uses sanitized surrounding HTML. Numeric mode applies to read-only sensors too. New widgets use 150x70 and only CSS General enabled.
- Optional migration hints explain confirmation and display behavior; numeric writes reject empty, non-finite and out-of-range values.

## 0.1.156

- String supports HTML editors for prefix/suffix/test text, plain-text source values, editor-only test override and fixed 5..200px icon size (24px default). Size controls appear only with an icon.
- HA attribute selection maps VIS2 attribute datapoints such as friendly_name to the selected entity's attributes, including the output dock value. Missing sources show --.
- New String widgets start with empty fields, 100x30 size and only CSS General enabled. Optional migration hints explain attribute selection and preview semantics.

## 0.1.155

- Filter dropdown now offers separate dropdown/button variants, small dropdowns, optional title/autofocus, page-local runtime filters and multi-value entries. Editor widgets remain visible.
- Entry editing supports ordering, icons/images, HEX text and active text colors, optional alpha, clearing colors and a single default for single selection. Legacy RGB(A) colors remain compatible.
- Active button colors affect text instead of backgrounds. Dropdown options support icons and keyboard navigation. New widgets use 200x50, empty entries and CSS General enabled; other CSS groups start disabled.

## 0.1.154

- CSS General is required and always enabled for every registered widget, including future packages and projects with previously disabled groups. Geometry is retained during export.
- HTML navigation starts with empty markup, page selection, 200x130 size and other CSS groups disabled. Untargeted markup remains visible; legacy URLs and labels still render.
- Migration hints explain sanitized navigation markup and the unsupported VIS2 special-purpose subview field.

## 0.1.153

- New HTML widgets start with empty HTML, refresh disabled, 200x130 size and disabled CSS groups. HTML is displayed literally and refreshed consistently without a custom value placeholder.
- Optional migration hints explain sanitized markup, disabled embedded scripts/event handlers and the HTML rebuild interval versus HA state polling.

## 0.1.152

- Bar reversal changes its origin instead of complementing the numeric fill percentage. Vertical bars start at the top normally and at the bottom when reversed.
- Bar borders and VIS2's misleading transparency/shadow field now apply CSS border and box-shadow to the fill. Existing stored opacity is preserved.
- New bars default to blue, 0..100, 200x130 and disabled CSS groups. Optional migration hints explain read-only sensors, borders, shadows and reverse direction.

## 0.1.151

- HTML State now writes its configured fixed value on runtime click or keyboard activation, using compatible HA switch entities or number/text helpers. It does not toggle based on the current state.
- Optional click URLs are requested via browser GET instead of navigating away. Migration hints explain HA targets and browser/network constraints.
- New HTML State widgets have empty fields and disabled CSS groups. Previous state values are retained as the fixed-value fallback; HTML is displayed literally with sanitization.

## 0.1.150

- Added project-wide Show migration hints setting, enabled by default. Editor fields explain the required HA helper/switch target, JSON/index sources and unavailable extra write targets.
- Hints use compact 10px regular text, light red on dark backgrounds and dark red on light backgrounds. Display-only controls get read-only guidance; runtime contains no migration hints.

## 0.1.149

- Bool Select uses configurable true/false labels and 0/1 option values. It supports HA number/text helpers as well as switchable entities and reads numeric states correctly.
- New Bool Select widgets start with empty labels/HTML, autofocus disabled and all CSS groups disabled. Existing labels remain unchanged.

## 0.1.148

- Table hides underscore metadata, supports explicit column titles, widths and attributes, and renders sanitized HTML cells.
- Runtime event rows are deduplicated and replaced by `_id`; new-on-top applies to event rows instead of reversing the static table.
- Row selection and acknowledgment write to compatible HA helpers. `_detail` displays in the configured detail widget. New tables start with CSS disabled and no print button caption.

## 0.1.147

- New Bool Checkbox widgets start with all CSS groups disabled, empty HTML additions and autofocus disabled. Existing configurations remain unchanged.
- Documented prepended/appended HTML, runtime autofocus and Home Assistant checkbox controls in German and English.

## 0.1.146

- Bool HTML adds prepended/appended HTML and HTML-editor controls for false/true content. Existing contents remain compatible.
- New Bool HTML widgets start with empty HTML content and all CSS groups disabled. The widget remains read-only.

## 0.1.145

- ValueList HTML Style uses individual HTML/style entries from index zero through the configured count, including count zero. Preserves legacy list fallback values and supports Boolean indices.
- Shares editor-only test-index selection with ValueList HTML without changing runtime state; new widgets start with all CSS groups disabled.
- Adds CSS declaration guidance and safe per-entry font sizing, family, line height, text decoration and letter spacing. Plain `bold` is not a CSS declaration; use `font-weight: bold;`.

## 0.1.144

- ValueList HTML now offers a list-derived editor-only test-index dropdown and an explicit live/preview-state option. Runtime continues using the bound entity; selecting a test index does not modify its stored state.
- Preserves comma text, supports semicolon/newline entry separators and escaped semicolons (`§§`), and renders no entry for unavailable or out-of-range values.
- New ValueList HTML widgets start with all CSS groups disabled; existing group settings remain intact.

## 0.1.143

- New Data flow widgets start with CSS groups disabled; Value calculation also starts with its Display group disabled. Calculation and conversion controls remain enabled, and existing widgets retain their saved choices.
- New Value connections start without arrowheads at either end.

## 0.1.142

- Adds an independently switchable value output for ordinary widgets with top/bottom/right/left radio buttons. Output points are editor-only and use the separate Output point color in Studio settings.
- Keeps existing docking configurations and supports the new output in snapping, hidden value connections and numeric calculations; disabled outputs stop forwarding values.

## 0.1.141

- Adds the Data flow palette with Value converter, Value connection and Value calculation. Connections and calculations reuse SVG-Line/LineBox Math internally and start hidden in runtime; converters are always runtime-invisible.
- Adds a radio-button converter editor with live typed previews, numeric/text/switch conversions, on/off/true/false/1/0 normalization, unit recognition, explicit unit output, threshold, scaling and opt-in text fallback.
- Adds directed widget value output/input with active dock selection, one-source validation and cycle detection. Widgets with an entity or preview value can supply typed values, including unit metadata, without additional HA entities.

## 0.1.140

- Exposes all five shared CSS property groups for SVG LineBox Math, including general layout, font/text, background, borders and shadow/spacing.
- Honors configured corner radius, padding, result font size and text alignment instead of overriding them in the Math renderer.

## 0.1.139

- Allows independent SVG LineBox Math width and height from 32 px, including rectangular resizing and size-adaptive editor dock markers.
- Adds an optional icon with size/color controls, background/border/text colors, restricted inline CSS styling and optional result display. Calculations continue when results are hidden.

## 0.1.138

- Extends SVG LineBox Math to four independent calculations with per-calculation output lists (e.g. E,F;H), previews and optional internal result handoff to one input, disabled by default.
- Adds role, duplicate assignment and feedback validation. Internal handoff replaces external values at its target input; arithmetic errors affect the corresponding calculation and dependent results.
- Enlarges the calculation dialog with responsive layouts and preserves existing single-calculation projects as calculation 1 with their previous outputs.

## 0.1.137

- Adds SVG LineBox Math under Special: visible square, 16 clockwise ports A–P, green occupied/orange free markers in the editor, and perpendicular connection entry in editor and runtime.
- Adds a calculation dialog with port roles, size, arithmetic expressions, occupied-port averages and previews. Multiple lines sum per input; results flow to numeric widgets and downstream boxes without additional HA entities.
- Invalid inputs, division by zero and feedback cycles stop output and expose an error; formulas are parsed without executing JavaScript.

## 0.1.136

- Adds independent automatic animation divisors for numeric entities and LineBox outputs. Each has a target speed (default 1 cycle/s, adjustable 0.05–5); zero stops motion and negative values reverse it. Manual divisors remain stored.

## 0.1.135

- Separates editor names from visible captions for all registered widget types, including future packages. New captions start empty; old stock captions are removed once while custom captions remain editable.
- LineBox displays only its explicit caption instead of its technical editor name.

## 0.1.134

- Uses the supplied folder-up SVG for parent-folder navigation in the Files window.

## 0.1.133

- Adds case-insensitive file search across all studio subfolders with image previews and relative paths. File-type filters, selection and image insertion also work with search results.

## 0.1.132

- Moves all selected widgets together when dragging a selected widget, including pasted selections and selected connection lines with intermediate points. Relative spacing and existing attachments are retained; locked members block the move.
- Keeps multi-selection when clicking an already selected widget and records a shared drag as one undo operation.

## 0.1.131

- Keeps editor widgets, including selected widgets and high layers, behind the widget selection menu by isolating the stage stacking context.
- Adds Copy and Delete buttons directly to the selection menu. They act on the checked selection; deletion opens the existing confirmation dialog.

## 0.1.130

- Adds a widget deletion confirmation dialog listing the selected IDs, with Delete, Cancel and an optional five-minute suppression period. Escape cancels; cutting widgets retains its existing behavior and deletion remains undoable.

## 0.1.129

- Uses /local/studio/ paths for widget image selection and copied file paths.
- Disables signal images and extra controls for new widgets, alongside docking points. Previously configured optional behavior remains available; heading switches now control rendering and extra URL actions.
- Synchronizes individual and all-widget checkbox selections immediately with the editor selection.

## 0.1.128

- Restricts the Files browser to Home Assistant's /config/www/studio directory, creates it automatically when opened and explains how to create it manually if permissions prevent creation.

## 0.1.127

- Fixes left, center and right text alignment for Number and Red Number by aligning their flex content, including HTML additions, in editor and runtime views.

## 0.1.126

- Fixes LineBox inputs ignoring numeric widgets connected through lines without their own numeric animation entity. Explicit numeric line entities retain priority; otherwise connected numeric widgets provide values, including Number scaling.
- Supports internal LineBox chains with cycle guards and keeps zero as a valid value. Output helper protection also checks numeric source widgets for direct feedback.
- Adds entity/preview/docking-point value sources for Number, Red Number, Gauge and Bar. Enable the selected docking point to display the signed sum of valid connected line values without another HA helper; missing input displays --.

## 0.1.125

- Fixes Number HTML prefix and singular/plural suffix rendering for bound entities, including immediate local state updates. Formatting, factor and missing-value placeholders remain intact.
- Fixes Gauge singular/plural suffixes. Audits all 19 widget types exposing HTML additions in bound and unbound browser cases.

## 0.1.124

- Renders active Tabs contents directly from the open project instead of loading a separate iframe document. Switching tabs and editor previews no longer wait for project/network reloads.
- Clicking a tab's content area opens its editing surface; returning immediately shows unsaved edits. Existing project pages remain shared references with cycle guards.
- Runtime state polling includes active tab contents and their LineBox helper outputs; switching tabs requests their entity states immediately.

## 0.1.123

- Prevents the editor shell from flashing while embedded tab surfaces load. A tab frame stays hidden until its same-origin surface signals that project loading and initial rendering are complete.

## 0.1.122

- Adds a 0-90% inactive-tab dimming control in the main Tabs settings. It dims header backgrounds, text and icons while keeping the active header and tab content unchanged; existing widgets default to 0%.

## 0.1.121

- Adds separate active/inactive tab text colors in the main Tabs settings. Empty values preserve the existing Tab color; per-tab icon colors remain independent.

## 0.1.120

- Expands per-tab overflow X/Y choices to none, visible, hidden, scroll, auto, initial and inherit. None clears the explicit CSS override; existing tabs retain auto as their default.

## 0.1.119

- Adds an independent background color for each tab header, available in horizontal and vertical layouts. Existing tabs retain their transparent background and active marker.

## 0.1.118

- Shows the toolbar brand in three compact lines beside its logo, leaving more horizontal space for editor controls and Save.

## 0.1.117

- Highlights the return-to-Tabs editor button in turquoise with a compact three-line German/English label that stays within its toolbar tile.

## 0.1.116

- Adds an original Tabs widget with 1-20 horizontal/vertical tabs, standard/centered/full-width variants, per-tab titles, icons/images, icon colors/sizes and overflow settings.
- Each tab embeds an existing project page or an owned widget surface edited through Edit tab surface; owner dimensions define the common content size.
- Runtime renders only the active tab, remembers selection locally, and blocks cyclic page embedding. Tabs support grouping and independent copies including owned contents.
- Own surfaces do not support nested Tabs widgets yet. Existing pages are referenced and edited as shared pages.

## 0.1.115

- Editor context menus offer selection, grouping, ungrouping, group editing, clipboard actions and delete, with duplication, ordering, locking, history and import/export under More.
- Flat widget groups persist in project data, move together without changing relative offsets and can be edited individually. SVG connections cannot be grouped.
- Copies receive independent group identities; grouping and movement use the existing undo/redo history. Runtime does not show editor context menus or group outlines.

## 0.1.114

- Slider track and thumb have separate colors, sizes, rounding and configurable shadows (offset, blur, spread and CSS/RGBA color).
- Track fill supports normal, inverted and no active fill; it follows pointer input and incoming Home Assistant state updates in Chromium and Firefox.
- Existing slider scale and entity write behavior remain available; styling applies in editor and runtime.

## 0.1.113

- Colorpicker tabs share one measured content area so switching to Favorites preserves the dialog size.
- Favorites use two columns on larger screens and one column on narrow screens, with scrolling for longer lists.

## 0.1.112

- Colorpicker 1.2.0 stores a shared list of up to 15 favorites in add-on data, guarded by trusted Ingress identity and Home Assistant administrator membership.
- Add and delete operations are atomic; local browser favorites can be explicitly merged without replacing the shared list.
- Each favorite has matching SVG buttons for copying its HEX value and deleting it.

## 0.1.111

- Colorpicker 1.1.0 adds a separate Favorites tab with 15 locally persisted colors, individual removal and automatic compaction.
- Save favorite is separate from Copy, prevents duplicates and disables at capacity with a highlighted full-list message.

## 0.1.110

- Copy Colorpicker HEX values and names through a modal-local clipboard fallback when the browser Clipboard API is missing or denied, including HTTP/Ingress contexts.

## 0.1.109

- Add the installable UGSo Colorpicker tool: keyboard-accessible color wheel, brightness, HEX input, local color names, and copy output.
- Add the data-only color-picker action without project or Home Assistant capabilities; existing background tools retain their contract.

## 0.1.108

- Compact the page size toolbar: use Seite, B: and H:, five-character numeric fields, and a shorter Save button.

## 0.1.107

- Immediately synchronize sliders sharing a helper with another input widget or local helper update.
- Keep incoming Home Assistant values authoritative for bound sliders; unavailable values no longer fall back to a saved preview.
- Capture slider pointer release outside the control so dragging cannot block subsequent runtime updates.

## 0.1.106

- Place slider minimum/maximum labels above or below the track ends.
- Add evenly spaced intermediate scale marks (0 disables them), with optional numeric labels independent of the input step.

## 0.1.105

- Open the new-tab action through an explicit runtime URL under the Studio base path, preserving the project and page.
- Replace the new-tab arrow with a yellow play icon.

## 0.1.104

- Use the supplied SVG icons for Files, Settings, Projects, Entities, Pages, and Tools, including the runtime page menu.

## 0.1.103

- Use the supplied trash, duplicate, and clipboard SVG icons for widget Delete, Duplicate, and Paste, matching the toolbar color and size.

## 0.1.102

- Use the supplied diskette icon for Save.
- Add a new-tab runtime link for the current project and page, opening the Studio directly outside the Home Assistant panel frame.

## 0.1.101

- Rename the visible Linebox widget to SVG LineBox to clarify its relationship with SVG-Line. Existing saved `linebox` widget types and project data remain compatible; the former name remains searchable in the palette.

## 0.1.100

- Linebox can optionally show its signed output value above or below the junction circle. The label updates immediately with bound slider changes and can also be shown when the circle is hidden.

## 0.1.99

- Linebox now draws a configurable circle over joined SVG-Line ends at runtime, hiding the angular junction. Diameter, fill, border color, border width, and visibility can be set in Linebox properties.
- Linebox can optionally write its signed input sum to an `input_number` helper when the sum changes, while continuing its internal handoff to outgoing lines. Direct helper feedback to the same Linebox is rejected.

## 0.1.98

- Slider can optionally show its minimum and maximum. Bound slider changes immediately update Number and SVG-Line, including Linebox-driven flow, while the Home Assistant write completes.
- Runtime widgets with entity bindings now use live states consistently. Boolean controls and State Element write only to supported switch-like entities or helpers; unsupported bindings remain read-only. Date, indexed, image URL, and JSON table displays also use live states where configured.

## 0.1.97

- Slider writes its selected value to a bound Home Assistant `input_number` helper on release and reads the current helper state. Input val renders as a bordered input box and writes numeric or text entries to `input_number` or `input_text`, with its existing Auto-set and Enter options. Both remain local when unbound.

## 0.1.96

- The editor now refreshes Home Assistant states used by SVG-Line direction sources and Linebox inputs, so a numeric helper can drive and preview its connected lines before switching to runtime.

## 0.1.95

- Runtime pages now center only when they fit the viewport. Larger pages begin at the reachable top-left edge and scroll in both directions, so widgets no longer disappear beyond the left or top side.

## 0.1.94

- A Number widget bound to a Home Assistant entity now shows only the formatted current value, without its title, entity ID, unit or configured prefix/suffix. The editor refreshes bound Number states as well as the runtime; an unavailable value displays `--`. Unbound Number widgets retain their preview layout.

## 0.1.93

- At runtime, SVG-Lines docked to enabled Linebox input and output ports now meet at one invisible junction in the center of the Linebox. Editor docking positions and port roles remain unchanged; neutral or disabled ports do not join.

## 0.1.92

- Added Linebox to HA Grafik – Spezial: enabled docking points can be inputs, neutral, or outputs. Numeric SVG-Line inputs are summed with their direction sign, and selected outputs can drive another line's animation while preserving its colors and style. Linebox is visible only in the editor.
- Standardized the remaining German palette widget names to English: SVG-Line, Icon Toggle Button, Gauge and State Element. Stored widget types remain unchanged, and former German labels remain searchable.

## 0.1.91

- The docking-point properties now start with an "All points" checkbox that toggles all twelve anchors and shows a mixed state when only some are enabled. New widgets start with every anchor off, while previously active anchors in saved projects remain enabled.

## 0.1.90

- SVG connection animation can use one exclusive direction source: manual, numeric Home Assistant entity, or boolean Home Assistant entity. Numeric magnitude divided by a configurable divisor controls cycles per second; its sign controls direction, and zero or unavailable values stop the flow. Boolean states choose direction, with optional inversion. Arrowheads follow the resolved direction. Existing lines remain in manual mode.

## 0.1.89

- Local widget and tool package import accepts ZIP archives named `.wg` and `.tp` while retaining `.wg.zip` and `.tp.zip` compatibility. The first Packer core validates source folders and exports both new formats.

## 0.1.88

- Narrowed page-width and page-height inputs and the Save button in the editor toolbar.

## 0.1.87

- Editor and Runtime share one compact two-row toolbar column; Runtime is green. Widget packages continue to accept 1–30 widgets, while tool packages now require exactly one tool.

## 0.1.86

- Installed tools now appear as two-row icon actions in the editor toolbar and open their existing preview directly. The page-size preset and width/height controls are stacked in two compact rows to make room.

## 0.1.85

- Docking points start disabled on widgets. Their handles and snap targets appear only after the widget's docking-point group is explicitly enabled.

## 0.1.84

- The Settings dialog keeps the same size when switching between General, Widget packages and Tools; each tab scrolls within the fixed dialog area.

## 0.1.83

- Widget, tool and package images in local extension ZIPs may use validated SVG or PNG files. PNG framing, checksums, size and dimensions are checked before embedding. Studio action buttons retain SVG icons.

## 0.1.82

- Added data-only tool package API 0.1 and local `.tp.zip` installation in Settings → Tools. The first tool action previews and changes the current page background after confirmation; it uses the editor's undo history. Packages contain no executable code or Home Assistant access.

## 0.1.81

- Widget packages may include referenced SVG palette icons. Only restricted SVG geometry is accepted; other icon formats and active SVG content are rejected. Packages without icons use the built-in SVG text icon.

## 0.1.80

- Added widget package API 0.1: install local manifest-only `.wg.zip` files in Settings → Widget packages. Validated text widgets appear in the palette, editor properties and runtime. The package list shows version and license; removal is blocked while any project uses a package widget. GitHub installs, updates and executable extensions are not part of this initial contract.

## 0.1.79

- The settings dialog now has General, Widget packages and Tools tabs. Existing settings stay under General; the other tabs show compact empty package lists until package installation is implemented.

## 0.1.78

- The SVG connection line dialog calls its default option "Zwischenpunkt" (intermediate point) instead of "Klick". Newly created points receive a matching name in the selected UI language; existing saved point names remain unchanged.

## 0.1.77

- VIS2-inspired widget names in the palette now use the original English labels, including Bool SVG, Input val, Bool Checkbox, Bulb on/off, Border and Image. The interface language does not translate palette widget names; former labels remain searchable.
- New widgets use their palette label as the initial editor name. Existing saved widget names and content are unchanged.

## 0.1.76

- The existing numeric-value widget is listed as "Number" in the palette, separately from "Red Number", and can now be found by searching for "number" or the former name "Zahlenwert". Existing saved numeric widgets keep their type and settings.

## 0.1.75

- The widget palette now has a search field that filters widgets by name or type. Matching groups expand temporarily, while the previous accordion state returns when the search is cleared.

## 0.1.74

- The switch-control endpoint accepts only JSON requests, preventing cross-origin browser forms from submitting service actions.

## 0.1.73

- A Switch widget bound to a `switch`, `light` or `input_boolean` entity now sends `turn_on`/`turn_off` through the authenticated Home Assistant WebSocket service API. Its displayed state follows HA confirmation instead of changing only a local test value.
- Missing, unavailable or unsupported bound states disable the Switch control. Service errors are reported in the runtime; arbitrary service calls are not exposed through the app endpoint.

## 0.1.72

- The runtime reads only the Home Assistant states needed by the current page every five seconds, and refreshes on returning to the tab. Sensor, String, Red Number, Bar, Gauge and Bool HTML display widgets use these values without changing saved preview data.
- Visibility rules now fail closed while a bound state is missing. A state-read failure is shown in the runtime. Home Assistant write actions and the remaining widget types follow in separate increments.

## 0.1.71

- The editor and settings now use German when Home Assistant is set to German and English otherwise. Settings offer an Auto / German / English override stored in the local browser, independently of the shared project.
- Toolbar, dialogs, widget palette and property labels receive English translations; widget content and user-defined project names are preserved.

## 0.1.70

- Dragged line endpoints now snap to enabled collector points on other SVG lines; inactive points do not couple.
- A line coupled to a non-animated main line stops animating and displays that line's base color, including its arrowheads. Its own settings remain stored for when the coupling is removed.

## 0.1.69

- SVG connection lines now show a compact name tab near their start point in the editor. Selecting the tab opens the line properties; its edit button renames the line directly.

## 0.1.68

- Selecting an SVG connection now shows its editable properties on the first click; clicking the selected line again opens the point dialog.
- Connected lines can inherit the animation rhythm from their main line or an enabled collector while keeping their own colors and line styling.

## 0.1.67

- Keeps newly inserted palette widgets in the visible editor area and confirms the insertion in the status line.
- Removes the grab cursor from the full-page SVG connection container while retaining it on the draggable line.

## 0.1.66

- Fixes SVG connection lines with active non-pulse animations so selecting or dragging them no longer interrupts rendering before the properties panel updates.

## 0.1.65

- Replaces the single-widget finder with a VIS-2-style multi-widget dropdown supporting all, apply and clear actions with widget previews.
- Adds editor filtering from the selected widgets' enabled filter words, plus multi-widget cut, copy, paste, duplicate and delete actions.
- Adds a 50-step widget undo/redo history with toolbar counters and keyboard shortcuts.
- Gives every widget common Generell and Sichtbarkeit sections which are disabled by default; entity conditions work in runtime once Home Assistant states are available, while locked widgets cannot be moved or resized.

## 0.1.64

- Adds dedicated SVG icons for widget import and export based on the supplied artwork.
- Arranges layer, import/export and duplicate/delete actions as three paired columns with two rows.
- Moves all ten alignment actions into the top toolbar as two rows of five and frees the corresponding space above the editor canvas.

## 0.1.63

- Replaces the layer arrow glyphs with matching stacked-layer SVG icons.
- Uses a plus badge for moving the selected widget forward and a minus badge for moving it backward.
- Keeps disabled layer actions visually subdued while retaining their accessible labels and tooltips.

## 0.1.62

- Rebuilds the editor header as one VIS-2-inspired toolbar with icons or controls above their labels.
- Separates pages, widget operations, modes and project controls into compact visual groups without wrapping the toolbar into multiple rows.
- Preserves the corrected remaining-height workspace and its permanently accessible horizontal and vertical scrollbars.

## 0.1.61

- Reorganizes the editor toolbar into two compact, stable rows instead of squeezing every control into one line.
- Makes the workspace consume the actual remaining viewport height so its lower edge is no longer clipped by the toolbar.
- Keeps horizontal and vertical editor scrollbars permanently available and reserves their layout space on both axes.

## 0.1.60

- Changes the widget palette to an accordion so opening one widget group closes the other groups.
- Keeps every other widget-group heading visible in collapsed form below or above the open group.
- Opens the first widget group initially and preserves the active group while the editor rerenders.

## 0.1.59

- Adds an editable, persistent widget name to every widget type while keeping the technical widget ID unchanged.
- Uses widget names in the finder, property heading, alignment feedback and widget, connection and collector selectors.
- Migrates existing widgets to useful names, assigns unique names to new, duplicated and imported widgets and warns when a manually entered name is already used.

## 0.1.58

- Moves an entire SVG connection by holding the primary mouse button on the line and dragging it.
- Translates both endpoints, every intermediate point and every collector together while preserving the line geometry.
- Detaches endpoint bindings only after an actual line movement and keeps a short click available for the point-type dialog.

## 0.1.57

- Changes ordered widget multi-selection to Ctrl + Shift + click so an ordinary Shift-click no longer modifies the selection.
- Keeps normal clicks as single selection and uses the combined shortcut to add or remove individual widgets.

## 0.1.56

- Uses Shift-click to add or remove widgets from the ordered multi-selection while keeping the first selected widget as the reference.
- Requires Ctrl plus mouse drag to detach an attached SVG connection endpoint from a widget anchor or collector, preventing accidental disconnects.
- Keeps free endpoints directly draggable and provides the equivalent Ctrl plus arrow-key action with visible usage hints.

## 0.1.55

- Wraps the editor page in a horizontally and vertically scrollable workspace with usable space on every side of the page.
- Expands the surrounding workspace automatically for widgets, connection endpoints and intermediate points outside the configured page bounds.
- Keeps the page visually stable when the surrounding workspace grows and clips out-of-page content again in runtime mode.

## 0.1.54

- Adds ordered multi-selection with Ctrl, Cmd or Shift so the first selected widget remains the alignment reference and property target.
- Adds the compact ten-button alignment toolbar for left, right, top, bottom, horizontal/vertical center, horizontal/vertical distribution and matching width/height.
- Supports a long press on the width or height buttons to enter an explicit pixel size for every selected widget.

## 0.1.53

- Opens a centered point-type dialog when an SVG connection line is clicked in the editor, with `Klick` selected by default and `Sammelpunkt` as the explicit coupling option.
- Inserts the new point on the clicked path segment and switches the connection to the manual multi-point path while preserving the connection as one widget with one name.
- Keeps normal widgets selectable below the selected connection line and keeps explicitly opened property sections open across editor updates until the user closes them.

## 0.1.52

- Snaps dragged SVG connection start and end handles to enabled widget anchors within a visible 24-pixel capture radius.
- Highlights the current anchor target while dragging and writes the widget/anchor binding when the handle is released.
- Respects disabled anchors, single-connection anchors and configured connection limits while snapping.
- Renders the selected connection's endpoint controls above normal widgets while its line hit area remains click-through, keeping both the handles and other widgets accessible.

## 0.1.51

- Turns the `Andockpunkte` section checkbox into a master switch that disables every anchor and marker on the widget.
- Preserves the current visual endpoint positions while anchors are disabled and restores attachment behavior when they are enabled again.

## 0.1.50

- Adds draggable start and end handles to the selected SVG connection widget.
- Dragging an attached endpoint deliberately detaches it from its widget or collector and converts it into a free endpoint at the new position.
- Supports precise endpoint movement with the arrow keys and ten-pixel steps with Shift.
- Keeps light-point animation paths synchronized while endpoints or intermediate points are dragged.

## 0.1.49

- Selects widgets during the capture phase so nested links, buttons, selectors and other interactive content cannot suppress the editor selection or its property panel.

## 0.1.48

- Opens project settings reliably in HTTP Home Assistant ingress by providing a UUID fallback when `crypto.randomUUID()` is unavailable.
- Keeps every normal widget above SVG connection interaction layers in the editor regardless of its configured z-index; runtime z-index output remains unchanged.

## 0.1.47

- Keeps normal widgets selectable after inserting another widget by preserving click events through the drag lifecycle and placing them above SVG connection editing layers.
- Keeps anchor markers visible after another widget is inserted while connections exist on the page.

## 0.1.46

- Repairs and structures the project settings dialog with an explicit Auto-Save section.
- Adds a project-wide anchor-point color setting with yellow as the default.

## 0.1.45

- Added the `HA Grafik – Spezial` widget group with the new `SVG-Verbindungslinie` widget.
- Added widget-relative anchor points, multiple connection lanes, free endpoints, intermediate points and opt-in collector points.
- Added straight, orthogonal, curved and multipoint routes with line, arrow, animation, flow inheritance, crossing and z-index controls.
- Added safe connector cleanup on widget deletion and stable point IDs when duplicating connections.

## 0.1.44

- Behält eingeklappte Widget-Bereiche der Palette beim Einfügen oder Wechseln eines Widgets geschlossen.

## 0.1.43

- Zeigt in der Widget-Palette rechts eine kompakte, typbezogene Vorschau für Werte, HTML, Listen, Tabellen, Bilder und Bedienelemente.
- Verwendet dafür eigene CSS-Miniaturen und Schriftzeichen statt lizenzbeschränkter VIS-2-Grafiken.

## 0.1.42

- Ergänzt HTML voranstellen/anhängen für sämtliche Zeit- und ValueList-Widgets.
- Ergänzt einzelne HTML-/Stilfelder, Werteanzahl und Testwert-Auswahl für ValueList HTML Style; bestehende Listen bleiben lesbar.

## 0.1.41

- Macht Slider im Attributbereich kompakter: 3 px Schiene, 12 px Griff und 20 px Bedienhöhe; Tastaturbedienung und Zahlenfelder bleiben verfügbar.

## 0.1.40

- Ergänzt an HTML-Feldern einen Code-Editor mit Zeilennummern, Speichern und Abbrechen; mehrzeiliger Code bleibt erhalten.
- Stellt HTML-Elemente und Formatierungen ohne die bisherige Element-/Attribut-Whitelist dar, auch in vorangestellten und angehängten Inhalten.
- Vereinheitlicht Auswahlknöpfe als drei Punkte für Entitäten, Icons, Bilder und die multi-views-Seitenauswahl.
- Ergänzt Slider mit Zahlenanzeige und die Border-Grenzen für Titel oben (-20 bis 20), Titel links (-20 bis 30) und Kopfhöhe (0 bis 100).
- Hält den Attributbereich bei vielen aufgeklappten Gruppen scrollbar.

## 0.1.39

- Speichert Editoränderungen standardmäßig fünf Sekunden nach der letzten Änderung automatisch.
- Ergänzt in den Projekteinstellungen einen Auto-Save-Schalter und eine Wartezeit von 1 bis 300 Sekunden.
- Zeigt Speicherfehler an und verhindert parallele Speicheranfragen; die Runtime speichert nicht automatisch.

## 0.1.38

- Benennt die gemeinsame Widget-Einstellung „Ebene“ in allen Widget-Sets und der Statusanzeige in „z-index“ um.

## 0.1.37

- Zeigt die Entitätenauswahl konsequent als Gerätebaum mit Ordnersymbolen; ein Klick auf ein Gerät klappt dessen Entitäten auf.
- Ordnet Entitäten anhand ihrer Geräte-ID auch dann einem Geräteordner zu, wenn der Geräte-Registry-Eintrag fehlt.

## 0.1.36

- Lädt Entitäten, Geräte und Zustände direkt im Add-on über den Home-Assistant-WebSocket-Proxy; der Abruf hängt nicht mehr vom optionalen Sidebar-Panel ab.
- Aktiviert dafür den Home-Assistant-API-Zugriff des Add-ons und liefert verständliche API-Fehler im Entitäten-Dialog.

## 0.1.35

- Erklärt bei fehlender Entity-Bridge, dass der separate Sidebar-Eintrag „HA Grafik Editor“ geöffnet und die optionale Integration installiert sein muss.
- Ergänzt die Anleitung, die Sidebar-Integration nach Add-on-Updates erneut zu kopieren und Home Assistant neu zu starten.

## 0.1.34

- Ergänzt den Home-Assistant-Entitäten-Dialog mit Gerätebaum, Suche, Zustandsanzeige, Aktualisieren, Kopieren und Einfügen in Widget-Felder.
- Lädt Entitäten, Geräte und Zustände beim Öffnen oder manuellen Aktualisieren über die Home-Assistant-Oberfläche.
- Benennt den Menüpunkt „Objekte“ in „Entitäten“ um.

## 0.1.33

- Ergänzt einen SVG-Ansichtsbutton zum Umschalten zwischen Listen- und Kachelansicht im Dateien-Dialog.

## 0.1.32

- Zentriert die SVG-Icons in den Aktionsbuttons des Dateien-Dialogs.
- Stellt die Typauswahlliste auf dunkle Schrift und weißen Hintergrund.

## 0.1.31

- Ersetzt Zeichen und Emojis im Dateien-Dialog durch einheitliche, lokal gespeicherte SVG-Symbole.

## 0.1.30

- Ersetzt das App-Icon und Logo durch neu gestaltete SVG-Dateien.
- Rendert passende `icon.png` und `logo.png` aus den SVG-Quellen für den Home-Assistant-App-Store.

## 0.1.29

- Fügt ein eigenes App-Icon und ein passendes Logo für HA Grafik Visual Studio hinzu.

## 0.1.28

- Ergänzt Upload- und Dateifilter für Bilder, Code/JSON, Text, Audio und Video.
- Stellt Dateiaktionen als kompakte Icon-Schaltflächen dar und ergänzt Ordner erstellen sowie neu laden.
- Vergrößert den Dateien-Dialog auf 90 vw × 75 vh.

## 0.1.27

- Stellt den Dateien-Dialog auf eine Dateiliste mit Miniaturansichten und Dateigrößen um.
- Ergänzt je Bilddatei beschriftete Download- und Löschaktionen; Löschen erfordert eine Bestätigung.

## 0.1.26

- Ergänzt Mehrfachauswahl und Upload von PNG-, JPG-, SVG- und WebP-Dateien in den geöffneten www-Ordner.
- Ergänzt Pfadkopie in die Zwischenablage, Einzelübernahme ins aktive Feld und Abbrechen im Dateien-Dialog.
- Verhindert das Überschreiben gleichnamiger Dateien; Uploads sind auf www-Dateien bis 20 MB begrenzt.

## 0.1.25

- Ergänzt die Dateiauswahl auch für den Ansichts-Hintergrund und das Runtime-Favicon.
- Ermöglicht die Dateiauswahl direkt aus einem Dialogfeld, ohne vorher den Icon-Katalog zu öffnen.

## 0.1.24

- Erkennt den Home-Assistant-www-Ordner über die üblichen Add-on-Mountpfade und zeigt die geprüften Pfade bei fehlender Einbindung an.

## 0.1.23

- Verschiebt den Grafikbrowser in den eigenen Menüpunkt „Dateien“.
- Reserviert „Objekte“ für die geplante Home-Assistant-Geräte- und Entitätenansicht.

## 0.1.22

- Ergänzt Werkzeuge, um das ausgewählte Widget um eine Ebene nach vorn oder hinten zu verschieben.
- Ergänzt den JSON-Import mehrerer Widgets und den JSON-Export des ausgewählten Widgets.

## 0.1.21

- Ergänzt die Bereiche Widgets, Projekteinstellungen, Objekte und Projekte in der Editor-Leiste.
- Ermöglicht mehrere getrennte Visualisierungsprojekte mit eigenem Editor- und Runtime-Link sowie Umbenennen, Duplizieren und Löschen.
- Ergänzt einen Bildbrowser für PNG, JPG, SVG und WebP unter `/config/www`, inklusive Ordnernavigation, Miniaturen und Übernahme als `/local/...`-Pfad.
- Ergänzt projektspezifische Laufzeit- und Browseroptionen und bindet den HA-Konfigurationsordner ausschließlich schreibgeschützt ein.

## 0.1.20

- Ergänzt neben dem Seitenmenü eine Widget-Auswahl mit Widgetname, Typ und ID.
- Springt bei Auswahl zum Widget, markiert es und öffnet seine Eigenschaften.

## 0.1.19

- Benennt das Widget-Set „HA Grafik – Basic 2“ in „HA Grafik – Interaktiv“ und das Universal-Widget in „Zustands-Element“ um.

## 0.1.18

- Ergänzt das getrennte Widget-Set „HA Grafik – Interaktiv“ mit einem Zustands-Element für bis zu fünf zustandsabhängige Inhalte.
- Unterstützt pro Zustand MDI-/Iconset-Icons, Grafiken, Text oder bereinigtes HTML sowie Größe, Farbe, Layout und Bildanpassung.
- Fügt lokale Runtime-Testbedienung für Schalter, Buttons und Navigation hinzu; echte Entity-Bindung folgt später.

## 0.1.17

- Ergänzt eine durchsuchbare MDI-Auswahl für Icon- und Bildfelder.
- Akzeptiert Home-Assistant-Iconset-Namen wie `mdi:home`, `atlas:home` und `custom:home` sowie Grafikpfade wie `/local/icons/home.png`.
- Zeigt MDI-Symbole und erreichbare Grafikdateien direkt neben dem Eingabefeld sowie MDI-Symbole in Schaltern und Lampen an.
- Ergänzt Lizenzhinweise zum eingebetteten Material Design Icons-Katalog.

## 0.1.16

- Zeigt für Bild- und Icon-Pfade eine kleine Vorschau direkt neben dem Eingabefeld.
- Aktualisiert die Vorschau sofort beim Ändern und unterstützt lokale HA-Pfade sowie normale Bild-URLs.

## 0.1.15

- Ergänzt im Reiter Ansicht die gezeigten Gruppen für allgemeine CSS-Werte, Hintergrund, Schrift und Text, Optionen, Navigation, Anwendungsleiste und responsive Einstellungen.
- Ergänzt für Ansichtsgruppen die Checkbox zum Ein- oder Ausschließen der Werte im gespeicherten Projekt.
- Wendet Hintergrund-, Schrift- und Anzeigeoptionen in der Visualisierungsfläche an.

## 0.1.14

- Ergänzt pro Eigenschaftsabschnitt eine Checkbox, mit der die Abschnittswerte beim Speichern aus dem Projektcode ausgeschlossen werden.
- Klappt Eigenschaftsabschnitte standardmäßig zu; Überschrift und Auswahl bleiben sichtbar.
- Ergänzt ein eigenes Leinwand-und-Stift-Icon für die App und den Editor-Sidebar-Eintrag.

## 0.1.13

- Ergänzt Mehrseiten-Projekte mit separaten Widgets, Seitengrößen und Hintergründen.
- Fügt ein Seitenmenü mit Hamburger-Schaltfläche, neuer Seite, Umbenennen, Duplizieren, Sichtbarkeit und Löschen hinzu.
- Ermöglicht den Seitenwechsel in Editor und Runtime und migriert gespeicherte Einseiten-Projekte automatisch.

## 0.1.12

- Ergänzt bei zustandsgebundenen Widgets bis zu neun bedingte Signalbild-Overlays mit Bild, kleinem Symbol, Text, CSS-Klassen, Blinken und Position.
- Erweitert die Widget-CSS-Eigenschaften um Layout, Schrift, Hintergrundbild, Rahmen sowie einzelne Abstände und Schattenwerte.

## 0.1.11

- Macht den Widget-Namen ausdrücklich optional; leere Namen erzeugen keine sichtbare Ersatzbeschriftung.
- Ergänzt im Eigenschaftenbereich den Hinweis, dass ein separates Text-Widget als Beschriftung dienen kann.

## 0.1.10

- Ändert die Schaltfläche zu einem zustandsabhängigen Icon-Feld mit separaten Bild-URLs für Ein und Aus.
- Das ganze Feld schaltet den lokalen Vorschauzustand in der Runtime um; optional kann es auf Nur-Lesen gesetzt werden.

## 0.1.9

- Ergänzt VIS-inspirierte Basic-Widgets für Strings, bereinigtes HTML, Zeitwerte, Wertelisten, boolesche Ausgaben und Steuerungen, Tabellen, Vollbild, Balken, Navigation und Widget-Filter.
- Zeigt Zahlenwerte mit Singular-/Plural-Nachsilben an und unterstützt Bild-URLs aus dem Wert eines Widgets.
- Begrenzt HTML-Ausgaben und URLs auf sichere Elemente, Attribute und Protokolle.
- Hält fest, dass Entity-Livebindung und mehrseitige Navigation noch folgen und ioBroker-Ack-Metadaten keine direkte Home-Assistant-Entsprechung haben.

## 0.1.8

- Trennt projektweites CSS für alle Widgets von den CSS-Eigenschaften eines ausgewählten Widgets.
- Der Reiter CSS bietet einen live angewendeten Projekt-CSS-Editor; individuelle CSS-Gruppen liegen im Reiter Widget.

## 0.1.7

- Behebt 404-Antworten beim Öffnen im Add-on-Docker-Image, indem der Server den tatsächlichen Web-Ordner im Container findet.

## 0.1.6

- Korrigiert die Ingress-URL der zusätzlichen Editor- und Runtime-Panels. Sie verwenden jetzt die vom Supervisor gelieferte `ingress_url` statt der Add-on-ID.

## 0.1.5

- Kennzeichnet das Add-on im Home-Assistant-Store ausdrücklich als experimentell.
- Ergänzt eine optionale Home-Assistant-Integration mit getrennten Sidebar-Panels für Editor und Runtime.
- Die Panels öffnen den Add-on-Ingress mit einer aktuellen Supervisor-Ingress-Sitzung.

## 0.1.4

- Fügt ein eigenes Rahmen-Widget mit Titel- und Kopfzeilenoptionen hinzu.
- Ergänzt Ebenen ab 0 für jedes Widget; höhere Ebenen liegen im Editor und in der Runtime weiter vorn.
- Ergänzt Seitenhintergründe mit Farbe und Bild sowie den Modi Kacheln, Zentriert und Stretch.
- Schalter besitzen einen direkten Ein-/Aus-Zustand und lassen sich in der Runtime lokal umschalten.

## 0.1.3

- Ergänzt grafische Basic-Widgets für Switch, Checkbox, Lampe ein/aus und Slider.
- Rendert Schalter, Checkboxen und Slider als passende Bedienelemente statt als generische Widget-Karten.
- Die Lampe nutzt ein eigenes SVG-Symbol oder wählbare Ein-/Aus-Bilddateien.

## 0.1.2

- Stellt Widgets als frei platzierte HTML-Elemente statt als einheitliche Kartenboxen dar.
- Zeigt beim Auswählen die Widget-ID als Fahne und einen blauen Resize-Rahmen mit Ziehgriff.
- Auswahlrahmen, ID-Fahne und Resize-Griff sind in der Runtime ausgeblendet.

## 0.1.1

- Kennzeichnet HA Grafik Visual Studio als experimentelles Projekt.
- Text-Widget ohne Entitätsbindung; Eigenschaftenleiste mit Reitern und gruppierten CSS-Einstellungen.
- Korrigiert den Pfad, über den der Server die Weboberfläche ausliefert.

## 0.1.0

- Initiales App-Grundgerüst mit getrennten Editor- und Runtime-Modi.
- Erste eigenständige HA-orientierte Widget-Palette und gemeinsame Projektspeicherung.
