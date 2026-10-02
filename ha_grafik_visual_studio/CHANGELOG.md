# Changelog

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
