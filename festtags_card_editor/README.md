# Festtags-Card-Editor 0.1.3

Home-Assistant-App mit eigenem Editor, lokaler Weihnachtssteuerung und kompakter
Dashboard-Card. Keine Cloud und keine eigenen Zugangsdaten. Bilder werden nicht
mitgeliefert. [English documentation](docs/README.en.md).

## HA-App

Die App erscheint im Sammelrepo **UGSo HA Apps** als **Festtags-Card-Editor**.
Nach Installation starten und vor Änderungen ein vollständiges HA-Backup anlegen.
Die App kopiert ausschließlich ihre eigene Integration und Frontend-Dateien nach
HA. Bei Updates sichert sie vorhandene eigene Dateien vorher nach `/data/backups`.
Vorhandene Einstellungen, andere Integrationen und Nutzerbilder bleiben erhalten.
Nach der ersten Installation oder einem Update HA neu starten.

Die App über **Weboberfläche öffnen** aufrufen. Auf einem frischen System einmal
**Integration einrichten** wählen; bestehende Einträge werden dabei nicht verändert.
Region, Land, Saison und bis zu
fünf Entitäten einstellen und **Speichern**. **Card-Ressource einrichten** trägt
nur die eigene Card in HA ein beziehungsweise aktualisiert deren Versions-URL.
Die YAML-Vorlage aus dem Editor in ein Dashboard übernehmen.

Bei jeder Steuerung unter **Entität suchen** einen Teil des Namens oder der
Entitäts-ID eingeben, etwa `weihnacht`. Die passenden Entitäten erscheinen
direkt darunter. Einen Treffer auswählen und anschließend speichern. Die Suche
allein ändert die bisherige Auswahl nicht; ein leeres Suchfeld zeigt alle Ziele.

Die Steuerung läuft im HA-Core und bleibt aktiv, wenn die Editor-App gestoppt
wird. Der Editor ist nur für aktive HA-Administratoren über Ingress erreichbar.
Ein Supervisor-Zugang wird ausschließlich serverseitig verwendet; er wird nicht
an Browser, Card oder Nutzerbilder weitergegeben.

## Eigene Festtagsbilder

Im Editor einen Ordner unter `/local/` wählen, beispielsweise
`/local/weihnachtssteuerung/bilder`. Eigene PNG-, JPG-, WebP- oder GIF-Dateien
hochladen, dann **Region → Land → Festtag → Datei** auswählen, **Bild zuordnen**
und **Speichern**. Pro Land lassen sich andere Motive hinterlegen. Vorhandene
Dateinamen werden bei erneutem Upload mit einem Zähler ergänzt, nicht überschrieben.
**Lösen** entfernt ausschließlich die Zuordnung und löscht keine Datei.

Die Anzeige in der Card ist abschaltbar und standardmäßig aus. Fallen zwei
Festtage zusammen, kann die Card beide zugeordneten Bilder anzeigen. An Tagen
ohne zugeordnetes Festtagsbild kann das zugeordnete Bild der aktuellen Adventswoche
erscheinen. Fehlende Bilder lassen die Textanzeige bestehen. GIF-Daten werden
unverändert gespeichert; fremde HA-Aktualisierungen laden die Bilder nicht neu.

Upload: maximal 5 MiB und 16 Megapixel, tatsächlicher Bildinhalt wird geprüft.
Bereits selbst im Ordner abgelegte SVG-Dateien können ebenfalls zugeordnet werden;
SVG wird nicht über den Upload angenommen. Nutzer müssen die erforderlichen
Rechte an ihren eigenen Bildern haben. Das Repository und die Pakete enthalten
keine Motive, Beispielbilder oder fremde Grafiken.

## Funktionen

- Auswahl zuerst nach **Region**, dann **Land**: 47 Länder und eigene Termine.
- Westliche, julianische oder beide Weihnachtstraditionen wählbar.
- Jährlich berechnete Adventssonntage, feste Festtage, regionale Bräuche und
  US-Thanksgiving. Dies ist kein vollständiger gesetzlicher Feiertagskalender.
- Bis zu fünf unabhängig konfigurierte `light`, `switch` oder `input_boolean`.
- Je Steuerung **täglich im Zeitraum** oder **nur ausgewählte Festtage**,
  eigene Ein-/Ausschaltzeit und optional eigener Anfang/Ende.
  Im Festtagsmodus zählt die Festtagauswahl unabhängig vom Saisonzeitraum;
  die Datumsfelder gelten für den täglichen Zeitraummodus.
- Vorgabe **1. Advent bis einschließlich 10. Januar**. Andere Datumsregeln und
  eigene Daten im Format `TT.MM.` sind möglich. Alle Jahre werden automatisch
  neu berechnet; keine jährliche Anpassung nötig.
- Über Mitternacht: z. B. 20:00 bis 02:00. Maßgeblich ist der Tag des
  Einschaltens; auch die letzte Nacht darf bis zur Ausschaltzeit weiterlaufen.
- Sensoren: aktueller Festtag (mehrere Namen gleichzeitig), nächster Festtag,
  nächstes Festdatum, nächste Schaltung; zusätzlich Weihnachtszeit aktiv und
  fünf dauerhaft gespeicherte Aktiv-/Pause-Schalter.
- Card mit Region/Land, Festtagen, Saison, Entitätszuständen, fünf Zeitplänen,
  nächsten Schaltungen und Pause-/Aktivieren-Buttons. Editor DE/EN.

## Alternative: Integration ohne App installieren

Vor Änderungen ein vollständiges HA-Backup erstellen.

1. Aus der ZIP den Ordner `custom_components/weihnachtssteuerung` nach
   `/config/custom_components/weihnachtssteuerung` kopieren.
2. `www/weihnachtssteuerung-card.js` nach
   `/config/www/weihnachtssteuerung/weihnachtssteuerung-card.js` kopieren.
3. HA neu starten. Unter **Einstellungen → Geräte & Dienste → Integration
   hinzufügen → Weihnachtssteuerung** Region, Land und Tradition auswählen.
4. Über **Konfigurieren** zuerst den Saisonzeitraum und dann Steuerung 1–5
   einrichten. Die Entitätsauswahl leer lassen, wenn ein Platz unbenutzt bleibt.
5. Unter **Dashboards → Ressourcen** als JavaScript-Modul hinzufügen:
   `/local/weihnachtssteuerung/weihnachtssteuerung-card.js?v=0.1.3`.
6. Die Card hinzufügen; der passende Sensor wird automatisch gefunden:

```yaml
type: custom:weihnachtssteuerung-card
title: Weihnachtssteuerung
```

Bei mehreren Installationen den gewünschten Festtagssensor im Card-Editor
auswählen oder dessen `entity_id` unter `entity:` eintragen.

## Verhalten

HA-Zeitzone und lokale Uhrzeit gelten. Schaltzeiten haben Minutengenauigkeit;
Sekunden müssen null sein. Bei einer Zeitlücke durch Sommerzeit beginnt ein
Zeitfenster zur ersten gültigen Minute. Bei einer doppelt vorkommenden Stunde
gilt der erste Einschalt- und letzte Ausschaltzeitpunkt.

Nach Neustart, geänderter Konfiguration, Wiederverfügbarkeit eines Ziels oder
Aktivieren einer Steuerung wird der aktuell vorgesehene Zustand hergestellt.
Ansonsten werden Dienste nur bei einem Wechsel des Sollzustands aufgerufen.
Manuelle Änderungen bleiben bis zur nächsten geplanten Änderung bestehen.
Pausieren lässt das Ziel unverändert; wieder Aktivieren stellt den Zeitplan her.
Entitäten außerhalb des Zeitraums werden beim Wiederanlauf ausgeschaltet.

Jede Entität darf nur einmal innerhalb derselben Installation verwendet werden.
Andere Automationen für dasselbe Ziel können weiterhin gegeneinander arbeiten.
Eine reine Offline-Integration kann Schaltungen bei ausgeschaltetem HA nicht
ausführen. Änderungen von Region/Tradition beeinflussen die verfügbaren Festtage;
vorhandene Auswahlen danach prüfen. Landesvorgaben sind bewusst anpassbare
Vorschläge, keine Aussage über die Religion aller Einwohner oder Rechtslage.

## Lokale Prüfung und Paket

```text
python -m unittest discover -s tests -v
node --check www/weihnachtssteuerung-card.js
python tools/build.py
```

Der Build erzeugt vollständige DE-/EN-Formulare und
`dist/Weihnachtssteuerung-0.1.3.zip` (Integration/Card) und
`dist/Festtags-Card-Editor-0.1.3.zip` (HA-App). Details zum Test auf .193 stehen in
`docs/TEST-193.md`. Die Entwicklungsquelle bleibt in einem eigenen lokalen Repo;
die HA-App wird über das gemeinsame App-Repository verteilt.
