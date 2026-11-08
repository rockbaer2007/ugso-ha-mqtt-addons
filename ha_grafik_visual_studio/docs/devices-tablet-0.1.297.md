# Studio 0.1.297 – Geräte und Tablet-Runtime

## Deutsch

Das eigene Set **Geräte** enthält Schalter, Dimmer, farbiges Licht, Thermostat und Messwert. Jedes Gerät gibt es als **Kachel** mit direkter Bedienung oder als **Grundriss**-Marker mit Popup. Unter Gerät eine HA-Entität wählen. Name und Status lassen sich ausblenden; Symbole und Akzentfarben sind änderbar. Die fünf gemeinsamen CSS-Gruppen bleiben vorhanden. Optionale Stile starten deaktiviert.

Die Runtime bietet nur von der Entität gemeldete Fähigkeiten an. Schalter unterstützen `switch`, `light` und `input_boolean`; Dimmen/Farbe benötigen passende Light-Fähigkeiten. Thermostate benötigen eine `climate`-Entität mit einzelnem Sollwert. Bereichsthermostate können weiter über Technic/Climate gesteuert werden. Messwerte sind nur lesbar. Editor-Vorschauen steuern keine Geräte, unbekannte oder nicht verfügbare Entitäten werden nicht bedient. Backend-Prüfungen bleiben maßgeblich; ein erfolgreicher HA-Serviceaufruf ist noch keine physische Gerätebestätigung.

Unter **Einstellungen**: „Zustände bei Tablet-Rückkehr aktualisieren“ fragt nach Rückkehr, Browser-Wiederherstellung oder erneutem Online-Zustand neu ab. Es wird kein kompletter Browser-Neustart ausgelöst. „Startseite nach Inaktivität“ ist mit **0 Sekunden deaktiviert**. Eine sichtbare Projektseite als Ziel auswählen. Offene Dialoge und laufende Eingaben werden nicht durch eine Inaktivitätsnavigation unterbrochen. Browser können Hintergrund-Timer aussetzen; die Prüfung wird bei Rückkehr nachgeholt.

Bei Border und Geräte-Widgets lässt sich **Status in Überschrift** optional einschalten. Quelle, optionales Attribut, Nachkommastellen und Einheit bestimmen die Anzeige. Eigene Titel/HTML bleiben erhalten; HA-Werte werden als Text eingesetzt.

Sieben Renderer-Familien werden erst für sichtbare Widgets geladen: Geräte, Wetter, Heizräume, Fensterübersicht, Vermieterbenachrichtigung, Technic-Statusliste und Material-Farbschemata. Gemeinsame Daten-/Binding-Module bleiben dort früh geladen, wo der Editor sie benötigt. Gleichzeitige Anforderungen teilen denselben Ladeauftrag.

Installierte Widget-Manifeste werden alle 30 Sekunden und bei Rückkehr geprüft. Nur geänderte Definitionen lösen eine Aktualisierung aus. Fehlerhafte Ersetzungen lassen den bisherigen Katalog bestehen; entfernte Definitionen bleiben für bereits geöffnete Projekte im Speicher verfügbar. Keine Projekte werden automatisch migriert oder überschrieben.

Pakete dürfen `optionalCapabilities` als Liste deklarieren: `entity-state`, `history`, `light-color`, `climate`. Diese Angaben werden in der Paketliste angezeigt. Sie erteilen keine neuen Zugriffsrechte. Unbekannte Namen werden als nicht unterstützt gemeldet. Alte Manifeste ohne diese Liste bleiben gültig. Geräteseitige Fähigkeiten werden weiterhin bei jeder Steuerung geprüft.

Eigenständige HA-Implementierung ohne VIS-2-Code oder fremde Grafiken. Web Components bleiben ein späteres separates Vorhaben. Ein responsiver Rastercontainer ist ebenfalls noch kein Bestandteil dieses Geräte-Sets.

## English

The original **Devices** set provides switches, dimmers, color lights, thermostats and measurements as tiles with direct controls or floor-plan markers with a popup. Select an HA entity in the Device properties. Names/states can be hidden; icons and accent colors are configurable. All five shared CSS groups remain available; optional styles start disabled.

Controls follow actual entity capabilities. Power supports `switch`, `light` and `input_boolean`; brightness/color require matching light capabilities. Thermostats require a `climate` entity with a single target temperature. Existing Technic/Climate controls remain available for temperature ranges. Measurements are read-only. Editor previews never operate devices; unavailable entities cannot be controlled. Backend validation remains authoritative; service acceptance does not prove physical device feedback.

Settings can refresh states when a tablet returns, the browser restores a page or connectivity returns, without reloading the page. Inactivity navigation is disabled at **0 seconds**. Choose a visible project page. Open dialogs and ongoing inputs defer automatic navigation. Suspended background timers are checked on return.

Border/device headings optionally display an HA state or attribute with decimal precision and a unit. User titles/HTML are preserved; HA data is inserted as text.

Seven renderer families load on demand: devices, weather, heating rooms, window overview, landlord notification, Technic status list and Material color schemes. Shared binding/data modules still load early when required by the editor. Concurrent loads share one request.

Widget manifests are checked every 30 seconds and on return. Only changes refresh the catalog. Failed replacements retain the previous catalog; removed definitions remain in memory for already open projects. Projects are neither migrated nor overwritten automatically.

Packages may declare `optionalCapabilities`: `entity-state`, `history`, `light-color`, `climate`. The package list shows support; declarations never grant permissions. Unknown capabilities are marked unsupported. Legacy manifests remain valid; actual HA device capabilities are still validated for commands.

Original HA implementation without VIS-2 source/assets. Web Components and a responsive grid container remain separate future work.

## Français

Le nouvel ensemble **Appareils** propose interrupteur, variateur, lumière colorée, thermostat et mesure, sous forme de tuile avec commandes ou de marqueur sur plan avec fenêtre de commande. Choisir une entité HA dans les propriétés. Le nom et l’état peuvent être masqués; icône et couleur d’accent sont configurables. Les cinq groupes CSS communs restent disponibles; les styles facultatifs sont initialement désactivés.

Les commandes dépendent des capacités réelles de l’entité. Marche/arrêt accepte `switch`, `light` et `input_boolean`; variation et couleur nécessitent les capacités correspondantes. Le thermostat utilise une entité `climate` avec consigne unique; les commandes Technic/Climate existantes gèrent toujours les plages de température. Les mesures sont en lecture seule. L’éditeur ne commande aucun appareil. Les entités indisponibles restent désactivées. Le serveur valide les commandes; leur acceptation ne prouve pas le retour physique de l’appareil.

Les réglages permettent d’actualiser les états au retour de la tablette, à la restauration de la page ou au rétablissement du réseau, sans recharger toute la page. **0 seconde désactive** le retour après inactivité. Choisir une page visible du projet. Les dialogues ouverts et les saisies en cours reportent la navigation. Les temporisateurs suspendus sont vérifiés au retour.

Les titres des cadres et appareils peuvent afficher un état HA ou un attribut, avec décimales et unité. Les titres/HTML existants sont conservés; les valeurs HA sont insérées comme texte.

Sept familles de rendu sont chargées à la demande: appareils, météo, pièces chauffées, vue des fenêtres, notification au propriétaire, liste d’états Technic et palettes Material. Les modules communs nécessaires à l’éditeur restent chargés normalement. Les demandes simultanées partagent un chargement.

Les manifestes sont vérifiés toutes les 30 secondes et au retour. Seules les modifications actualisent le catalogue. Un remplacement incorrect conserve le catalogue précédent; les définitions retirées restent en mémoire pour les projets déjà ouverts. Aucun projet n’est migré ou écrasé automatiquement.

Les paquets peuvent déclarer `optionalCapabilities`: `entity-state`, `history`, `light-color`, `climate`. Leur prise en charge est indiquée dans la liste, sans accorder de droits supplémentaires. Les capacités inconnues sont signalées comme non prises en charge. Les anciens manifestes restent valides; les commandes restent soumises aux capacités HA réelles.

Implémentation HA originale sans code ni ressources graphiques VIS-2. Web Components et conteneur de grille réactive restent des projets ultérieurs distincts.

## Prüfstand / Verification / Vérification

Lokal: 394 JavaScript- und 109 Python-Prüfungen erfolgreich. Ergänzend bestanden 7 gezielte JavaScript- und 17 Paket-Python-Prüfungen sowie die JavaScript-Syntaxprüfungen.

Auf .177 (HA 2026.11.0, Raspberry Pi 5/ARM64) und .193 (HA 2026.10.4, Proxmox/amd64) wurde Studio 0.1.297 installiert und bleibt installiert. Geprüft wurden Speichern und erneutes Laden des Beispielprojekts, tatsächliches Schalten und HA-Rückmeldung über einen eigenen temporären input_boolean sowie die Inaktivitäts-Rückkehr zur Hauptseite. Nach dem Test ist die automatische Rückkehr wieder ausgeschaltet (0 Sekunden). Der Marker-Dialog wurde zusätzlich auf .177 geprüft. Helligkeit, RGB und Thermostat wurden lokal mit simulierten Entitäten geprüft; keine echten Lampen oder Heizungen wurden dafür geschaltet.

Auf .177 wurde das lokale Testpaket nach manueller Dateiauswahl als Version 1.1.0 mit zwei Widgets nachgewiesen: `entity-state` verfügbar, unbekanntes `future-extension` nicht unterstützt. Die native Browser-Rückfrage erforderte manuelle Bedienung. Die temporären HA-Helfer wurden auf beiden Systemen entfernt. Das ausdrücklich freigegebene Vollbackup 2157cbf4 wurde gelöscht; die drei neueren Vollbackups auf .177 und das App-Update-Backup bleiben erhalten. Frische Sicherungen vor den Tests: .177 `8b5f6122`, .193 `eeb45473`. Bestehende Projekte und Einstellungen bleiben erhalten. Noch keine Veröffentlichung.

English: Studio 0.1.297 remains installed on both test systems. Project persistence, a disposable HA switch with state feedback and inactivity navigation passed. Brightness, RGB and thermostat controls were tested locally with simulated entities. Package 1.1.0 with two widgets and capability reporting was verified on .177 after manual file selection. Temporary HA helpers were removed on both hosts; only the specifically approved old backup was deleted. Existing projects and settings were retained. Not published.

Français : Studio 0.1.297 reste installé sur les deux systèmes de test. La conservation du projet, un interrupteur HA temporaire avec retour d’état et le retour après inactivité ont été vérifiés. Luminosité, RGB et thermostat ont été testés localement avec des entités simulées. Le paquet 1.1.0 avec deux widgets et l’affichage des capacités a été vérifié sur .177 après sélection manuelle du fichier. Les assistants HA temporaires ont été supprimés sur les deux systèmes ; seule l’ancienne sauvegarde expressément autorisée a été supprimée. Projets et réglages existants conservés. Aucune publication.

### Screenshots

Freigabeprüfung am 08.11.2026: Geräte-Kacheln und Marker im Desktop-Browser bei 1440 × 1000 und Tablet-Ansicht 1280 × 800 ohne überlaufende Karteninhalte kontrolliert; Licht-Popup geöffnet und geschlossen. Die Ansichten verwenden lokale simulierte Entitäten. Dies ist keine Prüfung physischer Tablet-Hardware. Paket- und Sprachtests vor der Veröffentlichung erneut erfolgreich: 8 JavaScript-Prüfungen (einschließlich Paketaktualisierung) und 17 Python-Paketprüfungen.

Release review on 8 November 2026: inspected device tiles/markers at 1440 × 1000 and tablet viewport 1280 × 800 with no card-content overflow; opened/closed the light popup. These views use local simulated entities, not physical tablet hardware. Repeated 8 JavaScript checks (including package refresh) and 17 package Python checks passed.

Vérification avant publication le 8 novembre 2026 : tuiles/marqueurs à 1440 × 1000 et vue tablette 1280 × 800 sans débordement dans les cartes ; ouverture/fermeture du dialogue de lumière. Entités locales simulées, pas de tablette physique. Les 8 vérifications JavaScript (dont l’actualisation des paquets) et les 17 vérifications Python des paquets ont de nouveau réussi.

Abschluss: Das ausschließlich für die Prüfung angelegte Paket `test.studio-devices` wurde anschließend manuell entfernt; die leere Paketliste und das Verschwinden aus der Palette wurden im Browser bestätigt. Beide integrierten Geräte-Sets und die gespeicherten Beispielprojekte bleiben bestehen.

Completion: The disposable test package was removed manually, and its absence from the installed list and palette was verified. Built-in device sets and saved example projects remain available.

Fin : Le paquet temporaire a été supprimé manuellement ; son absence dans la liste et la palette a été vérifiée. Les appareils intégrés et les projets exemples enregistrés restent disponibles.

- [Runtime .177](images/0.1.297/177-runtime.jpg)
- [Desktop 1440 × 1000](images/0.1.297/devices-desktop.jpg)
- [Tablet 1280 × 800](images/0.1.297/devices-tablet.jpg)
- [Tablet-Popup](images/0.1.297/devices-tablet-popup.jpg)
- [Runtime .193](images/0.1.297/193-runtime.jpg)
- [Tablet-Einstellungen / Tablet settings / Réglages tablette](images/0.1.297/177-tablet-settings.jpg)
- [Paketimport / Package import / Import du paquet](images/0.1.297/177-package-import.jpg)
- [Bereinigte Paketliste / Clean package list / Liste nettoyée](images/0.1.297/177-package-cleanup.jpg)
- [Lokale Gerätesteuerung / Local device controls / Commandes locales](images/0.1.297/devices-local-fixture.jpg)
