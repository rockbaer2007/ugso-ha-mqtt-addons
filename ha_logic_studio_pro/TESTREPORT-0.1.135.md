# Logic Studio Pro 0.1.135 – Entitätenauswahl und kompakte Trigger

## Sicherung und Umfang

Vorherigen vollständigen Quellstand 0.1.134 lokal als ZIP gesichert. Änderungen betreffen die fehlende Entitäten-Mehrfachauswahl und die Darstellung dreier verwandter Blocks-JS-Auslöser. Vorhandene Projektdaten und Runtime-Optionen werden nicht verändert. Kein HA-System aktualisiert, nichts veröffentlicht.

## Prüfungen

- 285 registrierte aktuelle Blocks-A-/Blocks-JS-Bausteine erstellt und alle 51 direkten Felder ENTITY, ENTITIES und SCENE auf HA-Auswahl geprüft. Dynamische ID-Eingänge sind bewusst Verbindungen, JSON-Rohfelder werden durch vorhandene strukturierte HA-Felder ergänzt. LABEL-Beschriftungen, Skriptnachricht-Adressen und ENTITY_LIST-Schalter sind keine Entitätsfelder.
- Mehrfachauswahl in der tatsächlich ausgelieferten Oberfläche unter DE/EN/FR: Suche, ursprüngliche Markierung, Hinzufügen, Entfernen, Übernehmen außerhalb der manuellen Eingabe sowie Abbrechen geprüft.
- Altes Komma-/Leerraumformat bleibt beim Blockly-Speichern/Laden erhalten. Codegenerator erzeugt weiterhin je ausgewählter Entität eine ha.onState-Registrierung. Leere/ungültige IDs und Listen mit mehr als 100 Einträgen werden abgewiesen.
- Einzel-, Mehrfach- und Attributtrigger haben getrennte kompakte Zeilen. Lange sichtbare IDs werden gekürzt, der vollständige gespeicherte Wert bleibt unverändert. Verbindungen, Feldnamen, Bedingungen und Generatoren erhalten.
- Die ioBroker-Option „Auslösung durch“ wurde nicht als wirkungslose Zusatzoption ergänzt: HA-Zustandsereignisse entsprechen nicht dem ioBroker-ack-Modell.

68 Node-Tests und 12 Python-Server-Tests erfolgreich; Syntaxprüfung für Oberfläche und Bundle sowie git diff --check erfolgreich. Kein Live-Test auf Home Assistant. Neues ZIP lokal erstellt, nicht veröffentlicht.
