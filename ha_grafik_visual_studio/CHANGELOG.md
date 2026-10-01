# Changelog

## 0.1.52

- Snaps dragged SVG connection start and end handles to enabled widget anchors within a visible 24-pixel capture radius.
- Highlights the current anchor target while dragging and writes the widget/anchor binding when the handle is released.
- Respects disabled anchors, single-connection anchors and configured connection limits while snapping.
- Renders the selected connection's endpoint controls above normal widgets while its line hit area remains click-through, keeping both the handles and other widgets accessible.

## 0.1.51

- Turns the `Andockpunkte` section checkbox into a master switch that disables every anchor and marker on the widget.
- Preserves the current visual endpoint positions while anchors are disabled and restores attachment behavior when they are enabled again.

## 0.1.50

- Adds draggable start and end handles to the selected SVG connection widget.
- Dragging an attached endpoint deliberately detaches it from its widget or collector and converts it into a free endpoint at the new position.
- Supports precise endpoint movement with the arrow keys and ten-pixel steps with Shift.
- Keeps light-point animation paths synchronized while endpoints or intermediate points are dragged.

## 0.1.49

- Selects widgets during the capture phase so nested links, buttons, selectors and other interactive content cannot suppress the editor selection or its property panel.

## 0.1.48

- Opens project settings reliably in HTTP Home Assistant ingress by providing a UUID fallback when `crypto.randomUUID()` is unavailable.
- Keeps every normal widget above SVG connection interaction layers in the editor regardless of its configured z-index; runtime z-index output remains unchanged.

## 0.1.47

- Keeps normal widgets selectable after inserting another widget by preserving click events through the drag lifecycle and placing them above SVG connection editing layers.
- Keeps anchor markers visible after another widget is inserted while connections exist on the page.

## 0.1.46

- Repairs and structures the project settings dialog with an explicit Auto-Save section.
- Adds a project-wide anchor-point color setting with yellow as the default.

## 0.1.45

- Added the `HA Grafik – Spezial` widget group with the new `SVG-Verbindungslinie` widget.
- Added widget-relative anchor points, multiple connection lanes, free endpoints, intermediate points and opt-in collector points.
- Added straight, orthogonal, curved and multipoint routes with line, arrow, animation, flow inheritance, crossing and z-index controls.
- Added safe connector cleanup on widget deletion and stable point IDs when duplicating connections.

## 0.1.44

- Behält eingeklappte Widget-Bereiche der Palette beim Einfügen oder Wechseln eines Widgets geschlossen.

## 0.1.43

- Zeigt in der Widget-Palette rechts eine kompakte, typbezogene Vorschau für Werte, HTML, Listen, Tabellen, Bilder und Bedienelemente.
- Verwendet dafür eigene CSS-Miniaturen und Schriftzeichen statt lizenzbeschränkter VIS-2-Grafiken.

## 0.1.42

- Ergänzt HTML voranstellen/anhängen für sämtliche Zeit- und ValueList-Widgets.
- Ergänzt einzelne HTML-/Stilfelder, Werteanzahl und Testwert-Auswahl für ValueList HTML Style; bestehende Listen bleiben lesbar.

## 0.1.41

- Macht Slider im Attributbereich kompakter: 3 px Schiene, 12 px Griff und 20 px Bedienhöhe; Tastaturbedienung und Zahlenfelder bleiben verfügbar.

## 0.1.40

- Ergänzt an HTML-Feldern einen Code-Editor mit Zeilennummern, Speichern und Abbrechen; mehrzeiliger Code bleibt erhalten.
- Stellt HTML-Elemente und Formatierungen ohne die bisherige Element-/Attribut-Whitelist dar, auch in vorangestellten und angehängten Inhalten.
- Vereinheitlicht Auswahlknöpfe als drei Punkte für Entitäten, Icons, Bilder und die multi-views-Seitenauswahl.
- Ergänzt Slider mit Zahlenanzeige und die Border-Grenzen für Titel oben (-20 bis 20), Titel links (-20 bis 30) und Kopfhöhe (0 bis 100).
- Hält den Attributbereich bei vielen aufgeklappten Gruppen scrollbar.

## 0.1.39

- Speichert Editoränderungen standardmäßig fünf Sekunden nach der letzten Änderung automatisch.
- Ergänzt in den Projekteinstellungen einen Auto-Save-Schalter und eine Wartezeit von 1 bis 300 Sekunden.
- Zeigt Speicherfehler an und verhindert parallele Speicheranfragen; die Runtime speichert nicht automatisch.

## 0.1.38

- Benennt die gemeinsame Widget-Einstellung „Ebene“ in allen Widget-Sets und der Statusanzeige in „z-index“ um.

## 0.1.37

- Zeigt die Entitätenauswahl konsequent als Gerätebaum mit Ordnersymbolen; ein Klick auf ein Gerät klappt dessen Entitäten auf.
- Ordnet Entitäten anhand ihrer Geräte-ID auch dann einem Geräteordner zu, wenn der Geräte-Registry-Eintrag fehlt.

## 0.1.36

- Lädt Entitäten, Geräte und Zustände direkt im Add-on über den Home-Assistant-WebSocket-Proxy; der Abruf hängt nicht mehr vom optionalen Sidebar-Panel ab.
- Aktiviert dafür den Home-Assistant-API-Zugriff des Add-ons und liefert verständliche API-Fehler im Entitäten-Dialog.

## 0.1.35

- Erklärt bei fehlender Entity-Bridge, dass der separate Sidebar-Eintrag „HA Grafik Editor“ geöffnet und die optionale Integration installiert sein muss.
- Ergänzt die Anleitung, die Sidebar-Integration nach Add-on-Updates erneut zu kopieren und Home Assistant neu zu starten.

## 0.1.34

- Ergänzt den Home-Assistant-Entitäten-Dialog mit Gerätebaum, Suche, Zustandsanzeige, Aktualisieren, Kopieren und Einfügen in Widget-Felder.
- Lädt Entitäten, Geräte und Zustände beim Öffnen oder manuellen Aktualisieren über die Home-Assistant-Oberfläche.
- Benennt den Menüpunkt „Objekte“ in „Entitäten“ um.

## 0.1.33

- Ergänzt einen SVG-Ansichtsbutton zum Umschalten zwischen Listen- und Kachelansicht im Dateien-Dialog.

## 0.1.32

- Zentriert die SVG-Icons in den Aktionsbuttons des Dateien-Dialogs.
- Stellt die Typauswahlliste auf dunkle Schrift und weißen Hintergrund.

## 0.1.31

- Ersetzt Zeichen und Emojis im Dateien-Dialog durch einheitliche, lokal gespeicherte SVG-Symbole.

## 0.1.30

- Ersetzt das App-Icon und Logo durch neu gestaltete SVG-Dateien.
- Rendert passende `icon.png` und `logo.png` aus den SVG-Quellen für den Home-Assistant-App-Store.

## 0.1.29

- Fügt ein eigenes App-Icon und ein passendes Logo für HA Grafik Visual Studio hinzu.

## 0.1.28

- Ergänzt Upload- und Dateifilter für Bilder, Code/JSON, Text, Audio und Video.
- Stellt Dateiaktionen als kompakte Icon-Schaltflächen dar und ergänzt Ordner erstellen sowie neu laden.
- Vergrößert den Dateien-Dialog auf 90 vw × 75 vh.

## 0.1.27

- Stellt den Dateien-Dialog auf eine Dateiliste mit Miniaturansichten und Dateigrößen um.
- Ergänzt je Bilddatei beschriftete Download- und Löschaktionen; Löschen erfordert eine Bestätigung.

## 0.1.26

- Ergänzt Mehrfachauswahl und Upload von PNG-, JPG-, SVG- und WebP-Dateien in den geöffneten www-Ordner.
- Ergänzt Pfadkopie in die Zwischenablage, Einzelübernahme ins aktive Feld und Abbrechen im Dateien-Dialog.
- Verhindert das Überschreiben gleichnamiger Dateien; Uploads sind auf www-Dateien bis 20 MB begrenzt.

## 0.1.25

- Ergänzt die Dateiauswahl auch für den Ansichts-Hintergrund und das Runtime-Favicon.
- Ermöglicht die Dateiauswahl direkt aus einem Dialogfeld, ohne vorher den Icon-Katalog zu öffnen.

## 0.1.24

- Erkennt den Home-Assistant-www-Ordner über die üblichen Add-on-Mountpfade und zeigt die geprüften Pfade bei fehlender Einbindung an.

## 0.1.23

- Verschiebt den Grafikbrowser in den eigenen Menüpunkt „Dateien“.
- Reserviert „Objekte“ für die geplante Home-Assistant-Geräte- und Entitätenansicht.

## 0.1.22

- Ergänzt Werkzeuge, um das ausgewählte Widget um eine Ebene nach vorn oder hinten zu verschieben.
- Ergänzt den JSON-Import mehrerer Widgets und den JSON-Export des ausgewählten Widgets.

## 0.1.21

- Ergänzt die Bereiche Widgets, Projekteinstellungen, Objekte und Projekte in der Editor-Leiste.
- Ermöglicht mehrere getrennte Visualisierungsprojekte mit eigenem Editor- und Runtime-Link sowie Umbenennen, Duplizieren und Löschen.
- Ergänzt einen Bildbrowser für PNG, JPG, SVG und WebP unter `/config/www`, inklusive Ordnernavigation, Miniaturen und Übernahme als `/local/...`-Pfad.
- Ergänzt projektspezifische Laufzeit- und Browseroptionen und bindet den HA-Konfigurationsordner ausschließlich schreibgeschützt ein.

## 0.1.20

- Ergänzt neben dem Seitenmenü eine Widget-Auswahl mit Widgetname, Typ und ID.
- Springt bei Auswahl zum Widget, markiert es und öffnet seine Eigenschaften.

## 0.1.19

- Benennt das Widget-Set „HA Grafik – Basic 2“ in „HA Grafik – Interaktiv“ und das Universal-Widget in „Zustands-Element“ um.

## 0.1.18

- Ergänzt das getrennte Widget-Set „HA Grafik – Interaktiv“ mit einem Zustands-Element für bis zu fünf zustandsabhängige Inhalte.
- Unterstützt pro Zustand MDI-/Iconset-Icons, Grafiken, Text oder bereinigtes HTML sowie Größe, Farbe, Layout und Bildanpassung.
- Fügt lokale Runtime-Testbedienung für Schalter, Buttons und Navigation hinzu; echte Entity-Bindung folgt später.

## 0.1.17

- Ergänzt eine durchsuchbare MDI-Auswahl für Icon- und Bildfelder.
- Akzeptiert Home-Assistant-Iconset-Namen wie `mdi:home`, `atlas:home` und `custom:home` sowie Grafikpfade wie `/local/icons/home.png`.
- Zeigt MDI-Symbole und erreichbare Grafikdateien direkt neben dem Eingabefeld sowie MDI-Symbole in Schaltern und Lampen an.
- Ergänzt Lizenzhinweise zum eingebetteten Material Design Icons-Katalog.

## 0.1.16

- Zeigt für Bild- und Icon-Pfade eine kleine Vorschau direkt neben dem Eingabefeld.
- Aktualisiert die Vorschau sofort beim Ändern und unterstützt lokale HA-Pfade sowie normale Bild-URLs.

## 0.1.15

- Ergänzt im Reiter Ansicht die gezeigten Gruppen für allgemeine CSS-Werte, Hintergrund, Schrift und Text, Optionen, Navigation, Anwendungsleiste und responsive Einstellungen.
- Ergänzt für Ansichtsgruppen die Checkbox zum Ein- oder Ausschließen der Werte im gespeicherten Projekt.
- Wendet Hintergrund-, Schrift- und Anzeigeoptionen in der Visualisierungsfläche an.

## 0.1.14

- Ergänzt pro Eigenschaftsabschnitt eine Checkbox, mit der die Abschnittswerte beim Speichern aus dem Projektcode ausgeschlossen werden.
- Klappt Eigenschaftsabschnitte standardmäßig zu; Überschrift und Auswahl bleiben sichtbar.
- Ergänzt ein eigenes Leinwand-und-Stift-Icon für die App und den Editor-Sidebar-Eintrag.

## 0.1.13

- Ergänzt Mehrseiten-Projekte mit separaten Widgets, Seitengrößen und Hintergründen.
- Fügt ein Seitenmenü mit Hamburger-Schaltfläche, neuer Seite, Umbenennen, Duplizieren, Sichtbarkeit und Löschen hinzu.
- Ermöglicht den Seitenwechsel in Editor und Runtime und migriert gespeicherte Einseiten-Projekte automatisch.

## 0.1.12

- Ergänzt bei zustandsgebundenen Widgets bis zu neun bedingte Signalbild-Overlays mit Bild, kleinem Symbol, Text, CSS-Klassen, Blinken und Position.
- Erweitert die Widget-CSS-Eigenschaften um Layout, Schrift, Hintergrundbild, Rahmen sowie einzelne Abstände und Schattenwerte.

## 0.1.11

- Macht den Widget-Namen ausdrücklich optional; leere Namen erzeugen keine sichtbare Ersatzbeschriftung.
- Ergänzt im Eigenschaftenbereich den Hinweis, dass ein separates Text-Widget als Beschriftung dienen kann.

## 0.1.10

- Ändert die Schaltfläche zu einem zustandsabhängigen Icon-Feld mit separaten Bild-URLs für Ein und Aus.
- Das ganze Feld schaltet den lokalen Vorschauzustand in der Runtime um; optional kann es auf Nur-Lesen gesetzt werden.

## 0.1.9

- Ergänzt VIS-inspirierte Basic-Widgets für Strings, bereinigtes HTML, Zeitwerte, Wertelisten, boolesche Ausgaben und Steuerungen, Tabellen, Vollbild, Balken, Navigation und Widget-Filter.
- Zeigt Zahlenwerte mit Singular-/Plural-Nachsilben an und unterstützt Bild-URLs aus dem Wert eines Widgets.
- Begrenzt HTML-Ausgaben und URLs auf sichere Elemente, Attribute und Protokolle.
- Hält fest, dass Entity-Livebindung und mehrseitige Navigation noch folgen und ioBroker-Ack-Metadaten keine direkte Home-Assistant-Entsprechung haben.

## 0.1.8

- Trennt projektweites CSS für alle Widgets von den CSS-Eigenschaften eines ausgewählten Widgets.
- Der Reiter CSS bietet einen live angewendeten Projekt-CSS-Editor; individuelle CSS-Gruppen liegen im Reiter Widget.

## 0.1.7

- Behebt 404-Antworten beim Öffnen im Add-on-Docker-Image, indem der Server den tatsächlichen Web-Ordner im Container findet.

## 0.1.6

- Korrigiert die Ingress-URL der zusätzlichen Editor- und Runtime-Panels. Sie verwenden jetzt die vom Supervisor gelieferte `ingress_url` statt der Add-on-ID.

## 0.1.5

- Kennzeichnet das Add-on im Home-Assistant-Store ausdrücklich als experimentell.
- Ergänzt eine optionale Home-Assistant-Integration mit getrennten Sidebar-Panels für Editor und Runtime.
- Die Panels öffnen den Add-on-Ingress mit einer aktuellen Supervisor-Ingress-Sitzung.

## 0.1.4

- Fügt ein eigenes Rahmen-Widget mit Titel- und Kopfzeilenoptionen hinzu.
- Ergänzt Ebenen ab 0 für jedes Widget; höhere Ebenen liegen im Editor und in der Runtime weiter vorn.
- Ergänzt Seitenhintergründe mit Farbe und Bild sowie den Modi Kacheln, Zentriert und Stretch.
- Schalter besitzen einen direkten Ein-/Aus-Zustand und lassen sich in der Runtime lokal umschalten.

## 0.1.3

- Ergänzt grafische Basic-Widgets für Switch, Checkbox, Lampe ein/aus und Slider.
- Rendert Schalter, Checkboxen und Slider als passende Bedienelemente statt als generische Widget-Karten.
- Die Lampe nutzt ein eigenes SVG-Symbol oder wählbare Ein-/Aus-Bilddateien.

## 0.1.2

- Stellt Widgets als frei platzierte HTML-Elemente statt als einheitliche Kartenboxen dar.
- Zeigt beim Auswählen die Widget-ID als Fahne und einen blauen Resize-Rahmen mit Ziehgriff.
- Auswahlrahmen, ID-Fahne und Resize-Griff sind in der Runtime ausgeblendet.

## 0.1.1

- Kennzeichnet HA Grafik Visual Studio als experimentelles Projekt.
- Text-Widget ohne Entitätsbindung; Eigenschaftenleiste mit Reitern und gruppierten CSS-Einstellungen.
- Korrigiert den Pfad, über den der Server die Weboberfläche ausliefert.

## 0.1.0

- Initiales App-Grundgerüst mit getrennten Editor- und Runtime-Modi.
- Erste eigenständige HA-orientierte Widget-Palette und gemeinsame Projektspeicherung.
