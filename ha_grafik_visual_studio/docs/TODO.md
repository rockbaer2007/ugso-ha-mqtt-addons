# To-do: HA Grafik Visual Studio

## Aktueller Stand 0.1.299 (8. November 2026)

- [x] Geräte-Set, Tablet-Rückkehr, optionale Inaktivitäts-Startseite, Live-Werte in Überschriften und bedarfsgerechte Renderer (0.1.297).
- [x] Kompakte Miniaturpalette mit Beschreibungen, UGSo-Kacheln nur mit Namen, Inline-Runtime neben den Seitenreitern und separate Runtime (0.1.299, einschließlich der lokal geprüften 0.1.298).
- [x] Zuletzt benutzt unter der Suche: zwölf unterschiedliche Widgettypen und Einklappzustand browserlokal speichern. Auf .177 und .193 geprüft; Projekte und Einstellungen erhalten.
- [ ] Als nächstes empfohlen: vollständigen Projekt-Export/Import mit lokalen Medien, Paketabhängigkeiten und Importvorschau entwickeln. Vorhandene Projekte nicht überschreiben; Widget-JSON-Export bleibt erhalten. Umsetzung noch nicht begonnen.
- [ ] Praktische Geräte-/Recorder-/Companion- und Tablet-Schlaf-/Aufweckprüfungen ergänzen; die bisherigen Tests belegen keine vollständige Hardwareabdeckung.
- [ ] Allgemeine Studio-Oberfläche vollständig auf Französisch ergänzen. Widget-/Projekttexte und Dokumentation unterstützen bereits DE/EN/FR.
- [ ] Web Components als separates größeres Folgevorhaben bewerten. Noch keine implementierte Funktion.

Die älteren Einzelaufgaben unten sind historisch gewachsen. Teilfunktionen können bereits verfügbar sein; der aktuelle Umfang ist in der Open-Source-Doku und im Changelog beschrieben. Eigenständige Runtime und Koppel-App bleiben größere Folgevorhaben.

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
- [x] Paketverwaltung mit GitHub-Installation, Community-Katalog, kompatiblen angebotenen Updates und optionalen deklarativen Fähigkeiten erweitern. Paketänderungen werden ab 0.1.297 ohne Neustart übernommen; unbekannte Fähigkeiten gewähren keine zusätzlichen Rechte. Erweiterte Berechtigungsverträge bleiben davon getrennt.
- [ ] Ein vollständiges Demo-Widget-Paket mit Quellcode, Paketdatei, Tests und DE/EN-Dokumentation einschließlich Ordnerstruktur und Einstiegspunkten bereitstellen.
- [ ] Ein vollständiges Demo-Tool-Paket mit Quellcode, Paketdatei, Tests, Ergebnisvorschau, Rückgängig-Funktion und derselben DE/EN-Strukturdokumentation bereitstellen.
- [ ] Einen webbasierten Grundgerüst-Generator für Widget- oder Tool-Pakete bauen. Eingaben sollen unter anderem Name, Paket-ID, Icon, Beschreibung, Sprache, Kompatibilitätsversion sowie passende Widget-Eigenschaften oder Tool-Kontexte und Rechte umfassen.
- [x] Den Studio-Importer für die ZIP-basierten Endungen `.wg` und `.tp` erweitern; `.wg.zip` und `.tp.zip` bleiben nutzbar. Paketart und Manifest werden weiter geprüft. Erledigt in 0.1.89.
- [x] Packer-Kern für Quellordnerprüfung und sicheren Export von `.wg` und `.tp` erstellen. Erledigt in 0.1.89; die Qt-Oberfläche, Dateityp-Registrierung und eigenständige Testprogramme liegen im privaten Packer-Repository.
- [ ] Aus dem Generator eine ZIP-Datei mit nutzbarem Quellcode, Paketdatei, Tests, README und einer Strukturerklärung in Deutsch und Englisch erzeugen. Widget-Pakete heißen `*.wg`, Tool-Pakete `*.tp`; der Generator ergänzt die passende Endung automatisch. Die generierten Vorlagen prüfen und beim Import Paketart und Manifest zusätzlich zur Endung validieren.
- [ ] Eine isolierte Testumgebung für Erweiterungsentwürfe schaffen, in der ein Paket ohne Installation geladen und ausprobiert werden kann. Widgets sollen Editor- und Runtime-Vorschau, Größen- und Eigenschaftsänderungen sowie simulierte HA-Zustände zeigen; Tools sollen Auswahlkontexte, Ergebnisvorschau und Rückgängig testen können.
- [x] Im Windows-/Linux-Packer den Button **Endungen registrieren** umsetzen: eigene Icons für `.wg` und `.tp`, vorhandene grafische Archivprogramme erkennen, Öffnungsoptionen vor Bestätigung anzeigen und Dateitypen für den aktuellen Benutzer registrieren. Die Standard-App bleibt eine ausdrückliche Benutzerwahl; Details stehen in [packer-rules.md](packer-rules.md#dateitypen-registrieren).
- [x] Eigenständige Windows- und Linux-Testprogramme mit eingebetteten Paketprüfungen und Icons bauen; beide Plattformen führen Tests und Selbsttest im privaten CI aus.
- [x] Packer 0.2.0 als Windows- und Linux-Archiv im öffentlichen Studio-Repository veröffentlichen; Archive mit Qt-Lizenzhinweisen, `SHA256SUMS` und Ed25519-Signatur bereitstellen und in der DE/EN-Dokumentation verlinken.
- [ ] In der Testumgebung Fehlerfälle wie fehlende Entitäten, ungültige Werte und fehlende Rechte simulieren; vor dem ZIP-Export Pflichtfelder, Versionen, Übersetzungen und Kompatibilität prüfen.
- [ ] Später einen ausdrücklich aktivierten Testmodus für echte Home-Assistant-Zustände und -Dienste ergänzen. Der erste Testmodus bleibt bei lokalen Beispieldaten und führt keine echten HA-Aktionen aus.

## Home-Assistant-Anbindung

- [x] Runtime-Zustände für Sensor, String, Red Number, Bar, Gauge und Bool HTML alle fünf Sekunden lesen; Sichtbarkeitsregeln daran binden. Erledigt in 0.1.72.
- [x] Switch-Widget für `switch`, `light` und `input_boolean` über HA-Dienste schalten und den bestätigten Zustand anzeigen. Erledigt in 0.1.73; der Endpunkt wurde in 0.1.74 abgesichert.

- [x] Unterstützte Entitätsbindungen in Editor und Runtime live lesen und aktualisieren. In Studio 0.1.295 vorhanden; Quellcode-, Modell- und Browserprüfungen dokumentiert in `docs/remaining-widget-audit-2026-10-12.md`.
- [x] Vorhandene Schalter, Eingaben, Regler, Rollo-, Licht- und Einzel-Sollwertaktionen über fest zugeordnete HA-Dienste steuern. Unterstützte Domänen/Grenzen werden geprüft; Anzeige-Widgets bleiben lesend. Zusätzliche Gerätefunktionen sind damit nicht vollständig abgedeckt.
- [ ] Die zusätzlichen Steuerfunktionen aller Widget-Typen einzeln prüfen und für unterstützte HA-Domänen zuordnen. Anzeige-Widgets bleiben lesend; Funktionen ohne sichere HA-Entsprechung werden klar als nicht unterstützt gekennzeichnet.
- [x] Studio 0.1.296: verbleibende Widget-Eigenschaften und Laufzeitmeldungen in DE/EN/FR; optionale Climate-Funktionen und Quellen-/Attribut-/Einheitenprüfung. Bestehende Projekte und Paketversionen bleiben gültig. Anleitung: `docs/widgets-0.1.296.md`.
- [ ] Ergänzend zu automatisierten Modell-/API-/Browserprüfungen echte Geräte, Recorder-Daten, Ingress/Companion und externe Einbettungen prüfen.
