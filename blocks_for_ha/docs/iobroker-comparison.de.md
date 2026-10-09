# ioBroker / UGSo Blocks für HA

Stand: 9. Oktober 2026, Prototyp 0.1.1. Diese Liste beschreibt den vorhandenen Code. Ähnliche Blocks sind keine Zusage identischen Verhaltens: UGSo erzeugt native HA-Automationen, ioBroker erzeugt JavaScript für seine Script-Engine.

Bei jeder neuen Funktion werden Gegenstück, Verhalten, YAML-Ausgabe und Status in dieser Liste und der englischen Fassung aktualisiert. Die Kategorien werden schrittweise geprüft, beginnend mit **System**. Geplant bedeutet noch nicht implementiert.

## Alle vorhandenen Blocks

Es gibt **13 Blocktypen**, einschließlich des Automationsrahmens. Mehrere Auswahlmöglichkeiten innerhalb eines Blocks zählen als ein Typ.

| ioBroker-Konzept | Unser Block | Native HA-Ausgabe / Verhalten |
| --- | --- | --- |
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
| Falls / sonst | Wenn / Dann / Sonst | `if`, `then`, optional `else`; noch kein Zahnrad für zusätzliche Zweige |

## System: Gegenüberstellung und Ausbau

| ioBroker-Systemfunktion | UGSo Blocks für HA | Status |
| --- | --- | --- |
| Steuere State | Ein/Aus oder generische HA-Aktion | Vorhanden; weitere Werte über manuelle Aktionsdaten |
| State umschalten | Umschalten | Vorhanden, sofern HA-Domain diese Aktion bietet |
| Schreiben mit Verzögerung | Warte-Block vor Aktion | Vorhandene Kombination; kein eigenes zeitversetztes Schreiben oder Ablaufzeitfeld |
| Universeller Schreibblock | Generische HA-Aktion mit Ziel und JSON-Daten | Vorhandenes Grundgerüst; keine ioBroker-`ack`-Semantik |
| Kommentar | Erklärungsblock mit erhaltener Exportdarstellung | Geplant |
| Debug-Ausgabe | Eigener Log-Block | Geplant; manuelle HA-Aktion bereits möglich |
| Objekt-ID | Eigener Entitäts-Wertblock und Entitätsauswahl | Geplant; derzeit IDs als Textfelder |
| Wert von Objekt-ID, feste/dynamische/asynchrone Varianten | Zustand und Attribute als verwendbare Werte | Geplant; keine eigenen Wertblocks oder Callback-Ausführung |
| Objekt / Attribut von Objekt | Entitätsattribute und ausgewählte Metadaten | Geplant |
| Datenpunkt vorhanden | Existenz und Verfügbarkeit getrennt prüfen | Geplant |
| Aktualisiere State | Helfer setzen beziehungsweise Entität aktualisieren | Eigene Blocks geplant; kein direktes Gegenstück zu `ack: true` |
| Binde Objekt | Quelle als Auslöser, Ziel über passende Aktion | Eigener Komfortblock geplant; dynamische Wertweitergabe noch nicht vorhanden |
| Script steuern | HA-Script starten/stoppen | Eigener Block geplant; generische HA-Aktion bereits nutzbar |
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

Noch keine Live-Verbindung zu HA, kein installierbares HA-Add-on und keine Ausführung im Editor. Katalog, Plugins und erweiterbare Blocks über Zahnrad sind geplant. HA führt die exportierten Automationen aus.

Referenzen: [ioBroker-Systemdokumentation](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/de/blockly.md#systemblöcke), [System-Blockdefinitionen](https://github.com/ioBroker/ioBroker.javascript/blob/master/src-editor/src/Components/blockly-plugins/blocks/blocks_system.ts), [HA-Aktionen](https://www.home-assistant.io/docs/scripts/perform-actions/), [HA-Script-Syntax](https://www.home-assistant.io/docs/scripts/).
