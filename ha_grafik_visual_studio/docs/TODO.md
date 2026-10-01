# To-do: HA Grafik Visual Studio

## Sprachen

- [x] Home-Assistant-Sprache automatisch übernehmen und in den App-Einstellungen eine Auswahl **Automatisch / Deutsch / English** anbieten.
- [ ] Später Französisch als vollständige App-Sprache ergänzen und in der Sprachauswahl anbieten.

## Erweiterungen: Widget-Pakete und Tools

- [ ] Den versionierten Vertrag für Widget-Pakete und Tool-Erweiterungen festlegen: Paketformat, stabile IDs, Eigenschaften, Einstiegspunkte, Fähigkeiten, Berechtigungen, Migrationen und Kompatibilität mit bestehenden Projekten. Die Entwürfe stehen in [widget-rules.md](widget-rules.md) und [tool-rules.md](tool-rules.md).
- [x] Den Einstellungen-Dialog in **Allgemein**, **Widget-Pakete** und **Tools** aufteilen; die Paket-Tabs zeigen kompakte, scrollbar begrenzte Leerlisten. Erledigt in 0.1.79.
- [ ] Installierte Widget- und Tool-Pakete in den Listen mit Version, Kompatibilität, Status und angeforderten Fähigkeiten anzeigen; lokale ZIP- und GitHub-Installation sowie Update-Suche und Entfernen ergänzen.
- [ ] Ein vollständiges Demo-Widget-Paket mit Quellcode, Paketdatei, Tests und DE/EN-Dokumentation einschließlich Ordnerstruktur und Einstiegspunkten bereitstellen.
- [ ] Ein vollständiges Demo-Tool-Paket mit Quellcode, Paketdatei, Tests, Ergebnisvorschau, Rückgängig-Funktion und derselben DE/EN-Strukturdokumentation bereitstellen.
- [ ] Einen webbasierten Grundgerüst-Generator für Widget- oder Tool-Pakete bauen. Eingaben sollen unter anderem Name, Paket-ID, Icon, Beschreibung, Sprache, Kompatibilitätsversion sowie passende Widget-Eigenschaften oder Tool-Kontexte und Rechte umfassen.
- [ ] Aus dem Generator eine ZIP-Datei mit nutzbarem Quellcode, Paketdatei, Tests, README und einer Strukturerklärung in Deutsch und Englisch erzeugen. Widget-Pakete heißen `*.wg.zip`, Tool-Pakete `*.tp.zip`; der Generator ergänzt die passende Endung automatisch. Die generierten Vorlagen prüfen und beim Import Paketart und Manifest zusätzlich zur Endung validieren.
- [ ] Eine isolierte Testumgebung für Erweiterungsentwürfe schaffen, in der ein Paket ohne Installation geladen und ausprobiert werden kann. Widgets sollen Editor- und Runtime-Vorschau, Größen- und Eigenschaftsänderungen sowie simulierte HA-Zustände zeigen; Tools sollen Auswahlkontexte, Ergebnisvorschau und Rückgängig testen können.
- [ ] In der Testumgebung Fehlerfälle wie fehlende Entitäten, ungültige Werte und fehlende Rechte simulieren; vor dem ZIP-Export Pflichtfelder, Versionen, Übersetzungen und Kompatibilität prüfen.
- [ ] Später einen ausdrücklich aktivierten Testmodus für echte Home-Assistant-Zustände und -Dienste ergänzen. Der erste Testmodus bleibt bei lokalen Beispieldaten und führt keine echten HA-Aktionen aus.

## Home-Assistant-Anbindung

- [x] Runtime-Zustände für Sensor, String, Red Number, Bar, Gauge und Bool HTML alle fünf Sekunden lesen; Sichtbarkeitsregeln daran binden. Erledigt in 0.1.72.
- [x] Switch-Widget für `switch`, `light` und `input_boolean` über HA-Dienste schalten und den bestätigten Zustand anzeigen. Erledigt in 0.1.73; der Endpunkt wurde in 0.1.74 abgesichert.

- [ ] Zustände gebundener Entitäten in Editor und Runtime live lesen und bei Änderungen aktualisieren. Der Entitätenbrowser liest derzeit nur beim Öffnen oder manuellen Aktualisieren; eine ausgewählte Entity-ID allein bindet noch kein Widget.
- [ ] Bedienbare Widgets über passende Home-Assistant-Dienste tatsächlich steuern. Schalter, Buttons, Slider und andere Eingaben dürfen nicht nur lokale Testwerte ändern; Erfolg, Fehler und der bestätigte neue HA-Zustand müssen sichtbar sein.
- [ ] Die zusätzlichen Steuerfunktionen aller Widget-Typen einzeln prüfen und für unterstützte HA-Domänen zuordnen. Anzeige-Widgets bleiben lesend; Funktionen ohne sichere HA-Entsprechung werden klar als nicht unterstützt gekennzeichnet.
- [ ] Pro Widget-Typ Lese-, Schreib- und Fehlerfälle sowie die Runtime nach einem Neuladen prüfen und den tatsächlichen Funktionsumfang in der DE/EN-Dokumentation nachziehen.
