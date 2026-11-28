# HA Logic Studio Pro

## 0.1.137 – 28.11.2026

- Punkteraster in Blocks A und Blocks JS ergänzt, ohne erzwungenes Einrasten oder Änderung gespeicherter Blockpositionen.
- Mausrad verschiebt die Arbeitsfläche; Shift + Mausrad verschiebt horizontal. Strg + Mausrad, Pinch und Zoomtasten ändern den Maßstab.
- 87 Node- und 14 Server-Tests erfolgreich. Raster beider Editoren, Mausradverschiebung und Zoom lokal in Chrome geprüft. Kein HA-Update für diese Version.
- Erfolgreichen ergänzenden Live-Test von 0.1.136 auf .193 in README DE/EN und Doku DE/EN/FR dokumentiert. Originales 0.1.136-ZIP bleibt unverändert.

## 0.1.136 – 28.11.2026

- Sensorzustand-Bausteine warten in Blocks JS auf die HA-Schreibbestätigung. Nachfolgende Lese-/Debug-Ausgaben verwenden den bestätigten Sensorwert; neue HA-Ereignisse werden nicht mit älteren Antworten überschrieben. Fehler stoppen die betreffende Runtime sichtbar.
- Normale HA-Ausgabebausteine laufen mit Annahmebestätigung nacheinander. Explizite Timer und Callback-Auslöser bleiben eigenständige Fortsetzungen. Eigene JS-/TS-Skripte können `await ha.setSensorState(...)` und die anderen schreibenden HA-APIs verwenden.
- Floating-Eingaben werden beim Feldwechsel/Klick oder Tab ohne Enter übernommen. Geänderter Entwurf beziehungsweise gespeicherter, aber noch nicht gestarteter Code wird als vorheriger Runtime-Stand markiert.
- „Protokoll leeren“ entfernt lokale und gespeicherte Runtime-Meldungen des aktuellen Projekts, ohne es zu stoppen. Alte Poll-Antworten werden verworfen; neue Meldungen bleiben sichtbar.
- Neuer Blocks-JS-Zustandstrigger mit Entitäts-/Attributauswahl, on/off-Standardzweigen, freien Text-/Zahlenwerten, Zahnrad für weitere Zweige und optionalem Sonst-Zweig. Doppelte oder ungültige Vergleichswerte werden vor dem Start abgewiesen. Beschriftungen DE/EN/FR.
- Vergleichswert-Auswahl um on/off-Texte ergänzt; bestehende wahr/falsch-Projekte bleiben Boolean-Vergleiche. Bestehendes Falls/Sonst unverändert.
- Exportiertes Wecker-Beispiel mit verzögerter HA-Schreibantwort im echten QuickJS-Runner lokal geprüft. Quellenvergleich mit aktuellem ioBroker-JavaScript-master dokumentiert. Kein HA-System aktualisiert; kein HA-Livetest für diese Version.
- 85 Node- und 14 Server-Tests erfolgreich; 289 registrierte aktuelle Bausteine und 52 direkte Entitätsfelder geprüft. README DE/EN und Doku DE/EN/FR aktualisiert. ZIP, SHA-256-Prüfsumme und Prüfbericht zum Release.

## 0.1.135 – 28.11.2026

- Fehlende HA-typische Mehrfachauswahl bei „Falls Entitäten … wurde geändert“ ergänzt: Suche, mehrere Entitäten markieren/abwählen und gesammelt übernehmen. Bestehende kommagetrennte bzw. durch Leerraum getrennte Listen bleiben kompatibel.
- Einzel-, Mehrfach- und Attribut-Änderungsauslöser kompakt wie im ioBroker-Vorbild untereinander angeordnet. Lange Entitätsanzeigen werden nur optisch gekürzt; gespeicherte IDs bleiben vollständig. Beschriftungen DE/EN/FR.
- Direkte Entitätsfelder der registrierten Blocks-A-/Blocks-JS-Bausteine geprüft. Dynamische ID-Eingänge und reine Beschriftungen behalten ihren bisherigen Zweck.
- Kein automatischer Neustart vorhandener Projekte, keine Änderung der Runtime-Freigaben.
- 285 Bausteine und 51 direkte Entitätsfelder geprüft; 68 Node- und 12 Server-Tests erfolgreich. Lokale DOM-/Strukturprüfungen in DE/EN/FR; kein HA-Livetest für 0.1.135.
- README DE/EN und Doku DE/EN/FR aktualisiert. ZIP, SHA-256-Prüfsumme und Prüfbericht zum Release.

## 0.1.134 – 28.11.2026

- Zusätzlicher Baustein „Sensorzustand setzen · Dezimalzahl“ in Blocks A und Blocks JS mit HA-Sensorauswahl und direktem Zahlenfeld, Vorgabe 0.5.
- Dezimalwerte wie 0.5 und 33.25 bleiben bei Codeausgabe, Testlauf, HA-Schreibzugriff sowie Blockly-Speichern/Laden erhalten. Beschriftungen DE/EN/FR.
- Der bisherige Sensor-Baustein, bestehende Projekte, Attribute und Runtime-Freigaben bleiben erhalten.
- 60 Node- und 12 Server-Tests erfolgreich. Nach Sicherung auf HA 2026.11.3 geprüft: beide Werte 0.5 und 33.25 über Blocks JS sowie die von Blocks A erzeugten Ereignisdaten; Zahlenfelder nach Neuladen unverändert. Sensor-Ausgangswert wiederhergestellt, Attribute und Nutzereinstellungen erhalten. Beispiele auf Nutzerwunsch gespeichert und gestoppt behalten. Keine Start-Automation aktiviert.
- README DE/EN und Anleitung DE/EN/FR aktualisiert. Release mit ZIP, SHA-256-Prüfsumme und Prüfbericht.

## 0.1.133 – 28.11.2026

- „Sensorzustand setzen“ in Blocks A und Blocks JS, einschließlich HA-Sensorauswahl, Werteingang und Beschriftungen DE/EN/FR.
- Sensorattribute bleiben erhalten. WRITE-Freigaben und Formatgrenzen werden geprüft; Testläufe simulieren den Zugriff. Blocks A benötigt die aktive Studio-Ereignisbrücke.
- Neue Funktionspläne erhalten jedes Mal Name und Ordner und starten unabhängig leer. Bestehende Pläne und Runtime-Einstellungen bleiben erhalten.
- 50 Node- und 12 Server-Tests erfolgreich. Nach Sicherung auf Home Assistant 2026.11.3 geprüft: Blocks-JS-Berechnung 42 W, Blocks-A-YAML und dessen Ereignisdaten über die Brücke 43 W, Attributerhaltung, Ablehnung ohne WRITE, DE/EN/FR und unabhängige Funktionspläne. Ursprüngliche Freigaben wiederhergestellt.
- README DE/EN, Anleitung DE/EN/FR und Prüfbericht ergänzt. ZIP und SHA-256-Prüfsumme gehören zum Release.

## 0.1.132

- Vier getrennte „Alle“-Schalter für READ, WRITE, EVENT und TOPICS in der HA-App-Konfiguration, mit Namen und Beschreibungen in DE/EN/FR. Alle sind standardmäßig aus.
- Bei eingeschaltetem Schalter ignoriert die Runtime nur die zugehörige Liste. Die gespeicherten Einträge bleiben erhalten und gelten nach dem Ausschalten wieder. Die HA-Standardmaske deaktiviert Listen optisch nicht.
- Allgemeine Lesefreigabe für Funktionsplan, Blocks JS, JavaScript und TypeScript, einschließlich neu hinzugekommener Entitäten und Wiederverbindung. WRITE, EVENT und TOPICS bleiben getrennt steuerbar; vorhandene Aktions- und Formatgrenzen bleiben erhalten.
- 41 Node- und zehn Serverprüfungen lokal erfolgreich, einschließlich unabhängiger Freigaben, Listenerhaltung, Wiederverbindung und Schutz der READ-Grenze bei EVENT-all. Keine echten Geräteaktionen ausgeführt.

## 0.1.131

- Einheitliche HA-typische Entitätenauswahl in Funktionsplan, Rules, Blocks A/JS, HA-YAML, JavaScript/TypeScript und Importzuordnungen: Suche beim Tippen, Symbol, Name, Bereich/Gerät, ID, Zustand, Tastatursteuerung und weitere Treffer.
- Attributauswahl, Ausgangsmodi, Mehrfachlisten und manuelle IDs bleiben erhalten. Veraltete Suchantworten werden verworfen; geschlossene Auswahlen brechen laufende Anfragen ab.
- Der lesende Entitätenkatalog verwendet kurzzeitig zwischengespeicherte Zustände und Bereichs-/Gerätenamen. Sind Kontextdaten nicht abrufbar, bleiben die Entitäten auswählbar. Projekte, Einstellungen und Runtime-Freigaben bleiben unverändert.
- Lokal mit DOM-, Katalog-, Runtime- und Serverprüfungen sowie im isolierten Browser in allen sieben Editoren getestet. Ein Test auf einer HA-Installation steht noch aus.

## 0.1.130

- Blocks JS erhält bei `control_instance` die ioBroker-Adapterinstanz und die gewählte Aktion am importierten Block. Für „Neustart“ nennt der Hinweis passende HA-Aktionen für eine HA-App oder einen Integrationseintrag. Play bleibt bis zur manuellen Anpassung blockiert.
- Auf dem Testsystem PC (64) mit einem echten Blockly-Export geprüft. Der importierte Block zeigte `admin.0 · Neustart` und den Hinweis direkt am Block. Play meldete `control_instance` als nicht unterstützt. Der Test löste keinen Neustart aus.

## 0.1.129

- Blocks JS importiert `state_exists_var` mit berechneter ioBroker-ID. Die ausdrückliche HA-Zuordnung ist in der Importprüfung und direkt am Block verfügbar. Der Block unterscheidet eine fehlende Entität von einer fehlenden Zuordnung und nennt die berechnete ID im Protokoll.
- Auf dem Testsystem PC (64) mit echtem ioBroker-Blockly-Export per Play geprüft. Der vorhandene Helfer lieferte `true`, die zugeordnete, absichtlich fehlende Entität `false`. Für die dritte Prüfung meldete das Runtime-Protokoll die berechnete ID `0_userdata.0.ugso129.unmapped` ohne HA-Zuordnung. Der Hinweis war direkt am Block sichtbar.

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
