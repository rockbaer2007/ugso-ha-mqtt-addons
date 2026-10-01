# Widget-Regeln für HA Grafik Visual Studio

Stand: 01.10.2026. Dieses Dokument hält die vereinbarten Regeln und den ersten Widget-Paketvertrag fest. Die Tool-Schnittstelle und zusätzliche Widget-Fähigkeiten folgen später.

## Bereits vorhanden

- Widgets werden in benannten Widget-Sets registriert. Ein Set hat derzeit `id`, `label` und `widgets`.
- Eine Widget-Definition hat derzeit mindestens `type`, `label`, `defaults` und `propertyGroups`; Icon und Palettenvorschau können ergänzt werden. Doppelte Set-IDs und Widget-Typen werden abgewiesen.
- Widgets haben im Editor eine Platzierung, einen Namen, Eigenschaften und eine Runtime-Darstellung. Gemeinsame Bereiche wie **Generell** und **Sichtbarkeit** sind für alle Widgets vorgesehen; weitere Felder hängen vom Typ ab.
- Die SVG-Verbindungslinie nutzt Andockpunkte, Zwischenpunkte und ausdrücklich aktivierte Sammelpunkte. Diese Funktionen sind Eigenschaften des vorhandenen Widgets und noch kein allgemeines Paket-API.

## Verbindliche Kompatibilitätsregeln

1. **Die veröffentlichte Grundfunktion eines Widget-Typs bleibt erhalten.** Ein Update darf Bedeutung, Bedienung, Darstellung und Wirkung bereits vorhandener Einstellungen nicht stillschweigend ändern. Die erste später festgelegte Widget-Vertragsversion `0.1` ist dabei die Kompatibilitätsbasis; sie ist nicht mit der Version der Home-Assistant-App gleichzusetzen.
2. **Bestehende Projekte bleiben funktionsfähig.** Ein Paket-Update darf gespeicherte Widget-Instanzen nicht unerwartet umdeuten oder ihre Werte überschreiben. Auch ein Feld, das in einem alten Projekt fehlt, muss weiterhin das damalige Verhalten ergeben.
3. **Zusatzfunktionen werden optional eingehängt.** Neue Eigenschaften, Datenbindungen oder Darstellungsoptionen brauchen einen neutralen Standardwert. Ohne ausdrückliche Aktivierung verhält sich das Widget wie zuvor.
4. **Inkompatibles Verhalten bekommt einen neuen Widget-Typ.** Es ersetzt den alten Typ nicht im Hintergrund. Alter und neuer Typ dürfen parallel im selben Projekt vorkommen.
5. **Migrationen sind sichtbar und nachvollziehbar.** Falls ein Wechsel auf einen neuen Typ gewünscht ist, braucht er eine Vorschau, eine ausdrückliche Übernahme und eine Möglichkeit, den vorherigen Projektstand wiederherzustellen. Keine automatische Umstellung beim bloßen Paket-Update.
6. **Paketversion und Widget-Definitionsversion sind getrennt.** Ein Paket kann neue Widgets erhalten, ohne die Definition bereits veröffentlichter Widgets zu ändern. Gespeicherte Instanzen sollen ihre Typ-ID und Definitionsversion behalten.
7. **Kompatibilität wird getestet.** Referenzprojekte mit Widgets der ersten Vertragsversion müssen nach jedem Paket-Update im Editor und in der Runtime gleich funktionieren, solange keine optionale Erweiterung aktiviert wurde.

## Widget-Paket-Schnittstelle 0.1

Version 0.1 ist ein bewusst kleiner, datenbasierter Vertrag. Im Tab **Einstellungen → Widget-Pakete** kann ein lokales `*.wg` oder bisheriges `*.wg.zip` installiert werden. Beide enthalten ein ZIP mit `manifest.json` in UTF-8 und optional darin referenzierten SVG- oder PNG-Bildern unter `icons/`; andere Dateien sind unzulässig. Die ZIP-Größe ist auf 2 MB, das Manifest auf 200 KB und jedes Bild auf 50 KB begrenzt. PNG-Bilder dürfen höchstens 1024 × 1024 Pixel groß sein. Der Server validiert Manifest und Bilder und speichert ausschließlich geprüfte Daten unter `/data/widget_packages/`. Paket-Code wird nicht ausgeführt. Installierte Widgets erscheinen nach dem Neuladen als eigenes Set in der Palette; ihre Text-Darstellung funktioniert im Editor und in der Runtime. In der Paketliste sind ID, Version, API-Version, Widget-Anzahl und Lizenz sichtbar. Neuladen lädt die App erneut. Entfernen wird verweigert, sobald ein Widget-Typ aus dem Paket in irgendeinem Projekt benutzt wird. Ein bereits installiertes Paket wird nicht überschrieben.

Pflichtfelder des Manifests: `format: "ha-grafik-widget-package"`, `apiVersion: "0.1"`, eine punktgetrennte Paket-`id`, `name`, semantische `version` (`x.y.z`), `license` und `widgets`. Die Liste enthält **1 bis 30 Widgets**; alle erscheinen als eigene Paletteneinträge im selben Paket-Set. Jedes Widget besitzt einen eindeutigen `type` im Namensraum `paket.id/widget-name`, `label`, `defaults`, `propertyGroups` und `render: {"kind":"text","valueKey":"text"}`. Optional können Paket und Widgets mit `icon: "icons/name.svg"` oder `icon: "icons/name.png"` ein Bild referenzieren. Ohne Widget-Bild wird das integrierte SVG-Textsymbol verwendet. Andere Formate, Skripte, externe Referenzen und aktive SVG-Inhalte werden abgewiesen. Eigenschaftsfelder besitzen `key`, `label`, `type` und einen Standardwert gleichen Schlüssels. Unterstützte Feldtypen sind `text`, `number`, `checkbox`, `color`, `range` und `select`. `valueKey` muss ein bearbeitbares Text- oder Zahlenfeld sein. Die App ergänzt weiterhin die gemeinsamen Bereiche **Generell** und **Sichtbarkeit**. Neue Instanzen speichern `packageId` und `definitionVersion: "0.1"`.

Beispiel für `manifest.json`:

```json
{
  "format": "ha-grafik-widget-package",
  "apiVersion": "0.1",
  "id": "beispiel.widgets",
  "name": "Beispiel Widgets",
  "version": "1.0.0",
  "license": "MIT",
  "widgets": [{
    "type": "beispiel.widgets/label",
    "label": "Label",
    "icon": "icons/label.svg",
    "defaults": {"text": "Hallo"},
    "propertyGroups": [{"label": "Inhalt", "fields": [{"key": "text", "label": "Text", "type": "text"}]}],
    "render": {"kind": "text", "valueKey": "text"}
  }]
}
```

Das ZIP muss zu diesem Beispiel zusätzlich `icons/label.svg` enthalten. Die SVG-Datei darf nur grundlegende Formen wie `path`, `rect`, `circle`, `line` und `polygon` mit einfachen Zeichenattributen enthalten. Für PNG lautet der Pfad beispielsweise `icons/label.png`. Die Buttons der Studio-Oberfläche behalten ihre eigenen SVG-Symbole.

GitHub-Installation, Updates, Bilder außerhalb der referenzierten Icons, eigene Skripte, HA-Zustandsbindung und Schreibaktionen sind noch nicht Bestandteil von 0.1. Diese Fähigkeiten benötigen eigene geprüfte Vertragsversionen oder optionale Erweiterungspunkte, damit bestehende Widgets unverändert bleiben.

## Erweiterungsentwurf

Der geplante Packer soll Widget-Pakete als ZIP-Datei mit der Endung `*.wg` ausgeben, zum Beispiel `solar.wg`. Bisherige `*.wg.zip` bleiben importierbar. Die Endung kennzeichnet die Paketart; beim Import wird zusätzlich das Manifest geprüft. Folgende Angaben sollen die Schnittstelle abdecken:

| Bereich | Angaben |
| --- | --- |
| Paket | Stabile Paket-ID, Name, Hersteller, Paketversion, Lizenz, unterstützte Grafikstudio-Versionen, verfügbare Sprachen. |
| Widget-Identität | Stabile, paketweit eindeutige Typ-ID und eigene Definitionsversion. Eine Namensraum-ID wie `hersteller.paket/widget` vermeidet Kollisionen. |
| Palette | Anzeigename, Beschreibung, Gruppe, Icon oder Bild und Vorschau. |
| Grundzustand | Standardgröße, Standardwerte und eindeutig definierte Bedeutung aller Eigenschaften. |
| Eigenschaften | Gruppen, Feldschlüssel, Datentypen, Wertebereiche, Auswahloptionen, Validierung und optionaler Erweiterungsstatus. |
| Darstellung | Editor-Vorschau, Runtime-Darstellung und Verhalten bei fehlenden oder ungültigen Daten. |
| Home Assistant | Unterstützte Entity-Domänen, gelesene Zustände und Attribute, ausdrücklich deklarierte Schreibaktionen und Fehlerbehandlung. |
| Speicherung | Schema der Instanzdaten, Definitionsversion und gegebenenfalls ein gesonderter Migrationspfad. |
| Ressourcen und Rechte | Benötigte Bilder, Styles und Skripte sowie einzeln deklarierte Fähigkeiten, etwa Zustände lesen, Dienste aufrufen oder externe URLs laden. |

Der Editor und die Runtime brauchen jeweils einen klaren Einstiegspunkt. Ein Widget-Paket darf keine Home-Assistant-Tokens erhalten; Zugriff auf Zustände und Dienste erfolgt über freigegebene Grafikstudio-Funktionen. Ob externe Pakete eigenes Skript ausführen dürfen und wie sie installiert, signiert oder geprüft werden, ist noch offen.

## Getrennte Erweiterungsarten

- **Widget-Pakete** ergänzen Paletteneinträge, Eigenschaften und deren Editor-/Runtime-Verhalten.
- **Tool-Erweiterungen** ergänzen Editor-Werkzeuge, zum Beispiel Import, Prüfung oder Bearbeitungshilfen. Sie dürfen bestehende Widget-Grundfunktionen nicht heimlich verändern.
- Die Einstellungen haben die Bereiche **Allgemein**, **Widget-Pakete** und **Tools**. Der Tool-Tab verwaltet lokale Tool-Pakete nach der [Tool-Schnittstelle 0.1](tool-rules.md#tool-paket-schnittstelle-01).

Die erste Umsetzung sollte mit einem kleinen, versionierten Vertrag für Registrierung, Eigenschaften, Standardwerte, Vorschau und Runtime beginnen. Weitere Fähigkeiten werden nur als optionale Erweiterungspunkte ergänzt.
