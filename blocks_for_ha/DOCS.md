# UGSo Blocks for HA installieren

1. Das Repository `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` im HA-App-Store hinzufügen beziehungsweise aktualisieren.
2. **UGSo Blocks for HA** auswählen und installieren. Beim ersten Installieren wird die Weboberfläche lokal gebaut.
3. App starten und **Weboberfläche öffnen** wählen. Optional in der Seitenleiste anzeigen.

Version 0.1.19 ist eine experimentelle HA-App für amd64 und aarch64. Sie stellt den Blocks-Editor über HA-Ingress bereit und lädt Entitäten lesend über den Supervisor. Auf eine Entitäts-ID im Block klicken, nach Name oder ID suchen und übernehmen. Licht-/Script-/Helferblocks filtern nach dem passenden Typ. Keine zusätzliche Token-Eingabe im Editor; ohne Verbindung bleiben manuelle IDs möglich. Nach dem Update die App neu starten. [Entitätsauswahl und lokale Entwicklung](https://opensource.ugso-software.de/projects/blocks-for-ha/entities).

Der Block-/Template-Editor erstellt und importiert seit 0.1.18 deklarative JSON-/ZIP-Pakete. Übernommene Blocks stehen unter Benutzerdefiniert. Projektformat 3 sichert verwendete Definitionen mit; bisherige Projekte bleiben lesbar. [Anleitung und Grenzen](https://opensource.ugso-software.de/projects/blocks-for-ha/custom-blocks).

YAML kopieren oder auf den Rechner herunterladen und im HA-Automationseditor übernehmen. Unterstützte YAML-Dateien können vom Rechner geöffnet werden. Der Editor schreibt keine HA-Systemdateien und führt keine Automation selbst aus. HA führt die übernommene Automation aus.

Projekte liegen in der lokalen Browsersicherung. Projektdateien regelmäßig als JSON herunterladen; die App hält keine serverseitige Projektablage vor.

[Vollständige Dokumentation](https://opensource.ugso-software.de/projects/blocks-for-ha/)
