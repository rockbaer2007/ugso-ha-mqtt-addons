# UGSo Printer 0.1.1

Eigenständiges externes Widgetset von **rockbaer2007** für Grafik Visual Studio **0.1.261 oder neuer**.
Unter **Einstellungen → Widget-Pakete → Lokal** die Datei `ugso.printer.wg` installieren.
Danach erscheint **UGSo Printer → Drucker** in der Palette. Das Studio-Update ist für den Renderer erforderlich.

Vorbild: [HA Printer Card von ADNPolymerase](https://github.com/ADNPolymerase/ha-printer-card), MIT.
Eigene Umsetzung und SVG-Zeichnung; kein Originalcode und keine Originalgrafiken enthalten.
Dies ist ein Studio-Widgetset, keine Lovelace-Karte und kein Teil von Industrial.

## Verwendung

- Statusentität über **…** wählen. Bereit, Drucken, Ruhe, Hinweis, Gestoppt, Offline und unbekannt werden dargestellt. Beim Drucken bewegt sich ein Blatt; reduzierte Bewegung des Browsers wird beachtet.
- **Anzahl der Patronen**: 1–6. Die Grafiken stehen in einer Reihe mit automatisch gleichen Spaltenbreiten; auch beim Vergrößern und Verkleinern.
- Je aktiver Patrone: Füllstandsentität in Prozent, frei wählbare Beschriftung und Farbe. Die ersten N Patronen sind aktiv. Nicht verwendete spätere Bindungen bleiben gespeichert, werden aber nicht abgefragt.
- Warnschwelle 0–100 %, Standard 20 %. Bei gleichem oder niedrigerem Füllstand werden Patrone und Wert markiert.
- Unbekannte/nicht verfügbare Füllstände erscheinen als **—**, nicht als 0 %. Numerische Anzeigen werden auf 0–100 % begrenzt.
- Ab Studio 0.1.273: **Patronen → Stil → Patronen / Balken**. Patronen zeigt die Grafiken nebeneinander; Balken zeigt pro Zeile Name, farbigen Füllstand und Prozentwert. Die frühere Toner-Auswahl wird als Balken übernommen. Entitäten, Farben und Warnschwelle gelten für beide Stile. Druckermodell Multifunktion (`mfp`), Tintenstrahl (`inkjet`) oder Bürodrucker (`office`), Hintergrund-, Text- und Druckstatusfarbe bleiben separat einstellbar.
- Optionale Entitäten für Statusmeldung, Leistung und Seitenzähler. Ohne separate Meldungsentität werden `state_message` bzw. `state_reason` der Statusentität verwendet. Meldung ausblendbar.

Standardgröße **480 × 440 px**, Mindestgröße **240 × 280 px**. Text wird bei knappem Platz gekürzt; vollständige Namen und Werte stehen im Tooltip. Editor und Runtime verwenden dieselben aktuellen Home-Assistant-Werte. Keine erfundenen Vorschauwerte.

Das Widget liest ausdrücklich ausgewählte Entitäten. Es bietet keine automatische Geräte-/Patronensuche, Verschleißteile, Steckdosensteuerung oder Testdruck. Drucker-Weblinks sind über „URL der Weboberfläche“ verfügbar. Die Originalkarte ist separat nutzbar und bietet weitere Funktionen.

## English

Independent external **UGSo Printer** set for Studio **0.1.261+**, inspired by
[ADNPolymerase/ha-printer-card](https://github.com/ADNPolymerase/ha-printer-card) (MIT).
One printer widget, original SVG artwork, animated printing status and 1–6 ink/toner
cartridges evenly distributed across the available width. Explicit entity pickers,
per-cartridge names/colors, low-level warnings and optional message/power/page sensors.
Read-only. No upstream source or artwork is bundled; this is not the Lovelace card.
