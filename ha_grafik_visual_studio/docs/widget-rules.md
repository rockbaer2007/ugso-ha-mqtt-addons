# Widget-Regeln für HA Grafik Visual Studio

Ab Studio 0.1.194 unterstützt Schnittstelle 0.2 `render.kind: "heating-params"`. Der feste Host liest `heatingPeriodEntityId`, `publicHolidayEntityId`, `presentEntityId`, `partyEntityId`, `guestsEntityId`, `holidayHomeEntityId`, `vacationAwayEntityId`, `fireplaceEntityId` und optional `chosenRoomEntityId`. Jeweilige `*Preview`-Boolean-Werte gelten nur im ungebundenen Editor. Runtime-Schalten verwendet die bestehende `/api/switch`-Schnittstelle ausschließlich für verfügbare `input_boolean`/`switch`-Zustände on/off. `readOnly` sperrt alle Zeilen; Sensoren und unbekannte Werte sind immer nicht schreibbar. Der Raum ist eine Textanzeige, keine Raumumschaltung; `noCard` steuert den äußeren Kartenhintergrund.

Ab Studio 0.1.193 unterstützt Schnittstelle 0.2 `render.kind: "landlord-notification"`. Der feste Host bietet ein Nachrichtenformular. `notificationService` muss eine konkrete `notify.*`-Aktion sein; `notify.send_message` benötigt `notifyEntityId`. Unspezifisches `notify.notify` und `notify.persistent_notification` sind ausgeschlossen. `messageType` beschreibt den eingerichteten Kanal; Anbieter und Empfänger gehören zur HA-Konfiguration. `messageSubject` und die Formularpriorität werden als Nachrichtentext mitgegeben. Die Runtime übergibt nach bewusstem Senden an `/api/landlord-notification`; der Editor sendet nicht. Entwürfe werden nur im Formular gehalten, nicht im Projekt/Export. Maximal 10.000 Nachrichtenzeichen und 200 Überschriftszeichen. HA-Annahme ist keine Zustellbestätigung. `noCard` entfernt den äußeren Kartenhintergrund.

Stand: 01.10.2026. Dieses Dokument hält die vereinbarten Regeln und den ersten Widget-Paketvertrag fest. Die Tool-Schnittstelle und zusätzliche Widget-Fähigkeiten folgen später.

## Bereits vorhanden

- Widgets werden in benannten Widget-Sets registriert. Ein Set hat derzeit `id`, `label` und `widgets`.
- Eine Widget-Definition hat derzeit mindestens `type`, `label`, `defaults` und `propertyGroups`; Icon und Palettenvorschau können ergänzt werden. Doppelte Set-IDs und Widget-Typen werden abgewiesen.
- Widgets haben im Editor eine Platzierung, einen Namen, Eigenschaften und eine Runtime-Darstellung. Gemeinsame Bereiche wie **Generell** und **Sichtbarkeit** sind für alle Widgets vorgesehen; weitere Felder hängen vom Typ ab.
- SVG-Line (gespeicherter Typ `svg-connection`) nutzt Andockpunkte, Zwischenpunkte und ausdrücklich aktivierte Sammelpunkte. Die Linebox ist ein eigenes Spezial-Widget zur vorzeichenrichtigen Summierung von Zahlenwerten angeschlossener Linien. Diese Funktionen sind Eigenschaften der vorhandenen Widgets und noch kein allgemeines Paket-API.

## Verbindliche Kompatibilitätsregeln

1. **Die veröffentlichte Grundfunktion eines Widget-Typs bleibt erhalten.** Ein Update darf Bedeutung, Bedienung, Darstellung und Wirkung bereits vorhandener Einstellungen nicht stillschweigend ändern. Die erste später festgelegte Widget-Vertragsversion `0.1` ist dabei die Kompatibilitätsbasis; sie ist nicht mit der Version der Home-Assistant-App gleichzusetzen.
2. **Bestehende Projekte bleiben funktionsfähig.** Ein Paket-Update darf gespeicherte Widget-Instanzen nicht unerwartet umdeuten oder ihre Werte überschreiben. Auch ein Feld, das in einem alten Projekt fehlt, muss weiterhin das damalige Verhalten ergeben.
3. **Zusatzfunktionen werden optional eingehängt.** Neue Eigenschaften, Datenbindungen oder Darstellungsoptionen brauchen einen neutralen Standardwert. Ohne ausdrückliche Aktivierung verhält sich das Widget wie zuvor.
4. **Inkompatibles Verhalten bekommt einen neuen Widget-Typ.** Es ersetzt den alten Typ nicht im Hintergrund. Alter und neuer Typ dürfen parallel im selben Projekt vorkommen.
5. **Migrationen sind sichtbar und nachvollziehbar.** Falls ein Wechsel auf einen neuen Typ gewünscht ist, braucht er eine Vorschau, eine ausdrückliche Übernahme und eine Möglichkeit, den vorherigen Projektstand wiederherzustellen. Keine automatische Umstellung beim bloßen Paket-Update.
6. **Paketversion und Widget-Definitionsversion sind getrennt.** Ein Paket kann neue Widgets erhalten, ohne die Definition bereits veröffentlichter Widgets zu ändern. Gespeicherte Instanzen sollen ihre Typ-ID und Definitionsversion behalten.
7. **Kompatibilität wird getestet.** Referenzprojekte mit Widgets der ersten Vertragsversion müssen nach jedem Paket-Update im Editor und in der Runtime gleich funktionieren, solange keine optionale Erweiterung aktiviert wurde.

## Widget-Paket-Schnittstelle 0.1

Version 0.1 ist ein bewusst kleiner, datenbasierter Vertrag. Im Tab **Einstellungen → Widget-Pakete** kann ein lokales `*.wg` oder bisheriges `*.wg.zip` installiert werden. Beide enthalten ein ZIP mit `manifest.json` in UTF-8 und optional darin referenzierten SVG- oder PNG-Bildern unter `icons/`; andere Dateien sind unzulässig. Die ZIP-Größe ist auf 2 MB, das Manifest auf 200 KB und jedes Bild auf 50 KB begrenzt. PNG-Bilder dürfen höchstens 1024 × 1024 Pixel groß sein. Der Server validiert Manifest und Bilder und speichert ausschließlich geprüfte Daten unter `/data/widget_packages/`. Paket-Code wird nicht ausgeführt. Installierte Widgets erscheinen nach dem Neuladen als eigenes Set in der Palette; ihre Text-Darstellung funktioniert im Editor und in der Runtime. In der Paketliste sind ID, Version, API-Version, Widget-Anzahl und Lizenz sichtbar. Neuladen lädt die App erneut. Entfernen wird verweigert, sobald ein Widget-Typ aus dem Paket in irgendeinem Projekt benutzt wird. Ab Studio 0.1.188 darf eine höhere Version neue Widgets ergänzen, wenn bestehende Definitionen unverändert bleiben; Details stehen unter Schnittstelle 0.2.

Pflichtfelder des Manifests: `format: "ha-grafik-widget-package"`, `apiVersion: "0.1"`, eine punktgetrennte Paket-`id`, `name`, semantische `version` (`x.y.z`), `license` und `widgets`. Die Liste enthält **1 bis 30 Widgets**; alle erscheinen als eigene Paletteneinträge im selben Paket-Set. Jedes Widget besitzt einen eindeutigen `type` im Namensraum `paket.id/widget-name`, `label`, `defaults`, `propertyGroups` und `render: {"kind":"text","valueKey":"text"}`. Optional können Paket und Widgets mit `icon: "icons/name.svg"` oder `icon: "icons/name.png"` ein Bild referenzieren. Ohne Widget-Bild wird das integrierte SVG-Textsymbol verwendet. Andere Formate, Skripte, externe Referenzen und aktive SVG-Inhalte werden abgewiesen. Eigenschaftsfelder besitzen `key`, `label`, `type` und einen Standardwert gleichen Schlüssels. Unterstützte Feldtypen sind `text`, `number`, `checkbox`, `color`, `range` und `select`. `valueKey` muss ein bearbeitbares Text- oder Zahlenfeld sein. Die App ergänzt weiterhin die gemeinsamen Bereiche **Generell** und **Sichtbarkeit**. Neue Instanzen speichern `packageId` und `definitionVersion: "0.1"`.

Beispiel für `manifest.json`:

```json
{
  "format": "ha-grafik-widget-package",
  "apiVersion": "0.1",
  "id": "beispiel.widgets",
  "name": "Beispiel Widgets",
  "version": "1.0.0",
  "license": "MIT",
  "widgets": [{
    "type": "beispiel.widgets/label",
    "label": "Label",
    "icon": "icons/label.svg",
    "defaults": {"text": "Hallo"},
    "propertyGroups": [{"label": "Inhalt", "fields": [{"key": "text", "label": "Text", "type": "text"}]}],
    "render": {"kind": "text", "valueKey": "text"}
  }]
}
```

Das ZIP muss zu diesem Beispiel zusätzlich `icons/label.svg` enthalten. Die SVG-Datei darf nur grundlegende Formen wie `path`, `rect`, `circle`, `line` und `polygon` mit einfachen Zeichenattributen enthalten. Für PNG lautet der Pfad beispielsweise `icons/label.png`. Die Buttons der Studio-Oberfläche behalten ihre eigenen SVG-Symbole.

GitHub-Installation, Updates, Bilder außerhalb der referenzierten Icons, eigene Skripte, HA-Zustandsbindung und Schreibaktionen sind noch nicht Bestandteil von 0.1. Diese Fähigkeiten benötigen eigene geprüfte Vertragsversionen oder optionale Erweiterungspunkte, damit bestehende Widgets unverändert bleiben.

## Widget-Paket-Schnittstelle 0.2

Ab Studio 0.1.192 ergänzt `render.kind: "window-overview"` eine lesende JSON-Raumliste. `valueKey` bezeichnet die ungebundene Vorschau; `entityId`/`tableAttribute` die Live-Liste und `openCountEntityId`/`openCountAttribute` den optionalen separaten Zähler. JSON enthält `room`, `sinceText`, `changed`, `isOpen`. Ohne Zählerbindung wird die Anzahl nur aus vollständig bekannten Listenzuständen berechnet; fehlende gebundene Werte werden nicht ersetzt. Bekannte alte `fts_window_1w[_open].svg`-Namen dienen nur zur Statuszuordnung, ohne Bildabruf. Maximal 200.000 JSON-Zeichen und 500 Räume; Raumtexte werden als Text angezeigt. Farben: `headlineColor`, `statuslineColor`, `roomClosedColor`, `roomOpenColor`, `changedClosedColor`, `changedOpenColor`, `roomBackgroundColor`; `noCard` steuert den Kartenhintergrund.

Ab Studio 0.1.191 ist zusätzlich `render.kind: "meteored"` verfügbar. `valueKey` bezeichnet die Meteored-ID, `enableReload` aktiviert stündliches Neuladen, `noCard` die Darstellung ohne Kartenhintergrund. IDs sind auf 1–128 ASCII-Buchstaben, Ziffern, Unterstriche und Bindestriche begrenzt. Der Host erzeugt eine feste Loader-Seite und lädt sie ausschließlich in der Runtime in einem Frame mit `sandbox="allow-scripts"`, ohne Zugriff auf den Studio-DOM. Eigene Loader-URLs oder ZIP-Skripte bleiben verboten. Der Editor zeigt eine Konfigurationsvorschau; gültige Meteored-ID, Internetzugriff und Anbieter-Domainfreigabe bleiben Voraussetzung.

Ab Studio 0.1.190 ergänzt `render.kind: "room-table"` den Vertrag für passive HTML-Raumtabellen. `valueKey` bezeichnet den Vorschauwert. `entityId` und optional `tableAttribute` liefern ausschließlich Live-HTML; bei Bindung gibt es keinen Vorschau-Fallback. Der Host baut nur Tabellenelemente, Textformatierung, begrenzte Zellspannen und ausgewählte passive CSS-Werte nach. Skripte, Ereignishandler, Formulare, Einbettungen und externe Ressourcen werden nicht übernommen. ZIP-Code bleibt verboten. Das Referenzpaket Wetter und Heizung 1.3.0 ergänzt das Widget ohne Änderung älterer Definitionen; frühere Hosts unterstützen diesen neuen Darstellungsmodus noch nicht.

Ab Studio 0.1.188 akzeptiert derselbe lokale Import eine höhere Paketversion, wenn alle vorhandenen Widget-Definitionen exakt erhalten bleiben. Änderungen an Paketidentität, Schnittstelle, Lizenz, bestehenden Feldern, Standardwerten, Darstellung oder Icons werden abgewiesen. Neue Widgets können hinzukommen; Projekte und bestehende Instanzdaten werden nicht verändert. Downgrades und dieselbe Version bleiben gesperrt.

Der optionale Diagrammmodus `chartMode: "two-weeks"` ergänzt ab 0.1.188 das Zwei-Wochen-Balkendiagramm. Schlüssel: `showWeekData`, `unit`, `headlineColor`, `legendTextColor`, `previousWeekColor`, `currentWeekColor`, `axisColor`, `xAxisColor`, `positionYAxis` (`left`/`right`), `decimalPlaces` (0–5), `showLegend`, `noCard`. Pro englischem Wochentag Monday–Sunday heißen die Felder `currentMondayEntityId`/`previousMondayEntityId` und `currentMondayPreview`/`previousMondayPreview` entsprechend. Bei `showWeekData: true` werden ausschließlich 14 numerische HA-Zustände gelesen; ungebundene oder ungültige Werte bleiben leer. Bei false werden ausschließlich die konfigurierten Vorschauwerte dargestellt. Dieser Modus verändert den allgemeinen Diagrammvertrag nicht.

Ab Studio 0.1.187 bleibt 0.1 unterstützt. Mit `apiVersion: "0.2"` ist zusätzlich `render: {"kind":"chart","valueKey":"headline"}` verfügbar. Der Host zeichnet das Diagramm selbst als SVG; Pakete enthalten weiterhin ausschließlich Manifest und geprüfte Icons. `headline` muss als Textfeld mit Standardwert deklariert sein. Die Instanz speichert `definitionVersion: "0.2"`.

Der Diagrammvertrag verwendet `dataCount` (1–10), `entityId` (erste Reihe als Ersatzbindung), `xAxisType` (`time` oder `category`), `xAxisFormat`, `showLegend`, `noCard`, `axisColor`, `gridColor` und `backgroundColor`. Pro Reihe N heißen die Schlüssel `seriesNameN`, `seriesEntityIdN`, `seriesAttributeN`, `seriesDataN`, `seriesXKeyN`, `seriesYKeyN`, `seriesUnitN`, `seriesColorN`, `seriesTypeN` (`line`/`bar`), `seriesAxisN` (`left`/`right`) und `seriesDifferenceN`. Attribute oder Zustände können JSON-Arrays liefern; Vorschau-JSON gilt nur ohne Entitätsbindung. Die Bindung ist lesend. Ungültige Daten ergeben keine Vorschau anstelle fehlender Live-Daten.

Zeitwerte sind ISO-Datumsangaben oder Unix-Millisekunden; Kategorien sind Texte. Fehlende Werte unterbrechen Linien und Differenzen. Höchstens 20.000 Eingabezeilen werden akzeptiert und auf höchstens 500 Punkte pro Reihe begrenzt. Format-Tokens sind `YYYY`, `MM`, `DD`, `ddd`, `HH`, `mm`, `ss`; ausführbare Formatierer sind nicht erlaubt. Das Referenzpaket entsteht mit `python packages/weather-heating/build.py`.

Externe Sets erhalten automatisch eine eigene Palettenfarbe mit Abstand zu belegten Farbtönen. Die Zuordnung und Reservierung entfernter Sets bleibt im lokalen Browser-Speicher erhalten. Basis und integrierte Sets behalten ihre Farben. Eine browserübergreifende Farbzuordnung ist nicht Teil dieses Vertrags.

Der Diagrammmodus `weather` ab Studio 0.1.189 unterstützt HA-Vorhersagen über den festen lesenden `weather.get_forecasts`-Aufruf, JSON-Zustände/-Attribute und Einzelentitäten. Er zeigt fünf Tages- oder 24 Stundenwerte; nur ungebundene HA-/JSON-Quellen verwenden Vorschau-JSON. Fehlende Werte bleiben Lücken. Temperatur, Niederschlag, Wolkenbedeckung und Regenwahrscheinlichkeit werden nicht aus Zustandsnamen geschätzt. Sonnenanteil ist ausschließlich `100 - cloud_coverage`. Unterschiedliche Einheiten auf derselben Achse und ausdrücklich getrennte Reihen bekommen eigene Diagrammflächen. Erfolgreiche HA-Antworten werden im Browser fünf Minuten zwischengespeichert, Fehler eine Minute; der Server gibt nur begrenzte Vorhersagefelder zurück. Das optionale Referenzpaket 1.2.0 ergänzt diesen Modus ohne Änderung seiner bestehenden Widgets.

## Erweiterungsentwurf

Der geplante Packer soll Widget-Pakete als ZIP-Datei mit der Endung `*.wg` ausgeben, zum Beispiel `solar.wg`. Bisherige `*.wg.zip` bleiben importierbar. Die Endung kennzeichnet die Paketart; beim Import wird zusätzlich das Manifest geprüft. Folgende Angaben sollen die Schnittstelle abdecken:

| Bereich | Angaben |
| --- | --- |
| Paket | Stabile Paket-ID, Name, Hersteller, Paketversion, Lizenz, unterstützte Grafikstudio-Versionen, verfügbare Sprachen. |
| Widget-Identität | Stabile, paketweit eindeutige Typ-ID und eigene Definitionsversion. Eine Namensraum-ID wie `hersteller.paket/widget` vermeidet Kollisionen. |
| Palette | Anzeigename, Beschreibung, Gruppe, Icon oder Bild und Vorschau. |
| Grundzustand | Standardgröße, Standardwerte und eindeutig definierte Bedeutung aller Eigenschaften. |
| Eigenschaften | Gruppen, Feldschlüssel, Datentypen, Wertebereiche, Auswahloptionen, Validierung und optionaler Erweiterungsstatus. |
| Darstellung | Editor-Vorschau, Runtime-Darstellung und Verhalten bei fehlenden oder ungültigen Daten. |
| Home Assistant | Unterstützte Entity-Domänen, gelesene Zustände und Attribute, ausdrücklich deklarierte Schreibaktionen und Fehlerbehandlung. |
| Speicherung | Schema der Instanzdaten, Definitionsversion und gegebenenfalls ein gesonderter Migrationspfad. |
| Ressourcen und Rechte | Benötigte Bilder, Styles und Skripte sowie einzeln deklarierte Fähigkeiten, etwa Zustände lesen, Dienste aufrufen oder externe URLs laden. |

Der Editor und die Runtime brauchen jeweils einen klaren Einstiegspunkt. Ein Widget-Paket darf keine Home-Assistant-Tokens erhalten; Zugriff auf Zustände und Dienste erfolgt über freigegebene Grafikstudio-Funktionen. Ob externe Pakete eigenes Skript ausführen dürfen und wie sie installiert, signiert oder geprüft werden, ist noch offen.

## Getrennte Erweiterungsarten

- **Widget-Pakete** ergänzen Paletteneinträge, Eigenschaften und deren Editor-/Runtime-Verhalten.
- **Tool-Erweiterungen** ergänzen Editor-Werkzeuge, zum Beispiel Import, Prüfung oder Bearbeitungshilfen. Sie dürfen bestehende Widget-Grundfunktionen nicht heimlich verändern.
- Die Einstellungen haben die Bereiche **Allgemein**, **Widget-Pakete** und **Tools**. Der Tool-Tab verwaltet lokale Tool-Pakete nach der [Tool-Schnittstelle 0.1](tool-rules.md#tool-paket-schnittstelle-01).

Die erste Umsetzung sollte mit einem kleinen, versionierten Vertrag für Registrierung, Eigenschaften, Standardwerte, Vorschau und Runtime beginnen. Weitere Fähigkeiten werden nur als optionale Erweiterungspunkte ergänzt.
