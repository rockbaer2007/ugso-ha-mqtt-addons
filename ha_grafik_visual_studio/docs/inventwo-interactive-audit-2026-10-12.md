# Interaktiv: Vergleich mit Inventwo VIS-2

**Nachtrag 0.1.295:** Die unten aufgeführten Hauptlücken wurden um Dialog-/eingebettete Ansichten, feste/Halte-Taster, Wertänderung, HTTP, Farbwähler, Analoguhr und radiale Farbverläufe ergänzt. [Aktuelle Funktionen und verbleibende Detailunterschiede (DE/EN/FR)](universal-0.1.295.md). Die folgende Tabelle beschreibt den ursprünglichen Prüfstand 0.1.294.

Stand: 12.10.2026, Studio 0.1.294. Referenz: [Inventwo VIS-2 1.10.0, Commit 46f040e](https://github.com/inventwo/ioBroker.vis-2-widgets-inventwo/tree/46f040e761012a9a6d61151e8e03df7fde02ce7b), insbesondere `src-widgets/src/InventwoWidget*.tsx` und `docs/en/widgets/`. Verglichen wurden Registrierung, Eigenschaften, Ereignisse und Renderer aller elf Widgettypen. Dies ist ein Quellcodevergleich; ein vollständiger Pixelvergleich mit einer laufenden ioBroker-Installation steht noch aus.

## Ergebnis nach Widget

| Inventwo / Studio-Typ | Vorhanden im Studio | Abweichungen und Grenzen |
| --- | --- | --- |
| Universal / `universal-button` | Zustände, Bedingungen auf eigene/andere Entität, Standardzustand, getrennte Buttons, Icon/Bild/Text/HTML, Farben, Formen, Schatten, Rückmeldung | Größte Funktionslücke: Inventwo bietet zusätzlich Ansicht im Dialog, Erhöhen/Verringern und HTTP-Aktionen sowie eingebettete Ansicht, Farbwähler und Analoguhr als Inhalt. Studio-Taster schaltet zum nächsten Zustand; Inventwo-Taster schreibt einen festen Wert und unterstützt Haltewerte. Studio-Navigation öffnet eine URL, keine VIS-Ansicht mit PIN. |
| Calendar / `calendar` | Datumsauswahl, Heute, Monats-/Jahresnavigation, vergangene/künftige Tage sperren, Wochenbeginn/-nummern, sechs Stilgruppen | Eigener Kalender statt MUI-Datepicker, daher keine identische Optik. HA-Zeitstempel/ISO-Datum ersetzen ioBroker-Datenpunkte. Schreiben über passende HA-Helfer. |
| EventCalendar / `event-calendar` | FullCalendar, Monat/Woche/Tag/Jahr und vier Listenansichten, Quellen, Legende, Titelfarbregeln, Wochen-/Heuteanzeige, Stilgruppen | Native HA-Kalender oder JSON statt ioBroker-/ical-Datenpunktbindung. Keine direkte ICS-Übernahme; dafür HA-Kalenderintegration nutzen. Bibliotheksintegration und einzelne Bedienelemente unterscheiden sich. |
| Checkbox / `styled-checkbox` | Ein-/Aus-Werte und Texte, vier Textpositionen, Farben, Größe, Stilübernahme | Natives HTML statt MUI; HA-Zustandsnormalisierung und zugelassene Schreibaktionen unterscheiden sich von ioBroker. |
| Slider / `styled-slider` | Min/Max/Schritt, horizontal/vertikal, Wertanzeige, Marken, Spur/Daumen, Schatten, Stilübernahme | Natives Range-Feld mit eigener Darstellung statt MUI. Schreiben auf `input_number`; andere Entitäten lassen sich lesen. Keine bestätigte pixelgenaue Gleichheit. |
| Table / `interactive-table` | JSON-Zeilen, Spalten, Formate, Formeln, Mehrfachsortierung, Filter, Farbregeln, fixierter Kopf, Seiten, Summenzeilenmarkierung | Eigene HTML-Tabelle/Dialoge statt MUI. Formeln verwenden einen begrenzten eigenen Parser. Summenzeile markiert vorhandene Werte, berechnet keine automatischen Summen. HA-Attributquelle zusätzlich möglich. |
| Marquee / `marquee` | Richtung, Geschwindigkeit, Wiederholungen, Abstand, Hover-Pause, Hintergrund | Eigene Animation; Kopien werden zum Füllen des sichtbaren Bereichs ergänzt. Zusätzlich reduzierte Bewegung berücksichtigen. Manuelles Textfeld bleibt bei Entitätsbindung sichtbar, obwohl Entitätswert Vorrang hat. |
| ValueList / `interactive-value-list` | Trennzeichen einschließlich Zeilen/Tabulatoren, Kürzen, leere Einträge ignorieren, Aufzählungszeichen, Farben, Abstände | Eigener HTML-Renderer und HA-Quellen; keine vollständige Pixelgleichheit bestätigt. |
| Switch / `styled-switch` | Ein-/Aus-Werte und Texte, Spur-/Daumenfarben, Größen, Rundungen, Schatten, Stilübernahme | Eigenes HTML/CSS statt MUI; HA-Schreibaktionen und Zustandsnormalisierung statt allgemeinem Datenpunktschreiben. |
| RadialSlider / `radial-slider` | Min/Max/Schritt, Winkel, Spur/Daumen, Wert/Einheit, Farben, Stilübernahme | Konkrete Lücke: Inventwo interpretiert `linear-gradient(...)` für SVG-Verläufe; Studio verwendet einfache Stroke-Farben. Schreiben auf `input_number`. |
| Dropdown / `dropdown` | HA-Optionen oder eigene Wert/Text-Paare, Wert-/Textanzeige, Nur-Lesen, Hintergrundregeln, Stilgruppen | Eigenes Listbox-Menü statt MUI. HA-Optionslisten ersetzen `common.states`; Beschriftung/Wert sind dort oft identisch. HA-Auswahl/Helfer statt beliebiger ioBroker-Datenpunkte. |

Alle elf Typen haben ein Gegenstück. Daraus folgt keine vollständige 1:1-Umsetzung: Besonders Universal und RadialSlider brauchen weitere Funktionsarbeit. HA-spezifische Entitätsbindung bleibt notwendig. Separate Studio-Uhr-/Farbwähler-Widgets ersetzen keine entsprechenden Universal-Inhaltstypen.

## Änderung in 0.1.294

Die elf Vorschauen verwenden eigene, skalierbare SVG-Zeichnungen statt winziger Zeichen in 6-Pixel-Schrift. Sie belegen die volle Innenfläche des bestehenden Rahmens in Seitenleiste und Widget-Auswahl, im hellen und dunklen Theme. Sie führen keine Aktionen aus. Widget-Einstellungen, technische IDs, Standardwerte und Runtime bleiben unverändert. Keine Inventwo-Grafiken oder Quelldateien wurden übernommen.

## English

All eleven Inventwo widget types have Studio counterparts, but parity is incomplete. The largest gaps are Universal actions/content (dialog views, increase/decrease, HTTP, embedded views, color picker, analog clock and hold-value behavior) and RadialSlider gradients. HA entity bindings and native controls differ from ioBroker/MUI. Version 0.1.294 only enlarges inert sidebar/selector previews; it preserves existing widget behavior and settings. Source review is complete; a full pixel comparison against a running ioBroker installation remains outstanding.

## Français

Les onze types Inventwo ont un équivalent Studio, mais la correspondance reste incomplète. Les principaux écarts concernent Universal (actions/contenus supplémentaires, valeurs de maintien) et les dégradés RadialSlider. Les entités HA et les contrôles natifs diffèrent d’ioBroker/MUI. La version 0.1.294 agrandit uniquement les aperçus inertes et conserve les réglages/comportements. La revue du code est réalisée ; une comparaison visuelle exhaustive avec ioBroker en fonctionnement reste à faire.
