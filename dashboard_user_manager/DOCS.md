# Dashboard-Benutzerverwaltung

## App-/HA-Wiederherstellung ab 0.1.10 geprüft

Vor dem Rücksetzen frisch vollständig sichern. Im HA-Backup nur diese App auswählen, um App und private Dashboard-Sicherungen zurückzusetzen, während die aktuellen HA-Dashboards bestehen bleiben. Für eine vollständige Wiederherstellung zusätzlich HA-Einstellungen/Verlauf, vorhandene Ordner und alle benötigten Apps auswählen: Der ausgewählte Umfang kehrt auf den Sicherungszeitpunkt zurück. Während des HA-Neustarts keine parallelen Änderungen vornehmen. Anschließend die App über die HA-Seitenleiste öffnen und Daten/Vorauswahl prüfen.

EN: Back up first. App-only restoration recovers the app and private backups while keeping current HA dashboards. Full restoration also restores the selected HA configuration/history, folders and apps to the backup timestamp. Reopen through the HA sidebar and verify the data afterwards.

FR : Sauvegarder avant de restaurer. La restauration de l’application seule récupère ses données privées sans changer les tableaux HA actuels. La restauration complète ramène aussi configuration/historique HA, dossiers et applications sélectionnés à l’instant sauvegardé. Rouvrir par la barre latérale et vérifier les données.

## Zeitlimit und Entwurf ab 0.1.9

Speichern und „Serverstand prüfen“ haben jeweils 30 Sekunden Zeitlimit. „Warten abbrechen“ beendet das Warten und erhält die Zuordnungen. Ein bereits gesendeter Schreibauftrag kann serverseitig noch abgeschlossen werden. Deshalb bleibt erneutes Speichern dann gesperrt, bis die Serverprüfung den tatsächlichen Stand bestätigt; niemals automatisch erneut schreiben.

Die Prüfung unterscheidet bereits gespeichert, unverändert und Konflikt. Bei unverändertem Stand kann der erhaltene Entwurf bewusst gespeichert werden. Bei Konflikt den Entwurf sichern und neu laden. „Entwurf sichern“ lädt die geplanten Benutzerzuordnungen mit Dashboard-Pfad als JSON auf den PC, ohne Sitzungsschlüssel. Die vollständigen Dashboard-Sicherungen bleiben in der privaten App-Ablage.

EN: Saving and server checks each stop after 30 seconds. Stop waiting preserves the draft. A dispatched write may still finish; check the server before retrying. The check distinguishes saved, unchanged and conflicting states. Download draft exports planned assignments locally without session secrets.

FR : Enregistrement et vérification s’arrêtent après 30 secondes. Arrêter l’attente conserve le brouillon. Une écriture envoyée peut se terminer ; vérifiez le serveur avant de réessayer. La vérification distingue déjà enregistré, inchangé et conflit. Le brouillon se télécharge localement sans secrets de session.

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

Die App nutzt 90 vw und 90 vh. Ab 0.1.11 besitzt die Checkbox-Tabelle eine eigene begrenzte Höhe und scrollt vertikal sowie bei vielen Benutzern horizontal. Innerhalb der Tabelle wischen oder mit fokussiertem Scrollbereich Pfeiltasten/Bild auf/Bild ab verwenden. Ansichtennamen und Benutzerköpfe bleiben sichtbar; auf niedrigen Displays sind die Köpfe kürzer. Außerhalb der Tabelle scrollt die übrige Seite.

EN: The bounded checkbox table scrolls vertically and, when needed, horizontally. Swipe inside it or focus the region and use arrow/Page Up/Page Down keys. View names and user headers stay fixed; shorter screens use compact headers. Scroll outside the table to move the surrounding page.

FR : Le tableau de hauteur limitée défile verticalement et, si nécessaire, horizontalement. Balayez dans le tableau ou placez-y le focus puis utilisez les flèches/Page précédente/Page suivante. Noms des vues et en-têtes restent fixes ; les écrans bas utilisent des en-têtes compacts. Faites défiler hors du tableau pour déplacer le reste de la page.

Die Sichtbarkeit betrifft Tabs, keine Zugriffssperre. Direkte URLs bleiben erreichbar. YAML- und automatisch erzeugte Dashboards sind nur lesbar.

## Sicherungen

Die Sicherungsliste bietet JSON-Downloads und Wiederherstellung. Spätere Änderungen am Dashboard sperren die automatische Wiederherstellung. Vor einer Wiederherstellung wird erneut gesichert. Bei unbestätigtem Speicherergebnis zuerst den aktuellen Stand neu laden und vergleichen.

Die privaten Daten liegen in `/data/backups/` und bleiben bei App-Updates erhalten. Vor einer Deinstallation auf den PC herunterladen. Die JSON-Dateien enthalten die vollständige Dashboard-Konfiguration und müssen vertraulich aufbewahrt werden.

Die App benötigt keine manuell eingegebenen Zugangsdaten. Öffnen ist ausschließlich über HA Ingress als aktiver Administrator möglich. Während des Speicherns nicht gleichzeitig in einem anderen Dashboard-Editor arbeiten.
