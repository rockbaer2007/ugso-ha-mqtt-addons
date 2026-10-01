# Tool-Regeln für HA Grafik Visual Studio

Stand: 01.10.2026. Diese Datei beschreibt vorhandene Editor-Werkzeuge und Vorschläge für eine eigene Schnittstelle für spätere Tool-Erweiterungen. Die vorgeschlagenen Regeln sind noch nicht als technischer Vertrag beschlossen. Extern installierbare Tools, ein Tool-Paketformat und der geplante Einstellungen-Tab **Tools** sind noch nicht implementiert.

## Bereits vorhanden

- Der Editor bietet Projekt- und Seitenverwaltung, Entitäten- und Dateienbrowser, Widget-Suche und -Filter, Widget-Import und -Export als JSON, Zwischenablage, Ausrichtung sowie Rückgängig/Wiederholen.
- Diese Werkzeuge sind derzeit Teil der Grafikstudio-App. Sie werden nicht über eine eigenständige Tool-Schnittstelle registriert oder als getrennte Pakete installiert.
- Ein Tool ergänzt die Arbeit im Editor. Es ist kein Widget-Typ und erzeugt nicht automatisch ein neues Element in der Widget-Palette.

## Vorgeschlagene Grundregeln

1. **Bestehende Grundfunktionen bleiben stabil.** Ein Update eines veröffentlichten Tools darf die Wirkung vorhandener Aktionen oder Einstellungen nicht stillschweigend ändern. Zusatzfunktionen werden optional ergänzt; inkompatibles Verhalten erhält eine neue Tool-ID oder einen ausdrücklich wählbaren Modus.
2. **Tools verändern Widgets nur über freigegebene Editor-Aktionen.** Sie dürfen Widget-Definitionen und gespeicherte Projekte nicht direkt oder heimlich überschreiben. Die Kompatibilitätsregeln aus [widget-rules.md](widget-rules.md) gelten auch für von Tools erzeugte Widgets.
3. **Änderungen sind überprüfbar.** Vor größeren Importen oder Massenänderungen zeigt ein Tool Ziel, Umfang und Ergebnisvorschau. Nach Bestätigung laufen Änderungen als zusammenhängende Editor-Aktion mit Validierung, Rückgängig-Möglichkeit und anschließendem Speichern über den normalen Projektweg.
4. **Rechte sind einzeln und zweckgebunden.** Ein Tool deklariert vor der Aktivierung, ob es Projektdaten lesen oder ändern, Dateien öffnen, Home-Assistant-Zustände lesen, Dienste auslösen oder externe URLs verwenden möchte. Es bekommt keine rohen Home-Assistant-Tokens.
5. **Kein Zugriff durch bloße Installation.** Die Installation eines Tool-Pakets schaltet benötigte Fähigkeiten nicht automatisch frei. Nicht verfügbare oder nicht gewährte Fähigkeiten müssen zu einem erklärten, sicheren Fehlerzustand führen.
6. **Paket- und Tool-Version sind getrennt.** Ein Paket kann neue Tools hinzufügen, ohne vorhandene Tool-Verträge zu ändern. Gespeicherte Tool-Einstellungen werden versioniert; notwendige Migrationen sind sichtbar und dürfen bestehende Projekte nicht unbemerkt verändern.
7. **Fehler bleiben lokal und verständlich.** Ein Tool-Fehler darf Editor, Runtime und gespeicherte Projekte nicht beschädigen. Eine laufende Aktion muss abbrechbar sein; beim Schließen werden Ereignisse und temporäre Ressourcen freigegeben.
8. **Editor und Runtime bleiben getrennt.** Ein reines Bearbeitungswerkzeug wird nicht in die Runtime geladen. Runtime-Funktionen benötigen später eine eigene, ausdrücklich deklarierte Fähigkeit und einen klaren Anwendungsfall.

## Entwurf der Tool-Schnittstelle

Die genauen Feldnamen und das innere Paketformat werden bei der Implementierung festgelegt. Der Generator soll Tool-Pakete als `*.tp.zip` ausgeben, zum Beispiel `importhilfe.tp.zip`; `tp` steht für Tool-Paket. Die Endung kennzeichnet die Paketart; beim Import muss zusätzlich das Manifest geprüft werden. Voraussichtlich werden diese Angaben benötigt:

| Bereich | Angaben |
| --- | --- |
| Paket | Stabile Paket-ID, Name, Hersteller, Version, Lizenz, unterstützte Grafikstudio-Versionen und Sprachen. |
| Tool-Identität | Stabile, paketweit eindeutige Tool-ID, eigene Vertragsversion, Anzeigename, Beschreibung und Icon. |
| Einstieg | Platz im Menü, in einer Werkzeugleiste oder im Kontextmenü; Reihenfolge und Sichtbarkeit. |
| Kontext | Gültigkeitsbereich wie Projekt, Seite, Widget-Auswahl oder bestimmter Widget-Typ; Bedingung zum Aktivieren und Deaktivieren. |
| Bedienoberfläche | Optionaler Dialog oder Seitenbereich, Eingabefelder, Standardwerte, Validierung und zugängliche Beschriftungen. |
| Aktion | Eingaben, Vorschau, Ergebnis, Abbruch, Fortschritt und Fehlerzustände. Änderungen laufen über eine kontrollierte Editor-Aktion. |
| Daten und Rechte | Benötigte Lese-/Schreibfähigkeiten, Dateitypen, HA-Funktionen und externe Ziele; keine direkten Zugangsdaten. |
| Speicherung | Getrennte globale, projektbezogene oder temporäre Einstellungen mit Version und gegebenenfalls Migration. |
| Lebenszyklus | Registrierung, Aktivierung bei passendem Kontext, Deaktivierung und vollständiges Aufräumen beim Entfernen. |

Die erste Version sollte nur klar begrenzte Editor-Tools mit Menüeintrag, Kontextprüfung, Dialog und einer kontrollierten, rückgängig machbaren Projektänderung unterstützen. Eigene Skripte, Hintergrundaufgaben, externe Downloads und Tool-zu-Tool-Aufrufe sind spätere Erweiterungspunkte. Für sie müssen Ausführungsgrenzen, Paketprüfung und Berechtigungen zuerst konkret definiert werden.

## Geplante Darstellung in den Einstellungen

Die geplanten Tabs **Allgemein**, **Widget-Pakete** und **Tools** trennen App-Einstellungen, Widget-Erweiterungen und Editor-Werkzeuge. Im Tab **Tools** sollen später installierte Pakete, Version, Kompatibilität, Status, angeforderte Fähigkeiten und Fehler sichtbar sein. Aktivieren, Deaktivieren und Aktualisieren darf die Grundfunktion vorhandener Widgets nicht verändern.
