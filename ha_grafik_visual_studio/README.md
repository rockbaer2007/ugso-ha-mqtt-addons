# HA Grafik Visual Studio

> **Status: Experimentell.** Das Projekt befindet sich in einer frühen Entwicklungsphase. Funktionen, Projektformat und Bedienung können sich ändern; noch nicht für produktive Dashboards einplanen.

Regeln und Entwürfe für spätere Erweiterungen stehen in [docs/widget-rules.md](docs/widget-rules.md) und [docs/tool-rules.md](docs/tool-rules.md).

Der Einstellungen-Dialog hat die Tabs **Allgemein**, **Widget-Pakete** und **Tools**. Unter **Widget-Pakete** lassen sich ab 0.1.80 lokale, deklarative `*.wg.zip`-Pakete mit 1 bis 30 Widgets installieren, anzeigen und bei Nichtverwendung entfernen. Paket- und Widget-Bilder dürfen geprüfte SVG- oder PNG-Dateien sein; ohne eigenes Widget-Bild erscheint das integrierte SVG-Textsymbol. [Widget-Schnittstelle 0.1](docs/widget-rules.md#widget-paket-schnittstelle-01) beschreibt das geprüfte Manifest und den derzeit auf Textdarstellung begrenzten Vertrag. Unter **Tools** lassen sich ab 0.1.82 lokale `.tp.zip`-Pakete mit genau einem Tool installieren; die erste [Tool-Schnittstelle 0.1](docs/tool-rules.md#tool-paket-schnittstelle-01) bietet eine bestätigte Seitenhintergrund-Aktion mit Vorschau und Rückgängig. Installierte Tools erscheinen als Symbolaktionen in zwei Reihen der Editor-Werkzeugleiste und öffnen dort ihre Vorschau. Das Verwaltungssymbol führt direkt zum Tool-Tab. Auch Tool- und Tool-Paketbilder dürfen SVG oder PNG sein. Die Studio-Buttons verwenden weiterhin SVG-Symbole. GitHub-Installation, Updates und weitere Fähigkeiten folgen später.

Eigenständiges Home-Assistant-App-Projekt für eine grafische Visualisierung mit getrenntem Editor und Runtime. Das Paket ist ein frühes Grundgerüst, keine fertige VIS2-Alternative.

Seit 0.1.89 akzeptiert der lokale Paket-Import zusätzlich `.wg` und `.tp`. Beide Endungen enthalten weiterhin ein geprüftes ZIP-Archiv; `.wg.zip` und `.tp.zip` bleiben kompatibel.

Das Add-on enthält `icon.svg` und `logo.svg` als editierbare Markengrafiken sowie daraus gerenderte PNG-Dateien für den Home-Assistant-App-Store.

## Aktueller Stand

- **Neuer Tab** unter Runtime öffnet das aktuelle Projekt und die aktuelle Seite direkt in einem eigenen Browser-Tab ohne Home-Assistant-Kopf- und Seitenleiste. Beim Add-on wird die vorhandene authentifizierte Ingress-Sitzung verwendet.

- Home Assistant App-Store-Paket für dieses gemeinsame App-Repository.
- Visualisierungsprojekte werden getrennt unter `/data/projects/` gespeichert; vorhandene Projekte aus `/data/project.json` werden beim ersten Start übernommen.
- Jedes Projekt hat eigene Seiten, Einstellungen und getrennte Editor- sowie Runtime-Links.
- Die Leiste bietet Widget-Auswahl, Projekteinstellungen, Projektverwaltung, einen Dateienbrowser für Dateien unter `/config/www` und einen Entitätenbrowser. Der Entitätenbrowser liest Entitäten, Geräte und aktuelle Zustände beim Öffnen sowie auf Anforderung neu über den Home-Assistant-WebSocket-Proxy ein; Geräte lassen sich aufklappen und die Entity-ID kann gesucht, kopiert oder direkt in ein Widget-Feld eingefügt werden. Dafür ist die Add-on-Berechtigung `homeassistant_api` aktiviert; das Supervisor-Token bleibt serverseitig.
- Der Dateienbrowser sucht den Home-Assistant-www-Mount in den üblichen Containerpfaden `/homeassistant/www`, `/homeassistant_config/www` und `/config/www`.
- Die Dateiauswahl steht in Icon-/Bildfeldern sowie bei Hintergrundbild und Runtime-Favicon direkt zur Verfügung.
- Der Dateienbrowser erlaubt Mehrfachuploads unterstützter Bilder, Code-/JSON-, Text-, Audio- und Videodateien bis 20 MB in den offenen www-Ordner. Der Dateitypfilter begrenzt sowohl die Dateiliste als auch die Typen im Upload-Auswahldialog. Ausgewählte `/local/...`-Pfade lassen sich kopieren; Bilddateien können einzeln in das aktive Feld übernommen werden. Für Uploads benötigt das Add-on Schreibzugriff auf die Home-Assistant-Konfiguration.
- Dateien erscheinen als Liste mit Miniaturansicht beziehungsweise Dateitypsymbol und Dateigröße. Jede Datei kann über die Aktionssymbole heruntergeladen oder nach Bestätigung gelöscht werden. Ordner lassen sich erstellen und die Dateiliste neu laden.
- Die Aktionen und Dateitypen im Dateien-Dialog verwenden lokale SVG-Symbole.
- Ein Ansichtsbutton schaltet im Dateien-Dialog zwischen Liste und Kacheln mit größeren Bildvorschauen um.
- Ein Projekt kann mehrere benannte Seiten mit jeweils eigener Größe, eigenem Hintergrund und eigenen Widgets enthalten. Das linke Seitenmenü kann Seiten hinzufügen, umbenennen, duplizieren, ausblenden und löschen; die Runtime bietet die sichtbaren Seiten zur Auswahl an.
- Im Editor findet die Widget-Auswahl neben dem Seitenmenü Elemente anhand ihres Namens und Typs; die Auswahl markiert das Widget und öffnet seine Eigenschaften.
- Das ausgewählte Widget kann um eine Ebene nach vorn oder hinten verschoben, als JSON exportiert oder aus einem JSON-Widgetpaket importiert werden.
- Erste eigene, HA-orientierte Widget-Definitionen sind nach Kategorien registriert.
- Das Widget-Register ist separat; weitere eigene Widget-Sets können später unabhängig ergänzt werden.
- Auto-Save speichert Editoränderungen standardmäßig fünf Sekunden nach der letzten Änderung. Unter Einstellungen lässt es sich abschalten und die Wartezeit auf 1 bis 300 Sekunden setzen. Manuelles Speichern bleibt verfügbar; die Runtime speichert nicht automatisch.
- Die Oberfläche folgt automatisch der Home-Assistant-Sprache: Deutsch bei `de`, sonst Englisch. Unter **Einstellungen → Sprache** lässt sich **Automatisch**, **Deutsch** oder **English** für den eigenen Browser wählen; Projektdaten und Widget-Inhalte werden dabei nicht übersetzt.
- Seitengrößen Desktop, Tablet und Telefon können im Editor gewählt werden.
- Das Text-Widget ist ein freies Textfeld ohne Entitätsbindung oder Entitäts-Fehlermeldung.
- Widgets sind frei platzierte HTML-Elemente; Auswahl zeigt ihre Widget-ID und einen blauen Rahmen mit Resize-Griff. Jedes Element hat standardmäßig z-index 0; z-index lässt sich je Widget einstellen.
- Widget-Namen sind optional. Ein grafischer Schalter kann ohne eigene Beschriftung angezeigt und bei Bedarf mit einem separaten Text-Widget beschriftet werden.
- Icon- und Bildfelder bieten eine kleine Vorschau und eine MDI-Auswahl. Andere Home-Assistant-Iconset-Namen wie `atlas:home` oder `custom:home` sowie Grafikpfade wie `/local/icons/home.png` können direkt eingetragen werden; die jeweilige Iconset-Integration muss in Home Assistant installiert sein.
- Zustandsgebundene Widgets können bis zu neun Signalbild-Overlays mit Bedingung, Bild, kleinem Symbol, Größe, Position, Blinkverhalten, CSS-Stil und optionalem Text konfigurieren.
- Jedes Widget stellt eigene CSS-Gruppen für Position/Layout, Text, Hintergrund, Rahmen sowie Schatten und Abstände bereit.
- Die Basispalette enthält VIS-inspirierte native Widgets mit unveränderten englischen Namen: Number (getrennt von Red Number), String, HTML, Bild-URL aus einem Wert, Zeit-/Zeitstempelwerte, Wertelisten als Text/HTML/HTML mit Stil, Bool-HTML-Anzeige und -Steuerung, Auswahl, Table, Full Screen, Bar, HTML navigation und filter - dropdown. Dazu kommen Switch mit direktem Ein-/Aus-Zustand, Bool Checkbox, Bulb on/off, Border sowie eigene Widgets wie Slider und Text.
- Das eigenständige Widget-Set „HA Grafik – Interaktiv“ startet mit einem Zustands-Element: bis zu fünf Werte können unterschiedliche Icons, Bilder, Texte oder HTML anzeigen. Icongröße und Farbe, Bildgröße und -anpassung sowie Inhaltsanordnung sind je Zustand einstellbar. Schalter- und Button-Modus lassen sich in der Runtime lokal testen; die echte Entity-Bindung ist noch nicht enthalten.
- HTML-Felder bieten über den Stift einen mehrzeiligen Code-Editor mit Zeilennummern, Speichern und Abbrechen. HTML-Elemente, Attribute und Formatierungen werden ohne die frühere Whitelist übernommen. Zahlen, Zeiten, Tabellen und Wertelisten verwenden aktuell lokale Testwerte; die Entitätsauswahl ist verfügbar, die Live-Zustandsbindung in Widgets steht noch aus. Eine sinnvolle Home-Assistant-Abbildung der ioBroker-AckFlag-Anzeige bleibt zu prüfen.
- Drei Punkte öffnen die Entitäts-, Icon-/Bild- oder multi-views-Seitenauswahl. Slider bieten zusätzlich eine synchronisierte Zahleneingabe. Der Attributbereich bleibt bei aufgeklappten Gruppen scrollbar.
- Der Filter-Dropdown filtert Widgets anhand des Felds „Filterwort“ in deren Eigenschaften. Navigation öffnet eine sichere URL oder einen relativen Home-Assistant-Pfad; ein Wechsel zwischen mehreren Projektseiten folgt mit der Mehrseiten-Unterstützung.
- Der Seitenhintergrund unterstützt eine Farbe oder ein Bild mit Kachel-, Zentriert- und Stretch-Darstellung.
- Der rechte Eigenschaftenbereich orientiert sich an VIS2s Reitern für Ansicht, Widget, CSS und Skripte; Widget-Metadaten, Sichtbarkeit, Inhalt und CSS sind getrennt gruppiert.
- Der CSS-Reiter enthält projektweite CSS-Regeln für alle Widgets; CSS-Felder für das aktuell ausgewählte Widget stehen in dessen Widget-Eigenschaften.
- Zahlenwerte bieten erste Formatoptionen wie Nachkommastellen, Multiplikator, Dezimalkomma sowie Vor- und Nachsilbe. Entitätsfelder im Widget-Editor lassen sich über die Entitätenauswahl befüllen. In der Runtime lesen Sensor, String, Red Number, Bar, Gauge und Bool HTML gebundene HA-Zustände alle fünf Sekunden. Ein Switch-Widget mit `switch`, `light` oder `input_boolean` sendet Schaltbefehle über den HA-Dienst; andere Steuer-Widgets und Datenbindungen folgen später.
- CSS-Eigenschaften umfassen Schrift, Farbe, Hintergrund, Rahmen, Eckenradius, Schatten, Abstand und Deckkraft.

## Geplante nächste Bausteine

- Echte Home-Assistant-Entity-Auswahl und Zustandsbindung für Schalter und andere Widgets.
- Widget-Sets als getrennte, installierbare Erweiterungen.
- Optionales Editor-Plugin zum Importieren eines ioBroker-VIS-Widget-Pakets per URL. Der Importer soll das Paket analysieren, unterstützte Widget-Definitionen in das native HA-Grafik-Widget-Format überführen und nicht unterstützte Eigenschaften mit verständlichen Hinweisen melden.
- Importvorschau mit Zuordnung der Entity-Felder zu Home-Assistant-Entities sowie Prüfung und Bestätigung, bevor ein konvertiertes Widget-Set installiert wird.
- Native Home-Assistant-Integration, die Runtime und Editor als separate Sidebar-Panels registriert.
- Projekte, Import/Export, Vorschau und responsives Verhalten.

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

Die Entitätenauswahl funktioniert auch im normalen Add-on-Ingress. Die optionale Integration ist nur für separate Einträge **HA Grafik Editor** und **HA Grafik Runtime** erforderlich. Nach Updates dieser Integration müssen Änderungen im Ordner `custom_components/ha_grafik_visual_studio` erneut nach `/config/custom_components/ha_grafik_visual_studio` kopiert und Home Assistant neu gestartet werden.

## VIS2 als Referenz

VIS2 wurde auf Paket- und Quellcodeebene untersucht. Es trennt Editor (`Editor.tsx`) und Runtime (`Runtime.tsx`), lädt Widget-Sets über einen Widget-Katalog und unterstützt unter anderem mehrere Ansichten, Widget-Eigenschaften, Seitenauflösungen sowie absolute und rasterbasierte Layouts. Dieses Projekt übernimmt nur diese allgemeinen Produktideen. Es enthält keinen VIS2-Code, keine VIS2-Widgets und keine VIS2-Ressourcen. Die Widget-Registrierung ist für eigenständige Home-Assistant-Widgets vorgesehen. Ein späterer Importer ist als Konvertierungshilfe geplant, nicht als Möglichkeit, VIS-Widgets samt Abhängigkeiten direkt in Home Assistant auszuführen.
