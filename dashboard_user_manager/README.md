# Dashboard-Benutzerverwaltung

Benutzer als Checkbox-Spalten, Ansichten als Zeilen: im Spaltenkopf gemeinsam auswählen/abwählen und einzeln pro Ansicht korrigieren. Breite Tabelle in einer 90-vw-/90-vh-Oberfläche, ohne linke Benutzerliste oder Vorschau. Mit automatischer Dashboard-Sicherung und geprüfter Wiederherstellung.

Nur für Administratoren über Home Assistant Ingress. Kein zusätzlicher LAN-Port, keine manuelle Token-Eingabe. YAML- und automatisch erzeugte Dashboards sind nur lesbar. Tabsichtbarkeit ist keine Zugriffssperre für direkte URLs.

**0.1.4 · DE / EN / FR · MIT**. Automatisch nach HA-Sprache, Browser-Fallback und Englisch für nicht unterstützte Sprachen. Optional oben DE/EN/FR wählen. Sprachwechsel erhält ungespeicherte Auswahl und eigene Namen. U = Benutzer, A = Administrator. [Deutsche Dokumentation](https://opensource.ugso-software.de/projects/dashboard-user-manager/).

## English

Assign users to all dashboard views or individually using checkbox columns. Automatic HA language detection, browser fallback, English for unsupported languages; optional DE/EN/FR selection. Language changes preserve unsaved selections and original names. Green U = user, red A = administrator. Full dashboard backup before saving, conflict checks and guarded restore. Administrator-only HA Ingress; no LAN port or manual token. Tab visibility does not prevent access through direct URLs. YAML/generated dashboards are read-only. [English documentation](https://opensource.ugso-software.de/en/projects/dashboard-user-manager/).

## Français

Associez les utilisateurs à toutes les vues ou individuellement avec les colonnes de cases à cocher. Langue de HA détectée automatiquement, puis langue du navigateur ; anglais pour les langues non prises en charge. Choix DE/EN/FR possible. Le changement de langue conserve la sélection et les noms d’origine. U vert = utilisateur, A rouge = administrateur. Sauvegarde complète avant enregistrement, contrôle des conflits et restauration protégée. HA Ingress réservé aux administrateurs, sans port LAN ni jeton manuel. La visibilité des onglets ne bloque pas les URL directes. Tableaux YAML/générés en lecture seule. [Documentation française](https://opensource.ugso-software.de/fr/projects/dashboard-user-manager/).

Experimentell / experimental / expérimental. Die Benutzerprüfung von 0.1.3 bestätigt Zuordnungen, Speichern und Neuladen. 0.1.4 ist bisher offline mit automatisierten Frontend-/API-Tests geprüft; vollständige HA-Backup-Wiederherstellung bleibt offen.
