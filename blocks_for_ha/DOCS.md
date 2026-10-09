# UGSo Blocks for HA installieren

1. Das Repository `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` im HA-App-Store hinzufügen beziehungsweise aktualisieren.
2. **UGSo Blocks for HA** auswählen und installieren. Beim ersten Installieren wird die Weboberfläche lokal gebaut.
3. App starten und **Weboberfläche öffnen** wählen. Optional in der Seitenleiste anzeigen.

Version 0.1.3 ist eine experimentelle HA-App für amd64 und aarch64. Sie stellt den Blocks-Editor über HA-Ingress bereit. Noch keine direkte HA-Entitäts-/Aktionsauswahl: IDs werden eingegeben. Keine zusätzliche Token-Eingabe erforderlich, um den Editor zu öffnen.

YAML kopieren oder auf den Rechner herunterladen und im HA-Automationseditor übernehmen. Unterstützte YAML-Dateien können vom Rechner geöffnet werden. Der Editor schreibt keine HA-Systemdateien und führt keine Automation selbst aus. HA führt die übernommene Automation aus.

Projekte liegen in der lokalen Browsersicherung. Projektdateien regelmäßig als JSON herunterladen; die App hält keine serverseitige Projektablage vor.

[Vollständige Dokumentation](https://opensource.ugso-software.de/projects/blocks-for-ha/)
