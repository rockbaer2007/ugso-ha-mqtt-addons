# Dashboard-Benutzerverwaltung

## DE / EN / FR automatisch

Die App übernimmt die HA-Oberflächensprache, sonst die Browsersprache. Nicht unterstützte Sprachen verwenden Englisch. Oben ist zusätzlich eine manuelle Auswahl möglich. Eigene Namen, Zuordnungen und ungespeicherte Checkboxen bleiben beim Sprachwechsel erhalten. Übersetzungen sind vollständig im App-Paket enthalten.

## English / Français

- [Complete English guide](https://opensource.ugso-software.de/en/projects/dashboard-user-manager/)
- [Guide complet en français](https://opensource.ugso-software.de/fr/projects/dashboard-user-manager/)

Automatic language selection follows Home Assistant, then the browser; unsupported languages use English. Manual DE/EN/FR selection is available. Unsaved selections and original names remain unchanged.

La langue suit Home Assistant, puis le navigateur ; les langues non prises en charge utilisent l’anglais. Choix manuel DE/EN/FR disponible. Les sélections non enregistrées et les noms d’origine sont conservés.

## Alle Ansichten gemeinsam ändern

Dashboard auswählen. Die Tabelle zeigt Ansichten als Zeilen und Benutzer als Spalten.

- Checkbox im **Spaltenkopf**: Benutzer für alle bearbeitbaren Ansichten auswählen oder abwählen.
- Checkbox in einer **Zeile**: nur diese einzelne Ansicht ändern.
- **Strich im Spaltenkopf**: Benutzer ist nur für einige Ansichten ausgewählt.
- **Auswahl zurücksetzen**: ungespeicherte Auswahl verwerfen.

Anschließend **Änderungen speichern**. Es gibt keine separate Vorschau mehr. Vor dem Schreiben wird das komplette Dashboard gesichert. Nur bearbeitete Zuordnungen ändern sich; Karten, Layouts, frühere Benutzer-IDs und andere Ansichten bleiben erhalten. Bearbeitete Ansichten erhalten feste Benutzerlisten; neue Konten werden dort nicht automatisch ergänzt.

Die App nutzt 90 vw und 90 vh. Bei vielen Benutzern ist die Tabelle horizontal scrollbar; Ansichtennamen und Benutzerköpfe bleiben sichtbar.

Die Sichtbarkeit betrifft Tabs, keine Zugriffssperre. Direkte URLs bleiben erreichbar. YAML- und automatisch erzeugte Dashboards sind nur lesbar.

## Sicherungen

Die Sicherungsliste bietet JSON-Downloads und Wiederherstellung. Spätere Änderungen am Dashboard sperren die automatische Wiederherstellung. Vor einer Wiederherstellung wird erneut gesichert. Bei unbestätigtem Speicherergebnis zuerst den aktuellen Stand neu laden und vergleichen.

Die privaten Daten liegen in `/data/backups/` und bleiben bei App-Updates erhalten. Vor einer Deinstallation auf den PC herunterladen. Die JSON-Dateien enthalten die vollständige Dashboard-Konfiguration und müssen vertraulich aufbewahrt werden.

Die App benötigt keine manuell eingegebenen Zugangsdaten. Öffnen ist ausschließlich über HA Ingress als aktiver Administrator möglich. Während des Speicherns nicht gleichzeitig in einem anderen Dashboard-Editor arbeiten.
