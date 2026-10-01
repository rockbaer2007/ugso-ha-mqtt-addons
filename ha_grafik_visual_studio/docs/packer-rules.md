# Packer-Regeln für HA Grafik Visual Studio

Stand: 01.10.2026. Dieses Dokument hält den vereinbarten Entwurf für ein eigenständiges Programm zum Erstellen von Widget- und Tool-Paketen fest. Die Packer-Entwicklung liegt in einem separaten privaten Repository. Ein erster Kern kann Quellordner prüfen und `.wg`-/`.tp`-Dateien exportieren. Die grafische Oberfläche und Dateityp-Registrierung sind noch nicht implementiert. Die App installiert lokale `*.wg`- und `*.tp`-Dateien sowie die bisherigen `*.wg.zip`- und `*.tp.zip`-Dateien nach den Verträgen in [widget-rules.md](widget-rules.md) und [tool-rules.md](tool-rules.md).

## Ziel und Paketformat

- Ein Programm erstellt beide Paketarten: **Widget-Pakete** und **Tool-Pakete**.
- Die neue Ausgabedatei endet auf `*.wg` beziehungsweise `*.tp`. Ihr Inhalt bleibt ein normales ZIP mit `manifest.json` und gegebenenfalls Bildern unter `icons/`. Die Endung kennzeichnet die Paketart; die Prüfung muss zusätzlich das Manifest und den ZIP-Inhalt validieren.
- Bisherige `*.wg.zip`- und `*.tp.zip`-Pakete sollen beim Import weiter unterstützt werden. Ein bloßes Umbenennen einer ungeeigneten ZIP-Datei macht daraus kein gültiges Paket.
- Der Packer ändert keine Widget- oder Tool-Grundfunktion. Er verpackt und prüft die bestehenden deklarativen Schnittstellen 0.1. Erweiterte Paketfähigkeiten benötigen später eigene Verträge.

## Plattform und Oberfläche

- Der Packer soll unter **Windows und Linux** mit derselben Oberfläche laufen. Qt mit Python/PySide6 ist die bevorzugte technische Basis; Qt darf nicht als auf jedem System vorinstalliert vorausgesetzt werden. Die Auslieferung soll die benötigten Laufzeitbestandteile mitbringen.
- Beim Start wird **Widget-Paket** oder **Tool-Paket** gewählt. Danach verwendet das Programm ein gemeinsames Fenster, dessen Felder und Prüfungen sich nach der Paketart richten.
- Im Fenstertitel stehen Programmversion und Modus, beispielsweise `Packer 0.1.0 – Widget-Paket erstellen` oder `Packer 0.1.0 – Tool-Paket erstellen`. So sind beide Angaben bei Fehlermeldungen und Screenshots sichtbar.
- Ein Moduswechsel löst eine neue Prüfung aus. Ein bereits gewählter Quellordner darf erst nach erfolgreicher Prüfung für den anderen Modus exportiert werden.
- Die Oberfläche soll kompakt und verständlich bleiben. Fehlermeldungen nennen die betroffene Datei oder das betroffene Manifestfeld und die nötige Korrektur.
- Im Packer gibt es einen eigenen Button **Endungen registrieren**. Er ist unabhängig vom Paket-Export und richtet die Dateitypen `.wg` und `.tp` für den aktuellen Benutzer ein.

## Dateitypen registrieren

- `.wg` erhält ein Widget-Paket-Icon und `.tp` ein Tool-Paket-Icon. Die Icons sind Teil der Packer-Auslieferung; sie stammen nicht aus einem beliebigen Paket.
- Der Button prüft, welche Archivprogramme vorhanden sind. Unter Windows kommen der integrierte ZIP-Zugriff, 7-Zip und WinRAR infrage; unter Linux verfügbare Archivprogramme wie 7-Zip, unzip oder unrar. Er zeigt die gefundenen Programme und die geplanten Zuordnungen **vor** dem Registrieren an.
- Unter Windows registriert der Packer beide Dateitypen samt Icons und passenden **Öffnen mit**-Einträgen. Die Standard-App wählt der Benutzer über die Windows-Oberfläche; der Packer überschreibt diese Wahl nicht heimlich.
- Unter Linux registriert der Packer eigene MIME-Typen und Icons für beide Endungen und bietet verfügbare Archivprogramme als Öffnungsoptionen an. Eine bestehende Standard-App wird nur auf ausdrückliche Auswahl geändert.
- Nach dem Klick zeigt der Packer für `.wg` und `.tp` getrennt Erfolg oder einen konkreten Fehler. Ein erneuter Klick ist sicher; eine spätere Deinstallation entfernt nur die vom Packer angelegten Zuordnungen und Icons.
- Bestehende `*.wg.zip`- und `*.tp.zip`-Dateien behalten die normale ZIP-Zuordnung. Der Button registriert nur die neuen Endungen `.wg` und `.tp`.

## Eingaben und Einstellungen

- Der Benutzer wählt einen **Quellordner** mit `manifest.json` an dessen Wurzel. Referenzierte SVG- oder PNG-Dateien liegen unter `icons/`. Widget- und Tool-Daten werden über das Manifest beschrieben; ausführbare Paket-Skripte sind in Schnittstelle 0.1 nicht zulässig.
- Der Benutzer legt einen **Exportordner** fest. Dieser Pfad wird als lokale Programmeinstellung für den nächsten Start gemerkt und kann jederzeit geändert werden.
- Vor dem Export zeigt der Packer Paketart, Paket-ID, Name, Version, Lizenz, Anzahl der Widgets oder Tools, enthaltene Bilder und den Zielpfad als Vorschau.
- Der Ausgabename folgt der Paket-ID oder einem bearbeitbaren Dateinamen und erhält die passende Endung `.wg` oder `.tp`. Ein vorhandenes Ziel darf nicht stillschweigend überschrieben werden.

## Prüfungen und Exportfreigabe

Die Prüfergebnisse erscheinen als Liste mit **grünem Haken** bei Erfolg oder **rotem Kreuz** bei Fehler. Jede Zeile benennt die geprüfte Regel; Fehler enthalten einen konkreten Hinweis. Mindestens diese Punkte werden geprüft:

1. Der Quellordner ist lesbar; `manifest.json` liegt genau an der Wurzel und ist gültiges UTF-8-JSON.
2. `format`, `apiVersion`, Paket-ID, Name, Version und Lizenz entsprechen dem gewählten Pakettyp und dem jeweiligen Vertrag 0.1. Widget- und Tool-IDs sind eindeutig und liegen im Paket-Namensraum.
3. Alle Pflichtfelder der Widget-Definitionen beziehungsweise Tool-Aktionen sind vorhanden und zulässig. Für 0.1 gelten nur die deklarative Text-Darstellung beziehungsweise `set-page-background`.
4. Jeder referenzierte Bildpfad zeigt auf eine vorhandene Datei unter `icons/`. Es gibt keine nicht referenzierten oder unzulässigen Paketdateien; SVG-/PNG-Inhalte bestehen die bestehende Bildprüfung.
5. Die Grenzen des aktuellen Importers werden eingehalten: ZIP höchstens 2 MB, Manifest höchstens 200 KB, Bild höchstens 50 KB, PNG höchstens 1024 × 1024 Pixel sowie 1–30 Widgets pro Widget-Paket oder genau ein Tool pro Tool-Paket.
6. Der Exportordner ist beschreibbar; Ausgabename und Endung passen zum Modus. Ein bereits vorhandenes Ziel wird vor dem Überschreiben ausdrücklich behandelt.

**Exportieren** bleibt deaktiviert, solange auch nur eine Prüfung rot ist. Nach Änderungen im Quellordner, am Modus oder am Exportziel wird erneut geprüft. Direkt vor dem Schreiben wird dieselbe Validierung nochmals ausgeführt; ein währenddessen verändertes Paket darf nicht auf Basis eines veralteten grünen Ergebnisses exportiert werden. Der Packer schreibt zunächst eine temporäre Datei und stellt nur ein vollständig geprüftes Paket als Ergebnis bereit.

## Veröffentlichung und Downloads

- Fertige Windows- und Linux-Versionen können später als versionierte Downloads veröffentlicht werden. Der Release nennt unterstützte Systeme, Packer-Version, Änderungen und Prüfsummen der Downloads.
- Die **UGSo Open-Source-Dokumentation** erhält eine Packer-Seite mit je einem klar beschrifteten Downloadlink für Windows und Linux. Diese Links zeigen auf dieselben GitHub-Release-Dateien; angezeigte Version und Prüfsummen müssen mit dem Release übereinstimmen.
- Der Packer-Quellcode bleibt im privaten Entwicklungs-Repository; öffentliche Downloads können unabhängig davon bereitgestellt werden. Für eine neue Version werden Programm, Dokumentation und Downloadlinks zusammen aktualisiert.
- Downloadbuttons und konkrete Dateilinks werden erst veröffentlicht, wenn die jeweiligen Programmdateien gebaut und auf beiden Zielsystemen geprüft wurden. Bis dahin beschreibt die Dokumentation nur den geplanten Packer.
- Für öffentliche Programm-Downloads sind eine signierte `SHA256SUMS`-Datei und ein unabhängig über die offizielle Dokumentation bereitgestellter öffentlicher Schlüssel vorgesehen. Eine reine Prüfsumme belegt die Herkunft eines Downloads nicht. Aktuell gibt es weder einen freigegebenen Signaturschlüssel noch signierte Programm-Downloads.

## Spätere Ausbauschritte

- Beispielprojekte und Vorlagen für Widget- und Tool-Pakete.
- Ein lokaler Testlauf gegen den Studio-Importer und eine Vorschau im Editor; dieser Test ersetzt die Paketvalidierung nicht.
- Ein Generator für `manifest.json` und die benötigte Grundstruktur. Die erste Packer-Version darf mit einem vorbereiteten Quellordner beginnen.
- GitHub-Installation, Paket-Updates, eigene Skripte und zusätzliche Fähigkeiten erst nach separater Spezifikation und Prüfung.
