# To-do: HA Grafik Visual Studio

## Sprachen

- [x] Home-Assistant-Sprache automatisch übernehmen und in den App-Einstellungen eine Auswahl **Automatisch / Deutsch / English** anbieten.
- [ ] Später Französisch als vollständige App-Sprache ergänzen und in der Sprachauswahl anbieten.

## Erweiterungen: Widget-Pakete und Tools

- [ ] Den versionierten Vertrag für Widget-Pakete und Tool-Erweiterungen festlegen: Paketformat, stabile IDs, Eigenschaften, Einstiegspunkte, Fähigkeiten, Berechtigungen, Migrationen und Kompatibilität mit bestehenden Projekten. Die Entwürfe stehen in [widget-rules.md](widget-rules.md) und [tool-rules.md](tool-rules.md).
- [x] Widget-Schnittstelle 0.1 für lokale deklarative Textpakete mit Manifestprüfung, Palette, Eigenschaften, Runtime, Paketliste und Nutzungssperre beim Entfernen. Erledigt in 0.1.80; weitergehende Fähigkeiten und Tool-Vertrag bleiben offen.
- [x] Paket-Widget-Icons zunächst als geprüfte SVG-Dateien zulassen; ohne eigenes Icon das integrierte SVG-Symbol verwenden. Erledigt in 0.1.81.
- [x] Widget-, Tool- und Paketbilder zusätzlich als geprüftes PNG zulassen. Die Standard-Icons der Studio-Buttons bleiben SVG. Erledigt in 0.1.83.
- [x] Tool-Schnittstelle 0.1 mit lokaler `.tp.zip`-Installation, geprüftem Manifest, Tool-Liste, Vorschau, bestätigter Seitenaktion und Rückgängig. Erledigt in 0.1.82; weitere Tool-Aktionen und Berechtigungen folgen später.
- [x] Den Einstellungen-Dialog in **Allgemein**, **Widget-Pakete** und **Tools** aufteilen; die Paket-Tabs zeigen kompakte, scrollbar begrenzte Leerlisten. Erledigt in 0.1.79.
- [ ] Die Paketverwaltung erweitern: GitHub-Installation, Update-Suche/-Prüfung, Kompatibilitätsstatus und angeforderte Fähigkeiten. Lokale Widget-ZIP-Installation ist seit 0.1.80, lokale Tool-ZIP-Installation seit 0.1.82 vorhanden.
- [ ] Ein vollständiges Demo-Widget-Paket mit Quellcode, Paketdatei, Tests und DE/EN-Dokumentation einschließlich Ordnerstruktur und Einstiegspunkten bereitstellen.
- [ ] Ein vollständiges Demo-Tool-Paket mit Quellcode, Paketdatei, Tests, Ergebnisvorschau, Rückgängig-Funktion und derselben DE/EN-Strukturdokumentation bereitstellen.
- [ ] Einen webbasierten Grundgerüst-Generator für Widget- oder Tool-Pakete bauen. Eingaben sollen unter anderem Name, Paket-ID, Icon, Beschreibung, Sprache, Kompatibilitätsversion sowie passende Widget-Eigenschaften oder Tool-Kontexte und Rechte umfassen.
- [x] Den Studio-Importer für die ZIP-basierten Endungen `.wg` und `.tp` erweitern; `.wg.zip` und `.tp.zip` bleiben nutzbar. Paketart und Manifest werden weiter geprüft. Erledigt in 0.1.89.
- [x] Ersten Packer-Kern für Quellordnerprüfung und sicheren Export von `.wg` und `.tp` erstellen. Erledigt in 0.1.89; die weitere Entwicklung liegt im privaten Packer-Repository. Oberfläche und Dateityp-Registrierung folgen.
- [ ] Aus dem Generator eine ZIP-Datei mit nutzbarem Quellcode, Paketdatei, Tests, README und einer Strukturerklärung in Deutsch und Englisch erzeugen. Widget-Pakete heißen `*.wg`, Tool-Pakete `*.tp`; der Generator ergänzt die passende Endung automatisch. Die generierten Vorlagen prüfen und beim Import Paketart und Manifest zusätzlich zur Endung validieren.
- [ ] Eine isolierte Testumgebung für Erweiterungsentwürfe schaffen, in der ein Paket ohne Installation geladen und ausprobiert werden kann. Widgets sollen Editor- und Runtime-Vorschau, Größen- und Eigenschaftsänderungen sowie simulierte HA-Zustände zeigen; Tools sollen Auswahlkontexte, Ergebnisvorschau und Rückgängig testen können.
- [ ] Im geplanten Windows-/Linux-Packer den Button **Endungen registrieren** umsetzen: eigene Icons für `.wg` und `.tp`, vorhandene Archivprogramme erkennen, Öffnungsoptionen anzeigen und Dateitypen für den aktuellen Benutzer registrieren. Die Standard-App bleibt eine ausdrückliche Benutzerwahl; Details stehen in [packer-rules.md](packer-rules.md#dateitypen-registrieren).
- [ ] In der Testumgebung Fehlerfälle wie fehlende Entitäten, ungültige Werte und fehlende Rechte simulieren; vor dem ZIP-Export Pflichtfelder, Versionen, Übersetzungen und Kompatibilität prüfen.
- [ ] Später einen ausdrücklich aktivierten Testmodus für echte Home-Assistant-Zustände und -Dienste ergänzen. Der erste Testmodus bleibt bei lokalen Beispieldaten und führt keine echten HA-Aktionen aus.

## Home-Assistant-Anbindung

- [x] Runtime-Zustände für Sensor, String, Red Number, Bar, Gauge und Bool HTML alle fünf Sekunden lesen; Sichtbarkeitsregeln daran binden. Erledigt in 0.1.72.
- [x] Switch-Widget für `switch`, `light` und `input_boolean` über HA-Dienste schalten und den bestätigten Zustand anzeigen. Erledigt in 0.1.73; der Endpunkt wurde in 0.1.74 abgesichert.

- [ ] Zustände gebundener Entitäten in Editor und Runtime live lesen und bei Änderungen aktualisieren. Der Entitätenbrowser liest derzeit nur beim Öffnen oder manuellen Aktualisieren; eine ausgewählte Entity-ID allein bindet noch kein Widget.
- [ ] Bedienbare Widgets über passende Home-Assistant-Dienste tatsächlich steuern. Schalter, Buttons, Slider und andere Eingaben dürfen nicht nur lokale Testwerte ändern; Erfolg, Fehler und der bestätigte neue HA-Zustand müssen sichtbar sein.
- [ ] Die zusätzlichen Steuerfunktionen aller Widget-Typen einzeln prüfen und für unterstützte HA-Domänen zuordnen. Anzeige-Widgets bleiben lesend; Funktionen ohne sichere HA-Entsprechung werden klar als nicht unterstützt gekennzeichnet.
- [ ] Pro Widget-Typ Lese-, Schreib- und Fehlerfälle sowie die Runtime nach einem Neuladen prüfen und den tatsächlichen Funktionsumfang in der DE/EN-Dokumentation nachziehen.
