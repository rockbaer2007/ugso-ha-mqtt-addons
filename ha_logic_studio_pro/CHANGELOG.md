# HA Logic Studio Pro

## 0.1.104

- Blocks JS übernimmt ioBroker-HTTP-Antwortheader mit kleingeschriebenen Namen, etwa `content-type`.

## 0.1.103

- Blocks JS importiert ioBroker-HTTP-POST mit JSON-Payload, Statusprüfung und Antwortauswertung über einen freigegebenen HA-REST-Befehl.

## 0.1.102

- Blocks JS übernimmt ioBroker-HTTP-GET mit Status und Antworttext. Ein zugeordneter HA-REST-Befehl liefert die Antwort für die importierte JSON-Auswertung.

## 0.1.101

- Blocks JS zeigt beim ioBroker-Import einen Hinweis direkt am `exec`-Platzhalter. Ein angeschlossener Zeitvergleich wird als Bedingung für „falls“ erklärt.

## 0.1.100

- Rules bietet im Expertenmodus HA-Template-Bedingungen. Der YAML-Export übernimmt das Jinja-Template als native Home-Assistant-Bedingung.

## 0.1.99

- HA-YAML prüft verschachtelte Verzweigungen und markiert Strukturfehler an der betroffenen Zeile.

## 0.1.98

- Dauerhafte Runtime-Protokolle behalten pro Projekt höchstens 30 Tage, 100 Einträge und 64 KiB. Ältere Einträge werden auch bei gestoppten Projekten bereinigt.
- Auf dem Testsystem PC (64) wurde ein 31 Tage alter Eintrag entfernt und die Testdatei von 84.240 auf 65.430 Byte gekürzt. Der neue Eintrag war nach dem App-Neustart weiterhin abrufbar.

## 0.1.97

- Blocks JS kann ausgewählte Blöcke als JSON-Text austauschen und als separaten Entwurf öffnen.
- Die Entitäts-ID-Ansicht zeigt zum ausgewählten importierten Block auch die ursprüngliche ioBroker-ID.
- Der Funktionsplan speichert Zähler und Merker atomar in einer eindeutigen temporären Datei. Regressionstests prüfen Neustart, Planänderungen und das Unterdrücken künstlicher Flanken.
- Auf dem Testsystem PC (64) wurden die ioBroker-Exporte test33.xml und test33.js, der ausgewählte Einzelblock per JSON-Text und Datei sowie Zähler 1 und Merker true nach einem App-Neustart geprüft.

## 0.1.96

- Rules unterstützt verschachtelte UND-, ODER- und NICHT-Gruppen, das Warten auf einen Zustand sowie Schritte für HA-Skripte, Benachrichtigungen und Ereignisse.
- Bereichs- und Label-Auslöser speichern die beim Auswählen in Home Assistant zugeordneten Entitäten. Nach Änderungen an der Zuordnung lässt sich die Auswahl erneut übernehmen.
- Die Rules-Palette lässt sich durchsuchen und einklappen. Einträge lassen sich in den zugehörigen Abschnitt ziehen.
- Rules-JSON lässt sich als Text anzeigen, einfügen und als Datei austauschen.
- Blocks A nutzt die gemeinsame Auswahl für Entitäten, HA-Aktionen, Attribute, Geräte, Bereiche, Etagen und Labels. Erzeugte HA-YAML-Entwürfe zeigen die Herkunft im Editor.
- Live-Tests auf dem Testsystem PC (64) bestätigten die verschachtelten Rules-Zweige und die Aktionskette. Bereich und Label übernahmen dieselbe Testentität. Der Blocks-A-Export enthielt die IDs aller vier Kataloge als `area_id`, `label_id`, `device_id` und `floor_id`.

## 0.1.95

- Rules: Auslöser können eine Trigger-ID erhalten. Die Bedingung „Ausgelöst durch“ verwendet diese ID im HA-YAML-Export und bei der Umwandlung nach JavaScript.
- Live-Test auf dem Testsystem PC (64): Trigger-ID `first` führte DANN aus, `second` führte SONST aus.

## 0.1.94

- HA-YAML-Projekte können mit einer bestehenden Home-Assistant-Automation oder einem Skript verknüpft werden.
- Die Ansicht zeigt den Status des verknüpften Eintrags. Automationen lassen sich aktivieren, deaktivieren und mit Bedingungsprüfung auslösen. Skripte lassen sich starten und stoppen.

## 0.1.93

- Der YAML-Rückexport erhält unbekannte Felder und Blueprint-Instanzen. Der Rückexport der Flur-Testdatei und der Blueprint-Instanz war auf dem Testsystem PC (64) bytegleich.
