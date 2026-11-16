# Roadmap für HA Logic Studio Pro

Offene Aufgaben nach 0.1.116. Die veröffentlichten Änderungen stehen im [Changelog](CHANGELOG.md).

## Prioritäten

1. **Blocks-JS-Import weiter verbessern.** Weitere Zuordnungen anhand echter ioBroker-Exporte priorisieren und konkrete Codeanpassungen ausweisen.

## Runtime und Projektverwaltung

- [x] Gleichzeitige Auslöser und Fehlerisolation wurden in 0.1.73 geprüft. Die Protokollaufbewahrung ist in 0.1.98 implementiert und auf dem Testsystem PC (64) geprüft.
- [x] JavaScript und TypeScript können Funktionen aus ausgewählten globalen Skripten aufrufen. Laufender Zustand bleibt pro Projekt isoliert. Für gemeinsam benötigte Werte stehen explizit ausgewählte Home-Assistant-Helfer zur Verfügung.
- [x] Expertenmodus mit benutzerspezifischer Einstellung und Werkzeuggruppen in 0.1.71 umgesetzt und auf dem Testsystem PC (64) geprüft.

## Unterroadmaps

- [Rules](roadmap/rules.md)
- [Blocks A und Blocks JS](roadmap/blocks.md)
- [Funktionsplan](roadmap/funktionsplan.md)
- [JavaScript](roadmap/javascript.md)
- [TypeScript](roadmap/typescript.md)
- [HA-YAML](roadmap/ha-yaml.md)
