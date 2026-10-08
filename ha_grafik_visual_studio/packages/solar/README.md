# UGSo Solar 0.1.2

Requires HA Grafik Visual Studio **0.1.279 or later**. Import `ugso.solar.wg` in the widget package manager. Update Studio first, then import the newer package; its existing widget contracts remain compatible with installed packages.

Four original, brand-neutral SVG widgets: stack inverter head, one reusable battery module, a smaller standalone inverter with cooling fins, and a solar panel with pole and base. Transparent graphics contain no brand names or embedded raster images.

## Deutsch

- **Solarpanel mit Standfuß:** 320 × 288 px; Ausrichtung wie Vorlage oder horizontal gespiegelt. Leistung über Eingangsentität (W/kW) mit Entitätsauswahl. Ein abschaltbarer Ausgang, wahlweise am Standrohr über dem Fuß oder an der linken/rechten Widgetkante auf derselben Höhe. Bestehende SVG-Linien folgen der Position. Optionale Textanzeige ohne Rahmen; keine Gehäusekoppelpunkte. Proportionen bleiben beim Skalieren erhalten.
- **Stapel-Kopfteil:** 256 × 64 px, Grafik mittig und unten bündig; Gehäusekoppelpunkt unten mittig. Linienpunkte links/rechts; zusätzlich je zwei einzeln abschaltbare Solarpanel-Eingänge an beiden Gehäuseseiten, optisch als Anschlussbuchsen. Kein oberer Linienpunkt. Keine Wertanzeigen oder Wertgruppen; Solo behält seine Einstellungen. Die PV-Eingänge dienen als getrennte Linienziele ohne automatische Summierung.
- **Batteriemodul:** 256 × 169 px, Grafik oben/unten bündig; Gehäusekoppelpunkte oben und unten mittig. Füge für einen Stapel 1–6 unabhängige Instanzen hinzu. Linienpunkte links/rechts.
- Batterie-Linienpunkte links/rechts einzeln wahlweise an Widgetkante Mitte oder Gehäusekante an der unteren Naht. Verbindungen folgen der Position. Für Leistung, Temperatur und SoC jeweils eigene Schriftfarbe, ohne eigene Farbe gilt die allgemeine Schriftfarbe.
- **Wechselrichter Solo:** 144 × 103,3 px; sichtbares Gehäuse etwa ein Drittel schmaler als das Kopfteil. Linienpunkte auf allen vier Seiten.
- Pro Linienpunkt: Aus / Eingang / Ausgang und Leistung / Temperatur / SoC wählen. Ein Eingang ersetzt für diesen Wert die Entität; höchstens ein Eingang pro Wert. Ausgänge liefern auch bei ausgeblendeter Anzeige Daten. Keine Schreibzugriffe auf HA-Entitäten.
- Drei Entitätsauswahlen: Leistung in W (kW wird umgerechnet), Temperatur in °C, Ladezustand in %. Vorschauwerte gelten nur ohne eingetragene Entität. Unbekannte Zustände erscheinen als Strich.
- Batterieanzeigen stehen als Text ohne Rahmen ab der ersten Drittellinie untereinander. Jede Anzeige ist einzeln abschaltbar; Entität und Datenfluss bleiben aktiv.
- Optionales Richtungssymbol: positive Leistung = hinein oder heraus, Symbole frei eingebbar. Bei 0 und unbekannten Werten kein Richtungssymbol.
- Gehäusekoppelpunkte sind unabhängig von Linienpunkten und standardmäßig aktiv mit Abstand 0. Batterie und Solo behalten beim Skalieren ihre Proportionen. Standard-CSS-Gruppen sind vorhanden, optionale zunächst aus.

## English

The solar panel (320 × 288 px) has a pole and base, original or horizontally mirrored orientation, a selectable power entity (W/kW), and one optional output. Choose the pole just above the base or the left/right widget edge at the same height. Existing SVG lines follow position changes. The plain-text reading can be hidden independently; there are no housing snap points. Resizing preserves proportions.

The head is bottom-aligned; each reusable battery touches its top and bottom widget edges. Center housing snap points join 1–6 battery instances without gaps. Each instance has its own three entities. The solo inverter is visually about one-third narrower than the head.

The head has no readings or reading settings. Its top line port is replaced by four separately enabled PV input sockets, two on each enclosure side. Existing left/right ports remain. PV inputs are separate line destinations without automatic summation. The standalone inverter retains its reading settings. Battery line ports can independently move to the lower enclosure seam; power, temperature and SoC each have a separate text color, inheriting the general color until set.

Each line port can be disabled, used as an input, or used as an output, with power, temperature or SoC assigned independently. One input per channel replaces that channel's entity; outputs remain active when its display is hidden. All operations are read-only. Battery values appear as plain text below the first-third seam, packed vertically without blank rows. Direction symbols and positive power interpretation are configurable. All standard CSS groups are available.

## License / artwork

MIT. Original UGSo vector artwork inspired by generic inverter and battery enclosures. No vendor integration, trademark or logo is included; Home Assistant entities are selected independently of manufacturer.
