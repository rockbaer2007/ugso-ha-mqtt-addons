# HA Logic Studio Pro

## 0.1.128

- Blocks JS erklärt bei importiertem `control_ex` mit Ablaufzeit, dass ioBroker den gespeicherten Zustand nach Ablauf entfernt. Der Platzhalter erhält ID, Wert, Verzögerung und Ablaufzeit und blockiert Play bis zur Anpassung. Für gewünschtes Ausschalten nennt der Hinweis eine separate verzögerte HA-Aktion.
- Auf dem Testsystem PC (64) mit echtem ioBroker-Blockly-Export geprüft. Der Block enthielt `wahr`, die berechnete Verzögerung `7000 + 8000` ms und `expire: 5` Sekunden. Der Hinweis war direkt am Block sichtbar. Play meldete den nicht unterstützten Block, das Skript blieb gestoppt und der HA-Testhelfer blieb aus.

## 0.1.127

- Blocks JS übernimmt bei `control_ex` auch „steuere“ mit berechneter ID, booleschem Wert und berechneter Verzögerung. Die ID wird ausdrücklich einer schaltbaren HA-Entität zugeordnet. Für Ablaufzeiten bleibt der Importhinweis am Block.
- Mit einem echten ioBroker-Blockly-Export per Play auf dem Testsystem PC (64) geprüft. Die berechnete Verzögerung betrug `7000 + 8000` ms. Der zugeordnete HA-Schalterhelfer war nach rund vier Sekunden noch aus und nach rund 19 Sekunden an. Danach wurde der Helfer auf seinen ursprünglichen Aus-Zustand zurückgesetzt.

## 0.1.126

- Blocks JS importiert „aktualisiere“ aus `control_ex` mit berechneter ioBroker-ID, berechneter Verzögerung und der Option zum Abbrechen vorheriger Schreibvorgänge. Die ID wird ausdrücklich einem HA-Helfer zugeordnet. Andere Schreibmodi und Ablaufzeiten bleiben mit einem Hinweis am Block erhalten.
- Mit einem echten ioBroker-Blockly-Export per Play auf dem Testsystem PC (64) geprüft. Der zugeordnete HA-Zahlenhelfer stand rund vier Sekunden nach Play noch auf `0` und nach Ablauf der berechneten Verzögerung von `7000 + 8000` ms auf `42`.

## 0.1.125

- Blocks JS importiert `sendto_custom` mit benannten Parametern und Antwortzweig. In der Importprüfung wird eine HA-Skriptaktion mit Rückgabedaten zugeordnet und für die Runtime gezielt freigegeben.
- Auf dem Testsystem PC (64) mit einem echten ioBroker-Blockly-Export per Play geprüft. Das HA-Testskript berechnete aus `left: 17` und `right: 25` den Rückgabewert `42`. Der importierte Antwortzweig las `result.total` und protokollierte `42`.

## 0.1.124

- Blocks JS importiert `direct` mit getrennten HA-Zuordnungen für Quelle und Ziel und übernimmt „nur bei Änderung“. Das Ziel ist ein separater beschreibbarer HA-Helfer. Bei berechneten ioBroker-IDs zeigt ein Platzhalter die nötige Anpassung.
- Auf dem Testsystem PC (64) mit einem echten ioBroker-Blockly-Export und zwei HA-Zahlenhelfern per Play geprüft. Der Quellwechsel von `0` auf `53` schrieb `53` ins Ziel. Nach manuellem Setzen des Zielhelfers auf `7` änderte ein reines Quellattribut-Ereignis bei weiter `53` den Zielwert nicht.

## 0.1.123

- Blocks JS importiert `get_value_async` mit HA-Entitätszuordnung, Antwortzweig und dem Block „Gelesener Wert“. Unterstützt werden Wert, Aktualisierungs- und Änderungszeit, Anzeigename und Einheit. Für ioBroker-spezifische Felder bleibt ein Hinweis am Platzhalter erhalten.
- Auf dem Testsystem PC (64) mit einem echten ioBroker-Blockly-Export per Play geprüft. Der Antwortzweig protokollierte den gelesenen Wert `52.0` und schrieb `52` in den separat zugeordneten HA-Zahlenhelfer.

## 0.1.122

- Blocks JS importiert die ioBroker-Blöcke `create` und `create_ex` mit ihrer Blockfolge. Pro Datenpunkt lässt sich ein HA-Helfer zuordnen, anlegen oder später auswählen. Lesen und Aktualisieren übernehmen dieselbe Zuordnung.
- Ein neuer Helfer erhält den unterstützten festen Startwert einmalig bei der Anlage. Die Zuordnung eines vorhandenen Helfers und der Skriptstart erhalten seinen aktuellen Wert.
- Auf dem Testsystem PC (64) las der Live-Lauf zuerst `17`, aktualisierte den HA-Zahlenhelfer auf `42` und las nach dem Skriptneustart `42`. Der echte ioBroker-Export ergab denselben Blockly-Arbeitsbereich und wurde in Chrome mit dem vorhandenen Helfer verknüpft.

## 0.1.121

- Die kompakte Tab-Leiste fasst Projektname, rotes Quadrat für ungespeicherte Änderungen und Schließen-Kreuz zusammen. Eine blaue Linie markiert den aktiven Tab.
- „Alles speichern“ erscheint zwischen „Speichern“ und „Abbrechen“, sobald mindestens zwei offene Tabs ungespeicherte Änderungen haben.
- Im Chrome-Test auf dem Testsystem PC (64) blieb die Schaltfläche bei einem geänderten Tab verborgen. Bei zwei geänderten Tabs speicherte ein Klick beide Änderungen. Beide blieben nach dem Neuladen erhalten. Anschließend wurden die ursprünglichen Namen der Testprojekte wiederhergestellt.

## 0.1.120

- Bei mehreren offenen Tabs erscheint „Alles speichern“. Die Schaltfläche speichert die Änderungen aller offenen Projekte gemeinsam. Ein rotes Quadrat kennzeichnet jeden Tab mit ungespeicherten Änderungen.

- Blocks JS übernimmt `get_object_async` mit ausdrücklicher Zuordnung der ioBroker-ID zu einer HA-Entität. Im Antwortzweig liefert `common.name` den HA-Anzeigenamen und `common.unit` die Einheit.
- Auf dem Testsystem PC (64) mit einem ioBroker-Blockly-Export geprüft. Der Antwortzweig protokollierte per Play über `common.name` den Namen `Logic Studio Runtime Test` der zugeordneten Entität `input_boolean.logic_studio_runtime_test`.

## 0.1.119

- Blocks JS übernimmt den ioBroker-Selektor `$()` als Listenblock. Der ursprüngliche Ausdruck bleibt sichtbar. Beim Import werden die HA-Entitäten ausdrücklich zugeordnet und als feste Liste gespeichert.
- Auf dem Testsystem PC (64) mit einem ioBroker-Blockly-Export geprüft. Per Play protokollierte die importierte Schleife `input_boolean.logic_studio_runtime_test` und `input_number.ugso_rules_080_level` jeweils einmal.

## 0.1.118

- Blocks JS übernimmt `get_enum_members` mit aktivierter Option „nur Zustände“. Die ioBroker-Kategorie wird beim Import einem HA-Bereich oder Label zugeordnet. Der Block liefert die gespeicherten HA-Entitäts-IDs als Liste.
- Auf dem Testsystem PC (64) mit einem ioBroker-Blockly-Export und einem HA-Label mit zwei Testhelfern geprüft. Per Play protokollierte die importierte Schleife `input_boolean.logic_studio_runtime_test` und `input_number.ugso_rules_080_level` jeweils einmal.

## 0.1.117

- Blocks JS übernimmt `onEnumMembers` und ordnet die ioBroker-Kategorie beim Import einem HA-Bereich oder Label zu. Der Import speichert die aktuell aufgelösten Entitäten und erhält die Wert- und ID-Blöcke.
- Auf dem Testsystem PC (64) mit einem ioBroker-Blockly-Export und einem HA-Label mit zwei Testhelfern geprüft. Das laufende Skript protokollierte `input_boolean.logic_studio_runtime_test` mit `true` und `input_number.ugso_rules_080_level` mit `42.0`. Die Zustandsänderung von `counter.ugso_rules_080_count` außerhalb des Labels erzeugte keine Ausgabe.

## 0.1.116

- Blocks JS übernimmt den ioBroker-Logauslöser `onLog` für Warnungen und Fehler sowie `onLog_data` für Meldungstext und Logstufe. Der Importhinweis nennt die HA-Einstellung `system_log.fire_event` und die App-Freigabe unter `runtime_events`.
- Auf dem Testsystem PC (64) mit einem echten ioBroker-Blockly-Export geprüft. Beim manuell ausgelösten `system_log_event` mit `WARNING` protokollierte das laufende Skript die Meldung und `warn`. Das Kontrollereignis mit `ERROR` erzeugte keine Ausgabe.

## 0.1.115

- Blocks JS zeigt beim importierten ioBroker-Dateiauslöser `onFile` und beim Ereignisdatenblock `onFile_data` einen Hinweis zur Migration auf Home Assistant Folder Watcher.
- Auf dem Testsystem PC (64) mit einem echten Blockly-Export geprüft. Das Dateimuster `ugso-115-*.txt` und der Dateinamenblock blieben erhalten. Der Hinweis erschien in der Importübersicht und direkt am Block.
- Die App-Beschreibung verwendet einen versionsneutralen Titel. Die installierte Version steht in der Home-Assistant-App-Verwaltung.

## 0.1.114

- Blocks JS zeigt beim importierten ioBroker-Block `request` einen Hinweis zum Wechsel auf „HTTP GET · HA REST“ und zu den Entsprechungen für `result`, `response.statusCode` und `error`.
- Auf dem Testsystem PC (64) mit einem echten Blockly-Export geprüft. Die GET-URL und der Antwortzweig mit `result` blieben erhalten. Der Hinweis erschien in der Importübersicht und direkt am Block.

## 0.1.113

- Blocks JS erklärt am importierten ioBroker-Block „Datei lesen“ (`file_read`) und am Antwortblock `file_data`, wie ein HA-Skript die Antwort von `file.read_file` über `response_variable` und `.data` verarbeitet.
- Auf dem Testsystem PC (64) lieferte die native HA-Aktion für die JSON-Testdatei `data.probe = 42`. Beim Import eines echten Blockly-Exports blieben der Dateiname und der Antwortblock erhalten. Der Hinweis erschien in der Importübersicht und direkt am Block.

## 0.1.112

- Blocks JS erhält beim ioBroker-Import von „Datei schreiben“ (`file_write`) die Anschlüsse für Speicherobjekt, Dateiname und Inhalt. Der Hinweis beschreibt das Anhängen von Text über `notify.send_message` an eine fest konfigurierte Datei und den Einsatz eines eigenen Dienstes für dynamische Dateinamen, Binärdaten oder das Ersetzen einer Datei.
- Auf dem Testsystem PC (64) mit einem echten ioBroker-Blockly-Export geprüft. Der Dateiname `ugso-112-probe.txt` und der Inhalt `UGSO-Dateitest 42` blieben erhalten. Der Hinweis erschien in der Importübersicht und direkt am Block.

## 0.1.111

- Blocks JS erklärt am importierten ioBroker-Block für temporäre HTTP-Antwortdateien, wie sich ein eigener HA-Download vom Speichern einer bereits empfangenen Antwort unterscheidet.
- Auf dem Testsystem PC (64) blieb beim Import eines echten Blockly-Exports der Dateiname `ugso-111-probe.txt` erhalten. Der Hinweis erschien in der Importübersicht und direkt am Block.
- Die Paketversion stimmt mit der App-Version überein. Nach dem lokalen Neuaufbau zeigte die Studio-Kopfzeile in Chrome `0.1.111`.

## 0.1.110

- Blocks JS kennzeichnet ioBroker-HTTP-Blöcke mit Antworttyp `arraybuffer` und zeigt am Platzhalter sowie in der Importübersicht einen Hinweis. Für unveränderte Bytes kann ein Endpunkt Base64 in JSON liefern. Die Antwortverarbeitung muss daran angepasst werden.
- Der Play-Kontrolltest auf dem Testsystem PC (64) prüfte zwei Vier-Byte-Antworten. Home Assistant lieferte beim gültigen UTF-8-Fall drei Textzeichen ohne `byteLength`. Der zweite Fall löste beim Dekodieren einen Fehler aus.

## 0.1.109

- Blocks JS leitet ungültige JSON-Antworten an den Fehlerzweig weiter. Meldet Home Assistant einen Dekodierfehler, ist der HTTP-Status `null`. Erkennt Blocks JS den Fehler beim Lesen des Antworttexts, bleibt der empfangene HTTP-Status erhalten.
- Im Play-Test auf dem Testsystem PC (64) erreichten beide Fehlerfälle den Fehlerzweig. Der zweite Fall behielt HTTP 200. Die gültige Folgeanfrage lieferte `42` und das Skript lief weiter.

## 0.1.108

- Blocks JS übernimmt den ioBroker-HTTP-Antworttyp `json`. Der Antwortzweig kann Felder direkt aus den JSON-Daten lesen.
- Beim Play-Test auf dem Testsystem PC (64) lieferten der originale Blockly-Export mit „JSON nach Objekt“ und die XML-Testvariante mit `TYPE=json` für `result.value` jeweils `42`.

## 0.1.107

- Blocks JS übernimmt berechnete HTTP-URLs aus ioBroker, wenn ein fester HTTP(S)-Anfang mit einem variablen Teil verbunden ist. Der freigegebene HA-REST-Befehl erhält den variablen Teil als `url_suffix`.
- Im GET-Live-Test per Play auf dem Testsystem PC (64) empfing der Endpunkt `garten & 42` als einzelnen Query-Wert und antwortete mit HTTP 200.

## 0.1.106

- Blocks JS übernimmt beim ioBroker-POST-Import auch frei eingegebene Content-Type-Werte. Der Block zeigt den importierten Wert und verweist für zusätzliche Request-Header auf den HA-REST-Befehl.
- Im Live-Test per Play auf dem Testsystem PC (64) bestätigte der Testendpunkt `Content-Type: application/vnd.ugso+json` und `Accept: application/json`. Der POST lieferte HTTP 200 und übertrug den JSON-Wert `42`.

## 0.1.105

- Blocks JS importiert den ioBroker-HTTP-Fehlerblock. HTTP-Fehlerstatus bleiben verfügbar. Verbindungsfehler und Zeitüberschreitungen erreichen den Antwortzweig ohne Statuscode.

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
