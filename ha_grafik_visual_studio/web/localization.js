const LANGUAGE_KEY = "ha_grafik_visual_studio_language";

// German is the source language of the editor. Keep saved widget data and user text untouched.
const ENGLISH = {
  "Für Visualisierungen innerhalb von Home Assistant vorgesehen. Wenn ein Export in die externe Runtime geplant ist, dieses Widget möglichst nicht verwenden. Das eingebundene Dashboard wird nicht mit exportiert und benötigt weiterhin Home Assistant sowie eine Browser-Anmeldung.": "Intended for visualizations within Home Assistant. If you plan to export to the external runtime, avoid using this widget where possible. The embedded dashboard is not included in the export and still requires Home Assistant and browser authentication.",
  "Dashboard beim Export": "Dashboard export notice", "Trotzdem exportieren": "Export anyway",
  "Dashboard in widget": "Dashboard in widget", "HA-Dashboard": "HA dashboard", "HA-Dashboard auswählen": "Select HA dashboard", "Dashboard auswählen": "Select dashboard",
  "Dashboard-Ansicht (optional)": "Dashboard view (optional)", "HA-Basis-URL (optional)": "HA base URL (optional)",
  "Dashboard auswählen oder gültigen Pfad eintragen": "Select a dashboard or enter a valid path",
  "Dashboards werden geladen …": "Loading dashboards …", "Dashboards konnten nicht geladen werden.": "Could not load dashboards.",
  "Keine HA-Dashboards gefunden. Pfad direkt im Dashboard-Feld eintragen.": "No HA dashboards found. Enter the path directly in the dashboard field.",
  "Pfad direkt im Dashboard-Feld eintragen.": "Enter the path directly in the dashboard field.",
  "Bettet eine Studio-Projektseite ein; kein HA-Helfer nötig. Für HA-Dashboards gibt es Dashboard in widget unter Spezial. Rekursive Seiteneinbettung wird verhindert.": "Embeds a Studio project page; no HA helper is needed. For HA dashboards use Dashboard in widget under Special. Recursive page embedding is prevented.",
  "HA-Dashboard auswählen oder Pfad eintragen, zum Beispiel /lovelace. Anmeldung erfolgt über die normale HA-Browsersitzung; kein HA-Helfer oder Token im Widget nötig. Maximal 800 × 640 px.": "Select an HA dashboard or enter a path, e.g. /lovelace. Authentication uses the normal HA browser session; no HA helper or token in the widget is needed. Maximum 800 × 640 px.",
  "Im HA-Ingress leer lassen: Die aktuelle HA-Adresse wird verwendet. Bei direktem Studio-Zugriff die HA-Basis-URL eintragen, zum Beispiel https://ha.example.org. Einbettung hängt von Anmeldung und Browserregeln ab.": "Leave empty in HA ingress to use the current HA address. For direct Studio access enter the HA base URL, e.g. https://ha.example.org. Embedding depends on authentication and browser rules.",
  "Auto-setzen Verzögerung (ms)": "Auto-set delay (ms)",
  "Enter bestätigt die Eingabe immer. withEnter ergänzt eine Bestätigungstaste; Auto-setzen bleibt unabhängig davon aktiv. Ohne Auto-setzen wird beim Verlassen nicht geschrieben.": "Enter always submits the input. withEnter adds a confirmation button; auto-set works independently. Without auto-set, leaving the field does not write.",
  "Mit Style: Voranstellen ist die Feldbeschriftung, Anhängen der Hilfstext. Ohne Style: bereinigtes HTML vor und hinter einem einfachen Eingabefeld.": "Styled: prepend is the field label, append is helper text. No style: sanitized HTML before and after a plain input.",
  "HA-Attribut (leer: Zustand)": "HA attribute (empty: state)", "Symbolgröße in Pixel": "Icon size in pixels", "Testtext": "Test text",
  "ioBroker-Attributdatenpunkte wie friendly_name entsprechen HA-Attributen: Entität auswählen und hier friendly_name eintragen. Leer zeigt den Zustand. Kein HA-Helfer nötig.": "ioBroker attribute datapoints such as friendly_name map to HA attributes: select the entity and enter friendly_name here. Empty displays the state. No HA helper is needed.",
  "Testtext gilt nur im Editor. Der Entitätswert und der Testtext bleiben Text; nur HTML davor und dahinter wird formatiert.": "Test text applies only in the editor. Entity values and test text remain plain text; only prepended and appended HTML is formatted.",
  "Filterwerte entsprechen den Filterwörtern der Widgets auf dieser Seite. Kein HA-Helfer nötig. Textfarben werden als HEX gespeichert; Standard gilt beim Start der Runtime.": "Filter values match widget filter words on this page. No HA helper is needed. Text colors are stored as HEX; defaults apply when runtime starts.",
  "Dropdown-Menü": "Dropdown menu", "Horizontale Tasten": "Horizontal buttons", "Vertikale Tasten": "Vertical buttons", "Klein": "Small",
  "HTML wird bereinigt angezeigt. Eingebettete Skripte und Event-Handler werden nicht ausgeführt; keine HA-Schreibentität nötig.": "HTML is sanitized. Embedded scripts and event handlers are not executed; no HA write entity is needed.",
  "HTML-Beschriftung zum Wechseln einer Projektseite; Navigation erfolgt nur in der Runtime.": "HTML label for switching project pages; navigation runs only in runtime.",
  "Unteransicht": "Subview",
  "CSS Allgemein bleibt aktiv, damit Position und Größe gespeichert werden.": "CSS General stays enabled so position and size are saved.",
  "HTML wird bereinigt angezeigt; eingebettete Skripte werden nicht ausgeführt. Seitenwechsel benötigt keinen HA-Helfer.": "HTML is sanitized; embedded scripts are not executed. Page navigation needs no HA helper.",
  "VIS2-Unteransichten dienen speziellen Navigationssystemen, zum Beispiel Jaeger Design. Diese Funktion ist in Studio noch nicht angebunden; Tabs sind davon unabhängig.": "VIS2 subviews serve special navigation systems such as Jaeger Design. Studio does not support this function yet; tabs are independent of it.",
  "0 oder leer deaktiviert die Aktualisierung. Millisekunden bauen den HTML-Inhalt neu auf; das ist keine HA-Abfragezeit.": "0 or empty disables refresh. Milliseconds rebuild the HTML content; this is not an HA polling interval.",
  "Durchsichtigkeit (Schatten/CSS)": "Transparency (shadow/CSS)",
  "CSS-Rand angeben, zum Beispiel 2px solid blue. Eine einzelne 2 ist keine vollständige CSS-Randangabe.": "Enter a CSS border, for example 2px solid blue. A bare 2 is not a complete CSS border.",
  "VIS2 nennt dieses Feld Durchsichtigkeit, speichert aber shadow: CSS-Schatten, zum Beispiel 2px 2px 4px #0008.": "VIS2 calls this field transparency but stores shadow: a CSS box shadow, for example 2px 2px 4px #0008.",
  "Ändert die Wachstumsrichtung, nicht den Füllstand: horizontal von rechts, vertikal von unten.": "Changes the growth direction, not the fill percentage: from the right horizontally, from the bottom vertically.",
  "Liest einen Zahlenwert, zum Beispiel Solarleistung. Es wird kein HA-Wert geschrieben und kein zusätzlicher Helfer benötigt.": "Reads a numeric value, such as solar power. It does not write HA values or require an additional helper.",
  "Rufe URL bei Klick": "Call URL on click", "URL-Aufruf fehlgeschlagen": "URL request failed",
  "Schreibt bei jedem Klick denselben Wert; kein Umschalten zwischen zwei Zuständen.": "Writes the same value on each click; does not toggle between states.",
  "Die URL wird per GET vom Browser aufgerufen, nicht über den ioBroker-Server. Browser- und Netzwerkregeln gelten.": "The URL is called via GET from the browser, not the ioBroker server. Browser and network rules apply.",
  "Schreibt einen festen Wert an switch, light, input_boolean oder einen passenden input_number-/input_text-Helfer. Ein Sensor ist kein Schreibziel.": "Writes a fixed value to switch, light, input_boolean or a compatible input_number/input_text helper. A sensor is not a write target.",
  "Umsteigerhinweise anzeigen": "Show migration hints",
  "Benötigt einen input_number-Helfer für das berechnete Ergebnis. Ohne HA-Ausgabe bleibt die Berechnung lokal.": "Requires an input_number helper for the calculated result. Without HA output, calculation stays local.",
  "Liest JSON-Zeilen aus einem HA-Zustand. Ohne Entität wird Static JSON verwendet.": "Reads JSON rows from an HA state. Without an entity, Static JSON is used.",
  "Liest einzelne JSON-Ereigniszeilen. Zum Lesen ist kein zusätzlicher Helfer nötig.": "Reads individual JSON event rows. Reading requires no additional helper.",
  "Benötigt einen passenden input_text- oder input_number-Helfer für die Bestätigung; Typ und Länge müssen zum Wert passen.": "Requires a compatible input_text or input_number helper for acknowledgment; type and length must match the value.",
  "Benötigt einen input_text-Helfer für die ausgewählte JSON-Zeile. Die maximale Textlänge des Helfers beachten.": "Requires an input_text helper for the selected JSON row. Check the helper's maximum text length.",
  "Diese zusätzlichen Schreibziele sind noch nicht angebunden; hier wird derzeit kein HA-Wert geschrieben.": "These additional write targets are not connected yet; no HA value is currently written here.",
  "Nur Anzeige: Die Entität wird gelesen, nicht geschaltet. Dafür ist kein zusätzlicher Helfer nötig.": "Display only: the entity is read, not controlled. No additional helper is needed.",
  "Benötigt einen input_number-Helfer. Minimum, Maximum und Schrittweite müssen zum Helfer passen.": "Requires an input_number helper. Minimum, maximum and step must match the helper.",
  "Benötigt einen input_number-Helfer für Zahlen oder einen input_text-Helfer für Text.": "Requires an input_number helper for numbers or an input_text helper for text.",
  "Schaltet switch, light oder input_boolean; für 0/1 benötigt es einen passenden input_number- oder input_text-Helfer.": "Controls switch, light or input_boolean; 0/1 values require a compatible input_number or input_text helper.",
  "Schaltet switch, light oder input_boolean. Für numerische Min-/Max-Werte wird ein input_number-Helfer benötigt.": "Controls switch, light or input_boolean. Numeric min/max values require an input_number helper.",
  "Benötigt eine schaltbare HA-Entität: switch, light oder input_boolean. Ein Sensor ist kein Schreibziel.": "Requires a controllable HA entity: switch, light or input_boolean. A sensor is not a write target.",
  "Benötigt eine schaltbare HA-Entität oder einen passenden input_number-/input_text-Helfer für den gewählten Zustand.": "Requires a controllable HA entity or a compatible input_number/input_text helper for the selected state.",
  "HA hat kein ioBroker-ack-Flag. Eine eigene Bestätigungsentität liefert den Anzeigezustand.": "HA has no ioBroker ack flag. A separate acknowledgment entity supplies the display state.",
  "Die HA-Entität liefert den Listenindex, nicht den angezeigten Text. Zum Anzeigen ist kein zusätzlicher Helfer nötig.": "The HA entity supplies the list index, not the displayed text. Displaying it requires no additional helper.",
  "HTML bei 'false'": "HTML for 'false'", "HTML bei 'true'": "HTML for 'true'",
  "CSS-Deklarationen verwenden, zum Beispiel font-weight: bold; color: #29c8b5;": "Use CSS declarations, for example font-weight: bold; color: #29c8b5;",
  "Testwert (nur Editor)": "Test value (editor only)", "Livewert / Vorschauzustand": "Live value / preview state",
  "Andockpunkte und ihre Belegungszähler sind standardmäßig gelb. Der separate Ausgangspunkt ist standardmäßig hellblau. Beide Farben gelten nur im Editor.": "Docking points and their counters default to yellow. The separate output point defaults to light blue. Both colors apply only in the editor.",
  "Ausgangspunkt": "Output point", "Ausgangspunkt aktivieren": "Enable output point",
  "Oben": "Top", "Unten": "Bottom", "Rechts": "Right", "Links": "Left",
  "HA Grafik – Datenfluss": "HA Grafik – Data flow", "Datenfluss": "Data flow",
  "Wert-Konverter": "Value converter", "Wert-Verbindung": "Value connection", "Wert-Berechnung": "Value calculation",
  "Konvertierung bearbeiten": "Edit conversion", "Konvertierung": "Conversion", "Wert-Konverter · Konvertierung": "Value converter · Conversion",
  "Zahl → Text": "Number → text", "Text → Zahl": "Text → number", "Schaltzustand → Zahl": "Switch state → number",
  "Zahl → Schaltzustand": "Number → switch state", "Schaltzustand → Text": "Switch state → text",
  "Schaltzustand normalisieren": "Normalize switch state", "Zahl skalieren": "Scale number",
  "Ausgangs-Dockpunkt": "Output docking point", "Wert vom Datenfluss übernehmen": "Receive value from data flow",
  "In Runtime ausblenden": "Hide in runtime", "Gewählte Ein-/Ausgangs-Dockpunkte aktivieren": "Enable selected input/output docking points",
  "Nachkommastellen (Zahl → Text)": "Decimal places (number → text)", "Dezimalkomma (Zahl → Text)": "Decimal comma (number → text)",
  "Einheit als Fallback / Ziel bei Skalierung": "Fallback unit / target unit for scaling", "Einheit im Text mit ausgeben": "Include unit in text",
  "Schaltzustand-Ausgabe": "Switch state output", "Schaltzustand invertieren": "Invert switch state",
  "Text für Ein": "Text for on", "Text für Aus": "Text for off", "Schwellwert: Ein bei Wert ≥ Grenze": "Threshold: on when value ≥ limit",
  "Faktor (Skalierung)": "Factor (scaling)", "Offset (Skalierung)": "Offset (scaling)",
  "Ersatzwert bei Fehler aktivieren": "Enable fallback on error", "Ersatzwert (Text)": "Fallback (text)",
  "Dateien suchen": "Search files",
  "Dateien in allen Unterordnern suchen": "Search files in all subfolders",
  "Dateien · /config/www/studio": "Files · /config/www/studio",
  "Keine passenden Dateien gefunden.": "No matching files found.",
  "Widgets löschen": "Delete widgets",
  "Die Widgets {names} wirklich löschen?": "Really delete widgets {names}?",
  "Frage für die nächsten 5 Minuten unterdrücken": "Suppress this question for the next 5 minutes",
  "Wertquelle": "Value source", "Home-Assistant-Entität / Vorschau": "Home Assistant entity / preview",
  "Wert vom Dockpunkt": "Value from docking point", "Vorschauwert": "Preview value", "Eingangs-Dockpunkt": "Input docking point",
  "Den gewählten Andockpunkt aktivieren. Mehrere gültige Linienwerte werden mit Vorzeichen summiert. Ohne gültigen Eingang erscheint --; null ist ein gültiger Wert.": "Enable the selected docking point. Multiple valid line values are summed with signs. Missing input displays --; zero is a valid value.",
  "Inaktive Reiter abdunkeln (%)": "Dim inactive tabs (%)",
  "Textfarbe aktiv": "Active text color", "Textfarbe nicht aktiv": "Inactive text color",
  "Tab-Hintergrundfarbe": "Tab background color",
  "Zurück\nzum\nTabs-Widget": "Back\nto\nTabs widget",
  "Anzahl der Tabs": "Number of tabs", "Vertikale Tabs": "Vertical tabs", "Tab-Variante": "Tab variant",
  "Standard": "Standard", "zentriert": "Centered", "Gesamtbreite": "Full width", "Tab-Farbe": "Tab color",
  "Tab-Titel": "Tab title", "Tab-Inhalt": "Tab content", "Eigene Widget-Fläche": "Own widget surface",
  "Vorhandene Projektseite": "Existing project page", "Tabfläche bearbeiten": "Edit tab surface",
  "Symbolgröße (px)": "Icon size (px)", "Symbolfarbe": "Icon color",
  "Zurück zum Tabs-Widget": "Back to Tabs widget", "Überlauf X": "Overflow X", "Überlauf Y": "Overflow Y",
  "Verschachtelte eigene Tabs sind noch nicht unterstützt.": "Nested own Tabs widgets are not supported yet.",
  "Widget-Aktionen": "Widget actions", "Auswählen": "Select", "Alle Widgets": "All widgets",
  "Gruppe": "Group", "Gruppieren": "Group widgets", "Gruppierung aufheben": "Ungroup",
  "Gruppe bearbeiten": "Edit group", "Gruppenbearbeitung beenden": "Finish editing group",
  "Mehr": "More", "In den Vordergrund": "Bring to front", "In den Hintergrund": "Send to back",
  "Sperren": "Lock", "Entsperren": "Unlock",
  "Slider-Schiene": "Slider track", "Slider-Regler": "Slider thumb",
  "Schienenfarbe": "Track color", "Aktive Schienenfarbe": "Active track color",
  "Spurtyp": "Track fill", "Umgekehrt": "Inverted", "Ohne aktive Spur": "No active fill",
  "Schienenstärke (px)": "Track thickness (px)", "Schienenradius (%)": "Track rounding (%)",
  "Schienenschatten": "Track shadow", "Reglerschatten": "Thumb shadow",
  "Reglerfarbe": "Thumb color", "Reglergröße (px)": "Thumb size (px)", "Reglerradius (%)": "Thumb rounding (%)",
  "X-Versatz (px)": "X offset (px)", "Y-Versatz (px)": "Y offset (px)",
  "Unschärfe (px)": "Blur (px)", "Ausdehnung (px)": "Spread (px)", "Schattenfarbe (CSS / RGBA)": "Shadow color (CSS / RGBA)",
  "Lokale Favoriten übernehmen": "Import local favorites",
  "Gemeinsame Favoriten benötigen einen HA-Admin und einen aktuellen Ingress-Aufruf.": "Shared favorites require an HA administrator and a current Ingress session.",
  "Favoriten sind nur für HA-Admins verfügbar.": "Favorites are only available to HA administrators.",
  "HA-Adminprüfung momentan nicht verfügbar.": "HA administrator verification is currently unavailable.",
  "Ungültige Favoritendaten.": "Invalid favorites data.",
  "Favoriten": "Favorites", "Als Favorit speichern": "Save favorite", "Favoriten voll": "Favorites full",
  "Favorit löschen": "Delete favorite", "Favorit gelöscht": "Favorite deleted", "Favorit gespeichert": "Favorite saved",
  "Favoriten konnten nicht geladen werden.": "Favorites could not be loaded.",
  "Favoriten konnten nicht gespeichert werden.": "Favorites could not be saved.",
  "Colorpicker": "Color picker",
  "Farbe wählen und HEX oder Farbnamen kopieren. Farbnamen sind keine CSS-Farbwerte.": "Choose a color and copy HEX or its name. Color names are not CSS color values.",
  "Farbkreis": "Color wheel", "Helligkeit": "Brightness", "Ausgabe": "Output", "Farbname": "Color name",
  "Exakter Farbname": "Exact color name", "Nächster Farbname": "Nearest color name",
  "Kopieren nicht verfügbar. Ausgabe markieren und manuell kopieren.": "Copy unavailable. Select the output and copy manually.",
  "Farbnamen konnten nicht geladen werden. HEX bleibt verfügbar.": "Color names could not be loaded. HEX remains available.",
  "Seite": "Page", "B:": "W:", "H:": "H:",
  "Skalenposition": "Scale position",
  "Zwischenmarkierungen (0 = aus)": "Intermediate marks (0 = off)",
  "Werte der Zwischenmarkierungen anzeigen": "Show intermediate mark values",
  "Neuer Tab": "New tab",
  "Runtime in neuem Tab ohne Home-Assistant-Leisten öffnen": "Open runtime in a new tab without Home Assistant bars",
  "Seiten": "Pages", "Einstellungen": "Settings", "Entitäten": "Entities", "Dateien": "Files", "Projekte": "Projects",
  "Widgets filtern": "Filter widgets", "Widgets": "Widgets", "filtern": "filter", "Widgets auswählen": "Select widgets",
  "Aktive(s) Widget(s) von": "Active widget(s) out of", "Ausgewähltes Widget": "Selected widget",
  "Keine Widgets": "No widgets", "Widgets ausgewählt": "widgets selected",
  "Widgets anhand ihrer Filterschlüssel filtern": "Filter widgets by their filter keys",
  "Eine Ebene nach vorn": "Bring forward one layer", "Eine Ebene nach hinten": "Send backward one layer",
  "Widget importieren": "Import widget", "Ausgewähltes Widget exportieren": "Export selected widget",
  "Widget duplizieren": "Duplicate widget", "Widget löschen": "Delete widget",
  "Widget-Zwischenablage": "Widget clipboard", "Ausgewählte Widgets ausschneiden": "Cut selected widgets",
  "Widgets ausschneiden": "Cut widgets", "Ausgewählte Widgets kopieren": "Copy selected widgets",
  "Widgets kopieren": "Copy widgets", "Widgets einfügen": "Paste widgets", "Bearbeiten": "Edit",
  "Widget-Verlauf": "Widget history", "Rückgängig": "Undo", "Wiederholen": "Redo",
  "Letzte Änderung rückgängig machen": "Undo last change", "Letzte rückgängig gemachte Änderung wiederholen": "Redo last undone change",
  "Ausgewählte Widgets ausrichten": "Align selected widgets", "Ausrichten": "Align",
  "Linksbündig ausrichten": "Align left", "Oben ausrichten": "Align top", "Horizontal mittig ausrichten": "Center horizontally",
  "Horizontal gleichmäßig verteilen": "Distribute horizontally", "Breite ausrichten": "Match width",
  "Rechtsbündig ausrichten": "Align right", "Unten ausrichten": "Align bottom", "Vertikal mittig ausrichten": "Center vertically",
  "Vertikal gleichmäßig verteilen": "Distribute vertically", "Höhe ausrichten": "Match height",
  "Linksbündig am ersten Widget ausrichten": "Align left with the first widget",
  "Oben am ersten Widget ausrichten": "Align top with the first widget",
  "Horizontal mittig am ersten Widget ausrichten": "Center horizontally on the first widget",
  "Breite des ersten Widgets übernehmen; lange drücken für Wunschbreite": "Use the first widget's width; press and hold for a custom width",
  "Rechtsbündig am ersten Widget ausrichten": "Align right with the first widget",
  "Unten am ersten Widget ausrichten": "Align bottom with the first widget",
  "Vertikal mittig am ersten Widget ausrichten": "Center vertically on the first widget",
  "Höhe des ersten Widgets übernehmen; lange drücken für Wunschhöhe": "Use the first widget's height; press and hold for a custom height",
  "Modus": "Mode", "Seitengröße": "Page size", "Telefon 390 × 844": "Phone 390 × 844",
  "Benutzerdefiniert": "Custom", "Breite": "Width", "Höhe": "Height", "Speichern": "Save",
  "Alle": "All", "Auswählen": "Select", "Aufheben": "Clear selection", "Widget-Auswahl": "Widget selection",
  "Seitenmenü schließen": "Close pages menu", "Neue Seite": "New page", "Widget-Palette": "Widget palette",
  "Widgets suchen": "Search widgets", "Widget-Palette durchsuchen": "Search widget palette", "Keine Widgets gefunden": "No widgets found",
  "Palette einklappen": "Collapse palette", "Eigenschaften einklappen": "Collapse properties",
  "Grundgerüst – Widgets sind eigene HA-Elemente": "Basic editor – widgets are individual HA elements",
  "Visualisierungsfläche": "Visualization canvas", "Eigenschaften": "Properties",
  "Wähle ein Widget aus, um seine Eigenschaften zu bearbeiten.": "Select a widget to edit its properties.",
  "Seiten öffnen": "Open pages", "Schließen": "Close", "Abbrechen": "Cancel", "Anwenden": "Apply",
  "Projekteinstellungen": "Project settings", "Automatisches Speichern": "Autosave",
  "Änderungen automatisch speichern": "Save changes automatically",
  "Speichern nach letzter Änderung (Sekunden)": "Save after last change (seconds)",
  "Änderungen werden nach der eingestellten Ruhezeit im aktuellen Projekt gespeichert.": "Changes are saved in the current project after the selected idle time.",
  "Sprache": "Language", "App-Sprache": "App language", "Automatisch (Home Assistant)": "Automatic (Home Assistant)", "Deutsch": "German",
  "Home-Assistant-Zustände konnten nicht geladen werden": "Home Assistant states could not be loaded",
  "Home-Assistant-Zustände wieder verfügbar": "Home Assistant states are available again",
  "Schaltbefehl gesendet; warte auf Home Assistant": "Switch command sent; waiting for Home Assistant",
  "Keine schaltbare Home-Assistant-Entität mit verfügbarem Zustand": "No controllable Home Assistant entity with an available state",
  "Schalten fehlgeschlagen": "Switch failed",
  "Wert an Home Assistant gesendet": "Value sent to Home Assistant",
  "Wert konnte nicht gesetzt werden": "Could not set value",
  "Ungültige Home-Assistant-Entität.": "Invalid Home Assistant entity.",
  "Der Zahlenhelfer benötigt einen endlichen Zahlenwert.": "The number helper requires a finite numeric value.",
  "Der Texthelfer benötigt höchstens 255 Zeichen.": "The text helper accepts at most 255 characters.",
  "Nur input_number und input_text können hier beschrieben werden.": "Only input_number and input_text can be written here.",
  "Ungültiger Wertbefehl.": "Invalid value command.",
  "Diese Entität unterstützt die Schaltersteuerung nicht.": "This entity does not support switch control.",
  "Ungültiger Schaltzustand.": "Invalid switch state.",
  "Ungültiger Schaltbefehl.": "Invalid switch command.",
  "JSON-Anfrage erforderlich.": "A JSON request is required.",
  "Bei Automatisch wird Deutsch nur bei deutscher Home-Assistant-Sprache angezeigt, sonst Englisch. Diese Auswahl gilt nur für diesen Browser.": "Automatic uses German only when Home Assistant is set to German; otherwise it uses English. This choice applies only to this browser.",
  "Editor und Andockpunkte": "Editor and docking points", "Farbe der Andockpunkte": "Docking point color",
  "Diese Farbe gilt für alle Andockpunkte und ihre Belegungszähler. Standard: Gelb.": "This color applies to all docking points and their occupancy counters. Default: yellow.",
  "Bei Projektänderungen laden": "Reload when project changes", "Alle Browser neu laden": "Reload all browsers",
  "Nicht automatisch neu laden": "Do not reload automatically",
  "Dunkler Bildschirm zum erneuten Verbinden": "Dark screen while reconnecting",
  "Zustands-Entprellzeit (Millisekunden)": "State debounce (milliseconds)",
  "Browserinstanz-ID": "Browser instance ID", "Neue ID": "New ID",
  "Projekt für alle Benutzer zugänglich": "Make project available to all users",
  "Titel der Runtime": "Runtime title", "Favicon / Bildpfad": "Favicon / image path",
  "Datei auswählen": "Choose file", "Nicht geladene Widgets ignorieren": "Ignore unloaded widgets",
  "Widgets (mit Filterschlüssel) im Bearbeitungsmodus filtern": "Filter widgets by filter key in edit mode",
  "Filterwirkung": "Filter action", "Ausgewählte Widgets ausblenden": "Hide selected widgets",
  "Nur ausgewählte Widgets anzeigen": "Show only selected widgets",
  "Um den Filter zu verwenden, aktiviere bei mindestens einem Widget den Bereich „Generell“ und trage dort ein Filterwort ein.": "To use the filter, enable General on at least one widget and enter a filter key there.",
  "Filter aufheben": "Clear filter", "Dateien · /config/www": "Files · /config/www",
  "Dateien-Dialog schließen": "Close files dialog", "Dateien des gewählten Typs hochladen": "Upload files of the selected type",
  "Dateien hochladen": "Upload files", "Ordner im aktuellen Verzeichnis erstellen": "Create folder in current directory",
  "Ordner erstellen": "Create folder", "Dateiliste neu laden": "Reload file list", "Dateien nach Typ filtern": "Filter files by type",
  "Dateien filtern": "Filter files", "Alle Dateien": "All files", "Bilder": "Images", "Code/JSON": "Code/JSON",
  "Audio": "Audio", "Video": "Video", "Kachelansicht anzeigen": "Show grid view", "Listenansicht anzeigen": "Show list view",
  "Ansicht wechseln": "Switch view", "Ausgewählte Pfade in die Zwischenablage kopieren": "Copy selected paths to clipboard",
  "In Zwischenablage kopieren": "Copy to clipboard", "Keine Dateien ausgewählt": "No files selected",
  "Dialog abbrechen": "Cancel dialog", "Ausgewählte Datei übernehmen": "Use selected file",
  "Bilder, Code/JSON, Text, Audio und Video bis 20 MB. Für Icons und Bildfelder können Bilddateien übernommen werden.": "Images, code/JSON, text, audio and video up to 20 MB. Image files can be used for icon and image fields.",
  "Home-Assistant-Entitäten": "Home Assistant entities", "Entitäten-Dialog schließen": "Close entities dialog",
  "Entitäten und Zustände neu laden": "Reload entities and states", "Neu laden": "Reload",
  "Entitäten oder Geräte suchen …": "Search entities or devices …", "Entitäten suchen": "Search entities",
  "Entity-ID in die Zwischenablage kopieren": "Copy entity ID to clipboard", "Zwischenablage": "Clipboard",
  "Entity-ID ins aktive Widget-Feld einfügen": "Insert entity ID into active widget field", "Einfügen": "Insert",
  "Ausgewählt": "Selected", "Keine Entität ausgewählt": "No entity selected", "Entitäten werden geladen …": "Loading entities …",
  "Neues Projekt": "New project", "Icon oder Bild auswählen": "Choose icon or image",
  "Icon suchen, z. B. home, mdi:home oder atlas:home": "Search icons, e.g. home, mdi:home or atlas:home",
  "MDI-Icons auswählen oder einen Icon-Namen bzw. Bildpfad eintragen. Unterstützt werden z. B. mdi:home, atlas:home, custom:..., /local/... sowie PNG, JPG und SVG.": "Choose an MDI icon or enter an icon name or image path. Supported examples include mdi:home, atlas:home, custom:..., /local/..., PNG, JPG and SVG.",
  "Icon-Suchergebnisse": "Icon search results", "Dateien …": "Files …", "Wert übernehmen": "Use value",
};

Object.assign(ENGLISH, {
  "Abstand": "Spacing", "Addiere nichts zu URL": "Add nothing to URL", "Aktive Farbe": "Active color",
  "Akzentfarbe": "Accent color", "Allgemein": "General", "Alternativtext": "Alternative text",
  "Einstellungsbereiche": "Settings sections", "Widget-Pakete": "Widget packages", "Installierte Widget-Pakete": "Installed widget packages",
  "Installierte Tool-Pakete": "Installed tool packages", "Installierte Tools": "Installed tools", "Tool-Pakete verwalten": "Manage tool packages", "Keine zusätzlichen Widget-Pakete installiert.": "No additional widget packages installed.",
  "Keine zusätzlichen Tool-Pakete installiert.": "No additional tool packages installed.",
  "Zusätzliche Widget-Pakete werden hier angezeigt. Integrierte Widgets sind Teil der App.": "Additional widget packages appear here. Built-in widgets are part of the app.",
  "Zusätzliche Widget-Pakete mit Schnittstelle 0.1. Integrierte Widgets bleiben Teil der App.": "Additional widget packages using API 0.1. Built-in widgets remain part of the app.",
  "Lokales .wg / .wg.zip installieren": "Install local .wg / .wg.zip", "Paketliste neu laden": "Reload package list",
  "Paket entfernen": "Remove package", "Widget-Paket wirklich entfernen?": "Really remove this widget package?",
  "Widget-Paket wird geprüft …": "Checking widget package …",
  "Widget-Paket muss auf .wg oder .wg.zip enden.": "Widget package must end in .wg or .wg.zip.",
  "Widget-Paket konnte nicht installiert werden.": "Widget package could not be installed.",
  "Paket konnte nicht entfernt werden.": "Package could not be removed.",
  "Tool-Schnittstelle 0.1: Aktionen werden erst nach Vorschau und Bestätigung ausgeführt.": "Tool API 0.1: actions run only after preview and confirmation.",
  "Lokales .tp / .tp.zip installieren": "Install local .tp / .tp.zip", "Tool-Paket muss auf .tp oder .tp.zip enden.": "Tool package must end in .tp or .tp.zip.",
  "Tool-Paket wird geprüft …": "Checking tool package …", "Tool-Paket installiert.": "Tool package installed.",
  "Tool-Paket konnte nicht installiert werden.": "Tool package could not be installed.",
  "Tool-Pakete konnten nicht geladen werden.": "Tool packages could not be loaded.",
  "Tool-Paket wirklich entfernen?": "Really remove this tool package?", "Tool-Paket konnte nicht entfernt werden.": "Tool package could not be removed.",
  "Tool ausführen": "Run tool", "Neue Hintergrundfarbe": "New background color", "Aktuelle Seite": "Current page",
  "Die Änderung betrifft nur die aktuelle Seite und kann mit Rückgängig zurückgenommen werden.": "The change affects only the current page and can be undone.",
  "Seitenhintergrund geändert. Rückgängig ist möglich.": "Page background changed. Undo is available.",
  "Installierte Tool-Pakete werden hier angezeigt. Integrierte Editor-Werkzeuge sind Teil der App.": "Installed tool packages appear here. Built-in editor tools are part of the app.",
  "Am Anfang": "At start", "Am Ende": "At end", "Am Sammelpunkt synchron ankommen": "Arrive together at collector",
  "Andockpunkt": "Docking point", "Andockpunkte": "Docking points", "Andockpunkte dauerhaft anzeigen": "Always show docking points",
  "Alle Punkte": "All points",
  "Der Haken in der Überschrift aktiviert den Bereich. Alle Punkte sind zunächst aus und lassen sich gemeinsam oder einzeln einschalten.": "The heading checkbox enables this section. All docking points start off and can be enabled together or individually.",
  "Anfang → Ende": "Start → End", "Anfangsfilter": "Initial filter", "Animation": "Animation",
  "Animation aktivieren": "Enable animation", "Animationsart": "Animation type", "Animationsfarbe": "Animation color",
  "Richtungsquelle": "Direction source", "Manuell": "Manual", "Zahlen-Entität": "Numeric entity",
  "Bool-Entität": "Boolean entity", "Bool-Richtung umkehren": "Invert boolean direction", "Teiler": "Divisor",
  "Nur eine Richtungsquelle ist aktiv. Zahlenwert / Teiler ergibt Zyklen pro Sekunde (0,05 bis 20); bei 0 stoppt die Animation.": "Only one direction source is active. Numeric value / divisor gives cycles per second (0.05 to 20); zero stops the animation.",
  "Animationstakt der Hauptlinie übernehmen (eigene Farben behalten)": "Follow main line's animation timing (keep own colors)",
  "Anwendungsleiste": "App bar", "Anzahl der Signale": "Number of signals", "Anzahl der Zustände": "Number of states",
  "Anzeige": "Display", "Anzeigen": "Show", "Auflösung": "Resolution", "Aus": "Off",
  "Ausgewählt ID": "Selected ID", "Ausrichtung": "Alignment", "Autofokus": "Autofocus",
  "Automatisch": "Automatic", "Automatisch rechtwinklig": "Automatic orthogonal",
  "Balken": "Bar", "Bedienung": "Controls",
  "Bedingte Sichtbarkeit wird aktiv, sobald die Home-Assistant-Zustandsbindung verfügbar ist.": "Conditional visibility will become active once Home Assistant state binding is available.",
  "Bedingung": "Condition", "Beschriftung (optional)": "Label (optional)", "Bestätigung ID": "Acknowledgement ID",
  "Bild": "Image", "Bild (Datei oder HA-Pfad)": "Image (file or HA path)", "Bild (URL oder HA-Pfad)": "Image (URL or HA path)",
  "Bild / Kamera": "Image / camera", "Bild aus Entity": "Image from entity", "Bild-URL / Testwert": "Image URL / test value",
  "Bildanpassung": "Image fit", "Bildgröße (px)": "Image size (px)", "Bildgröße in px": "Image size in px",
  "Bildpfad / URL": "Image path / URL", "Blinken": "Blink", "Breite (px)": "Width (px)",
  "Breitenskala": "Width scale", "Brücke / Bogen": "Bridge / arc", "Buchstaben-Abstand": "Letter spacing",
  "Button: nächsten Zustand zeigen": "Button: show next state", "CSS Allgemein": "General CSS",
  "CSS Bildstil": "CSS image style", "CSS Hintergrund": "CSS background", "CSS Klasse": "CSS class",
  "CSS Ränder": "CSS borders", "CSS Schatten und Abstand": "CSS shadow and spacing",
  "CSS Textstil": "CSS text style", "CSS-Hintergrund": "CSS background", "CSS-Klasse": "CSS class",
  "CSS-Schriftart und -Text": "CSS font and text", "CSS-Stil je Zeile (Bestandsdaten)": "CSS style per row (existing data)",
  "Darstellung": "Appearance", "Darüber": "Above", "Darunter": "Below", "Daten": "Data",
  "Datumsformat": "Date format", "Dauer (Sekunden)": "Duration (seconds)", "Deckkraft": "Opacity",
  "Der Haken in der Überschrift aktiviert oder deaktiviert alle Andockpunkte dieses Widgets.": "The checkbox in the heading enables or disables all docking points on this widget.",
  "Der Name ist optional. Lass ihn leer, wenn du das Widget zum Beispiel über ein separates Textfeld beschriftest.": "The name is optional. Leave it blank if you label the widget with a separate text field, for example.",
  "Dezimalkomma verwenden": "Use decimal comma", "Dicke": "Thickness", "Drehen": "Rotate",
  "Durchgezogen": "Solid", "Durchsichtigkeit": "Transparency", "Ecke ausblenden": "Hide corner",
  "Eckenradius": "Corner radius", "Eckenradius (px)": "Corner radius (px)", "Ein": "On",
  "Ein Parameter": "One parameter", "Einheit": "Unit", "Ende → Anfang": "End → Start",
  "Entität für Bedingung": "Condition entity", "Ereignis ID": "Event ID", "Etikett Kein Filter": "Label: no filter",
  "Extrasteuerung": "Extra control", "Falls Anwender nicht in der Gruppe": "If user is not in group",
  "Falls nicht erfüllt": "If not met", "Farbe": "Color", "Filter": "Filter",
  "Filteroptionen (durch Semikolon getrennt)": "Filter options (semicolon-separated)", "Filterwort": "Filter key",
  "Freies X": "Free X", "Freies Y": "Free Y", "Füllfarbe": "Fill color",
  "Gemeinsame Angaben für Auswahl, Suche, Filterung und Darstellung dieses Widgets.": "Common settings for selection, search, filtering and appearance of this widget.",
  "Generell": "General", "Gepunktet": "Dotted", "Gerade": "Straight", "Gestrichelt": "Dashed",
  "Gleicher Takt": "Same timing", "Grenzradius": "Border radius", "Größe": "Size",
  "Größe und Position": "Size and position", "Grundfarbe": "Base color",
  "HA Grafik – Basis": "HA Graphics – Basic", "HA Grafik – Interaktiv": "HA Graphics – Interactive",
  "HA Grafik – Spezial": "HA Graphics – Special", "Hauptlinie / Flussgruppe": "Main line / flow group",
  "Hintergrund": "Background", "Hintergrundfarbe": "Background color", "Hintergrundklasse": "Background class",
  "Höhe (px)": "Height (px)", "Höhenskala": "Height scale", "Home-Assistant-Entität": "Home Assistant entity",
  "Home-Assistant-Entity": "Home Assistant entity", "Home-Assistant-Entity (Indexwert)": "Home Assistant entity (index value)",
  "Home-Assistant-Entity (JSON-Attribut, später)": "Home Assistant entity (JSON attribute, later)",
  "Horizontal": "Horizontal", "Horizontale Position (px)": "Horizontal position (px)",
  "HTML anhängen": "Append HTML", "HTML anhängen (Plural)": "Append HTML (plural)",
  "HTML anhängen (Singular)": "Append HTML (singular)", "HTML bei false": "HTML when false",
  "HTML bei true": "HTML when true", "HTML für Aus": "HTML for off", "HTML für Ein": "HTML for on",
  "HTML voranstellen": "Prepend HTML", "HTML-Inhalt": "HTML content", "HTML-Steuerung": "HTML control",
  "HTML-Wert": "HTML value", "Icon / Iconset": "Icon / icon set", "Icon für Aus (Bild-URL)": "Off icon (image URL)",
  "Icon für Ein (Bild-URL)": "On icon (image URL)", "Iconfarbe": "Icon color", "Icongröße (px)": "Icon size (px)",
  "Immer rendern": "Always render", "Inaktiv (gesperrt)": "Inactive (locked)", "Inhalt": "Content",
  "Inhaltsanordnung": "Content layout", "Innenabstand (px)": "Padding (px)", "JSON-Testdaten": "JSON test data",
  "Kacheln": "Tile", "Kamera": "Camera", "Kein Header": "No header", "Kein Rahmen": "No border",
  "Kein Sammelpunkt": "No collector point", "Kein Sandkasten": "No sandbox", "Kein Widget / freier Punkt": "No widget / free point",
  "Keine Hauptlinie": "No main line", "Keine Option Kein Filter": "No option: no filter", "Keine Seite": "No page",
  "Klassen": "Classes", "Kleines Symbol": "Small icon", "Klicks durchlassen": "Allow click-through",
  "Kolumnanzahl": "Column count", "Kommentar": "Comment", "Kopffarbe": "Header color",
  "Kopfhöhe (px)": "Header height (px)", "Kreuzung und z-index": "Crossing and z-index",
  "Kreuzungsdarstellung": "Crossing style", "Kurve": "Curve", "Lampe": "Bulb",
  "Lampe ein/aus": "Bulb on/off", "Laufende Striche": "Moving dashes", "Lichtpunkt": "Moving light",
  "Linie": "Line", "Linienart": "Line style", "Linienbreite": "Line width", "Linienenden": "Line caps",
  "Linienfarbe": "Line color", "Links / oben": "Left / top", "Linktext": "Link text", "Lücke": "Gap",
  "Manuell": "Manual", "Manueller Zickzack-/Mehrpunktpfad": "Manual zigzag / multi-point path",
  "Maximale Verbindungen (0 = unbegrenzt)": "Maximum connections (0 = unlimited)",
  "Maximale Zeilenanzahl": "Maximum row count", "Maximum": "Maximum", "Mehrfachauswahl": "Multiple selection",
  "Mehrfachbelegung erlauben": "Allow multiple connections", "Messanzeige": "Gauge", "Minimum": "Minimum",
  "Multiplikator": "Multiplier", "Nachkommastellen": "Decimal places", "Navigation anzeigen": "Show navigation",
  "Netz": "Grid", "Neues Ereignis am Anfang": "New event at start", "Nicht im Editor zeigen": "Hide in editor",
  "Nur Anzeige": "Display only", "Nur anzeigen": "Show only", "Nur für Gruppen": "Only for groups",
  "Nur lesen": "Read only", "Objekt ID bei false": "Object ID when false", "Objekt ID bei true": "Object ID when true",
  "Oder aktiver Sammelpunkt": "Or active collector point", "Öffnen": "Open", "Optionen": "Options",
  "Pfad und Sammelpunkte": "Path and collector points", "Pfadart": "Path type", "Pfeilspitzen": "Arrowheads",
  "Puls": "Pulse", "Punkteanzahl": "Point count", "Quelle": "Source", "Rahmen": "Frame",
  "Rahmenbreite (px)": "Border width (px)", "Rahmenfarbe": "Border color", "Rahmenstil": "Border style",
  "Rand": "Border", "Randfarbe": "Border color", "Rechts / unten": "Right / bottom",
  "Regler": "Slider", "Reihenlücke (px)": "Row gap (px)", "Relative Zeit anzeigen": "Show relative time",
  "Responsive Einstellungen": "Responsive settings", "Richtung": "Direction", "Schalter": "Switch",
  "Schalter: Zustand wechseln": "Switch: change state", "Schaltfläche": "Button",
  "Schaltfläche (Icon Ein/Aus)": "Button (on/off icon)", "Schaltflächentext": "Button text",
  "Schatten": "Shadow", "Schatten aktivieren": "Enable shadow", "Schriftart-Variante": "Font variant",
  "Schriftfamilie": "Font family", "Schriftgröße": "Font size", "Schriftstärke": "Font weight",
  "Schriftstil": "Font style", "Schrittweite": "Step size", "Scroll X": "Scroll X", "Scroll Y": "Scroll Y",
  "Seite": "Page", "Sichtbar": "Visible", "Sichtbarkeit": "Visibility", "Signalbilder": "Signal images",
  "Spaltenbreite (px)": "Column width (px)", "Spaltenlücke (px)": "Column gap (px)",
  "Spurabstand (px)": "Lane spacing (px)", "Standard": "Default", "Startwidget": "Start widget",
  "Steuert die Sichtbarkeit anhand eines Home-Assistant-Zustands und optionaler Benutzergruppen.": "Controls visibility based on a Home Assistant state and optional user groups.",
  "Strecken": "Stretch", "Strichlänge": "Dash length", "Symbol": "Symbol",
  "Symbol Aus (Bild-URL)": "Off symbol (image URL)", "Symbol Ein (Bild-URL)": "On symbol (image URL)",
  "Symbol neben Text": "Symbol beside text", "Symbol über Text": "Symbol above text",
  "Synchronisierung": "Synchronization", "Tabelle": "Table", "Test-Index / Zustand": "Test index / state",
  "Testtext (HTML)": "Test text (HTML)", "Testwert": "Test value", "Testwert (HTML)": "Test value (HTML)",
  "Testwert / Zeitstempel": "Test value / timestamp", "Testzustand": "Test state",
  "Text für Aus": "Text for off", "Text für Ein": "Text for on", "Text oder Vorlage ({value})": "Text or template ({value})",
  "Text-Schatten": "Text shadow", "Textausrichtung": "Text alignment", "Textfarbe": "Text color",
  "Textwert": "Text value", "Thema": "Theme", "Titel": "Title",
  "Titel-Links-Abstand (px)": "Title left offset (px)", "Titel-Oben-Abstand (px)": "Title top offset (px)",
  "Titelfarbe": "Title color", "Titelhintergrund": "Title background", "Typ": "Type",
  "Überlagerung": "Overlay", "Update bei Aufwachen": "Update on wake", "Update bei Viewwechsel": "Update on view change",
  "Updatezeit (ms)": "Update interval (ms)", "URL bei false": "URL when false", "URL bei true": "URL when true",
  "URL beim Anklicken (optional)": "URL on click (optional)", "URL falls Wert": "URL if value", "URL öffnen": "Open URL",
  "URLs sind nutzbar; Zielentitäten und Schreibwerte werden erst mit der HA-Schreibanbindung aktiv.": "URLs work; target entities and write values become active only with HA write binding.",
  "Variante": "Variant", "Verbindung": "Connection", "Vergleich": "Comparison", "Vertikal": "Vertical",
  "Vertikale Position (px)": "Vertical position (px)", "View zum Navigieren": "View for navigation",
  "Vollbild": "Full screen", "Vorschau-/Testzustand": "Preview / test state", "Vorschau-Index": "Preview index",
  "Vorschauwert": "Preview value", "Wenn der Benutzer nicht in der Gruppe ist": "If the user is not in the group",
  "Wert": "Value", "Wert (Vorschau)": "Value (preview)", "Wert für die Bedingung": "Condition value",
  "Wert für ID bei false": "Value for ID when false", "Wert für ID bei true": "Value for ID when true",
  "Wert umkehren": "Invert value", "Werteanzahl bis": "Number of values up to",
  "Werteliste (ein Eintrag pro Zeile oder mit Semikolon)": "Value list (one per line or separated by semicolons)",
  "Widget-Darstellung": "Widget appearance", "Wortabstand": "Word spacing", "Zahlenformat": "Number format",
  "Zahlenwert": "Number value", "Zeige Scrollbar": "Show scrollbar", "Zeilenhöhe": "Line height",
  "Zentriert": "Centered", "Ziel": "Destination", "Ziel-URL für Navigation": "Destination URL for navigation",
  "Ziel-URL oder HA-Pfad": "Destination URL or HA path", "Zielwidget": "Destination widget",
  "Zustand": "State", "Zustände und Inhalte": "States and content", "Zustands-Element": "State element",
  "Zustandsabhängige Bild-Overlays, zum Beispiel für Warnungen oder Batteriestände. Die Vorschau vergleicht den konfigurierten Wert mit dem Widget-Testzustand.": "State-dependent image overlays, for example for warnings or battery levels. The preview compares the configured value with the widget's test state.",
  "Zustandswert": "State value", "Zweifarbenfluss": "Two-color flow",
  "Zwischenpunkte und Sammelpunkte": "Intermediate and collector points", "SVG-Verbindungslinie": "SVG connection line",
  "Boolesches SVG": "Boolean SVG", "Eingegebener Wert": "Input value", "Bool HTML-Steuerung": "Bool HTML control",
  "Nummer": "Number", "Auto-setzen": "Auto-set", "nur lesend": "read only", "Kein Style": "No style",
  "Min-/Max-Werte anzeigen": "Show min/max values",
  "Der Zustand passt nicht zur schaltbaren Entität": "The value does not match a switchable entity",
  "Der Zustand muss eine Zahl sein": "The value must be a number",
  "Schreibt im Runtime-Modus in input_number oder input_text; ohne Entität bleibt die Eingabe lokal.": "Writes to input_number or input_text in runtime; without an entity the input remains local.",
  "beim Bearbeiten": "while editing", "sichtbar": "visible", "aus": "off", "deaktivieren": "disable", "ausblenden": "hide",
});

Object.assign(ENGLISH, {
  "Eigenschaften-Reiter": "Property tabs", "ANSICHT": "VIEW", "SKRIPTE": "SCRIPTS",
  "Ansicht / Hintergrund": "View / background", "Globales CSS · alle Widgets dieses Projekts": "Global CSS · all widgets in this project",
  "Diese Regeln gelten projektweit. Individuelle CSS-Werte des ausgewählten Widgets findest du unter WIDGET.": "These rules apply to the whole project. Individual CSS values for the selected widget are under WIDGET.",
  "Globales Projekt-CSS": "Global project CSS", "Widget-Skripte werden in einem späteren Ausbauschritt ergänzt.": "Widget scripts will be added in a later development step.",
  "Optionen dieser Gruppe im gespeicherten Projekt übernehmen": "Include this group's options in the saved project",
  "Icon oder Bild auswählen": "Choose icon or image", "Seiten auswählen": "Select pages", "HTML bearbeiten": "Edit HTML",
  "Projekt wird noch geladen …": "Project is still loading …", "Projekteinstellungen gespeichert": "Project settings saved",
  "Name des neuen Ordners": "New folder name", "Ordner konnte nicht erstellt werden": "Could not create folder",
  "Zwischenablage nicht verfügbar": "Clipboard unavailable", "Name des neuen Projekts": "New project name",
  "Keine passenden MDI-Icons gefunden. Andere Iconsets oder Bildpfade kannst du unten direkt eintragen.": "No matching MDI icons found. You can enter other icon sets or image paths below.",
  "MDI-Katalog konnte nicht geladen werden.": "Could not load the MDI catalog.",
  "Andockpunkt aktiv": "Docking point active", "Sammelpunkt aktiv": "Collector point active",
  "Linie auswählen und Eigenschaften anzeigen": "Select line and show properties",
  "Liniennamen bearbeiten": "Edit line name", "Anfangspunkt verschieben": "Move start point",
  "Endpunkt verschieben": "Move endpoint", "Strg halten und ziehen, um die Verbindung zu lösen": "Hold Ctrl and drag to detach the connection",
  "Anfangspunkt mit Strg und Ziehen lösen": "Hold Ctrl and drag to detach the start point",
  "Endpunkt mit Strg und Ziehen lösen": "Hold Ctrl and drag to detach the endpoint",
  "Generell aktivieren": "Enable General", "Sichtbarkeit aktivieren": "Enable Visibility",
  "Generell vollständig aktivieren oder deaktivieren": "Enable or disable all General settings",
  "Sichtbarkeit vollständig aktivieren oder deaktivieren": "Enable or disable all Visibility settings",
  "Verbindung hinzugefügt": "Connection added", "Projekt automatisch gespeichert": "Project autosaved",
  "Projekt lokal gespeichert": "Project saved locally", "Filter bearbeiten": "Edit filter",
  "Letzte Widget-Änderung rückgängig gemacht": "Last widget change undone",
  "Widget-Änderung wiederholt": "Widget change redone",
  "Speichern fehlgeschlagen – bitte erneut speichern": "Save failed – please try again",
  "In Runtime sichtbar": "Visible in runtime", "In Runtime ausgeblendet": "Hidden in runtime",
  "Ausblenden": "Hide", "Einblenden": "Show", "Seitennamen bearbeiten": "Edit page name",
  "Name der Seite": "Page name", "Seite duplizieren": "Duplicate page", "Seite löschen": "Delete page",
  "Verwendete Filterschlüssel": "Filter keys used", "Die ausgewählten Widgets besitzen keinen aktivierten Filterschlüssel.": "The selected widgets have no active filter key.",
  "Widget-Filter aufgehoben": "Widget filter cleared", "Entitäten und Zustände werden von Home Assistant geladen …": "Loading entities and states from Home Assistant …",
  "Zustand": "State", "unbekannt": "unknown", "Ohne Gerät": "Without device",
  "Keine passenden Entitäten gefunden.": "No matching entities found.",
  "WebSocket-Abhängigkeit fehlt. Erstelle das Add-on-Image neu.": "WebSocket dependency is missing. Rebuild the add-on image.",
  "Zum Übernehmen bitte genau eine Bilddatei auswählen": "Select exactly one image file to use",
  "Ausgewählte Bilddatei ins Feld übernehmen": "Use selected image file in field",
  "Upload läuft …": "Uploading …", "⬆ Hochladen": "⬆ Upload",
  "Übergeordneter Ordner": "Parent folder", "Ordner": "Folder",
  "Datei konnte nicht gelöscht werden": "Could not delete file",
  "Dieser Ordner enthält keine unterstützten Dateien.": "This folder contains no supported files.",
  "Keine Dateien dieses Typs in diesem Ordner.": "No files of this type in this folder.",
  "Projekt umbenennen": "Rename project", "Projektname": "Project name",
  "Projekt duplizieren": "Duplicate project", "Name für die Projektkopie": "Name for project copy",
  "Projekt löschen": "Delete project", "(Kopie)": "(copy)",
  "Seite „{name}“ löschen?": "Delete page “{name}”?",
  "Datei „{name}“ dauerhaft löschen?": "Permanently delete file “{name}”?",
  "Projekt „{name}“ löschen?": "Delete project “{name}”?",
  "Übernehmen": "Apply", "Gewünschte Breite": "Desired width", "Gewünschte Höhe": "Desired height",
  "Breite in Pixel": "Width in pixels", "Höhe in Pixel": "Height in pixels",
  "Punkt auf der Linie erstellen": "Create a point on the line",
  "Ein Zwischenpunkt teilt den Pfad in weitere Segmente. Nur ein Sammelpunkt kann von anderen Linien gezielt verwendet werden.": "An intermediate point splits the path into more segments. Only a collector point can be used by other lines.",
  "Punkttyp": "Point type", "Zwischenpunkt": "Intermediate point", "Sammelpunkt": "Collector point",
  "Angedockten Linienpunkt mit Strg + Maustaste ziehen": "Hold Ctrl and drag to move a docked line point",
  "Angedockten Linienpunkt mit Strg + Pfeiltaste lösen": "Hold Ctrl and press an arrow key to detach a docked line point",
  "Ziehen zum Verschieben": "Drag to move", "Verbindungslinie vollständig verschoben": "Connection line moved",
  "Linienname": "Line name", "Ziehen zum Ändern der Größe": "Drag to resize",
  "Seiten auswählen": "Select pages", "HTML-Code": "HTML code",
  "Zwischen- und Sammelpunkte": "Intermediate and collector points",
  "Nur ausdrücklich aktivierte Sammelpunkte können von anderen Linien gewählt werden. Kreuzungen koppeln sich nie automatisch.": "Other lines can choose only explicitly enabled collector points. Crossings never connect automatically.",
  "Unsichtbar": "Invisible", "Punkt": "Point", "Ring": "Ring", "Verteiler": "Distributor",
  "+ Zwischenpunkt": "+ Intermediate point", "+ Hinzufügen": "+ Add",
  "Home-Assistant-Entität auswählen": "Select Home Assistant entity", "Punkte bearbeiten": "Edit points",
  "Element hinzufügen": "Add item", "Eintrag löschen": "Delete item",
  "Anschlüsse": "Ports", "Rolle": "Role", "Eingang": "Input", "Nullstellung": "Neutral", "Ausgang": "Output",
  "Berechneten Wert weitergeben": "Pass calculated value", "SVG LineBox-Teiler (bei Übergabe)": "SVG LineBox divisor (on handoff)",
  "Verbindungspunkt": "Junction", "Kreis anzeigen": "Show circle", "Durchmesser (px)": "Diameter (px)",
  "Ausgabewert": "Output value", "Ausgabewert anzeigen": "Show output value",
  "Über dem Kreis": "Above the circle", "Unter dem Kreis": "Below the circle",
  "Randbreite (px)": "Border width (px)", "Zahlenhelfer-Ausgabe": "Number helper output",
  "Zusätzlich an Zahlenhelfer schreiben": "Also write to a number helper", "Zahlenhelfer": "Number helper",
  "Die interne Übergabe bleibt aktiv. Ein optionaler input_number-Helfer erhält die Summe nur bei einer Wertänderung.": "Internal handoff remains active. An optional input_number helper receives the sum only when its value changes.",
  "Links oben": "Left top", "Links Mitte": "Left center", "Links unten": "Left bottom",
  "Rechts oben": "Right top", "Rechts Mitte": "Right center", "Rechts unten": "Right bottom",
  "Oben 1/4": "Top 1/4", "Oben Mitte": "Top center", "Oben 3/4": "Top 3/4",
  "Unten 1/4": "Bottom 1/4", "Unten Mitte": "Bottom center", "Unten 3/4": "Bottom 3/4",
  "Nur aktive Andockpunkte erhalten eine Rolle. Eingänge werden mit Vorzeichen summiert; Ausgänge geben den Wert nur bei aktiviertem Haken weiter.": "Only enabled docking points have a role. Inputs are summed with their signs; outputs pass the value only when the checkbox is enabled.",
  "Zahlenwert / Teiler ergibt Zyklen pro Sekunde (0,05 bis 20). Ein aktiver SVG LineBox-Ausgang hat Vorrang vor der gewählten Richtungsquelle; Farbe und Linienart bleiben erhalten.": "Numeric value divided by divisor gives cycles per second (0.05 to 20). An active SVG LineBox output takes priority over the selected direction source; color and line style remain unchanged.",
});

const trackedText = new WeakMap();
const trackedAttributes = new WeakMap();
const ATTRIBUTES = ["title", "aria-label", "placeholder", "alt"];
let activeLanguage = "de";
let localizationPending = false;

function homeAssistantLanguage() {
  try {
    if (window.parent !== window) {
      const parentLanguage = window.parent.document.documentElement.lang;
      if (parentLanguage) return parentLanguage;
    }
  } catch { /* Cross-origin embedding: use the browser language. */ }
  return navigator.language || "en";
}

export function getLanguagePreference() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return ["auto", "de", "en"].includes(saved) ? saved : "auto";
}

export function resolveLanguage(preference, homeAssistantLocale) {
  return preference === "auto" ? (/^de(?:-|$)/i.test(homeAssistantLocale) ? "de" : "en") : preference === "de" ? "de" : "en";
}

function resolvedLanguage() { return resolveLanguage(getLanguagePreference(), homeAssistantLanguage()); }

function translate(source) {
  if (activeLanguage !== "en") return source;
  const trimmed = source.trim();
  let translated = ENGLISH[trimmed];
  if (!translated) {
    const group = trimmed.match(/^(.+): Optionen im Projekt speichern$/);
    if (group) translated = `${ENGLISH[group[1]] || group[1]}: Save options in project`;
  }
  if (!translated) {
    const port = trimmed.match(/^(.+): (Rolle|Berechneten Wert weitergeben)$/);
    if (port) translated = `${ENGLISH[port[1]] || port[1]}: ${ENGLISH[port[2]]}`;
  }
  if (!translated) {
    const item = trimmed.match(/^(Wert|HTML Wert|Stil für|Bild|frames|Tab) \[(\d+)\]$/);
    if (item) translated = `${ENGLISH[item[1]] || item[1]} [${item[2]}]`;
  }
  if (!translated) {
    const selection = trimmed.match(/^(\d+) Widgets ausgewählt$/);
    if (selection) translated = `${selection[1]} widgets selected`;
  }
  if (!translated) {
    const heading = trimmed.match(/^(.*) — (.+) · (.+)$/);
    if (heading && ENGLISH[heading[2]]) translated = `${heading[1]} — ${ENGLISH[heading[2]]} · ${heading[3]}`;
  }
  if (!translated) {
    const lineName = trimmed.match(/^Liniennamen von (.+) bearbeiten$/);
    if (lineName) translated = `Edit line name of ${lineName[1]}`;
  }
  if (!translated) {
    const points = trimmed.match(/^(\d+) Punkte bearbeiten$/);
    if (points) translated = `Edit ${points[1]} points`;
  }
  if (!translated) {
    const files = trimmed.match(/^(\d+) Datei\(en\) ausgewählt$/);
    if (files) translated = `${files[1]} file(s) selected`;
  }
  if (!translated) {
    const copied = trimmed.match(/^(\d+) Widget\(s\) (ausgeschnitten|kopiert|eingefügt|importiert)$/);
    if (copied) translated = `${copied[1]} widget(s) ${{ ausgeschnitten: "cut", kopiert: "copied", eingefügt: "pasted", importiert: "imported" }[copied[2]]}`;
  }
  if (!translated) {
    const state = trimmed.match(/^Zustand: (.+)$/);
    if (state) translated = `State: ${state[1]}`;
  }
  if (!translated) {
    const entitiesError = trimmed.match(/^Entitäten konnten nicht geladen werden: (.+)$/);
    if (entitiesError) translated = `Could not load entities: ${ENGLISH[entitiesError[1]] || entitiesError[1]}`;
  }
  if (!translated) {
    const filesError = trimmed.match(/^Der HA-www-Ordner ist nicht verfügbar\. Geprüfte Pfade: (.+)\. Prüfe die schreibgeschützte Konfigurationseinbindung\.$/);
    if (filesError) translated = `The HA www folder is unavailable. Checked paths: ${filesError[1]}. Check the read-only configuration mount.`;
  }
  if (!translated) return source;
  const leading = source.match(/^\s*/)?.[0] || "";
  const trailing = source.match(/\s*$/)?.[0] || "";
  return leading + translated + trailing;
}

export function uiText(source, values = {}) {
  return translate(source).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function excluded(element) {
  if (element.id === "entity-selected-id") return false;
  if (element.classList.contains("empty") && element.closest("#objects-browser, #entities-tree")) return false;
  if (element.closest(".widget-choice-label")) return true;
  return element.closest("#stage, #page-list, #projects-list, #widget-selector-list, #entities-tree, #objects-browser, #icon-picker-results, script, style, textarea, code, pre") !== null;
}

function localizeText(node) {
  if (!node.parentElement || excluded(node.parentElement)) return;
  let record = trackedText.get(node);
  if (!record || node.nodeValue !== record.applied) record = { source: node.nodeValue, applied: node.nodeValue };
  const next = translate(record.source);
  trackedText.set(node, { source: record.source, applied: next });
  if (node.nodeValue !== next) node.nodeValue = next;
}

function localizeAttributes(element) {
  if (excluded(element) && !["stage", "entities-tree"].includes(element.id)) return;
  const records = trackedAttributes.get(element) || new Map();
  for (const attribute of ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    const current = element.getAttribute(attribute);
    let record = records.get(attribute);
    if (!record || current !== record.applied) record = { source: current, applied: current };
    const next = translate(record.source);
    records.set(attribute, { source: record.source, applied: next });
    if (current !== next) element.setAttribute(attribute, next);
  }
  trackedAttributes.set(element, records);
}

function localizeDocument() {
  activeLanguage = resolvedLanguage();
  document.documentElement.lang = activeLanguage;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) localizeText(node);
    else if (node.nodeType === Node.ELEMENT_NODE) localizeAttributes(node);
    node = walker.nextNode();
  }
}

function scheduleLocalization() {
  if (localizationPending) return;
  localizationPending = true;
  queueMicrotask(() => { localizationPending = false; localizeDocument(); });
}

export function setLanguagePreference(preference) {
  if (!["auto", "de", "en"].includes(preference)) return;
  localStorage.setItem(LANGUAGE_KEY, preference);
  scheduleLocalization();
}

export function startLocalization() {
  localizeDocument();
  new MutationObserver((records) => {
    if (records.some(record => {
      const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      return element && !element.closest("#stage");
    })) scheduleLocalization();
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
  window.addEventListener("storage", event => { if (event.key === LANGUAGE_KEY) scheduleLocalization(); });
  try {
    if (window.parent !== window) new MutationObserver(scheduleLocalization).observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  } catch { /* Cross-origin embedding cannot observe Home Assistant's document. */ }
}
