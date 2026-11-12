# HA Logic Studio Pro 0.1.41

Die Schleifenpalette in Blocks JS folgt der ioBroker-Vorlage. „Zustand von Entität“ liest eine angeschlossene Entitäts-ID, etwa aus der Schleifenvariable einer Liste.

The Blocks JS loop palette follows the ioBroker layout. The State of entity block reads a connected entity ID, for example from a list loop variable.

La palette Boucles de Blocks JS suit la présentation d’ioBroker. Le bloc État de l’entité lit un identifiant connecté, par exemple celui fourni par une boucle sur une liste.

Die Kategorie „Logik“ in Blocks JS folgt der Reihenfolge und Farbgebung von ioBroker. Dazu kommen drei HA-Prüfungen für Verfügbarkeit, Zustand und vorhandene Attribute.

The Logic category in Blocks JS follows the ioBroker order and colour scheme. Three HA checks cover availability, state, and attribute presence.

La catégorie Logique de Blocks JS reprend l’ordre et les couleurs d’ioBroker. Trois vérifications HA couvrent la disponibilité, l’état et la présence d’un attribut.

**DE:** Die dynamischen Timeout- und Intervallblöcke übernehmen Millisekunden aus einem Zahlenblock oder einer Berechnung. „Verzögerung“ und „Intervall“ geben den Namen des gewählten aktiven Timers zurück, sonst `null`.

**EN:** Dynamic timeout and interval blocks take milliseconds from a number block or a calculation. The Timeout and Interval reference blocks return the selected active timer’s name, or `null`.

**FR :** Les blocs dynamiques acceptent une durée en millisecondes fournie par un bloc numérique ou un calcul. Les blocs Délai et Intervalle renvoient le nom du minuteur actif sélectionné, ou `null`.

**DE:** Blocks JS bietet unter „Timeouts“ feste Dauerfelder in ms, s und min und getrennte Stoppblöcke mit Namensauswahl. Unter „Objekt“ lassen sich Eigenschaften über das Zahnrad ergänzen, setzen, entfernen, prüfen und auflisten.

**EN:** Blocks JS Timeouts offers fixed durations in ms, s and min and separate stop blocks with a name selector. Object blocks build objects with the gear menu and set, remove, check and list properties.

**FR :** Blocks JS propose des durées fixes en ms, s et min et des blocs d’arrêt distincts avec sélection du nom. Les blocs Objet créent des objets via la roue dentée et permettent de définir, supprimer, vérifier et lister leurs propriétés.

**DE:** „Astro“ führt Aktionen bei Sonnenaufgang oder Sonnenuntergang mit bis zu ±1440 Minuten Versatz aus. Dazu `sun.sun` zum Lesen freigeben. „Zeitplan aus Zeit-Zustand“ liest einen freigegebenen `input_datetime`-Helfer in der HA-Zeitzone. Nur Uhrzeit bedeutet täglich, nur Datum bedeutet Mitternacht, Datum plus Uhrzeit bedeutet einmalig. Änderungen am Helfer wirken sofort auf den nächsten Termin. Ein positiver Astro-Versatz benötigt eine laufende Runtime, die den ursprünglichen Sonnenzeitpunkt bereits kennt.

**EN:** Astro runs at sunrise or sunset with an offset of up to ±1440 minutes. Allow read access to `sun.sun`. Schedule from time state uses a permitted `input_datetime` helper in the HA time zone. Time-only runs daily, date-only at midnight, and date plus time once. Edits update the next occurrence. A positive Astro offset requires a running runtime that has already seen the original sun event time.

**FR :** Astro se déclenche au lever ou au coucher du soleil, avec un décalage maximal de ±1440 minutes. Autorisez la lecture de `sun.sun`. Le bloc Horaire depuis un état horaire utilise un auxiliaire `input_datetime` autorisé dans le fuseau HA. Une heure seule se répète chaque jour, une date seule se déclenche à minuit, et la date avec l’heure une seule fois. Les changements actualisent la prochaine échéance. Un décalage Astro positif nécessite une exécution qui connaît déjà l’heure initiale de l’événement solaire.

**DE:** Blocks JS → Trigger nutzt das ioBroker-Layout. „Falls Entität“ und „Falls Entitäten“ reagieren auf Zustandswechsel und können den Zielzustand filtern. Mehrere IDs werden durch Kommas getrennt. „Wert“ liefert im Entitätstrigger den alten oder neuen Zustand bzw. Attributwert oder die Entitäts-ID. „Zeitplan“ öffnet den CRON-Dialog. Testläufe simulieren Zustandswechsel von off zu on und Attributwechsel von 0 zu 1.

**EN:** Blocks JS → Triggers follows the ioBroker layout. Single-entity and multi-entity triggers react to state changes and can filter by target state. Separate IDs with commas. The Value block returns the old or new state or attribute value, or the entity ID. Schedule opens the CRON editor. Test runs simulate off to on and attribute changes from 0 to 1.

**FR :** Blocks JS → Déclencheurs reprend la présentation d’ioBroker. Les déclencheurs d’une ou plusieurs entités réagissent aux changements d’état et peuvent filtrer l’état cible. Séparez les identifiants par des virgules. Le bloc Valeur renvoie l’état ou l’attribut ancien ou nouveau, ou l’identifiant de l’entité. Horaire ouvre l’éditeur CRON. Les tests simulent un changement de off à on et des changements d’attribut de 0 à 1.

**DE:** „Konvertierung“ in Blocks JS folgt der Anordnung und Beschriftung von ioBroker. „nach Datum/Zeit“ gibt Millisekunden aus und kann HA-Zeitstempel in Sekunden als Quelle verwenden. „Datum/Zeit … nach …“ liefert ein Datum-Objekt, lokales Datum oder Uhrzeit in der HA-Zeitzone oder ISO-Text in UTC. „Zeitdifferenz formatieren“ erwartet Millisekunden. „nach Logikwert“ erkennt unter anderem `on`/`off` und `1`/`0`. „HA-Zustand verfügbar?“ prüft den gelesenen Wert vor einer Konvertierung.

**EN:** Blocks JS Conversion follows the ioBroker layout. “to date/time” outputs milliseconds and accepts HA timestamps in seconds as a source. “date/time … to …” outputs a Date object, local date or time in the HA time zone, or UTC ISO text. “format time difference” takes milliseconds. “to boolean” recognises values including `on`/`off` and `1`/`0`. “HA state available?” checks the value before conversion.

**FR :** La catégorie Conversion reprend la disposition d’ioBroker. « en date/heure » produit des millisecondes et accepte les horodatages HA en secondes. « date/heure … vers … » produit un objet Date, une date ou une heure dans le fuseau HA, ou un texte ISO en UTC. « formater la durée » attend des millisecondes. « en booléen » reconnaît notamment `on`/`off` et `1`/`0`. « État HA disponible ? » vérifie la valeur avant la conversion.

**DE:** Blocks JS bietet unter „Datum und Zeit“ zwei Zeitvergleiche, den aktuellen Datumswert und Zeitberechnungen. Testlauf und Play verwenden die HA-Zeitzone. Zeitfenster schließen den Beginn ein und das Ende aus und können über Mitternacht laufen. Ganze Tage behalten die lokale Uhrzeit bei, soweit sie am Zieltag existiert; Stunden und kleinere Einheiten sind verstrichene Zeit.

**EN:** Blocks JS offers two time comparisons, the current date value and time arithmetic under “Date and time”. Test runs and Play use the HA time zone. Time ranges include the start, exclude the end and can span midnight. Whole days preserve local wall time where it exists on the target day; hours and smaller units are elapsed time.

**FR :** La catégorie « Date et heure » de Blocks JS propose deux comparaisons horaires, la date actuelle et des calculs de date et d’heure. Le test et l’exécution utilisent le fuseau horaire de HA. Les plages incluent le début, excluent la fin et peuvent traverser minuit. Les jours entiers conservent l’heure locale lorsqu’elle existe le jour cible ; les heures et unités inférieures mesurent le temps écoulé.

**Blocks JS → Sendto** enthält zwei neue violette AWTRIX-NG-Blöcke. **Benachrichtigung** bietet Nachricht, Farbe, Ton, Icon, Wiederholungen, Dauer, Stapeln, Aufwecken und Halten. **Sound abspielen** akzeptiert einen gespeicherten Tonnamen oder RTTTL.

Das MQTT-Präfix aus AWTRIX-NG in den Block eintragen und die verwendeten Topics unter `runtime_mqtt_topics` freigeben, etwa `awtrixNG/cmd/notify` und `awtrixNG/cmd/audio/play`. Die HA-MQTT-Integration und AWTRIX-NG müssen denselben Broker verwenden. Die Blöcke senden ohne Retain. [AWTRIX-NG-MQTT-Dokumentation](https://ang.blueforcer.de/esp32/reference/mqtt/)

**Blocks JS → Sendto** enthält MQTT-Nachricht senden, HA-Benachrichtigung senden und HA-Ereignis senden. Der Testlauf zeigt die Aufrufe im Protokoll. Für **Play** gelten die Freigaben in der App-Konfiguration.

- **MQTT:** MQTT-Integration in HA einrichten und das genaue Topic unter `runtime_mqtt_topics` eintragen. **Retain** ist standardmäßig aus.
- **Benachrichtigung:** Die gewünschte `notify.*`-Entität unter `runtime_write_entities` eintragen. Der Block verwendet `notify.send_message` mit Nachricht und optionalem Titel.
- **Ereignis:** Einen eigenen Namen mit Präfix `logic_studio_` unter `runtime_events` eintragen. Ein Datenobjekt ist optional. Derselbe Ereignisname kann im Trigger „Bei Ereignis“ oder in einer HA-Automation verwendet werden.

**Blocks JS → Aktionen** bietet HA-Aktion, HA-Aktion mit Daten, Taster drücken und Option auswählen. Die rosafarbenen Blöcke orientieren sich bei Form und Feldanordnung an ioBroker.

**Blocks JS → System** enthält die Lese- und Steuerblöcke in der vertrauten ioBroker-Anordnung. Schalten und Umschalten unterstützen eine optionale Verzögerung. Aktionen für HA-Skripte unterliegen der Liste freigegebener Schreibziele.

Alle Editoren übernehmen Entwürfe erst mit **Speichern**. **Abbrechen** verwirft die Änderungen seit dem letzten Speichern. Bei einem neuen Projekt verwirft es den ganzen Entwurf. **Play** und **Neustart** sind bei ungespeicherten Änderungen gesperrt. Laufende Skripte lassen sich weiterhin stoppen. Testläufe können den aktuellen Entwurf verwenden.

Die Werkzeugleisten und Dialoge der Editoren wurden in Deutsch, Englisch und Französisch ergänzt. Der Funktionsplan startet über **Play** auf dem HA-Server. **Automatisch** reagiert auf freigegebene Eingänge. **Fester Zyklus** wertet den Plan alle 100 bis 60.000 ms aus. **Speichern** übernimmt den Entwurf. **Abbrechen** lädt den zuletzt gespeicherten Stand.

Der Projektbaum liegt pro Home-Assistant-Benutzer im App-Datenspeicher.
Zur Übernahme vorhandener Browserprojekte beim ersten Start den bisherigen
Browser mit demselben Home-Assistant-Benutzer öffnen. Das Projektmenü bietet
einen JSON-Download für lokale Entwürfe.

Blocks JS ergänzt HA-Auslöser, Attribute, parametrisierte Aktionen, Helferwerte,
Timer und Programmstruktur. Der JS-/TS-Testlauf simuliert Ereignisse und Timer.

Blocks A verwendet den Katalog von Blocks for HA 0.1.66 und exportiert native Home-Assistant-Automationen. Entitäten lassen sich direkt im jeweiligen Blockfeld auswählen. Blocks JS bietet eine eigene Palette für JavaScript mit HA-Entitäten, Aktionen und Auslösern.

**Play** startet JavaScript, TypeScript und den von Blocks JS erzeugten Code in einem serverseitigen QuickJS-Prozess. **Stopp** beendet ihn. Browserwechsel und geschlossene Tabs beenden ihn nicht. Nach einem App-Neustart müssen Skripte erneut gestartet werden. TypeScript wird transpiliert.

Die Live-Runtime verwendet die HA-WebSocket-API. In der App-Konfiguration stehen `runtime_read_entities`, `runtime_write_entities` und `runtime_events` anfangs leer. Entitäten für Aktionen sind zugleich lesbar. Änderungen an den Freigaben gelten nach einem Neustart der App.

- `ha.readState` und `ha.readAttribute` lesen die zuletzt bestätigten Werte. `ha.onState` und `ha.onAttribute` reagieren auf Änderungen. `ha.onEvent` verarbeitet freigegebene Ereignistypen.
- `ha.callAction` sendet Aktionen an einzeln freigegebene Ziele. Unterstützt werden Schaltaktionen für Licht, Lüfter, Schalter und Umschalt-Helfer, Wertänderungen für Zahlen-, Text- und Auswahlhelfer sowie Taster. HA bestätigt die Aktion asynchron. Bei einer Ablehnung oder einem Verbindungsverlust stoppt das Skript mit einer Meldung im Protokoll.
- `ha.schedule` verarbeitet die von Blocks JS erzeugten Zeitmuster und festen Uhrzeiten samt Wochentagen in der HA-Zeitzone. `ha.onSun` und `ha.scheduleFromDateTime` ergänzen dynamische Termine aus HA-Entitäten. Termine vor dem Runtime-Start werden nicht nachgeholt.
- Der **Testlauf** verwendet weiterhin Demo-Zustände und simulierte Ereignisse. **Play** verwendet die Live-Verbindung in Home Assistant.

- **Blocks A** exportiert HA-Automationen als YAML. Vorhandene Blockly-Projekte öffnen sich weiterhin in diesem Modus. HA-Skripte und HA-Automationen haben in der Projektliste kein Play-Symbol.
- **Blocks JS** erzeugt JavaScript und testet es mit Demo-Zuständen. HA-Aktionen erscheinen im Protokoll und werden nicht ausgeführt.
- Der ioBroker-Import liest den gespeicherten Blockly-Plan aus dem Export. Unbekannte Bausteine bleiben als rote Platzhalter sichtbar und blockieren die Ausgabe, bis sie ersetzt sind. Entitäten müssen auf HA-IDs angepasst werden.

Interner Entwicklungsstand mit eigenem App-Slug ha_logic_studio_pro. Die App startet manuell und verwendet ihren eigenen Datenspeicher.

Nach dem Start **Weboberfläche öffnen**. Über **＋ → HA-YAML** ein Skript oder eine Automation erstellen. Vorhandene YAML-Dateien können geöffnet, bearbeitet, auf Syntax und Grundstruktur geprüft und exportiert werden. Die Ausführung einer exportierten Konfiguration übernimmt Home Assistant nach dem manuellen Übernehmen.

Rules und Blocks erzeugen über **Als HA-YAML öffnen** einen separaten bearbeitbaren Tab. Der Funktionsplan bringt den bisherigen Editor mit Import, Export, Simulation und Entitätsauswahl mit.

JavaScript-Testläufe verwenden Demo-Zustände und protokollieren simulierte HA-Aktionen im Editor. Projekte und Ordner werden serverseitig gespeichert. Zum Verschieben die Sortierpfeile anklicken, Skripte in einen Ordner oder vor einen anderen Eintrag ziehen und mit den roten Pfeilen speichern.

Der HA-Konfigurationsordner ist für den Funktionsplan lesend eingebunden. Die Importfunktion sichert gelesene Quelldateien vor dem Parsen unter /data/ha-source-backups/.
