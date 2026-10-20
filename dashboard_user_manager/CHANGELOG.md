# 0.1.6

- Doppelte Übersicht aus Dashboard-Liste und altem Standardzugang zusammengeführt; vorhandene Vorauswahl und ältere Sicherungen bleiben kompatibel.
- Gleichnamige Dashboards mit unterschiedlichen Pfaden bleiben getrennt erhalten.

# 0.1.5

- Nur erfolgreich geladene Dashboards mit Ansichten in der Auswahl; leere Einträge ausgeblendet und Ladefehler gesondert sichtbar.
- Dashboard-Vorauswahl mit Checkboxen, Alle auswählen/abwählen, Abbrechen und Speicherung pro Browser.
- Vorauswahl erhält eigene Namen, Dashboard-Daten und ungespeicherte Zuordnungen; DE/EN/FR vollständig ergänzt.

# 0.1.4

- Vollständige Oberfläche, Dialoge und API-Meldungen in DE/EN/FR.
- Automatische Auswahl anhand der HA-Oberflächensprache, Browser-Fallback und EN bei nicht unterstützten Sprachen; optional manuell DE/EN/FR.
- Sprachwechsel erhält ungespeicherte Checkbox-Zuordnungen und alle eigenen Namen und Daten.
- Veröffentlichung im gemeinsamen UGSo-HA-Apps-Repository und dreisprachige Dokumentation.
- ZIP-Zeitstempel aus Git-Commit statt konstantem Datum; lokale Update-Erkennung mit `touch` dokumentiert.

# 0.1.3

- Rollen kompakt als grünes U (Benutzer) und rotes A (Administrator) angezeigt.
- Legende oberhalb der Tabelle; Rollen zusätzlich als Tooltip und für Screenreader benannt.

# 0.1.2

- Benutzernamen um 90 Grad nach links gedreht, Benutzerspalten auf 56 Pixel verschmälert.
- Zusatz „Benutzer“ entfernt und „Administrator“ auf „Admin“ gekürzt.
- Checkboxen bleiben ausgerichtet; vollständige Namen und Inaktiv-Status im Tooltip.

# 0.1.1

- Benutzer als Checkbox-Spalten, Ansichten als Zeilen; Sammelauswahl im Kopf und Einzelauswahl je Zelle.
- Gemischte Auswahl als Zwischenzustand im Spaltenkopf.
- Linke Benutzerliste und Vorschau entfernt; Oberfläche mit 90 vw / 90 vh und horizontalem Scrollen in der Tabelle.
- Nicht bearbeitete Ansichten und frühere Benutzer-IDs erhalten; Konflikterkennung ab Laden der Tabelle.
- Source-Backup von 0.1.0 vor dem Umbau auf dem PC gesichert.

# 0.1.0

- Dashboards, Ansichten und menschliche HA-Benutzer auflisten.
- Benutzer gemeinsam hinzufügen, entfernen, ersetzen oder Sichtbarkeit zurücksetzen.
- Vorschau mit Konflikterkennung und Kontrolle nach dem Speichern.
- Vollständige Dashboard-Sicherung vor Schreibzugriff und geschützte Wiederherstellung.
- Administratorprüfung, Ingress-only und private persistente App-Daten.
