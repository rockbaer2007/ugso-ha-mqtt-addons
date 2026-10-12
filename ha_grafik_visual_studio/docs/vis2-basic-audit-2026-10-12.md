# Basic-Widgets: Vergleich mit ioBroker VIS-2

Stand: 12. Oktober 2026. Geprüftes Studio: 0.1.292, Commit `7e9f8bb1858d7d4ea815e7daf87d16ad3012c38e`.

## Ergebnis und Prüfgrenzen

Die Basic-Widgets stimmen **noch nicht vollständig** mit VIS-2 überein. Von 41 Originaltypen einschließlich des internen Gruppenwidgets haben 38 ein Gegenstück im Studio-Basisset. Drei Originaltypen sind dort nicht registriert. Das Basisset enthält außerdem acht zusätzliche Typen.

Dies ist ein Quellcodevergleich von Registrierung, Eigenschaften und Renderer-Verhalten. Er berücksichtigt die nachträglichen Ergänzungen am Ende von `core.js`, die dynamischen Eigenschaften in `app.js` und die gemeinsamen Hilfsmodule. Ein gleichlautender Widgetname allein zählt nicht als Funktionsgleichheit. Es wurde kein vollständiger Screenshot-/Pixelvergleich und kein Test gegen eine reale ioBroker- oder Home-Assistant-Installation durchgeführt. Auch die mit „nah“ bezeichneten Widgets sind deshalb nicht als optisch identisch freigegeben.

Als Referenz dient ausschließlich **Basic**, nicht das neue Set **Standard**, jQui oder ein separates Basic2-Adapterpaket. Studio „HA Grafik – Interaktiv“ (`basic2.js`) ist ein anderes Set und kein Ersatz für diesen Vergleich.

## Quellen

- [VIS-2 Basic, festgehaltener Quellstand](https://github.com/ioBroker/ioBroker.vis-2/tree/acb1b4ebad649bd66f3d5fb2d5b6da1b3700472b/packages/iobroker.vis-2/src-vis/src/Vis/Widgets/Basic), nach Aktualisierung von `master` am Prüftag.
- [Historische Basic-Templates im selben Quellstand](https://github.com/ioBroker/ioBroker.vis-2/blob/acb1b4ebad649bd66f3d5fb2d5b6da1b3700472b/packages/iobroker.vis-2/src-vis/public/widgets/basic.html). Für aktuelle Funktionen ist die React-Umsetzung maßgeblich.
- Studio: `web/widget-sets/core.js`, `web/widget-registry.js`, `web/app.js`, `web/number-display.js`, `web/table-data.js`, `web/value-list.js`, `web/image-widget.js`, `web/iframe-widget.js`, `web/note-widget.js`, `web/localization.js` und die jeweiligen Bool-/SVG-/Filter-Helfer.

## Vollständige Zuordnung

„Nah“ bedeutet: wesentliche widgetbezogene Felder und Grundfunktion vorhanden; gemeinsame Einschränkungen siehe unten. „Teilweise“ bezeichnet konkrete Funktions- oder Darstellungsunterschiede. HA-Anpassungen sind ausdrücklich benannt und nicht automatisch Fehler.

| VIS-2-Name / Template-ID | Studio-Typ | Befund |
| --- | --- | --- |
| link / `tplLink` | `link` | Teilweise: HTML und URL vorhanden, die Originaloption `target` fehlt; kein konfigurierbares Zielfenster. |
| Note / `tplNote` | `note` | Teilweise: Testtext, Entität, Ecke und Notizdialog vorhanden. Der Renderer setzt Inhalt einschließlich Präfix/Suffix mit `textContent`; im Editor angebotener HTML-Code erscheint daher als Text. Schreiben ist auf verfügbare `input_text` ohne Attribut begrenzt. |
| Screen Resolution / `tplScreenResolution` | `screen-resolution` | Teilweise: Fenstergröße und Resize-Aktualisierung vorhanden. Original zeigt zusätzlich VIS-Instanz-/View-bezogene Informationen; Studio zeigt nur Breite × Höhe. |
| Red Number / `tplRedNumber` | `red-number` | Nah: Kreis/Pin, Farben, Radius, Singular/Plural und Unterdrückung leerer/Nullwerte vorhanden. Eigene Geometrie und allgemeines Studio-CSS; optische Gleichheit offen. |
| Bool SVG / `tplValueBoolCtrlSvg` | `bool-svg` | Nah: zwei SVG-Inhalte, Deckkraft, Nur-Anzeige und numerisch/boolesches Umschalten vorhanden; HA-Schreibziele statt beliebiger ioBroker-States. |
| SVG shape / `tplShapes` | `svg-shape` | Nah: Formen, Polygonpunkte, Kontur, Füllung, Rotation und Skalierung vorhanden. Eigener Geometrie-Renderer und teilweise andere technische Optionswerte (`pentagon` statt `pentagone`). |
| Input val / `tplValueInput` | `input-value` | Nah: Zahlenmodus, Min/Max, Auto-setzen samt Verzögerung, Read-only, Autofokus, No-style, Enter und Varianten vorhanden. Schreiben ist auf `input_number`/`input_text` begrenzt; eigene statt MUI-Komponenten. |
| View in widget / `tplContainerView` | `view-in-widget` | Teilweise: Projektseite über iframe statt VIS-View als Widgetbaum. Rekursionsschutz vorhanden; VIS-Editor-Testoption fehlt. |
| View in widget 8 / `tplStatefulContainerView8` | `view-in-widget-8` | Teilweise: indexabhängige Projektseiten vorhanden; iframe-Einbettung statt Original-View, eigenes Indexlimit und HA-Zustandsabbildung. |
| iFrame / `tplIFrame` | `iframe` | Nah: Quelle, Refresh, Aufwachen/Viewwechsel, Query-Verzicht, Scrollachsen, Rahmen und Sandboxoption vorhanden. Sandboxfreigaben und Lebenszyklus sind eigene Implementierungen. |
| iFrame 8 / `tplStatefulIFrame8` | `iframe-8` | Nah: inklusive Indizes und Quelle/Sandbox je Eintrag vorhanden. Eigene Begrenzung auf Index 20; Bool-/On-off-Zustände zusätzlich unterstützt. |
| Image / `tplImage` | `image` | Nah: Quelle, Strecken, Refresh, Aufwachen/Viewwechsel, Query-Verzicht und Interaktionen vorhanden. Eigene Bildverwaltung und optionale HA-Quellbindung. |
| Image 8 / `tplStatefulImage8` | `image-8` | Nah: Quellen je Index, höchste inklusive Nummer bis 200 und Bildoptionen vorhanden. HA-Boolwerte werden zusätzlich abgebildet. |
| AckFlag HTML / `tplAckBool` | `ackflag-html` | **Semantisch abweichend:** Original liest `oid.ack`, Studio prüft den eigentlichen Entitätszustand mit `isOn`. HA besitzt kein direkt entsprechendes ioBroker-ACK-Flag. Der Name verspricht derzeit mehr als die Implementierung liefert. |
| Bool Checkbox / `tplValueBoolCheckbox` | `checkbox` | Teilweise: Bindung, HTML-Zusätze und Autofokus vorhanden; Originalwahl MUI/native (`mui`) fehlt. Studio verwendet eine native Checkbox und eigene Styles. |
| Bulb on/off / `tplBulbOnOffCtrl` | `bulb` | Teilweise: Min/Max, zwei Bilder, Nur-Lesen und zusätzliche URLs vorhanden. Zusätzliche Zielentitäten/Schreibwerte sind deaktiviert. URLs werden als Fenster geöffnet. Eigenes Standardsymbol und HA-spezifische Schaltlogik. |
| Number / `tplValueFloat` | `sensor` | **Teilweise:** Faktor, Nachkommastellen, Dezimalkomma und HTML-Zusätze vorhanden. Tausendertrennung (`is_tdp`), Qualitätsentität mit True/False-Klassen sowie frei leer bleibende Stellenzahl fehlen. Standard ist eine Nachkommastelle; Original lässt `digits` offen. Parser und Singularauswahl unterscheiden sich bei Grenzfällen. |
| String / `tplValueString` | `string` | Nah: escaped Text, HTML-Zusätze, Testtext, Icon und Größe vorhanden; HA-Attribut als zusätzliche Quelle. |
| String (unescaped) / `tplValueStringRaw` | `string-raw` | Teilweise: HTML-Inhalt samt Zusätzen vorhanden, aber durch Studio-HTML-Bereinigung begrenzt. Kein uneingeschränkter HTML-/Skript-Renderer. |
| String img src / `tplValueStringImg` | `image-source` | Nah: zustandsabhängige Bild-URL, HTML-Zusätze und Refresh vorhanden; zusätzliche Studio-Refreshoptionen. Fallback-/Layoutdarstellung ist eigenständig. |
| TimesValue / `tplTimeValue` | `time-value` | Teilweise: Zeit aus dem Zustandswert. Eigene eingeschränkte Datumsformatierung und relative Ausgabe; Details siehe unten. |
| Timestamp Value / `tplValueTimestampValue` | `timestamp-value` | Teilweise: dieselbe Quellart wie TimesValue, wie auch im Original. Kein versehentliches Duplikat; beide Originaltypen existieren zur Kompatibilität. |
| Timestamp / `tplValueTimestamp` | `timestamp` | HA-Anpassung: `last_updated` statt ioBroker `ts`. Formatierung/relative Zeit nicht vollständig gleich. |
| Last change Timestamp / `tplValueLastchange` | `last-changed` | HA-Anpassung: `last_changed` statt ioBroker `lc`. Formatierung/relative Zeit nicht vollständig gleich. |
| ValueList Text / `tplValueList` | `value-list-text` | Nah: Index, Liste, Editorvorschau, HTML-Zusätze und escaped Text vorhanden. Zusätzlich zeilenweise Liste; Index-/Parsing-Grenzfälle nicht identisch. |
| ValueList HTML / `tplValueListHtml` | `value-list-html` | Nah: Indexvorschau nur im Editor, HTML-Einträge und Semikolon-Escape vorhanden. HTML-Bereinigung und Zahlenparser weichen ab. |
| ValueList HTML Style / `tplValueListHtml8` | `value-list-html-style` | Nah: HTML und CSS je Index, inklusive höchste Nummer und Testindex vorhanden. Studio erlaubt bis 50 statt Originalfeldgrenze 10; bereinigtes HTML/CSS. |
| Bool HTML / `tplValueBool` | `bool-display` | Teilweise: zwei HTML-Inhalte und Zusätze vorhanden. Originalfelder `min`/`max` und deren numerische False-Zuordnung fehlen; Studio nutzt allgemeines `isOn`. |
| Bool Select / `tplValueBoolSelect` | `bool-select` | Teilweise: zwei Texte, Zusätze, Autofokus und numerische/boolesche Zustände vorhanden. MUI/native-Auswahl fehlt; native Auswahl statt Original-MUI. |
| Bool HTML (control) / `tplValueBoolCtrl` | `bool-html-control` | Teilweise: zwei HTML-Inhalte und Umschalten vorhanden. Min/Max, HTML-Präfix/Suffix als Felder sowie zusätzliche URLs/Ziel-IDs des Originals fehlen. |
| HTML State / `tplBasicState` | `html-state` | Nah: HTML, fester Schreibwert und URL-Aktion vorhanden. HA-Schreibfreigaben statt beliebiger ioBroker-States; URL-Aufruf über Browser mit dessen Zugriffsgrenzen. |
| Table / `tplTableBody` | `table` | Teilweise: JSON, Ereignisse, Bestätigung, Auswahl, Details, Zeilenlimit, Header/Scrollbar und dynamische Spaltenfelder vorhanden. Original `noStyle` mit separatem Legacy-/Modern-Renderer und vollständigen `tclass`-CSS-Strukturen fehlt. Details werden in einen Zielcontainer geschrieben; Daten-/DOM-Verhalten ist eigenständig. Druckfunktionen sind zusätzliche Studio-Optionen. |
| Full Screen / `tplFullScreen` | `fullscreen` | **Optisch abweichend:** Studio zeigt einen Textbutton statt des wechselnden Vollbild-/Beenden-Icons. Browserfunktion vorhanden; anders als im Original ist der Klick im Editor nicht gesperrt. |
| Bar / `tplValueFloatBar` | `bar` | Nah: Grenzen, Richtung, Farbe, Rahmen, Schatten und Reverse vorhanden. Original-MUI-Auswahl fehlt; eigenes Balkenlayout. |
| HTML / `tplHtml` | `html` | Teilweise: Inhalt und Aktualisierungsintervall vorhanden. Bereinigtes HTML statt uneingeschränktem Originalinhalt; keine allgemeine ioBroker-Binding-Auswertung. |
| HTML navigation / `tplHtmlNav` | `navigation` | Teilweise: HTML und Zielseite vorhanden. `subView` ist deaktiviert; keine Original-Unteransichtsnavigation. |
| filter - dropdown / `tplFilterDropdown` | `filter-dropdown` | Nah: Einträge, drei Layouts, Mehrfachauswahl, Kein-Filter-Option, Titel, Autofokus und Varianten vorhanden. Eigene Buttons/`details` statt MUI; kein Nachweis identischer Maße/Interaktionen. |
| Border / `tplFrame` | `border` | Nah: Titel, Titelhintergrund/-versatz, Kopfbereich, Farbe und Rahmen vorhanden; eigene CSS-Umsetzung. |
| HTML logout / `tplHtmlLogout` | — | Fehlender Basic-Typ. HA-/Studio-Abmeldung braucht einen eigenen definierten Sitzungskontext; ioBroker-Logout kann nicht unverändert funktionieren. |
| Speech to Text / `tplSpeech2Text` | — | Fehlender Basic-Typ: Sprachaufnahme, Modi, Schlüsselwörter und Statusanzeigen sind nicht vorhanden. |
| Group / `_tplGroup` | — | Kein identischer interner Widgettyp. Studio besitzt bereits eigene Gruppierungsfunktionen über `widget-groups.js`; daher keine vollständig fehlende Gruppierung, aber kein VIS-Gruppenschema. |

Die acht zusätzlichen Studio-Basistypen sind `tabs`, `button`, `toggle`, `slider`, `horizontal-line`, `vertical-line`, `text` und `gauge`. Sie sind keine fehlenden oder umbenannten Basic-Originaltypen.

## Gemeinsame Unterschiede

1. **Darstellung:** Eigene Widgets, CSS, Icons und Vorschauen statt React/MUI-/VIS-DOM. Einzelne Standardgrößen sind bereits angeglichen, aber daraus folgt keine allgemeine optische Gleichheit. Bool Select/Checkbox, Full Screen und Table sind konkrete sichtbare Beispiele.
2. **Zustände und Aktionen:** HA-Entitäten, Attribute und freigegebene Aktionen ersetzen ioBroker-State-IDs. Ein ACK-Flag, beliebige State-Schreibzugriffe oder die VIS-Abmeldung haben kein direktes HA-Gegenstück. Diese Unterschiede müssen sichtbar dokumentiert oder durch gezielte HA-Funktionen ersetzt werden.
3. **HTML und CSS:** HTML wird bereinigt; beliebige Skripte und ioBroker-Bindings werden nicht wie im Original ausgeführt. CSS-Gruppen sind vorhanden, aber nicht der komplette VIS-Attribut- und DOM-Vertrag.
4. **Sichtbarkeit:** Die aktiven gemeinsamen Eigenschaften ersetzen die alten deaktivierten Felder aus `core.js`. Zustandsbedingungen funktionieren bereits. `visibilityGroups` ist als Feld vorhanden, wird im geprüften Runtime-Sichtbarkeitspfad jedoch nicht ausgewertet. Es darf daher nicht als funktionierende Gruppenfreigabe gelten.
5. **Sprachen:** Studio bietet insgesamt DE/EN; die eigenständige Material-Lokalisierung macht Basic nicht automatisch dreisprachig. Relative Zeit in `formatDate` enthält fest deutsche Wörter (`vor`, `in`, `Sek.`, `Min.`, `Std.`, `Tage`), Vollbildfehler und einige Runtime-Fallbacks ebenfalls. Vollständige DE/EN/FR-Parität fehlt.
6. **Zeitformate:** Studio ersetzt nur `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss` und bietet fünf feste Formate. Die Originalformatierung umfasst weitere Möglichkeiten und eine Auto-Auswahl. Relative Zeit ist eine eigene Kombination aus Datum und Abstand. Numerische Zeitwerte werden im Studio je nach Größe als Sekunden oder Millisekunden interpretiert; keine pauschale Gleichheit behaupten.

## Bereits vorhandene Funktionen, die nicht erneut als fehlend gelten dürfen

- Input val: Min/Max und `autoSetDelay` werden nachträglich in die Eigenschaften eingesetzt.
- Table: dynamische Spalten mit Titel, Breite und Attribut werden in `widgetPropertyGroups` erzeugt; Ereignis-/Bestätigungs-/Auswahl-/Detailfunktionen existieren bereits.
- Image/iFrame: Aufwachen, Viewwechsel, Query-Verzicht und individuelle Sandboxoptionen sind umgesetzt.
- String: Icon und Icongröße werden nachträglich ergänzt.
- Bool Select/Checkbox: Zusätze und Autofokus sind vorhanden.
- Gemeinsame Zustands-Sichtbarkeit ist aktiv, trotz veralteter deaktivierter Definitionen im Basisset.

## Empfohlene Reihenfolge einer späteren Umsetzung

1. Semantik klären: AckFlag umbenennen oder explizite Bestätigungsentität anbieten; keine angebliche ACK-Erkennung aus einem beliebigen Zustand.
2. Number vervollständigen: Tausendertrennung, optionale Stellenzahl, Qualitätsklassen und ausdrücklich getestete Singular-/Parsergrenzen.
3. Optik angleichen: Vollbildicons mit Browserzustand, native/MUI-nahe Bool-Steuerelemente, kompatible Tabellen-Darstellungsmodi.
4. Funktionslücken schließen: Linkziel, Bool-Min/Max, vollständige HTML-Steuerungsoptionen, aktive zusätzliche HA-Ziele und Navigation in Unteransichten, soweit sinnvoll abbildbar.
5. Notiz-HTML und Gruppen-Sichtbarkeit entweder tatsächlich umsetzen oder die Eigenschaften ehrlich einschränken.
6. Datumsformate, Runtime-Texte und Basic-Eigenschaften vollständig DE/EN/FR lokalisieren.
7. Speech-to-Text als optionale Browserfunktion prüfen; Logout ausschließlich passend zum Studio-Sitzungsmodell. Vor optischer Freigabe Browservergleich in Hell/Dunkel, Editor/Runtime und mehreren Größen.

Bestehende IDs, gespeicherte Felder und Projekte müssen dabei erhalten bleiben. Neue Verhaltensmodi sollten opt-in sein, wenn sie alte Anzeigen oder Schreibaktionen verändern würden. Dieser Prüfbericht verändert keine Runtime und keine gespeicherten Projekte.

## Verifikation

40 vorhandene Node-Tests aus 13 relevanten Testdateien bestanden ohne übersprungene Fälle: Number, Input value, Table data, Value lists, Bool Select, Bool SVG, SVG shape, Red Number, Note, Image, iFrame, Filter und Bar. Sie testen die derzeitige Studio-Implementierung und einzelne Referenzverträge, nicht den vollständigen Originalrenderer.

Die Tests wurden mit `node --test` ausgeführt. Kein App-Build oder Docker-Build erforderlich, da nur dieser Prüfbericht hinzugefügt wurde. Keine App-Versionsänderung: das Verhalten bleibt unverändert.
