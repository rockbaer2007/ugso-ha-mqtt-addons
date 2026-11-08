UGSo Logic Studio 0.1.7 – HA-App und lokaler Test
============================================

Start unter Windows: ZIP vollständig entpacken, dann Start.cmd doppelklicken.
Voraussetzung: Python 3 und PyYAML. Einmal Install-Abhaengigkeiten.cmd starten
oder python -m pip install -r requirements.txt. Die HA-App enthält PyYAML bereits.
Start-Demo.cmd startet zusätzlich die Entitätsauswahl mit klar markierten
Beispielentitäten. Es verbindet sich nicht mit einem HA-System.
Alternativ: python server.py oder unter Linux sh start.sh.
Browser: http://127.0.0.1:4180/ ; beenden mit Strg+C im Startfenster.
Nicht die index.html per Doppelklick öffnen: Module benötigen den lokalen HTTP-Server.

Enthalten
---------
Neu in 0.1.7 (lokaler Test): Verbindungen mit gedrückter Maustaste ziehen.
Am farbigen Anschluss starten: Kreuzcursor, Leitungsvorschau und grün markierte
passende Ziele. Rote Markierung bedeutet unpassender Typ oder belegter Eingang.
BOOL nur an BOOL; INT darf ohne Umwandlung an REAL, ANY ist ausdrücklich universell.
Am Ziel loslassen. Auf freier Fläche oder mit Esc abbrechen. Eine bestehende
Leitung bleibt dabei erhalten. Pro Eingang genau eine Leitung; Rückkopplungen
werden abgewiesen. Tastatur: Ausgang per Tab wählen, Enter, Eingang und Enter.
Vorhandene Pläne und Einstellungen bleiben erhalten. Öffentliches Testupdate 0.1.7.
Rechts unten: Miniübersicht mit Bausteinpositionen und sichtbarem Ausschnitt.
Klick zum Navigieren; mit Tab fokussiert auch Pfeiltasten, Pos1 und Ende.
Der Link „Referenz: React Flow“ öffnet das Vorbild in einem neuen Tab;
die aktuelle Zeichenfläche bleibt eine eigene Implementierung.

Neu in 0.1.5: HA-Import für Automationen, Skripte und Blueprints; native
Ablaufkategorien, verschachtelte Zweige, Blueprint-Eingaben und Parameterverweise.
Drei-Punkte-Menü je Baustein: Eigenschaften, Duplizieren, Löschen.
Import-/Bearbeitungsanleitung und Grenzen: HA-IMPORT-ANLEITUNG.txt.
Vorhandene Wertpläne mit ihren drei Ausgabearten bleiben erhalten.

Seit 0.1.4: HA-Attribute, Zahlen-/Text-/Helligkeitsausgänge, RS/SR, Flanken,
Timer und Zähler mit persistenten Helfern; zusätzlich HA-Package-Export.
Details und Anleitung: HA-EXPORT-ANLEITUNG.txt; reale Prüfung auf .193 siehe
PRUEFBERICHT-0.1.4.txt. HA-App bleibt lesend, Installation/Start der erzeugten
Ausgaben erfolgen ausdrücklich über den HA-Editor.

55 aus der FBD-Referenz gelesene Bausteinstrukturen plus Kommentar.
ioBroker-Kategorie durch Home Assistant ersetzt. Palette mit Suche, Favoriten
und Zuletzt benutzt; Rasterfläche, Verschieben, typisierte Verbindungen,
Eigenschaften, Dokumentation, Rückgängig/Wiederholen, Projekt speichern/laden.
Eigene Optik nach den bereitgestellten Bildern, keine ioBroker-UI-Bibliotheken.

Klick auf Ausgang, danach Eingang verbindet. Eine Leitung anklicken entfernt
sie. Baustein wählen und Entf entfernt ihn. Rückgängig: Strg+Z.
Projekt als .logic.json sichern. Browser speichert automatisch unter eigenem
Schlüssel. Vor Neu/Beispiel/Import entstehen zusätzlich fünf lokale Sicherungen.
Browserdaten löschen entfernt diese lokalen Sicherungen; Projektdatei behalten.
Dateien enthalten keine HA-Zugangsdaten. Unterschiedliche Adressen/Browser
haben getrennte Browserstände; die HA-App speichert zusätzlich benutzerbezogen.
Bestehende Studio-Projekte bleiben unverändert.

Ausgabe / Grenzen
-----------------
Auswahl HA-Automation, HA-Skript oder JavaScript-Funktion mit HA-Hostvertrag.
Unterstützt: STATE_IN/OUT, CONST, AND/OR/XOR/NOT, Vergleiche,
ADD/SUB/MUL/DIV/MIN/MAX, SEL und LIMIT sowie RS/SR, R_TRIG/F_TRIG,
TON/TOF/TP/BLINK und CTU/CTD/CTUD (33 Typen). Ausgang BOOL, NUMBER an
input_number, TEXT an input_text oder BRIGHTNESS an light (0–100 %).
Regler, Kalender und Unterpläne sind weiterhin nicht exportierbare Vorlagen.
JavaScript benötigt einen eigenen Host für Eingänge, Aktionen, dauerhaften
Speicher und seriellen Takt. Kein direkt ausführbares ioBroker-Skript.
HA-Skript: ein Durchlauf pro Aufruf. HA-Automation: Zustandsänderungen der
Quellentitäten lösen aus. CONST-only-Pläne sind als HA-Skript/JS möglich.
Keine vollwertige SPS-Laufzeit, keine automatische HA-Installation.
Exportierte Zielaktionen können nach manuellem Import echte Geräte steuern.
Simulation ausschließlich mit den im Editor eingetragenen Demowerten.

Lokal testen
------------
1. Beispiel anklicken: Freigabe UND Anwesenheit -> Licht.
2. Simulation: Beide Demoeingänge TRUE -> Ausgang TRUE.
3. Einen STATE_IN wählen, Demo-Eingang FALSE setzen: Simulation -> FALSE.
4. Alle drei Ausgabeziele auswählen und Ausgabe ansehen / Datei speichern.
5. Projekt sichern, neu laden und wieder öffnen.
6. TON ergänzen: Texthelfer mit max 255 anlegen oder Package exportieren.
   Simulation schrittweise ausführen, +1 s verwenden. Details und Grenzen
   stehen vollständig in HA-EXPORT-ANLEITUNG.txt.

EN: Local prototype. Run python server.py, open http://127.0.0.1:4180/.
No live HA connection. Stateful blocks are editable templates, not executable.
FR: Prototype local. Lancer python server.py puis ouvrir le navigateur.
Aucune connexion HA réelle ; blocs à mémoire/temporisation non exécutables.

HA-App lokal installieren
------------------------
Farbschema: Die Oberfläche folgt automatisch prefers-color-scheme des Browsers.
Hell und Dunkel wechseln ohne Neustart oder Neuladen. Die Einstellung wird
nicht im Projekt gespeichert; Plan, Entitäten und Palette bleiben unverändert.
Auch Raster, Bausteine, Formulare, Entitätsdialog und Codevorschau passen sich an.

Im ZIP liegt addon/logic_studio als vollständig vorbereitetes App-Verzeichnis.
Diesen Ordner nach /addons/logic_studio auf dem HA-Testsystem kopieren.
In der App-Verwaltung den Store neu laden beziehungsweise nach Updates suchen.
Unter lokalen Apps "UGSo Logic Studio" installieren, starten und über
"Weboberfläche öffnen" aufrufen. Optional in der Seitenleiste anzeigen.
Kein eigenes GitHub-Repository erforderlich. Der Container wird lokal gebaut.
Es sind keine Portfreigaben, Änderungen an configuration.yaml oder Tokens nötig.
Die alte statische 0.1.0 unter /config/www bleibt separat erhalten.

Entitätsauswahl
--------------
STATE_IN oder STATE_OUT auswählen, dann oben "HA-Entität wählen".
Suche nach Anzeigename/entity_id; Bereichsfilter und jeweils 100 Ergebnisse.
Der Dialog zeigt Zustand, Einheit und Signaltyp sowie eine Quellenauswahl
für skalare Attribute. STATE_OUT bietet switch/light/input_boolean sowie
input_number/input_text und die Helligkeitsausgabe für light.
Beim Übernehmen wird der Signaltyp vorgeschlagen und der aktuelle Zustand als
Simulationswert kopiert; dies ist eine Momentaufnahme, keine Live-Simulation.
Typkonflikte mit vorhandenen Verbindungen werden gemeldet, nicht übergangen.
Signaltyp und Demowert können weiterhin manuell eingestellt werden.
Die App liest nur HA-Zustände, steuert keine Geräte und verändert keine
Automationen oder HA-Systemdateien. Alle drei Exporte bleiben manuell.
Der vom Supervisor bereitgestellte Token bleibt ausschließlich im Backend.

Speichern und bisherige Einstellungen
------------------------------------
Browserstand und Dateiformat ugso.logic/1 bleiben kompatibel. Zusätzlich
speichert die App Plan, Favoriten, zuletzt benutzte und eingeklappte Kategorien
unter /data je Ingress-Benutzer, mit zehn Sicherungen je Arbeitsstanddatei.
Der App-Speicher wird durch App-Neustart/Container-Neubau nicht ersetzt.
Vor Laden eines App-Projekts wird der Browserstand zusätzlich lokal gesichert.
Bei abweichenden Browser-/App-Ständen wird nicht still überschrieben:
"App-Projekt laden" lädt den gespeicherten App-Stand; den Browserstand
vorher bei Bedarf als Projektdatei exportieren. Bei Konflikt zwischen Fenstern
stoppt die App das automatische Überschreiben und zeigt einen Hinweis.
Keine vorhandenen Projekte oder Daten anderer Apps werden verändert.
Lokal liegt der App-Speicher im Unterordner userdata (nicht im gelieferten ZIP).
Von der alten statischen URL: Projekt exportieren und in der App öffnen.

EN: Copy addon/logic_studio to /addons/logic_studio, reload the app store,
install/start the local app and open its web UI. Entity selection is read-only.
Start-Demo.cmd uses sample entities only. Existing project files remain valid.
FR: Copier addon/logic_studio dans /addons/logic_studio, actualiser le magasin,
installer/démarrer l'application locale et ouvrir son interface web. Sélection
des entités en lecture seule. Les fichiers de projets existants restent valides.

Quellen und Rechte: THIRD-PARTY.txt. Noch nicht öffentlich veröffentlicht.
HA-App-Referenz: https://contributors.home-assistant.io/apps/guides/communication/
