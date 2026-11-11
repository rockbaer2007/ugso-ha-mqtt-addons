# HA Logic Studio Pro 0.1.13

Öffentliche Testversion mit eigenem App-Slug `ha_logic_studio_pro`. Die App startet manuell und verwendet ihren eigenen Datenspeicher.

Version 0.1.13 ergänzt Syntaxfarben und Zeilennummern für JavaScript und TypeScript. Kommentare erscheinen grün, Zeichenketten orange und Schlüsselwörter blau. Der Editor passt seine Farben an das helle oder dunkle Browserdesign an. Über **＋ → TypeScript** lässt sich ein neuer Entwurf erstellen und bearbeiten. Die Ausführung von TypeScript ist noch nicht verfügbar. Für JavaScript steht der bisherige Testlauf mit Demo-Zuständen zur Verfügung.

In Version 0.1.12 richtet sich die Mindestbreite der linken Projektspalte nach den sichtbaren Skript- und Ordnernamen samt Einrückungen und Symbolen. Der Anfasser bleibt zum Verbreitern verfügbar. Lange Namen werden bei Platzmangel gekürzt und bleiben als Tooltip lesbar. Die Projektliste hat keinen horizontalen Scrollbalken.

Auf .193 mit Home Assistant 2026.11.1 im Ingress geprüft: 294 px mit offenem Hauptordner, 232 px eingeklappt und 446 px nach Ziehen am Anfasser. Die sechs vorhandenen Projekte waren nach dem Update weiterhin vorhanden.

In Version 0.1.11 lassen sich Leitungen am belegten Zieleingang greifen und auf einen anderen passenden Eingang ziehen. Loslassen auf freier Fläche entfernt die Leitung. Rückgängig stellt sie wieder her. Die Simulation zeigt Zahlen, Texte und Zeiten direkt am Zieleingang an.

Version 0.1.9 zeigt in der Skriptliste geschlossene und offene Ordnersymbole passend zum Zustand der jeweiligen Gruppe.

Version 0.1.8 zeigt Skripte in 28 px hohen Zeilen mit rahmenlosen Aktionen. Die Auswahl färbt die gesamte Zeile blau. Auf .193 mit Home Assistant 2026.11.1 wurden Zeilenhöhe, Auswahl, Öffnen und der simulierte JavaScript-Testlauf geprüft.

Die App im UGSo-App-Repository unter **HA Logic Studio Pro** installieren oder aktualisieren. Die GitHub-Ausgabe hat in Home Assistant eine eigene Installationskennung. Bei einem Wechsel aus „Local apps“ die bisherige Installation für browsergespeicherte Entwürfe behalten. YAML und Funktionspläne können als Dateien exportiert werden.

Nach dem Start **Weboberfläche öffnen**. Über **＋ → HA-YAML** ein Skript oder eine Automation erstellen. Vorhandene YAML-Dateien können geöffnet, bearbeitet, auf Syntax und Grundstruktur geprüft und exportiert werden. Die Ausführung einer exportierten Konfiguration übernimmt Home Assistant nach dem manuellen Übernehmen.

Rules und Blocks erzeugen über **Als HA-YAML öffnen** einen separaten bearbeitbaren Tab. Der Funktionsplan bringt den bisherigen Editor mit Import, Export, Simulation und Entitätsauswahl mit.

JavaScript-Testläufe verwenden Demo-Zustände und protokollieren simulierte HA-Aktionen im Editor. Projekte und Ordner werden im aktuellen Browser gespeichert. Zum Verschieben die Sortierpfeile anklicken, Skripte in einen Ordner oder vor einen anderen Eintrag ziehen und mit den roten Pfeilen speichern.

Der HA-Konfigurationsordner ist für den Funktionsplan lesend eingebunden. Die Importfunktion sichert gelesene Quelldateien vor dem Parsen unter /data/ha-source-backups/.
