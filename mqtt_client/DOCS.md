# MQTT-Client einrichten

## Neu in 0.1.24: automatische VIS-2-Datenpunkte

Der kombinierte ioBroker-Helfer legt in `outputMode: 'virtual'` eigene Datenpunkte
unter `0_userdata.0.ugso_mqtt` an. Ein Datenpunkt verbindet Status und Rückkanal:
HA-Rückmeldungen kommen mit `ack: true`, VIS-2-Bedienungen gehen mit `ack: false`
an `/set`. Switches, Helligkeit, RGB, Effekte und Kelvin werden passend umgesetzt.
Sicherungsdatenpunkt und Ordner entstehen automatisch in `mode: 'apply'`;
`mode: 'preview'` bleibt ohne Schreibzugriffe. Beim Start wird nicht geschaltet.
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
