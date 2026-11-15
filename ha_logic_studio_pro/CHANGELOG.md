# HA Logic Studio Pro

## 0.1.95

- Rules: Auslöser können eine Trigger-ID erhalten. Die Bedingung „Ausgelöst durch“ verwendet diese ID im HA-YAML-Export und bei der Umwandlung nach JavaScript.
- Live-Test auf dem Testsystem PC (64): Trigger-ID `first` führte DANN aus, `second` führte SONST aus.

## 0.1.94

- HA-YAML-Projekte können mit einer bestehenden Home-Assistant-Automation oder einem Skript verknüpft werden.
- Die Ansicht zeigt den Status des verknüpften Eintrags. Automationen lassen sich aktivieren, deaktivieren und mit Bedingungsprüfung auslösen. Skripte lassen sich starten und stoppen.

## 0.1.93

- Der YAML-Rückexport erhält unbekannte Felder und Blueprint-Instanzen. Der Rückexport der Flur-Testdatei und der Blueprint-Instanz war auf dem Testsystem PC (64) bytegleich.
