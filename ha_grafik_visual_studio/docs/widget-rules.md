# Widget-Regeln für HA Grafik Visual Studio

Stand: 01.10.2026. Dieses Dokument hält die bisher vereinbarten Regeln und den Entwurf für spätere Erweiterungsschnittstellen fest. Ein externes Paketformat und eine installierbare Erweiterungsschnittstelle sind noch nicht implementiert.

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

## Entwurf der Widget-Paket-Schnittstelle

Die genauen Feldnamen und das innere Dateiformat werden bei der Implementierung festgelegt. Der Generator soll Widget-Pakete als `*.wg.zip` ausgeben, zum Beispiel `solar.wg.zip`. Die Endung kennzeichnet die Paketart; beim Import muss zusätzlich das Manifest geprüft werden. Folgende Angaben sollen die Schnittstelle abdecken:

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
- Für die Einstellungen sind die Bereiche **Allgemein**, **Widget-Pakete** und **Tools** vorgesehen. Das sind geplante Oberflächenbereiche, noch keine vorhandenen Tabs.

Die erste Umsetzung sollte mit einem kleinen, versionierten Vertrag für Registrierung, Eigenschaften, Standardwerte, Vorschau und Runtime beginnen. Weitere Fähigkeiten werden nur als optionale Erweiterungspunkte ergänzt.
