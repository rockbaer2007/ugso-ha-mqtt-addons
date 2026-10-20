# Dashboard-Benutzerverwaltung

Benutzer als Checkbox-Spalten, Ansichten als Zeilen: im Spaltenkopf gemeinsam auswählen/abwählen und einzeln pro Ansicht korrigieren. Breite Tabelle in einer 90-vw-/90-vh-Oberfläche, ohne linke Benutzerliste oder Vorschau. Mit automatischer Dashboard-Sicherung und geprüfter Wiederherstellung.

Nur für Administratoren über Home Assistant Ingress. Kein zusätzlicher LAN-Port, keine manuelle Token-Eingabe. YAML- und automatisch erzeugte Dashboards sind nur lesbar. Tabsichtbarkeit ist keine Zugriffssperre für direkte URLs.

**0.1.11 · DE / EN / FR · MIT · stabil / stable**. Eigenes Icon in HA-App-Kachel und Oberfläche. Automatisch nach HA-Sprache, Browser-Fallback und Englisch für nicht unterstützte Sprachen. Optional oben DE/EN/FR wählen. Sprachwechsel erhält ungespeicherte Auswahl und eigene Namen. U = Benutzer, A = Administrator. Nur Dashboards mit Ansichten, getrennte Ladefehler und gespeicherte Dashboard-Vorauswahl per Checkbox. Die migrierte Übersicht erscheint einmal; die frühere Vorauswahl bleibt erhalten. [Deutsche Dokumentation](https://opensource.ugso-software.de/projects/dashboard-user-manager/).

0.1.11: Checkbox-Tabelle mit eigener begrenzter Höhe vertikal und horizontal scrollen, per Touch oder Tastatur. Kompaktere Köpfe auf niedrigen Displays. EN: Scroll the bounded checkbox table vertically and horizontally using touch or keyboard; shorter headers on low displays. FR : Tableau de cases à cocher de hauteur limitée, défilement vertical et horizontal au toucher ou au clavier ; en-têtes compacts sur écrans bas.

0.1.9: 30 Sekunden Zeitlimit, Warten abbrechen und Entwurf sichern. Unklare Schreibausgänge vor erneutem Speichern am Server prüfen. / 30-second limit, Stop waiting and Download draft. Verify uncertain outcomes before retrying. / Limite de 30 secondes, arrêt de l’attente et téléchargement du brouillon. Vérifier le serveur avant de réessayer.

0.1.8: Speichern-Erfolgsmeldung und Ansichtenanzahl durchgehend in der aktuellen Sprache, auch beim Sprachwechsel nach dem Speichern. Save confirmation and view count follow the current language, including later language changes. Le message de réussite et le nombre de vues suivent la langue actuelle, y compris après l’enregistrement.

## English

Assign users to all dashboard views or individually using checkbox columns. Automatic HA language detection, browser fallback, English for unsupported languages; optional DE/EN/FR selection. Language changes preserve unsaved selections and original names. Green U = user, red A = administrator. Full dashboard backup before saving, conflict checks and guarded restore. Administrator-only HA Ingress; no LAN port or manual token. Tab visibility does not prevent access through direct URLs. YAML/generated dashboards are read-only. [English documentation](https://opensource.ugso-software.de/en/projects/dashboard-user-manager/).

## Français

Associez les utilisateurs à toutes les vues ou individuellement avec les colonnes de cases à cocher. Langue de HA détectée automatiquement, puis langue du navigateur ; anglais pour les langues non prises en charge. Choix DE/EN/FR possible. Le changement de langue conserve la sélection et les noms d’origine. U vert = utilisateur, A rouge = administrateur. Sauvegarde complète avant enregistrement, contrôle des conflits et restauration protégée. HA Ingress réservé aux administrateurs, sans port LAN ni jeton manuel. La visibilité des onglets ne bloque pas les URL directes. Tableaux YAML/générés en lecture seule. [Documentation française](https://opensource.ugso-software.de/fr/projects/dashboard-user-manager/).

Dashboard selection: only dashboards with views, separate load errors, saved browser selection with checkboxes. Bundled app icon in HA and the interface. Présélection : tableaux avec des vues uniquement, erreurs distinctes et choix enregistré dans le navigateur par cases à cocher. Icône intégrée dans HA et l’interface.

0.1.10: App-Wiederherstellung mit zwölf vorhandenen privaten Sicherungen und vollständige HA-Backup-Wiederherstellung auf dem Testsystem erfolgreich geprüft. Bestehende Dashboards, Einstellungen, Projekte und Plugins erhalten; experimentelle Kennzeichnung entfernt. Keine Änderung an Speicherlogik oder Zugriffsrechten. Harte Trennung exakt nach HA-Schreiben weiterhin automatisiert geprüft.

EN: App recovery including twelve existing private backups and full HA backup restoration passed on the test system, preserving existing data. Experimental label removed; save logic and permissions unchanged. A hard cut immediately after an HA write has automated fault coverage only.

FR : Restauration de l’application avec ses douze sauvegardes privées et restauration HA complète vérifiées sur le système de test, données existantes conservées. Mention expérimentale retirée ; logique d’enregistrement et droits inchangés. La coupure juste après l’écriture HA reste couverte par les tests automatisés.
