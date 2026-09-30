# HA Grafik Visual Studio

> **Status: Experimentell.** Das Projekt befindet sich in einer frühen Entwicklungsphase. Funktionen, Projektformat und Bedienung können sich ändern; noch nicht für produktive Dashboards einplanen.

Eigenständiges Home-Assistant-App-Projekt für eine grafische Visualisierung mit getrenntem Editor und Runtime. Das Paket ist ein frühes Grundgerüst, keine fertige VIS2-Alternative.

## Aktueller Stand

- Home Assistant App-Store-Paket für dieses gemeinsame App-Repository.
- Ein gemeinsamer Projektentwurf wird unter `/data/project.json` gespeichert.
- Editor- und Runtime-Modus verwenden denselben Entwurf.
- Erste eigene, HA-orientierte Widget-Definitionen sind nach Kategorien registriert.
- Das Widget-Register ist separat; weitere eigene Widget-Sets können später unabhängig ergänzt werden.
- Seitengrößen Desktop, Tablet und Telefon können im Editor gewählt werden.
- Das Text-Widget ist ein freies Textfeld ohne Entitätsbindung oder Entitäts-Fehlermeldung.
- Widgets sind frei platzierte HTML-Elemente; Auswahl zeigt ihre Widget-ID und einen blauen Rahmen mit Resize-Griff. Jedes Element liegt standardmäßig auf Ebene 0; die Ebene lässt sich je Widget einstellen.
- Die Basispalette enthält VIS-inspirierte native Widgets: Zahlenwert, String, bereinigtes HTML, Bild-URL aus einem Wert, Zeit-/Zeitstempelwerte, Wertelisten als Text/HTML/HTML mit Stil, Bool-HTML-Anzeige und -Steuerung, Auswahl, Tabelle, Vollbild, Balken, Navigation und Filter-Dropdown. Dazu kommen Switch mit direktem Ein-/Aus-Zustand, Checkbox, Lampe ein/aus, Slider, Text und Rahmen.
- HTML-Ausgaben werden auf sichere Elemente und Attribute begrenzt. Zahlen, Zeiten, Tabellen und Wertelisten verwenden aktuell lokale Testwerte; die Home-Assistant-Entity-Auswahl und Live-Zustandsbindung stehen noch aus. ioBroker-spezifische AckFlag-Anzeigen entfallen, da Home Assistant kein direktes `ack`-Gegenstück bereitstellt.
- Der Filter-Dropdown filtert Widgets anhand des Felds „Filterwort“ in deren Eigenschaften. Navigation öffnet eine sichere URL oder einen relativen Home-Assistant-Pfad; ein Wechsel zwischen mehreren Projektseiten folgt mit der Mehrseiten-Unterstützung.
- Der Seitenhintergrund unterstützt eine Farbe oder ein Bild mit Kachel-, Zentriert- und Stretch-Darstellung.
- Der rechte Eigenschaftenbereich orientiert sich an VIS2s Reitern für Ansicht, Widget, CSS und Skripte; Widget-Metadaten, Sichtbarkeit, Inhalt und CSS sind getrennt gruppiert.
- Der CSS-Reiter enthält projektweite CSS-Regeln für alle Widgets; CSS-Felder für das aktuell ausgewählte Widget stehen in dessen Widget-Eigenschaften.
- Zahlenwerte bieten erste Formatoptionen wie Nachkommastellen, Multiplikator, Dezimalkomma sowie Vor- und Nachsilbe.
- CSS-Eigenschaften umfassen Schrift, Farbe, Hintergrund, Rahmen, Eckenradius, Schatten, Abstand und Deckkraft.

## Geplante nächste Bausteine

- Echte Home-Assistant-Entity-Auswahl und Zustandsbindung für Schalter und andere Widgets.
- Widget-Sets als getrennte, installierbare Erweiterungen.
- Optionales Editor-Plugin zum Importieren eines ioBroker-VIS-Widget-Pakets per URL. Der Importer soll das Paket analysieren, unterstützte Widget-Definitionen in das native HA-Grafik-Widget-Format überführen und nicht unterstützte Eigenschaften mit verständlichen Hinweisen melden.
- Importvorschau mit Zuordnung der Entity-Felder zu Home-Assistant-Entities sowie Prüfung und Bestätigung, bevor ein konvertiertes Widget-Set installiert wird.
- Native Home-Assistant-Integration, die Runtime und Editor als separate Sidebar-Panels registriert.
- Projekte, mehrere Seiten, Import/Export, Vorschau und responsives Verhalten.

## Inspiration und Widget-Import

Bedienung und Funktionsumfang orientieren sich als Inspiration an ioBroker VIS: getrennte Runtime und Editor, Widget-Sets, eine gestaltbare Arbeitsfläche sowie kontextbezogene Eigenschaften. HA Grafik Visual Studio bleibt eine eigenständige Home-Assistant-Entwicklung und übernimmt keinen VIS-Quellcode oder VIS-Widget-Pakete.

Der geplante Widget-Paket-Importer soll eine vom Nutzer angegebene Paket-URL einlesen und zunächst analysieren, welche Teile sich in native Home-Assistant-Widgets übersetzen lassen. Er soll keine fremden Skripte oder Pakete beim Import ausführen. Die Konvertierung wird vor dem Übernehmen angezeigt; nicht unterstützte Funktionen bleiben gekennzeichnet, statt stillschweigend falsch umgesetzt zu werden. Vor einer Übernahme müssen außerdem die Lizenzbedingungen des Quellpakets geprüft werden. Der Importer soll eigene, neu erzeugte HA-Widget-Definitionen erstellen und keine inkompatiblen ioBroker-Objekt- oder Laufzeitbindungen voraussetzen.

Die App-Oberfläche stellt momentan einen einzigen Ingress-Eintrag in der Home-Assistant-Seitenleiste bereit. Zwei eigenständige Sidebar-Einträge benötigen zusätzlich eine Home-Assistant-Integration; das wird nicht durch die App-Store-Installation allein erledigt.

### Getrennte Sidebar-Einträge für Editor und Runtime (experimentell)

Das Add-on stellt weiterhin den normalen Ingress-Eintrag bereit. Für zwei separate Seitenleisteneinträge kann die optionale Integration aus `custom_components/ha_grafik_visual_studio` installiert werden. Sie registriert **HA Grafik Editor** und **HA Grafik Runtime** und öffnet beide über die authentifizierte Add-on-Ingress-Sitzung.

1. Diese optionale Sidebar-Integration setzt Home Assistant OS oder Home Assistant Supervised mit Supervisor voraus. Kopiere den Ordner `custom_components/ha_grafik_visual_studio` nach `/config/custom_components/ha_grafik_visual_studio`.
2. Ergänze in `/config/configuration.yaml` den Integrationsschlüssel (vorhandene YAML-Schlüssel auf oberster Ebene nicht doppelt anlegen):

   ```yaml
   ha_grafik_visual_studio:
   ```

3. Starte Home Assistant neu.
4. Öffne die beiden neuen Einträge in der Seitenleiste. Die Integration sucht das installierte Add-on anhand seines Slugs; der Supervisor-Zugriff ist auf Administratoren beschränkt.
5. Wenn du nur die zwei neuen Einträge verwenden möchtest, deaktiviere **In Seitenleiste anzeigen** in den Add-on-Einstellungen. Das Add-on selbst muss weiterlaufen.

Diese Integration ist wie das Add-on experimentell. Bei Fehlern kannst du den Integrationsordner entfernen und Home Assistant neu starten; der normale Add-on-Ingress bleibt verfügbar.

## VIS2 als Referenz

VIS2 wurde auf Paket- und Quellcodeebene untersucht. Es trennt Editor (`Editor.tsx`) und Runtime (`Runtime.tsx`), lädt Widget-Sets über einen Widget-Katalog und unterstützt unter anderem mehrere Ansichten, Widget-Eigenschaften, Seitenauflösungen sowie absolute und rasterbasierte Layouts. Dieses Projekt übernimmt nur diese allgemeinen Produktideen. Es enthält keinen VIS2-Code, keine VIS2-Widgets und keine VIS2-Ressourcen. Die Widget-Registrierung ist für eigenständige Home-Assistant-Widgets vorgesehen. Ein späterer Importer ist als Konvertierungshilfe geplant, nicht als Möglichkeit, VIS-Widgets samt Abhängigkeiten direkt in Home Assistant auszuführen.
