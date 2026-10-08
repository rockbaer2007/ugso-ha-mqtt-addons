# UGSo Calendar +

Studio **0.1.269** ergänzt getrennte Kachel-Schriftgrößen oben/unten (0 = automatisch). Der farbige Kopf passt sich an und bleibt maximal ein Drittel der Kachelhöhe hoch. Zu große Wunschwerte werden passend dargestellt, ohne die Kachelgröße zu ändern; gilt auch im Popup. / Studio 0.1.269 adds separate top/bottom tile font sizes (zero = automatic), with a colored header capped at one third of tile height and fonts constrained to available space.

Ab Studio **0.1.268** heißt „Farben“ **Kacheleinstellungen**. Vierte Größe: **Sehr klein 36 × 44 px** (weiterhin mindestens 12/24 px Text). Unter Konfiguration ist **Automatisch aktualisieren (60 s)** abschaltbar. Beim Runtime-Seitenaufruf werden die Termine frisch geladen; manuelles Aktualisieren bleibt möglich. Andere Live-Widgets bauen den Kalender nicht neu auf. Vorhandenes Paket 0.1.1 weiterverwenden; kein Paket-Update erforderlich.

Studio **0.1.268** adds **Tile settings**, an extra-small **36 × 44 px** size and an optional automatic refresh. Runtime page entry loads fresh events; manual refresh remains available. Unrelated live updates retain the calendar widget. Existing package 0.1.1 remains compatible.

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
