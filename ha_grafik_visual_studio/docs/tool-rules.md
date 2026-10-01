# Tool-Regeln für HA Grafik Visual Studio

Stand: 01.10.2026. Diese Datei beschreibt die vorhandenen Editor-Werkzeuge, den ersten externen Tool-Vertrag 0.1 und spätere Erweiterungspunkte.

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

## Tool-Paket-Schnittstelle 0.1

Unter **Einstellungen → Tools** kann ein lokales `*.tp.zip` installiert, angezeigt und entfernt werden. Ein Tool-Paket enthält **genau ein Tool**. Das ZIP enthält `manifest.json` in UTF-8 und optional darin referenzierte SVG- oder PNG-Bilder unter `icons/`; andere Dateien sind unzulässig. Es ist auf 2 MB begrenzt, das Manifest auf 200 KB und jedes Bild auf 50 KB. PNG-Bilder dürfen höchstens 1024 × 1024 Pixel groß sein. Der Server prüft Paketart, Felder und Bilder und speichert das geprüfte Manifest unter `/data/tool_packages/`. Die Installation führt keine Aktion aus und gewährt keinen Zugriff. Der Tab zeigt Paket-ID, Version, Lizenz und das Tool. **Ausführen** öffnet eine Vorschau. Erst **Anwenden** löst eine kontrollierte Editor-Aktion aus; sie wird in die normale Rückgängig-Historie aufgenommen und über den normalen Projektweg gespeichert. Die Runtime lädt keine Tools.

Pflichtfelder: `format: "ha-grafik-tool-package"`, `apiVersion: "0.1"`, punktgetrennte Paket-`id`, `name`, Paket-`version` (`x.y.z`), `license` und `tools`. Paket und Tools können optional `icon: "icons/name.svg"` oder `icon: "icons/name.png"` verwenden. Ein Tool hat eine stabile `id` im Namensraum `paket.id/tool-name`, `definitionVersion: "0.1"`, `label`, `description`, `context: "page"`, `capabilities: ["project.read", "project.write"]` und eine deklarative `action`. In 0.1 ist nur `set-page-background` mit einer sechsstelligen `defaultColor` erlaubt. Die Farbe kann in der Vorschau angepasst werden. Diese Fähigkeiten erlauben ausschließlich die konkrete, bestätigte Änderung an der aktuellen Seite; sie sind keine allgemeine Schreibberechtigung für Paket-Code.

Beispiel für `manifest.json`:

```json
{
  "format": "ha-grafik-tool-package",
  "apiVersion": "0.1",
  "id": "beispiel.tools",
  "name": "Beispiel Tools",
  "version": "1.0.0",
  "license": "MIT",
  "tools": [{
    "id": "beispiel.tools/background",
    "definitionVersion": "0.1",
    "label": "Seitenfarbe",
    "description": "Setzt die Farbe der aktuellen Seite.",
    "context": "page",
    "capabilities": ["project.read", "project.write"],
    "action": {"kind": "set-page-background", "defaultColor": "#224466"}
  }]
}
```

Ein `.tp.zip` mit diesem Manifest lässt sich im Tool-Tab installieren. Optionale SVG-/PNG-Bilder werden geprüft und im Tab angezeigt; die Aktionsbuttons verwenden weiter die SVG-Symbole des Studios. Eigene Skripte, andere Dateien, Home-Assistant-Dienste, externe URLs, GitHub-Installation und Updates sind noch nicht Teil von 0.1. Erweiterungen brauchen einen neuen geprüften Vertrag oder optionale Fähigkeiten; bestehende Tool-Aktionen dürfen nicht stillschweigend umgedeutet werden.

## Erweiterungsentwurf

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

## Darstellung in den Einstellungen

Die Tabs **Allgemein**, **Widget-Pakete** und **Tools** trennen App-Einstellungen, Widget-Erweiterungen und Editor-Werkzeuge. Der Tool-Tab zeigt installierte Pakete und ihre Aktionen. Installierte Tools erscheinen zusätzlich als Symbolaktionen in zwei Reihen der Editor-Werkzeugleiste; ein Klick öffnet dieselbe Vorschau vor der bestätigten Änderung. Ein Verwaltungssymbol öffnet direkt den Tool-Tab. Kompatibilitätsstatus, Update-Suche und weitergehende Fähigkeiten folgen später. Aktivieren, Deaktivieren und Aktualisieren darf die Grundfunktion vorhandener Widgets nicht verändern.
