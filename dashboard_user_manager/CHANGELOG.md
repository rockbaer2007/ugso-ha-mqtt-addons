# 0.1.11

- Checkbox-Tabelle als begrenzte Scrollfläche mit ausdrücklich vertikalem und horizontalem Scrollen, Touch-Gesten und Tastaturbedienung.
- Kompaktere Benutzerköpfe auf niedrigen Displays und schmalere Ansichtenspalte auf Mobilgeräten; fixierte Köpfe bleiben erhalten.
- Scrollbereich in DE/EN/FR zugänglich beschriftet. Keine Änderung an Zuordnungen, Speicherlogik oder Berechtigungen.

# 0.1.10

- App-/HA-Backup-Wiederherstellung auf dem Testsystem erfolgreich geprüft; vorhandene private Dashboard-Sicherungen und Bestandsdaten erhalten.
- Kennzeichnung „Experimentell“ nach Abschluss der offenen Wiederherstellungsprüfung entfernt. Doku DE/EN/FR ergänzt; Speicherlogik und Berechtigungen unverändert.

# 0.1.9

- Speichern und Serverprüfung mit 30 Sekunden Gesamtzeitlimit und „Warten abbrechen“; Entwurf bleibt erhalten und kann als JSON gesichert werden.
- Nach unklarem Schreibausgang erneutes Speichern bis zur Serverprüfung gesperrt. Prüfung wartet auf laufende eigene Schreibvorgänge und entwertet verspätete Schreibaufträge; kein automatisches Nachspeichern.
- Bereits gespeicherten Entwurf erkennen, unveränderten Stand zum bewussten erneuten Speichern freigeben und abweichende Daten/Benutzer als Konflikt behandeln. DE/EN/FR vollständig.

# 0.1.8

- Speichern-Erfolgsmeldung samt Anzahl vollständig in der gewählten Sprache DE/EN/FR, unabhängig von der Sprache der API-Antwort.
- Bereits angezeigte Erfolgsmeldung wechselt bei einer Sprachänderung ohne Neuladen korrekt mit; unveränderte Speicherung und Sicherungen.

# 0.1.7

- Eigenes Dashboard-/Benutzer-Icon im HA-App-Paket, in der Oberfläche und als PNG-Favicon eingebunden.
- Gleiches freigegebenes Motiv im UGSo-Paket; kompakter Kopfbereich und unveränderte Daten/Vorauswahl.

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
