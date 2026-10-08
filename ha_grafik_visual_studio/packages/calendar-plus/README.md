# UGSo Calendar +

Eigenständiges externes Widgetset **0.1.1**, benötigt **HA Grafik Visual Studio 0.1.267+**.

Kalender-Sichtbarkeit als Checkbox rechts oben. Kalenderkacheln: Klein **44 × 52 px**, Mittel **58 × 64 px** (Standard), Groß **76 × 82 px**. Kopftext mindestens **12 px**, Tagesziffer mindestens **24 px**, unabhängig von der allgemeinen Schriftgröße. Die Auswahl gilt für Liste und Popup. Vorhandene Pakete 0.1.0 erhalten die Einstellung ebenfalls mit Studio 0.1.267.

`ugso.calendar-plus.wg` über Einstellungen → Widget-Pakete → Lokal installieren. Danach „Kalender +“ aus der Palette auf die Seite ziehen.

- Erkennt alle verfügbaren `calendar.*`-Entitäten aus Home Assistant automatisch, auch Kalender ohne Registry-Eintrag. Alle sind zunächst aktiviert; neue Kalender werden ebenfalls aktiviert.
- Unter „Meine Kalender“ jeden Kalender einzeln ein-/ausblenden und Farbe/Hintergrundfarbe einstellen. Die Auswahl bleibt je Entitäts-ID gespeichert.
- Vorschau 1–90 Tage; kompakte Ansicht oder bis zu 20 sichtbare Termine, Detail-Popup bis 100 Termine.
- Tages-/Kalendergruppen, leere Tage, Kalendername, Datum, Ort, Dauer, Uhrzeit, Wochentag, Trenner und relative Zeit einstellbar.
- Ganztagstermine mit exklusivem Enddatum; automatische DE/EN-Sprache des Studios; Browser-Theme oder festes Hell/Dunkel.
- Aktualisierung nach 60 Sekunden sowie manuell in der Runtime. Fehler werden angezeigt, ohne sie als leeren Kalender auszugeben.

Termine werden ausschließlich gelesen. „Neuer Termin“, Bearbeiten und Löschen sind in dieser ersten Version nicht enthalten. Home Assistant muss die Kalender bereitstellen; keine direkte ICS-/Google-Anmeldung und keine zusätzliche HACS-Karte erforderlich. Die sichtbare Terminzahl ist begrenzt, die automatisch erkannte Kalenderanzahl nicht.

## Original und Lizenz / Original and license

Inspiriert von **[xBourner/calendar-card-plus](https://github.com/xBourner/calendar-card-plus)**, MIT, Copyright (c) 2026 xBourner. Eigenständige Studio-Implementierung; kein Originalquellcode und keine Originalgrafiken übernommen. Dieses Paket enthält nur deklarative Daten; sein Renderer wird von Studio bereitgestellt. Eigene Implementierung: MIT, Copyright (c) 2026 rockbaer2007.

Independent external widget set inspired by the original above. Requires Studio 0.1.267+. Install the `.wg` under Settings → Widget packages → Local. Automatically discovers **all** Home Assistant calendars, enabled by default, with per-calendar show/hide checkboxes and colors/backgrounds. Three date-tile sizes: 44 × 52, 58 × 64 (default), 76 × 82 px. No data-flow settings. Upcoming event list and details popup, all-day events, grouping, configurable text, automatic DE/EN language and light/dark theme. Read-only: event creation/editing/deletion is not included. No original source code or images were copied.
