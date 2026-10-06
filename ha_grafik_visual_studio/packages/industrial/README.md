# UGSo Industrie 0.1.0

## Deutsch

**Ergänzung ab Studio 0.1.224:** Unter **CSS Allgemein → Eckenradius (px)** wird auch der Gehäuserahmen gerundet. Unter **Gehäuse-Snappunkte** lassen sich die vier Ecken einzeln aktivieren, zusammen mit einem gemeinsamen Abstand für alle Seiten (Standard 1 px). Beide benachbarten Abstände addieren sich; 1 + 1 px ergibt 2 px Fuge. Einzelne Widgets rasten beim Verschieben ein. Unter **Einstellungen → Allgemein → Editor und Andockpunkte** gibt es eine eigene Gehäuse-Snappunktfarbe. Das Paket 0.1.0 muss dafür nicht neu installiert werden. Automatische Signalanschlussverlegung bleibt geplant; die folgende Beschreibung der noch fehlenden Gehäuse-Andockfunktion bezieht sich auf Studio 0.1.223.

Externes, deklaratives Widget-Set für **Grafik Visual Studio ab 0.1.223**. Installation: `ugso.industrial.wg` unter Einstellungen → Widget-Pakete → Lokal auswählen. Das Paket enthält keinen ausführbaren Code und wird nicht automatisch installiert.

Das erste Widget **Gauge/Poti – 270°** beginnt bei 64 × 64 px. Ohne Eingang dient es in der Runtime als Drehpoti (Maus, Touch und Pfeiltasten; Home/End für die Endwerte). Mit einer Eingangs-Entität oder aktiviertem Datenfluss-Eingang dient es als Gauge. Fehlende Eingangswerte zeigen einen Fehlzustand und schalten nicht zum Poti um. Die Datenfluss-Bindung hat Vorrang vor der Entität.

Skalenminimum und Maximum dürfen negativ sein. Strichskala und Farbring sind auswählbar. Skalenteilung und Bedien-Schrittweite sind unabhängig. Null wird hervorgehoben; die Skala hat keine Zahlen. Start-/Vorschauwert gilt ausschließlich ohne Eingangsbindung. Farbbereiche erhalten aufsteigende Bis-Werte und Farben; der letzte endet immer am Maximum. Ungültige Bereiche werden als Fehler dargestellt. Höchstens 500 Skalenintervalle.

Ausgabe an `number.*` oder `input_number.*` erfolgt über den vorhandenen Studio-Schreibdienst. Andere Entitätsdomänen werden nicht beschrieben. Die Entität muss verbunden und schreibbar sein; ihre eigenen Grenzen gelten zusätzlich. Gauge-Eingangswerte werden bei Änderung weitergegeben. Poti-Ausgabe erfolgt wahlweise beim Loslassen (`release`) oder während des Ziehens (`continuous`). Eingangs- und Ausgangsentität dürfen nicht identisch sein.

Für Lines im gemeinsamen Bereich **Datenfluss** den Ein- beziehungsweise Ausgangspunkt aktivieren; den Eingang auch unter Dockpunkte aktivieren. Sichtbare und über die Liniengestaltung unsichtbare Wert-Lines verwenden denselben Datenfluss. Ein fehlender Eingang wird nicht durch den Startwert ersetzt. Im Editor sind Schreibaktionen und Poti-Bedienung gesperrt.

Industriestyle ergänzt Schrauben in den vier Ecken und einen CSS-Rand von 2 px. Das Widget bleibt quadratisch und mindestens 64 × 64 px groß, auch beim Ändern der Größe. Die neuen Gehäuse-Andockpunkte, automatische Anschlussverlegung und der additive Andockabstand sind weitere Roadmap-Schritte und noch nicht Bestandteil dieser Version.

Build: `python packages/industrial/build.py` im Studio-Ordner.

## English

**Added in Studio 0.1.224:** **General CSS → Corner radius (px)** also rounds the housing. **Housing snap points** enables each corner independently and provides one spacing value for all sides (default 1 px). Neighboring spacing values add up; 1 + 1 px produces a 2 px gap. Single widgets snap when dragged. **Settings → General → Editor and dock points** includes a separate housing snap point color. Package 0.1.0 does not need reinstalling. Automatic signal port relocation remains planned; the note below about future housing docking describes Studio 0.1.223.

External, declarative widget set for **Grafik Visual Studio 0.1.223 or newer**. Install `ugso.industrial.wg` through Settings → Widget packages → Local. The package contains no executable code and is not installed automatically.

**Gauge/Poti – 270°** starts at 64 × 64 px. Without an input, runtime supports a rotary control with mouse, touch and arrow keys (Home/End select endpoints). With an entity or an enabled dataflow input it becomes a read-only gauge. An unavailable input remains unavailable; it never enables the rotary control. Dataflow takes precedence over the entity.

Negative bounds are supported. Choose ticks or a color ring; tick division and control step are independent. Zero is emphasized, with no numeric tick labels. The start/preview value applies only without an input binding. Color bands have ascending upper limits; the final band always ends at the maximum. Invalid bands show an error. Up to 500 tick intervals.

Outputs use Studio's existing write service for `number.*` and `input_number.*`. Other entity domains are not written. The output must be connected and writable; its own limits also apply. Changed gauge inputs are forwarded. Rotary outputs can be committed on release or continuously while dragging. Input and output entities must differ.

Enable signal ports in the shared Dataflow section and enable the input dock point. Visible lines and lines made invisible through their line styling use the same dataflow. Missing inputs never fall back to preview values. The editor does not permit control interaction or writes.

Industrial styling adds four corner screws and a 2 px CSS border. The widget remains square and at least 64 × 64 px, including when resized. New housing docking, automatic port relocation and additive docking spacing are future roadmap steps.

Build: `python packages/industrial/build.py` from the Studio folder.
