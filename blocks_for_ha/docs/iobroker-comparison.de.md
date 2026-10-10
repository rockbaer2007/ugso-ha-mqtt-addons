# ioBroker / UGSo Blocks für HA

Stand: 9. Oktober 2026, experimentelle HA-App 0.1.10. Diese Liste beschreibt den vorhandenen Code. Ähnliche Blocks sind keine Zusage identischen Verhaltens: UGSo erzeugt native HA-Automationen, ioBroker erzeugt JavaScript für seine Script-Engine.

Bei jeder neuen Funktion werden Gegenstück, Verhalten, YAML-Ausgabe und Status in dieser Liste und der englischen Fassung aktualisiert. Die Kategorien werden schrittweise geprüft, beginnend mit **System**. Geplant bedeutet noch nicht implementiert.

## Alle vorhandenen Blocks

Es gibt **34 Blocktypen**, einschließlich des Automationsrahmens. Mehrere Auswahlmöglichkeiten innerhalb eines Blocks zählen als ein Typ.

| ioBroker-Konzept | Unser Block | Native HA-Ausgabe / Verhalten |
| --- | --- | --- |
| Erhöhe Variable um | Erhöhe mit Zahlen-Schritt | Native HA-Variablenzuweisung mit Jinja; Standard `1`, negative Schritte verringern. Variable vorher numerisch setzen. |
| Vergleich | Vergleich mit sechs Operatoren | Boolean-Ergebnis über Jinja; zwei Werteingänge, keine automatische Typumwandlung |
| UND / ODER / NICHT kompakt | UND/ODER mit zwei Eingängen, NICHT mit einem | Native HA-Gruppen als Bedingungen; Jinja als Variablenwert |
| wahr / falsch | Boolean-Konstante | Echte YAML-Boolean-Zuweisung oder Template-Bedingung |
| null | Kein Wert | YAML `null` / Jinja `none`; kein Boolean-Bedingungsblock |
| test / if true / if false | Wenn → dann Wert → sonst Wert | Bedingte Jinja-Wertauswahl für Variablen, Log-Meldungen und Vergleiche |
| Variable erstellen / setzen | Variablen-Menü und Setze-Block | Native `variables`-Aktion, Zahl, Text/Template, Boolean oder null; Gültigkeit im HA-Lauf, kein persistenter Datenpunkt |
| Variable lesen | Variable-Wertblock | `{{ name }}` für Log-Meldung oder nächste Variablenzuweisung |
| Ausdruck / Berechnung | Template-Wertblock | Frei eingegebene Jinja-Vorlage; Auswertung in HA statt JavaScript |
| Ausdruck als Bedingung | Template-Bedingung | `condition: template`, `value_template`; Boolean-Anschluss |
| Script als Rahmen | Automation | `triggers`, `conditions`, `actions` |
| Trigger auf Zustandsänderung | Zustand erreicht | `trigger: state` mit `to` |
| Trigger mit Zahlenprüfung | Zahl über/unter Grenze | `trigger: numeric_state`; startet beim Grenzübertritt |
| Zeitplan | Uhrzeit | `trigger: time` |
| Astro-Trigger | Sonnenaufgang/-untergang | `trigger: sun` |
| Script-/Systemstart, anderes Lebenszyklusmodell | HA-Start | `trigger: homeassistant`, `event: start` |
| Zustandsvergleich | Zustand ist | `condition: state` |
| Zahlenvergleich | Zahl über/unter Grenze | `condition: numeric_state` |
| UND / ODER / NICHT | Alle / mindestens eine / keine Bedingungen | `condition: and`, `or`, `not` mit verschachtelten Bedingungen |
| Steuere / umschalten | Ein / Aus / Umschalten | `<domain>.turn_on`, `.turn_off`, `.toggle`; Zielentität muss Aktion unterstützen |
| Adapteraktion, keine identische sendTo-Schnittstelle | HA-Aktion | `action`, optional `target.entity_id`, Aktionsdaten als JSON-Objekt |
| Warten/Pause | Warte Sekunden | `delay`; ganze Sekunden von 0 bis 86400 |
| Falls / sonst falls / sonst | Erweiterbarer Falls-Block mit Zahnrad | `if`/`then`/`else` oder mehrere `choose`-Zweige mit optionalem `default`; erster passender Zweig gewinnt |
| Zahl | Zahlen-Wertblock und Shadow-Standardwert | Konstante für Grenze oder Wartezeit |
| Prozent | Prozent-Wertblock mit Slider | Number-Wert 0–100 |
| Farbe | Farb-Wertblock | Colour-Wert für Lichtaktion |
| Lichtfarbe | Licht mit Farbe und Helligkeit | `light.turn_on` mit `rgb_color` und `brightness_pct` |
| Datum vergleichen | Datum heute ist/ab/bis | Unterstützte HA-Template-Bedingung in HA-Zeitzone |
| Helfer steuern | Abhängige Helferaktion | Schalter, Zähler oder Timer; passende Aktionen im Dropdown |
| Text | Text-Wertblock und Shadow-Standardwert | String-Wert für Logmeldung |
| Debug-Ausgabe | Log mit Info/Warnung/Fehler/Debug/Kritisch | `system_log.write` mit Meldung und Schweregrad |
| Script steuern | HA-Script starten/stoppen/aufrufen und warten | `script.turn_on`, `script.turn_off` oder direkter `script.name`-Aufruf |
| Aktualisiere State, andere Bedeutung | Entität aktualisieren | `homeassistant.update_entity`; fordert Aktualisierung an, setzt keinen Zustand |

Bedingungen besitzen Boolean-Output-Anschlüsse; Falls und Nur wenn passende Werteingänge. UND/ODER/NICHT ist über das Zahnrad um Werteingänge erweiterbar. Deaktivierte Blocks werden nicht exportiert, Pflichtinhalte bleiben erforderlich. Kontextmenü, Papierkorb mit Wiederherstellung, Hilfe und Zoom sind vorhanden. Text ist umgesetzt; Entitäts- und Sensor-Wertblocks folgen später.

## System: Gegenüberstellung und Ausbau

| ioBroker-Systemfunktion | UGSo Blocks für HA | Status |
| --- | --- | --- |
| Steuere State | Ein/Aus oder generische HA-Aktion | Vorhanden; weitere Werte über manuelle Aktionsdaten |
| State umschalten | Umschalten | Vorhanden, sofern HA-Domain diese Aktion bietet |
| Schreiben mit Verzögerung | Warte-Block vor Aktion | Vorhandene Kombination; kein eigenes zeitversetztes Schreiben oder Ablaufzeitfeld |
| Universeller Schreibblock | Generische HA-Aktion mit Ziel und JSON-Daten | Vorhandenes Grundgerüst; keine ioBroker-`ack`-Semantik |
| Kommentar | Erklärungsblock mit erhaltener Exportdarstellung | Geplant |
| Debug-Ausgabe | Eigener Log-Block | Vorhanden; Meldung als Text-Shadow oder Textblock, Schweregrad als Dropdown |
| Objekt-ID | Eigener Entitäts-Wertblock und Entitätsauswahl | Geplant; derzeit IDs als Textfelder |
| Wert von Objekt-ID, feste/dynamische/asynchrone Varianten | Zustand und Attribute als verwendbare Werte | Geplant; keine eigenen Wertblocks oder Callback-Ausführung |
| Objekt / Attribut von Objekt | Entitätsattribute und ausgewählte Metadaten | Geplant |
| Datenpunkt vorhanden | Existenz und Verfügbarkeit getrennt prüfen | Geplant |
| Aktualisiere State | Entität aktualisieren | Vorhanden; fordert ein Update an, kein Gegenstück zu `ack: true`; Helfer steuern umgesetzt; Zahlen-/Texthelfer setzen weiterhin geplant |
| Binde Objekt | Quelle als Auslöser, Ziel über passende Aktion | Eigener Komfortblock geplant; dynamische Wertweitergabe noch nicht vorhanden |
| Script steuern | HA-Script starten/stoppen/aufrufen und warten | Vorhanden; Parameter weiterhin über generische HA-Aktion |
| IDs vom Selektor | Auswahl nach Domain/Bereich/Gerät/Label | Geplant |
| RegExp | Textprüfung | Geplant |
| Scriptname | Automationsmetadaten | Name vorhanden; kein eigener Wertblock |
| Datenpunkt erzeugen, beide Varianten | HA-Helfer einrichten | Späterer Einrichtungsablauf; kein direktes Erzeugen von ioBroker-Datenpunkten |
| Objekt-ID meta/script | HA-spezifische Auswahlfilter | Geplant, keine unveränderte Übernahme der ioBroker-Typen |
| Instanz steuern | Adapterinstanzen haben kein direktes HA-Gegenstück | Nicht für den ersten Ausbau vorgesehen |
| Zugangsdaten lesen | Verwaltete Integrationseinstellungen/Geheimnisreferenzen | Kein Geheimnis-Wertblock vorgesehen; keine Tokens im Export |

## Bereits vorhandene Editorfunktionen

- YAML-Vorschau, Kopieren und Speichern als lokale YAML-Datei.
- Öffnen einer unterstützten YAML-Automation als Blocks, als Einzelobjekt oder Liste mit einem Eintrag. Nicht unterstützte Strukturen werden zurückgewiesen.
- JSON-Projektdateien mit Blockpositionen öffnen und speichern; automatische lokale Browsersicherung.
- Drei Beispiele: Licht, Batterie und Abend.
- Name, Beschreibung und ID; Ausführungsmodi `single`, `restart`, `queued`, `parallel`, mit maximaler Anzahl für die letzten beiden.
- Strukturvalidierung und Fehlermeldungen. Keine Prüfung der tatsächlich installierten HA-Aktionen.

Seit Version 0.1.3 ist das experimentelle HA-App-Paket mit Ingress vorhanden. Noch keine Live-Entitäts-/Aktionsauswahl aus HA und keine Ausführung im Editor. Katalog und Plugins sind geplant. Der Falls-Block ist bereits über das Zahnrad erweiterbar; weitere Mutatoren folgen bei Bedarf. HA führt die exportierten Automationen aus. [Öffentliche Dokumentation](https://opensource.ugso-software.de/projects/blocks-for-ha/).

Referenzen: [ioBroker-Systemdokumentation](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/de/blockly.md#systemblöcke), [System-Blockdefinitionen](https://github.com/ioBroker/ioBroker.javascript/blob/master/src-editor/src/Components/blockly-plugins/blocks/blocks_system.ts), [HA-Aktionen](https://www.home-assistant.io/docs/scripts/perform-actions/), [HA-Script-Syntax](https://www.home-assistant.io/docs/scripts/).

## Neue Originalplugins und Bedienung

Sechs Originalplugins sind lokal eingebunden. Suche am Menüende, mehrzeiliger Text, Prozent-Slider, Farbfeld, Datumsfeld und abhängige Helfer-Dropdowns sind vorhanden. Plus/Minus in unseren HA-Blocks ist eine eigene Umsetzung des Bedienprinzips; automatische dynamische Anschlüsse sind noch offen. [Blockkatalog mit Bildern und direkten Links zu allen Originalplugins](https://opensource.ugso-software.de/projects/blocks-for-ha/blocks).
