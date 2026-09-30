# Changelog

## 0.1.18

- Ergänzt das getrennte Widget-Set „HA Grafik – Basic 2“ mit einem Universal-Widget für bis zu fünf zustandsabhängige Inhalte.
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
