# Changelog

## 0.1.6

- Weihnachten heißt jetzt 1. Weihnachtstag; der 26. Dezember heißt 2. Weihnachtstag.
- Stephanstag, Pakjesavond und Epiphanias sind eigenständige Einträge statt
  zusammengefasster Namen. Sinterklaas und Heilige Drei Könige bleiben separat.
- Bestehende Festtags-IDs, Termine, Steuerungen und Bildzuordnungen erhalten.
  Neue Einträge können unabhängig ausgewählt und mit Bildern versehen werden.

## 0.1.5

- Speicher- und Fehlermeldungen bleiben in der oberen Buttonleiste sichtbar.
- Ein durch App-Neustart veralteter CSRF-Nachweis wird nach erneuter
  Administratorprüfung einmalig erneuert; der Entwurf bleibt dabei unverändert.
- Fehlgeschlagene Speicherversuche behalten alle Eingaben im Editor.
- Gleichzeitige doppelte Speicherversuche werden verhindert.

## 0.1.4

- Entitätsauswahl im HA-Stil: aufklappbares Suchfeld, Treffer mit Symbol,
  Anzeigename, Bereich/Gerät und Entitäts-ID sowie markierter aktueller Auswahl.
- Auswahl über × entfernen; Escape, Pfeiltasten und Tab unterstützen die Bedienung.
- Suche berücksichtigt jetzt auch Bereich und Gerätename.

## 0.1.3

- Entitätsauswahl mit sofortiger Suche nach Anzeigename und Entitäts-ID.
- Treffer werden direkt unter dem Suchfeld angezeigt; Groß-/Kleinschreibung
  spielt keine Rolle. Die Suche verändert keine gespeicherte Auswahl.

## 0.1.2

- Eigener Festtags-Card-Editor als HA-App mit Ingress und DE-/EN-Oberfläche.
- Region/Land, jährliche Saisonregeln und fünf unabhängige Zeitpläne.
- Festtagssensoren, Pause-Schalter und Anzeige-Card.
- Eigene Bilder hochladen und pro Land/Festtag zuordnen; keine Bilder im Paket.
- Geprüfte Bildinhalte, Dateierhalt und unveränderte GIF-Animationen.
- App und HA-Steuerung getrennt: Zeitpläne laufen ohne Editor-App weiter.

## Interne Entwicklungsstände 0.1.0 / 0.1.1

- Lokale Erstimplementierung, Kalender-/Laufzeitprüfungen und Schaltversuch auf .193.
- Keine eigenständigen öffentlichen Releases dieser Entwicklungsstände.
