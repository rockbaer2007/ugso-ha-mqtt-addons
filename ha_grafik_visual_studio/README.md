# HA Grafik Visual Studio

Eigenständiges Home-Assistant-App-Projekt für eine grafische Visualisierung mit getrenntem Editor und Runtime. Das Paket ist ein frühes Grundgerüst, keine fertige VIS2-Alternative.

## Aktueller Stand

- Home Assistant App-Store-Paket für dieses gemeinsame App-Repository.
- Ein gemeinsamer Projektentwurf wird unter `/data/project.json` gespeichert.
- Editor- und Runtime-Modus verwenden denselben Entwurf.
- Erste eigene, HA-orientierte Widget-Definitionen sind nach Kategorien registriert.
- Das Widget-Register ist separat; weitere eigene Widget-Sets können später unabhängig ergänzt werden.
- Seitengrößen Desktop, Tablet und Telefon können im Editor gewählt werden.
- Widget-Eigenschaften enthalten bereits Position, Größe, Eckenradius und Sichtbarkeit.

## Geplante nächste Bausteine

- Echte Home-Assistant-Entity-Auswahl und Zustandsbindung.
- Bedingungen für die Sichtbarkeit und übereinanderliegende Widgets.
- Widget-Sets als getrennte, installierbare Erweiterungen.
- Optionales Editor-Plugin zum Importieren eines ioBroker-VIS-Widget-Pakets per URL. Der Importer soll das Paket analysieren, unterstützte Widget-Definitionen in das native HA-Grafik-Widget-Format überführen und nicht unterstützte Eigenschaften mit verständlichen Hinweisen melden.
- Importvorschau mit Zuordnung der Entity-Felder zu Home-Assistant-Entities sowie Prüfung und Bestätigung, bevor ein konvertiertes Widget-Set installiert wird.
- Native Home-Assistant-Integration, die Runtime und Editor als separate Sidebar-Panels registriert.
- Projekte, mehrere Seiten, Import/Export, Vorschau und responsives Verhalten.

## Inspiration und Widget-Import

Bedienung und Funktionsumfang orientieren sich als Inspiration an ioBroker VIS: getrennte Runtime und Editor, Widget-Sets, eine gestaltbare Arbeitsfläche sowie kontextbezogene Eigenschaften. HA Grafik Visual Studio bleibt eine eigenständige Home-Assistant-Entwicklung und übernimmt keinen VIS-Quellcode oder VIS-Widget-Pakete.

Der geplante Widget-Paket-Importer soll eine vom Nutzer angegebene Paket-URL einlesen und zunächst analysieren, welche Teile sich in native Home-Assistant-Widgets übersetzen lassen. Er soll keine fremden Skripte oder Pakete beim Import ausführen. Die Konvertierung wird vor dem Übernehmen angezeigt; nicht unterstützte Funktionen bleiben gekennzeichnet, statt stillschweigend falsch umgesetzt zu werden. Vor einer Übernahme müssen außerdem die Lizenzbedingungen des Quellpakets geprüft werden. Der Importer soll eigene, neu erzeugte HA-Widget-Definitionen erstellen und keine inkompatiblen ioBroker-Objekt- oder Laufzeitbindungen voraussetzen.

Die App-Oberfläche stellt momentan einen einzigen Ingress-Eintrag in der Home-Assistant-Seitenleiste bereit. Zwei eigenständige Sidebar-Einträge benötigen zusätzlich eine Home-Assistant-Integration; das wird nicht durch die App-Store-Installation allein erledigt.

## VIS2 als Referenz

VIS2 wurde auf Paket- und Quellcodeebene untersucht. Es trennt Editor (`Editor.tsx`) und Runtime (`Runtime.tsx`), lädt Widget-Sets über einen Widget-Katalog und unterstützt unter anderem mehrere Ansichten, Widget-Eigenschaften, Seitenauflösungen sowie absolute und rasterbasierte Layouts. Dieses Projekt übernimmt nur diese allgemeinen Produktideen. Es enthält keinen VIS2-Code, keine VIS2-Widgets und keine VIS2-Ressourcen. Die Widget-Registrierung ist für eigenständige Home-Assistant-Widgets vorgesehen. Ein späterer Importer ist als Konvertierungshilfe geplant, nicht als Möglichkeit, VIS-Widgets samt Abhängigkeiten direkt in Home Assistant auszuführen.
