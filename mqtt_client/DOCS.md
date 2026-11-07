# MQTT-Client einrichten


## Neu in 0.1.34: flache MQTT-Pfade nur für neue Entitäten {#mqtt-layout-0134}

Unter **Übertragung und TLS → MQTT-Struktur für neue Entitäten** kann **Flach mit kurzen Namen** gewählt werden. Standard bleibt die bisherige Struktur. Danach **Speichern und verbinden**. Die Einstellung gilt für erstmals ausgewählte manuelle Entitäten und neue Label-Mitglieder, einschließlich optionaler Gerätemesswerte.

Bereits bekannte Entitäten behalten ihre bisherigen Pfade. Die Zuordnung wird dauerhaft in `/data/mqtt-routes.json` gespeichert und ist in der exportierten Einstellungssicherung enthalten. Auch nach Entfernen und erneutem Auswählen eines Labels, Umbenennen, Neustart oder Update wird derselbe Pfad verwendet. Beim ersten Upgrade werden vorhandene Auswahlen und erfasste Topics als Bestand übernommen; die bestehende Label-Auswahl wird beim ersten erfolgreichen Abgleich gesichert. Diese Datei nicht löschen. Eine Rückstellung auf die bisherige Struktur migriert keine bereits zugeordneten Entitäten.

Beispiel für neue flache MQTT-Topics:

```text
ha_external/geraet/schalter
ha_external/geraet/schalter_set
ha_external/geraet/schalter_attribute/device_class
ha_external/geraet/energie
ha_external/geraet/leistung
ha_external/geraet/licht_brightness
ha_external/geraet/licht_brightness_set
```

Alte Topics wie `ha_external/geraet/switch/state` und `…/switch/set` bleiben parallel gültig. Vergebene kurze Namen werden bei Kollisionen eindeutig ergänzt. Vorhandene Datenpunkte, Werte, Aliase und VIS-2-Verknüpfungen werden weder umbenannt noch gelöscht.

**Vor Aktivierung den vollständigen JavaScript-Helfer 0.1.34 installieren und eigene Einstellungen übernehmen.** Er liest beide MQTT-Strukturen anhand des übertragenen Auswahlkatalogs mit exakten Status- und Rückkanalpfaden. Erst Vorschau prüfen, dann `mode: 'apply'`. Ältere Helfer erkennen die neuen flachen MQTT-Pfade nicht. `virtualLayout: 'flat'` ist davon unabhängig: Diese Helferoption bestimmt nur die Darstellung unter `0_userdata.0.ugso_mqtt`. Die bisherigen manuellen Rollen und Verknüpfungen bleiben geschützt.


## Neu in 0.1.33: flache VIS-2-Struktur mit kurzen Namen

**Den vollständigen JavaScript-Helfer 0.1.33 ersetzen und eigene Einstellungen übernehmen.** Im Einstellungsblock wählt `virtualLayout: 'nested'` die bisherige Struktur (Standard); `virtualLayout: 'flat'` legt kurze Datenpunkte direkt unter dem Geräteordner an, etwa `schalter`, `energie`, `leistung`, `spannung`, `stromstaerke`. Bei Lampen kommen passende Werte wie `helligkeit`, `farbe`, `effekt` und `farbtemperatur` hinzu. Gleichartige oder belegte Namen erhalten eindeutige Zusätze wie `leistung_2`; einmal vergebene Zuordnungen bleiben im Sicherungsjournal erhalten.

Zuerst im Vorschaumodus prüfen, anschließend `mode: 'apply'` wählen. Ein Layoutwechsel löscht oder verschiebt keine vorhandenen Datenpunkte. Bereits vom Helfer angelegte alte und neue IDs werden weiter aktualisiert und behalten ihre freigegebenen Rückkanäle; vorhandene VIS-2-Verknüpfungen können bleiben. Deshalb bleiben alte Ordner zunächst auch sichtbar. Fremde Objekte und manuelle Rollen werden nicht überschrieben, MQTT-Topics bleiben unverändert. Zur Rückkehr die Option mit dem neuen Helfer auf `nested` stellen; die alte Helferdatei 0.1.27 kann Journale mit flachen Einträgen nicht lesen.

## Neu in 0.1.32: zusätzliche Messwerte deutlich markieren

Die Option **„Zugehörige Mess- und Batteriewerte desselben Geräts automatisch einbeziehen“** ist gelb hervorgehoben. Die Markierung aktiviert den Haken nicht: Gewünschte Auswahl setzen und **„Speichern und verbinden“** drücken. Bestehende Einstellungen bleiben erhalten. TLS und Zertifikate sind weiterhin separat einklappbar.

## Neu in 0.1.31: TLS und Zertifikate separat einklappen

**TLS und Zertifikate** ist jetzt ein eigener, per Maus und Tastatur bedienbarer Klappbereich. Die Schaltfläche zeigt auch geschlossen, ob TLS ausgewählt ist. Beim Auf-/Zuklappen werden weder TLS noch gespeicherte Zertifikate oder Zugangsdaten verändert. Nach Laden und Speichern bleibt der Bereich geschlossen; Übertragungseinstellungen und die beiden Aktionsschaltflächen bleiben sichtbar. Der [neue Blogeintrag zum JavaScript-Helfer](https://opensource.ugso-software.de/blog/snippets/iobroker-blockly#mqtt-vis2-helper) erklärt Zweck, Einrichtung, Status/Rückkanal und Sicherung und enthält das vollständige unveränderte Skript 0.1.27 mit Kopierbutton und Download.

## Neu in 0.1.30: Zugangsdaten einklappen

**Zugangsdaten** besitzt jetzt eine eigene Auf-/Zuklapp-Schaltfläche, auch per Tastatur bedienbar. Bei vorhandenem Broker bleiben IP, Port, Benutzername und Passwort nach Laden und Speichern eingeklappt. Fehlen Pflichtangaben, wird der Bereich zur Eingabe geöffnet. **Übertragung und TLS**, **Speichern und verbinden** und **Aktuell übertragene Werte** bleiben sichtbar. Einstellungen und Zugangsdaten werden nicht verändert. Die Priorisierung aus 0.1.29 und Helfer 0.1.27 bleiben erhalten. Der Nutzer hat die Schalt-Rückmeldung mit ungefähr einer halben Sekunde Verzögerung als erfolgreich bestätigt. Auch die Zigbee-Lampe wurde erfolgreich geprüft: Rückmeldung funktioniert, die Helligkeit folgt HA auf 100 %.

## Neu in 0.1.29: Schaltwerte vor Messwerten

**Die HA-MQTT-Client-App auf 0.1.29 aktualisieren; der ioBroker-Helfer 0.1.27 bleibt unverändert.** Schaltzustände, Kontakte und Befehlsrückmeldungen werden vor Messwerten behandelt. Ihre Veröffentlichung wartet nicht auf die Publish-Pause. Bereits laufende Übertragungen werden abgeschlossen; zwischen Nachrichten geben Messwert-/Attributpakete für dringende Zustände und Schaltbefehle nach. Wenn mindestens 32 Ereignisse warten, werden Sensor-Zwischenstände in begrenzten Paketen auf den jeweils letzten Zustand zusammengefasst. Normale Schaltfolgen bleiben erhalten. Zusätzlich liest der Kontrollabgleich auch bei bestehender Live-Verbindung den tatsächlichen HA-Zustand im vorhandenen `poll_interval` (Standard 5 Sekunden). Unveränderte Werte werden nicht erneut veröffentlicht. **Übertragung und TLS** sowie die **Publish-Pause für Messwerte und Attribute** sind direkt sichtbar; Zugangsdaten bleiben separat einklappbar. Die Statuszeile unterscheidet **Wartend**, **Zusammengefasst**, **HA-Eingang** und den fortlaufenden Zähler **Gesendet**. Bestehende Einstellungen und Werte bleiben erhalten. Für die Prüfung den Kontrollabgleich auf 5 Sekunden lassen und ein unkritisches Relais in HA schalten. Erst eine tatsächliche HA-Rückmeldung führt zu `ack: true`; die Broker-Übergabe allein genügt nicht. Lokal geprüft, Bestätigung der Verzögerung auf dem Nutzersystem steht noch aus.

Schalter werden über die Domain `switch.*` erkannt und benötigen weder Geräteklasse noch Einheit. Lampen verwenden `light.*`. Die aktivierte automatische Messwertauswahl bleibt auf dieselbe HA-Gerätezuordnung beschränkt. Für Sensoren gilt zuerst `device_class`; fehlt sie, werden eindeutige Einheiten aus `unit_of_measurement` wie W/kW/MW, V/mV/kV, A/mA und Wh/kWh/MWh verwendet. Vorhandene Klassen werden nicht überschrieben; ähnliche Namen oder ein mehrdeutiges Prozentzeichen genügen nicht. Unter **Zugehörige Messwerte prüfen** zeigt eine schreibgeschützte Prüfung die erkannten Sensoren und Ausschlussgründe, etwa fehlende Gerätezuordnung, deaktivierte Entität oder ungeeignete Klasse/Einheit. Messwerte dürfen hinter Schaltwerten warten. Einstellungen, Zugangsdaten und bestehende Werte bleiben erhalten.

## Neu in 0.1.28: HA-Live-Rückmeldungen ohne fremde Ereignisflut

Diese Korrektur betrifft die **MQTT-Client-App in Home Assistant**: auf 0.1.28 aktualisieren und die App neu starten. Der ioBroker-Helfer 0.1.27 kann unverändert bleiben; sein Austausch allein behebt den Empfang von HA-Ereignissen nicht. Bei aktiver Label-Auswahl werden nur noch Ereignisse tatsächlich ausgewählter Entitäten und ihrer aktivierten Gerätemesswerte eingereiht. Ereignisse des übrigen HA-Bestands können die Warteschlange nicht mehr füllen. Wenn Labels oder Gerätezuordnungen geändert werden, lädt der Client frische HA-Zustände. Ältere gepufferte Zustände mit überholtem `last_updated` werden nach einem Abgleich verworfen; normale zeitlich geordnete Änderungen bleiben erhalten. Der Überlastzähler zählt seit dem App-Start und meldet weiterhin echte Überläufe ausgewählter Ereignisse. Die eingestellte Publish-Pause und alle Zugangsdaten/Auswahlen bleiben erhalten; ein großer erster Abgleich kann weiterhin länger dauern. Nach abgeschlossenem Erstabgleich ein unkritisches Relais in HA schalten und prüfen, ob MQTT und der virtuelle ioBroker-Status zeitnah folgen. Live-Bestätigung auf dem Nutzersystem steht noch aus.

## Neu in 0.1.27: Rückkanal ohne Retain

Schaltbefehle werden jetzt gezielt über die ioBroker-MQTT-Schnittstelle `sendMessage2Client` mit **`retain: false`** veröffentlicht. Normale Schreibzugriffe auf MQTT-`set`-Datenpunkte können im Servermodus mit gesetztem Retain-Flag beim Client ankommen. Der HA-Client verwirft solche Befehle weiterhin, damit beim Verbinden keine alten Schaltaufträge ausgeführt werden. Globale Broker-Einstellungen und MQTT-Datenpunktwerte bleiben erhalten. Der Helfer prüft den Befehlstopic gegen den zugehörigen Statustopic und verwendet `native.topic`, nicht aus Objekt-IDs erratene Pfade. In VIS 2 weiterhin ausschließlich den virtuellen Datenpunkt unter `0_userdata.0.ugso_mqtt` mit `ack: false` bedienen und `mode: 'apply'` verwenden. Die Logzeile `Command handed to MQTT adapter (retain=false)` bestätigt nur die Übergabe; erst ein neuer HA-Status bestätigt den Vorgang. Der rohe MQTT-`set`-Wert muss dabei nicht wechseln. Keine automatischen Wiederholungen; Fehler oder fehlende HA-Bestätigung bleiben als unbestätigt erkennbar. Für diese Korrektur die vollständige Helferdatei ersetzen und eigene Einstellungen übernehmen.

## Neu in 0.1.26: automatische Basisanlage

Fehlende eigene Basisordner (`virtualRoot`, `aliasRoot`) und beide Sicherungsdatenpunkte (`virtualBackupId`, `backupId`) werden jetzt beim Start in **jedem Modus** automatisch angelegt, auch in `preview` und `restore`. Vorhandene Ordner, Sicherungen, Werte und manuelle Rollen werden nicht überschrieben. Neue Journale enthalten gültige leere Strukturen. Für die Basisanlage muss `setObject` in der JavaScript-Instanz auch in der Vorschau erlaubt sein. Fehlende Freigaben oder kollidierende Pfade werden als Fehler gemeldet. Die Vorschau legt keine steuerbaren VIS-2-Datenpunkte an und ändert keine MQTT-Rollen oder Gerätewerte; dafür nach Prüfung `mode: 'apply'` verwenden. Die ereignisgesteuerte Verarbeitung aus 0.1.25 bleibt erhalten.

## Korrektur in 0.1.25

Fehlende Journale, optionale Attribute und virtuelle Ziele werden vor dem Lesen
mit `existsObject`/`existsState` geprüft. Auch `getObject` warnt in Adapter 10.4.10
bei fehlenden IDs. Alle Modi legen fehlende Basisordner und Sicherungen an; nur `apply` legt VIS-2-Nutzdatenpunkte an.
[Aktualisierte Hinweise zu Freigaben und Vorschau](iobroker/README.de.md#fix-0125).

## Neu in 0.1.24: automatische VIS-2-Datenpunkte

Der kombinierte ioBroker-Helfer legt in `outputMode: 'virtual'` eigene Datenpunkte
unter `0_userdata.0.ugso_mqtt` an. Ein Datenpunkt verbindet Status und Rückkanal:
HA-Rückmeldungen kommen mit `ack: true`, VIS-2-Bedienungen gehen mit `ack: false`
an `/set`. Switches, Helligkeit, RGB, Effekte und Kelvin werden passend umgesetzt.
Basisordner und Sicherungsdatenpunkte entstehen automatisch in jedem Modus;
`mode: 'preview'` ändert keine Gerätewerte oder Rollen. Beim Start wird nicht geschaltet.
Die APIs von JavaScript-Adapter 10.4.10 sind berücksichtigt. Bestehende Aliase und
MQTT-Objekte bleiben erhalten. Fehlende optionale Attribute erzeugen keine Warnungen.
[Vollständige Einrichtung und Grenzen](iobroker/README.de.md).

## Neu in 0.1.23

**ioBroker-Rollenskript herunterladen** liefert ein optionales JavaScript für
den ioBroker-JavaScript-Adapter. Vorschau ist voreingestellt. Es sichert ursprüngliche
Rollen vor Änderungen und erhält Werte, Datentypen, Zugangsdaten und manuelle
Spezialrollen. Bei schreibbaren MQTT-Messwerten entstehen schreibgeschützte Aliase.
[Installation, Wiederherstellung und Zuordnungstabelle](iobroker/README.de.md).

## Neu in 0.1.22

Die Label-Auswahl aktiviert jetzt den Zustand, vorhandene Standardattribute und
passende Rückkanäle steuerbarer Entitäten. Schalter erhalten automatisch
`<basis>/set` für `ON`/`OFF`; Zahlen, Selects und Taster verwenden ihre
unterstützten Befehle. Es werden beim Einrichten keine Schaltbefehle gesendet.
Retain-Befehle, leere Befehle und ungültige Werte werden verworfen.

Bei Lampen entstehen nur die von HA gemeldeten Kanäle:

| Kanal unter `<basis>` | Wert und Rückkanal |
| --- | --- |
| `brightness/state`, `brightness/set` | Helligkeit 0–100 % |
| `rgb_color/state`, `rgb_color/set` | JSON `[255,128,0]`, Komponenten 0–255 |
| `effect/state`, `effect/set` | Effektname aus der gemeldeten Effektliste |
| `color_temp_kelvin/state`, `color_temp_kelvin/set` | Ganze Kelvinzahl innerhalb der gemeldeten Grenzen |

`<basis>` ist das bestehende Topic ohne `/state`. Effektliste, unterstützte
Farbmodi und minimale/maximale Kelvinwerte werden als Attribute nur gelesen.
Manuell ausgewählte HA-Attribute behalten ihren Pfad und ihre Einheit:
`attribute/brightness` bleibt beispielsweise 0–255.

Unter **Übertragung und TLS** kann **Zugehörige Mess- und Batteriewerte desselben
Geräts automatisch einbeziehen** aktiviert werden. `label_device_readings` ist
standardmäßig `false`. Berücksichtigt werden Energie, Spannung, Strom, Leistung,
Temperatur, Feuchtigkeit und Batterie sowie ein vorhandener Batterie-leer-Sensor.
Die Zuordnung erfolgt ausschließlich über dieselbe HA-Geräte-ID. Es werden keine
Schwellwerte erfunden oder ähnlich benannte Geräte zusammengefasst. Diese
zusätzlichen Sensoren erhalten keine Rückkanäle.

Automatisch übertragen werden vorhandene Standardangaben wie Name, Geräteklasse,
Einheit und Zustandsklasse sowie notwendige Auswahl-/Grenzwerte. Andere Attribute
bleiben manuell auswählbar. `device_class` wird als Metadatum übertragen; die
ioBroker-Rolle, etwa `date`, wird dadurch nicht automatisch geändert.

Das Werte-Popup zeigt auch automatische Attribute, Light-Werte und aktive
Rückkanäle mit ihrer Herkunft. Nach Entfernen des Labels entfallen automatische
Werte und Rückkanäle beim nächsten Abgleich; wartende Befehle werden vor der
Ausführung erneut geprüft. Manuelle Auswahlen und Zugangsdaten bleiben erhalten.
Alte Retain-Werte werden erst über die bestätigte Topic-Bereinigung entfernt.

Lokal mit simuliertem HA und Broker geprüft; kein neuer Gerätetest auf HA.
[Release 0.1.22](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/releases/tag/mqtt-client-v0.1.22)

## Neu in 0.1.21

Nur die Zugangsdaten klappen automatisch ein. **Übertragung und TLS** bleibt
separat erreichbar; **Speichern und verbinden** und **Aktuell übertragene Werte**
stehen gleich groß nebeneinander und bleiben sichtbar.

**Aktuell übertragene Werte** öffnet eine durchsuchbare, scrollbare Liste mit
States und ausgewählten Attributen. Die Herkunft ist beschriftet und farbig:
**Label** blau, **Manuell** grün, **Beides** violett. Doppelte States erscheinen
nur einmal. Seit 0.1.22 kommen auch automatische Standardattribute hinzu.

Angezeigt werden Name, Entitäts-ID, Attribut, aktueller Wert, Topic und letzte
Brokerbestätigung mit gesendetem Wert. Fehler sind separat rot markiert; noch
nicht bestätigte Werte sind entsprechend gekennzeichnet. Die Liste aktualisiert
sich bei geöffnetem Dialog alle drei Sekunden sowie über **Aktualisieren**.
Bestätigung bedeutet Annahme durch den MQTT-Broker, nicht Verarbeitung in ioBroker.
Die Laufzeitübersicht wird bei einem Neustart der Verbindung zurückgesetzt;
vorhandene Einstellungen, Zugangsdaten und Auswahlen bleiben erhalten.

Ab **0.1.20** sind die Verbindungseinstellungen unter **Zugangsdaten** einklappbar.
Ohne gespeicherte Brokeradresse bleibt der Bereich zur Ersteinrichtung offen.
Mit gespeicherter Brokeradresse ist er nach dem Laden oder erfolgreichen Speichern
eingeklappt und lässt sich über den Titel jederzeit öffnen.

Ab **0.1.19** trennt auch die Übertragungsliste den Namen von den Angaben zu
State, Attributauswahl und Rückbefehl. **Bearbeiten** bleibt rechts ausgerichtet.

Ab **0.1.18** zeigt jede Entität im Geräte-Popup den Namen, die Entitäts-ID und
den Zieltyp mit Attributanzahl in drei getrennten Zeilen. Der aktuelle State
steht weiterhin rechts; lange Namen und IDs werden innerhalb der Zeile umgebrochen.

Seit **0.1.16**: Live-Zustände mit vollständigem Erstabgleich und Polling-Rückfall,
getrennter MQTT-/HA-Status, bestätigte Bereinigung erfasster alter Retain-Topics,
Rollladen-/Helligkeits-/Lüfterbefehle, Einstellungssicherung und eigene TLS-PEM-Zertifikate.
Bestehende Einstellungen aus 0.1.15 bleiben gültig; beim Start werden weder
Zugangsdaten oder Auswahl überschrieben noch Retain-Werte gelöscht.

**Übertragung und TLS** enthält das bisherige Abfrageintervall als Rückfall sowie
CA und Client-Zertifikat/Schlüssel. Leere Zertifikatsfelder behalten gespeicherte Werte.
**Einstellungen sichern** exportiert ohne Passwort oder Client-Zertifikat/privaten
Schlüssel; **Sicherung öffnen** prüft das Format und fragt vor dem Ersetzen nach.
**Veraltete Retain-Topics prüfen** löscht nur ausgewählte und bestätigte, von dieser
App erfasste unbenutzte Topics. Aktive Werte und fremde Topics bleiben geschützt.

Rollläden akzeptieren `OPEN`, `CLOSE`, `STOP`, `{"position":45}`, Lampen
`{"brightness_pct":75}` und Lüfter `{"percentage":50}`. Die Prozentwerte liegen
zwischen 0 und 100; das Gerät muss die HA-Funktion unterstützen.

Der MQTT-Client überträgt ausgewählte Home-Assistant-Geräte und Werte gezielt an ioBroker oder einen anderen externen MQTT-Broker. Er ist eine schlanke Alternative dazu, über den ioBroker-HASS-Adapter den kompletten Home-Assistant-Bestand zu spiegeln. Du bestimmst, welche Geräte und Werte exportiert werden; daraus entsteht in ioBroker ein übersichtlicher Gerätebaum.

Öffne nach dem Start **Open Web UI** und trage dort deinen externen Broker ein,
zum Beispiel ioBroker im Modus Server/Broker. Die Oberfläche enthält Felder für
IP oder Hostname, Port, Benutzername und Passwort. Port `1883` ist als
ioBroker-Standardport voreingestellt. Rot bedeutet **Keine Verbindung**, grün
bedeutet **Verbunden**.

Darunter zeigt die Oberfläche links eine kompakte Geräteliste. Die Suche findet
Geräte auch über enthaltene Entitäten, zum Beispiel alle Stecker. Beim Klick auf
ein Gerät öffnet sich ein Popup mit den Bereichen **Steuerung**, **Sensoren**,
**Konfiguration** und **Diagnose**. Dort stehen die zugehörigen
Home-Assistant-Entitäten mit State, Zieltyp und Attributanzahl. Rechts stehen die
ausgewählten Übertragungen. Setze im Geräte-Popup rechts an einer Wert-Zeile die Checkbox, um den State und alle Attribute dieses Werts freizugeben. **Alle States dieses Geräts übertragen** aktiviert alle Werte eines Geräts inklusive Attribute auf einmal. Sensorwerte
bleiben nur ausgehend. Der bestehende HA-Broker bleibt erhalten. Die App benötigt keinen
manuellen HA-Token. Änderungen aus der Weboberfläche werden sofort angewendet.

Die ioBroker-Zuordnung in der Liste folgt diesen Regeln: `press` wird als `button`
angezeigt, `state_boolean` als `switch`, `text`/`state` als `state`.

Die Standard-Topics sind gerätebasiert: `ha_external/<gerät>/<wert>/state`,
`ha_external/<gerät>/<wert>/attribute/<attribut>` und
`ha_external/availability`. So erscheint in ioBroker ein Geräteordner mit den
Werten darunter. Die Abfrage erfolgt alle fünf Sekunden. Nur explizit
ausgewählte States und Attribute werden exportiert; keine Discovery. Beim ersten
Abgleich sendet die App States und Attribute vor den `/set`-Rückkanälen und
drosselt neue MQTT-Werte standardmäßig mit 50 ms Pause, damit ioBroker die Objekte
in kleinen Häppchen anlegen kann.

Für ausgewählte steuerbare States aktiviert die App Rückbefehle automatisch.
Sende ohne Retain an `ha_external/<gerät>/<wert>/set`: `ON` oder `OFF` für
Schalter-ähnliche Domains, Zahlen für Slider/Zahlwerte, Optionsnamen für Selects,
Text für Textfelder und `PRESS` für Buttons oder Taster. Alte Entity-ID-Topics
wie `ha_external/switch.stecker_garten/set` werden als Kompatibilität weiter
angenommen. Sensorwerte bleiben nur ausgehend.

[Vollständige Anleitung mit Beispiel und Einschränkungen](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/mqtt_client)
## Entitäten per HA-Label weiterleiten

Lege ein HA-Label „An MQTT-Client weiterleiten“ an und trage seine ID im Feld **HA-Label-ID für Zustandsweiterleitung** ein. Weise das Label in den Entitätseinstellungen über **Label hinzufügen** zu und speichere die Entität. Der Client prüft die Zuordnung im eingestellten Polling-Intervall. Ein leeres Feld deaktiviert die Label-Auswahl.

Das Label leitet Zustand und Standardattribute weiter und aktiviert passende Rückkanäle. Weitere Attribute bleiben manuell auswählbar. Nach Entfernen des Labels endet die automatische Weiterleitung samt Rückkanälen. Manuell ausgewählte Entitäten bleiben aktiv. Der letzte Retain-Wert kann über die vorhandene Topic-Bereinigung entfernt werden.
