const LANGUAGE_KEY = "ha_grafik_visual_studio_language";

// German is the source language of the editor. Keep saved widget data and user text untouched.
const ENGLISH = {
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
  "Installierte Tool-Pakete": "Installed tool packages", "Keine zusätzlichen Widget-Pakete installiert.": "No additional widget packages installed.",
  "Keine zusätzlichen Tool-Pakete installiert.": "No additional tool packages installed.",
  "Zusätzliche Widget-Pakete werden hier angezeigt. Integrierte Widgets sind Teil der App.": "Additional widget packages appear here. Built-in widgets are part of the app.",
  "Zusätzliche Widget-Pakete mit Schnittstelle 0.1. Integrierte Widgets bleiben Teil der App.": "Additional widget packages using API 0.1. Built-in widgets remain part of the app.",
  "Lokales .wg.zip installieren": "Install local .wg.zip", "Paketliste neu laden": "Reload package list",
  "Paket entfernen": "Remove package", "Widget-Paket wirklich entfernen?": "Really remove this widget package?",
  "Widget-Paket wird geprüft …": "Checking widget package …",
  "Widget-Paket muss auf .wg.zip enden.": "Widget package must end in .wg.zip.",
  "Widget-Paket konnte nicht installiert werden.": "Widget package could not be installed.",
  "Paket konnte nicht entfernt werden.": "Package could not be removed.",
  "Tool-Schnittstelle 0.1: Aktionen werden erst nach Vorschau und Bestätigung ausgeführt.": "Tool API 0.1: actions run only after preview and confirmation.",
  "Lokales .tp.zip installieren": "Install local .tp.zip", "Tool-Paket muss auf .tp.zip enden.": "Tool package must end in .tp.zip.",
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
  "Anfang → Ende": "Start → End", "Anfangsfilter": "Initial filter", "Animation": "Animation",
  "Animation aktivieren": "Enable animation", "Animationsart": "Animation type", "Animationsfarbe": "Animation color",
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
