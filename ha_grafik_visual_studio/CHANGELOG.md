# Changelog

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
