# Logic Studio Pro 0.1.132 – getrennte Alle-Freigaben

Stand: 26. November 2026. Lokale Prüfung mit künstlichen Daten; kein Live-Test auf HA.

## Umsetzung

Vier getrennte Boolean-Optionen stehen in der HA-App-Konfiguration:

| Option | Übersteuerte Liste | Runtime-Schlüssel |
| --- | --- | --- |
| `runtime_read_all` | `runtime_read_entities` | `readAll` |
| `runtime_write_all` | `runtime_write_entities` | `writeAll` |
| `runtime_events_all` | `runtime_events` | `eventsAll` |
| `runtime_mqtt_all` | `runtime_mqtt_topics` | `mqttAll` |

Die Standardwerte sind alle `false`. Fehlende Optionen in älteren Einstellungen
werden ebenfalls als `false` behandelt. Aktivierte Optionen ignorieren nur die
jeweilige Liste beim Erstellen des Runtime-Snapshots. Die Datei `options.json`
wird dabei nicht geschrieben; beim Ausschalten gelten die gespeicherten Werte
wieder. Schalter- und Listenbeschriftungen sind in DE/EN/FR vorhanden.

Der Nutzer hat ausdrücklich die HA-Standardmaske gewählt: Listen bleiben optisch
bearbeitbar, werden bei „Alle“ jedoch ignoriert. Eine eigene Einstellungsoberfläche
oder Änderung am HA-Frontend wurde nicht eingeführt.

READ-all gilt in der gemeinsamen HA-Verbindung und beim Funktionsplan-Preflight.
Neue Entitäten und Zustandsänderungen werden erfasst. Die Wiederverbindung
vergleicht die tatsächlich geladenen Zustände einschließlich neuer/entfernter IDs.
WRITE-all aktiviert nicht automatisch READ-all. Bereits einzeln eingetragene
WRITE-Ziele bleiben wie bisher auch lesbar.

Alle-Schalter verändern nur die Listenprüfung: Unterstützte Aktionen,
Einzelziel-Prüfung, gültige IDs, Topic- und Ereignisformate sowie das Präfix
`logic_studio_*` für gesendete Ereignisse bleiben unverändert. EVENT-all kann
keine ungefilterten `state_changed`-Daten an der READ-Prüfung vorbei weitergeben.
Andere HA-Benutzerrechte und andere Apps bleiben unverändert.

## Prüfungen und Erhaltungsnachweis

- 41 Node-Tests erfolgreich, darunter sieben neue Freigabeprüfungen für die vier
  voneinander unabhängigen Modi, ungültige IDs/Topics, deaktivierte Modi,
  neue Zustände, Wiederverbindung und die READ-Grenze bei EVENT-all.
- Zehn Python-Serverprüfungen erfolgreich. Neue Tests vergleichen die
  Einstellungsdatei bytegleich vor und nach dem Lesen, prüfen das Wiedereinschalten
  der alten Liste, Boolean-Typen, Standardwerte und alle drei Sprachdateien.
- Bestehende Picker-, Runtime-, Import-, YAML- und Speicherprüfungen bestehen weiter.
- JavaScript-Syntax und Python-Kompilierung geprüft; keine echten HA-Verbindungen,
  Schaltaktionen, Ereignisse oder MQTT-Nachrichten in diesen Tests.
- Ausgangsstand 0.1.131 als vollständiges Paketarchiv gesichert unter
  `M:/repos/_backups/logic-pro-0131-before-all-permissions-20261126-102227.zip`.
- Projekte, Kopplungen, Benutzereinstellungen und bisherige Listen nicht verändert.

## Nutzung

Für den gemeldeten Solarleistungssensor nur **READ – alle Entitäten lesen**
einschalten. WRITE, EVENT und TOPICS sind dafür nicht erforderlich. Konfiguration
speichern und betroffene Projekte neu starten; bei Bedarf die App neu starten.

Referenz zur nativen Boolean-Konfiguration:
[Home Assistant App options](https://contributors.home-assistant.io/apps/guides/options/).
