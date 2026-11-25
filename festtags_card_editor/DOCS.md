# Festtags-Card-Editor einrichten

1. Ein vollständiges HA-Backup erstellen.
2. App installieren und starten. Die App installiert ausschließlich ihre eigene
   Integration `weihnachtssteuerung` sowie Editor und Card im eigenen `www`-Ordner.
3. Home Assistant nach Erstinstallation oder Update neu starten. Vorhandene
   Einstellungen bleiben erhalten; die App führt keinen unangekündigten Neustart aus.
4. **Weboberfläche öffnen**. Auf einem frischen System einmal **Integration einrichten**
   wählen; eine vorhandene Einrichtung bleibt unverändert. Danach Region und Land auswählen, Saison sowie Steuerungen
   einrichten und speichern. Bei einer neuen Einrichtung wird die HA-Integration
   durch ihren normalen Konfigurationsablauf angelegt.
5. **Card-Ressource einrichten** ausführen. Danach diese Card zum Dashboard hinzufügen:

```yaml
type: custom:weihnachtssteuerung-card
title: Weihnachtssteuerung
```

Die Vorgabe läuft jährlich vom ersten Advent bis einschließlich 10. Januar.
Pro Entität lassen sich eigene Schaltzeiten und ein eigener Zeitraum einstellen.
Im Modus **Nur ausgewählte Festtage** zählt die Festtagsauswahl, nicht der
tägliche Saisonzeitraum. Ein Ausschaltzeitpunkt vor dem Einschaltzeitpunkt liegt
in der folgenden Nacht. Es werden `light`, `switch` und `input_boolean` unterstützt.

## Bilder

Es sind keine Bilder enthalten. Eigene Dateien im Editor hochladen und pro
Region/Land/Festtag zuordnen. Bilder müssen unter einem lokalen `/local/`-Ordner
liegen. **Eigene Festtagsbilder anzeigen** aktivieren und speichern.
PNG, JPG, WebP und GIF werden nach Inhaltsprüfung angenommen; maximal 5 MiB und
16 Megapixel. Doppelte Dateinamen erhalten einen Zähler. Lösen entfernt nur eine
Zuordnung. Vorhandene, selbst abgelegte SVG-Dateien können zugeordnet werden.

## Hintergrund, Schneefall und Dekoration

Im gleichnamigen Editorbereich einen Modus wählen. Eigene Dateien nach
`/local/weihnachtssteuerung/background` hochladen oder dort ablegen; der Ordner
liegt neben `bilder` und wird beim ersten Upload angelegt. Hintergrund und
Dekoration getrennt auswählen. Transparenz (100 % = unsichtbar), Größe und
X-/Y-Position einstellen und speichern. **Dekoration anzeigen** ist unabhängig
vom Hintergrundmodus. Die Abdunklung liegt unter den Texten und Buttons.
Alle Effekte sind zunächst aus. GIFs werden nicht verändert; Schneefall pausiert
bei unsichtbarer Card/Seite. Es werden keine Bilder mitgeliefert.

Bei aktivem **Bewegung reduzieren** bleiben die Flocken statisch. Optional
**Schneefall trotzdem animieren** aktivieren und speichern. Diese bewusste
Ausnahme gilt nur für die Card; Pause bei unsichtbarer Card/Seite bleibt aktiv.

Unter **Schneeflocken-Durchmesser (px)** 1 bis 20 CSS-Pixel einstellen,
Standard 4 px. Flockenzahl und Abdunklung bleiben unabhängig davon.

## Was bleibt bei Stoppen oder Deinstallation?

Die Editor-App und die Steuerung sind getrennt. Die HA-Integration führt die
Zeitpläne weiter aus, auch wenn die App gestoppt wird. Eine App-Deinstallation
entfernt weder HA-Konfigurationseinträge noch Bilder unter `/config/www`.
Die HA-Integration kann bei Bedarf separat in HA deaktiviert werden.

## Sicherheit und Daten

Nur aktive HA-Administratoren dürfen den Editor öffnen. Ingress prüft den
tatsächlichen HA-Nutzer; Änderungen benötigen einen CSRF-Nachweis. Der
Supervisor-Zugang bleibt auf dem Server. Es gibt keine allgemeine HA-API-Weiterleitung.
Die Card zeigt nur konfigurationsbezogene Daten und kann die fünf Pause-Schalter
bedienen. Keine Bilder und keine Zugangsdaten werden nach außen übertragen.

[English documentation](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/blob/master/festtags_card_editor/docs/README.en.md)
