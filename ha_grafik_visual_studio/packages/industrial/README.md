# UGSo Industrie 0.3.0

Deutsch: Ab Studio 0.1.236 berücksichtigt nur der Kippschalter den Zwischenabstand im Mehrfachblock: Breite = Höhe × Schalteranzahl + 2 × Abstand rundherum × (Schalteranzahl − 1). Bei 64 px Höhe und 1 px Abstand ergeben sich 64/130/196/262 px. Schaltermitten und Anschlüsse fluchten mit einzeln angedockten Widgets. Wippschalter bleiben vorerst unverändert. Das Host-Update genügt; Paket 0.3.0 bleibt unverändert.

English: Since Studio 0.1.236, only toggle banks include spacing: width = height × channel count + 2 × all-side spacing × (channel count − 1). At 64 px height and 1 px spacing, widths are 64/130/196/262 px. Channel centers and ports align with individually docked widgets. Rocker sizing remains unchanged for now. Only a host update is required; package 0.3.0 is unchanged.

## Wippschalter / Rocker switches

Deutsch: Paket 0.3.0 und Studio ab 0.1.235 ergänzen Wippschalter mit eigener Farbauswahl je Schalter: Weiß/Grau, Rot, Schwarz und Grün. Alle Eigenschaften des Kippschalters gelten unverändert, einschließlich 1–4 Kanälen, LED, Text und Schildbeschriftung, Entitäten, E1–E4/A1–A4 und sechs Gehäuse-Snappunkten. Die Darstellung nutzt die von rockbaer2007 bereitgestellten transparenten Einzelgrafiken. Das aufgedruckte O/I ist Bestandteil der Grafik; zusätzliche Schildbeschriftungen bleiben einstellbar. Das bestehende Gauge/Poti und der Kippschalter bleiben beim Paket-Update erhalten.

English: Package 0.3.0 with Studio 0.1.235 or newer adds rocker switches with an independent color choice per channel: white/gray, red, black and green. All toggle settings apply, including 1–4 channels, LED, captions and legends, entities, E1–E4/A1–A4 and six housing snap points. Artwork uses the transparent individual PNGs supplied by rockbaer2007. Printed O/I symbols are part of the artwork; additional legends remain configurable. Updating preserves existing Gauge/Poti and toggle definitions.

## Kippschalter / Toggle switches (Studio 0.1.232+)

Ab Studio 0.1.234: E1–E4 oberhalb und A1–A4 unterhalb jedes Schalters. Sechs separate Gehäuse-Snappunkte (vier Ecken und links/rechts mittig) ergeben mit den Signalpunkten 8/10/12/14 mögliche Punkte für 1–4 Schalter. Einzeln aktivierbar, zentrale Farben; vorhandene Verbindungen bleiben erhalten. Host-Update genügt, Paket 0.2.0 bleibt unverändert.

Since Studio 0.1.234: E1–E4 above and A1–A4 below each switch. Six separate housing snap points (four corners and left/right centers) provide 8/10/12/14 available points including signal ports for 1–4 switches. Individually enabled, central colors; existing connections are preserved. A host update is sufficient; package 0.2.0 remains unchanged.

Deutsch: Paket 0.2.0 ergänzt ein bis vier unabhängige Kippschalter, Verhältnis 1:1 bis 4:1, mindestens 64 px pro Schalter. Je Kanal kleine LED mit eigenen Ein-/Aus-Farben, Textbeschriftung und festes Schild ON/OFF, 1/0 oder EIN/AUS. Ab Studio 0.1.233 verwendet der Metallhebel die von rockbaer2007 bereitgestellte transparente PNG mit vollständigem Hebel in beiden Stellungen. Die LED bleibt eine CSS-Zeichnung. Ein Studio-Update genügt; Paket 0.2.0 muss nicht erneut installiert werden. Gehäuse, Schrauben, Rahmen, Schrift und Gehäuse-Snappunkte bleiben einstellbar.

Je Kanal separate Eingangs-/Ausgangsentitäten oder Koppelpunkte. Eingang oben, Ausgang unten in der jeweiligen Spalte, einzeln aktivierbar. Eingangskoppelpunkt hat Vorrang. Die LED zeigt den Eingangszustand; ohne Eingang dient die Ausgangsentität als Rückmeldung. Ohne Bindung wird lokal geschaltet. Ausgänge unterstützen switch, light und input_boolean. Ohne getrennten Ausgang wird eine geeignete Eingangsentity geschaltet. Ausgangs-Lines liefern den letzten Bedienbefehl, vor der ersten Bedienung den aktuellen Zustand. Fehlende Rückmeldung sperrt die Bedienung; der Editor sendet keine Befehle. Zum Hinzufügen das optionale Paket auf 0.2.0 aktualisieren. Die bestehende Gauge/Poti-Definition bleibt erhalten.

English: Package 0.2.0 adds one to four independent toggle switches, 1:1 to 4:1 ratio, at least 64 px per channel. Each channel has a small LED with custom on/off colors, a caption and fixed ON/OFF, 1/0 or EIN/AUS legends. Since Studio 0.1.233, the metallic lever uses the transparent PNG supplied by rockbaer2007, showing the complete lever in both positions. The LED remains CSS artwork. Updating Studio is sufficient; package 0.2.0 does not need reinstalling. Shared housing, screws, frame, font and housing snap settings apply.

Assign input/output entities or individual signal ports per channel. Input above, output below its column; enable each independently. Signal input takes precedence. LED shows input feedback, or output entity feedback when no input is configured. Unbound switches work locally. Outputs support switch, light and input_boolean; without a separate output a compatible input entity is controlled. Output lines carry the last command, or the current state before the first command. Missing feedback disables control; the editor never sends commands. Update the optional package to 0.2.0 to add this widget; existing Gauge/Poti definitions are retained.

## Deutsch

**Ab Studio 0.1.226:** Unter **Größe** gibt es die standardmäßig aktivierte Checkbox **Verhältnis 1:1**. Breite und Höhe bleiben beim Ziehen und bei der Eingabe gleich; beide Zahlenfelder werden aktualisiert. Ohne Haken sind die Maße unabhängig. Jedes Maß bleibt mindestens 64 px. Beim erneuten Aktivieren wird das größere Maß für beide Seiten übernommen. Bestehende Widgets bleiben ohne neue Konfiguration quadratisch; Paket 0.1.0 bleibt verwendbar.

**Ergänzung ab Studio 0.1.224:** Unter **CSS Allgemein → Eckenradius (px)** wird auch der Gehäuserahmen gerundet. Unter **Gehäuse-Snappunkte** lassen sich die vier Ecken einzeln aktivieren, zusammen mit einem gemeinsamen Abstand für alle Seiten (Standard 1 px). Beide benachbarten Abstände addieren sich; 1 + 1 px ergibt 2 px Fuge. Einzelne Widgets rasten beim Verschieben ein. Unter **Einstellungen → Allgemein → Editor und Andockpunkte** gibt es eine eigene Gehäuse-Snappunktfarbe. Das Paket 0.1.0 muss dafür nicht neu installiert werden. Automatische Signalanschlussverlegung bleibt geplant; die folgende Beschreibung der noch fehlenden Gehäuse-Andockfunktion bezieht sich auf Studio 0.1.223.

Externes, deklaratives Widget-Set für **Grafik Visual Studio ab 0.1.223**. Installation: `ugso.industrial.wg` unter Einstellungen → Widget-Pakete → Lokal auswählen. Das Paket enthält keinen ausführbaren Code und wird nicht automatisch installiert.

Das erste Widget **Gauge/Poti – 270°** beginnt bei 64 × 64 px. Ohne Eingang dient es in der Runtime als Drehpoti (Maus, Touch und Pfeiltasten; Home/End für die Endwerte). Mit einer Eingangs-Entität oder aktiviertem Datenfluss-Eingang dient es als Gauge. Fehlende Eingangswerte zeigen einen Fehlzustand und schalten nicht zum Poti um. Die Datenfluss-Bindung hat Vorrang vor der Entität.

Skalenminimum und Maximum dürfen negativ sein. Strichskala und Farbring sind auswählbar. Skalenteilung und Bedien-Schrittweite sind unabhängig. Null wird hervorgehoben; die Skala hat keine Zahlen. Start-/Vorschauwert gilt ausschließlich ohne Eingangsbindung. Farbbereiche erhalten aufsteigende Bis-Werte und Farben; der letzte endet immer am Maximum. Ungültige Bereiche werden als Fehler dargestellt. Höchstens 500 Skalenintervalle.

Ausgabe an `number.*` oder `input_number.*` erfolgt über den vorhandenen Studio-Schreibdienst. Andere Entitätsdomänen werden nicht beschrieben. Die Entität muss verbunden und schreibbar sein; ihre eigenen Grenzen gelten zusätzlich. Gauge-Eingangswerte werden bei Änderung weitergegeben. Poti-Ausgabe erfolgt wahlweise beim Loslassen (`release`) oder während des Ziehens (`continuous`). Eingangs- und Ausgangsentität dürfen nicht identisch sein.

Für Lines im gemeinsamen Bereich **Datenfluss** den Ein- beziehungsweise Ausgangspunkt aktivieren; den Eingang auch unter Dockpunkte aktivieren. Sichtbare und über die Liniengestaltung unsichtbare Wert-Lines verwenden denselben Datenfluss. Ein fehlender Eingang wird nicht durch den Startwert ersetzt. Im Editor sind Schreibaktionen und Poti-Bedienung gesperrt.

Industriestyle ergänzt Schrauben in den vier Ecken und einen CSS-Rand von 2 px. Das Widget bleibt quadratisch und mindestens 64 × 64 px groß, auch beim Ändern der Größe. Die neuen Gehäuse-Andockpunkte, automatische Anschlussverlegung und der additive Andockabstand sind weitere Roadmap-Schritte und noch nicht Bestandteil dieser Version.

Build: `python packages/industrial/build.py` im Studio-Ordner.

## English

**Studio 0.1.226:** **Size** includes a checked-by-default **1:1 aspect ratio** checkbox. Width and height stay equal during dragging and typed changes, and both property fields update. Uncheck it for independent dimensions. Each dimension remains at least 64 px. Re-enabling the lock uses the larger dimension for both sides. Existing widgets keep their square layout without configuration changes; package 0.1.0 remains usable.

**Added in Studio 0.1.224:** **General CSS → Corner radius (px)** also rounds the housing. **Housing snap points** enables each corner independently and provides one spacing value for all sides (default 1 px). Neighboring spacing values add up; 1 + 1 px produces a 2 px gap. Single widgets snap when dragged. **Settings → General → Editor and dock points** includes a separate housing snap point color. Package 0.1.0 does not need reinstalling. Automatic signal port relocation remains planned; the note below about future housing docking describes Studio 0.1.223.

External, declarative widget set for **Grafik Visual Studio 0.1.223 or newer**. Install `ugso.industrial.wg` through Settings → Widget packages → Local. The package contains no executable code and is not installed automatically.

**Gauge/Poti – 270°** starts at 64 × 64 px. Without an input, runtime supports a rotary control with mouse, touch and arrow keys (Home/End select endpoints). With an entity or an enabled dataflow input it becomes a read-only gauge. An unavailable input remains unavailable; it never enables the rotary control. Dataflow takes precedence over the entity.

Negative bounds are supported. Choose ticks or a color ring; tick division and control step are independent. Zero is emphasized, with no numeric tick labels. The start/preview value applies only without an input binding. Color bands have ascending upper limits; the final band always ends at the maximum. Invalid bands show an error. Up to 500 tick intervals.

Outputs use Studio's existing write service for `number.*` and `input_number.*`. Other entity domains are not written. The output must be connected and writable; its own limits also apply. Changed gauge inputs are forwarded. Rotary outputs can be committed on release or continuously while dragging. Input and output entities must differ.

Enable signal ports in the shared Dataflow section and enable the input dock point. Visible lines and lines made invisible through their line styling use the same dataflow. Missing inputs never fall back to preview values. The editor does not permit control interaction or writes.

Industrial styling adds four corner screws and a 2 px CSS border. The widget remains square and at least 64 × 64 px, including when resized. New housing docking, automatic port relocation and additive docking spacing are future roadmap steps.

Build: `python packages/industrial/build.py` from the Studio folder.
