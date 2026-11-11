# HA Logic Studio Pro 0.1.7

Öffentliche Testversion mit eigenem App-Slug `ha_logic_studio_pro`. Die App startet manuell und verwendet ihren eigenen Datenspeicher.

Version 0.1.7 bringt eine gemeinsame Sprachauswahl für Deutsch, Englisch und Französisch, einen kompakteren eingebetteten Funktionsplan, größere Filter-Symbole und bündige Skriptaktionen. Diese vier Änderungen wurden in Home Assistant 2026.11.1 geprüft.

Die App im UGSo-App-Repository unter **HA Logic Studio Pro** installieren. Die GitHub-Ausgabe hat in Home Assistant eine eigene Installationskennung. Bei einem Wechsel aus „Local apps“ die bisherige Installation für browsergespeicherte Entwürfe behalten. YAML und Funktionspläne können als Dateien exportiert werden.

Nach dem Start **Weboberfläche öffnen**. Über **＋ → HA-YAML** ein Skript oder eine Automation erstellen. Vorhandene YAML-Dateien können geöffnet, bearbeitet, auf Syntax und Grundstruktur geprüft und exportiert werden. Die Ausführung einer exportierten Konfiguration übernimmt Home Assistant nach dem manuellen Übernehmen.

Rules und Blocks erzeugen über **Als HA-YAML öffnen** einen separaten bearbeitbaren Tab. Der Funktionsplan bringt den bisherigen Editor mit Import, Export, Simulation und Entitätsauswahl mit.

JavaScript-Testläufe verwenden Demo-Zustände und protokollieren simulierte HA-Aktionen im Editor. Projekte und Ordner werden im aktuellen Browser gespeichert. Zum Verschieben die Sortierpfeile anklicken, Skripte in einen Ordner oder vor einen anderen Eintrag ziehen und mit den roten Pfeilen speichern.

Der HA-Konfigurationsordner ist für den Funktionsplan lesend eingebunden. Die Importfunktion sichert gelesene Quelldateien vor dem Parsen unter /data/ha-source-backups/.
