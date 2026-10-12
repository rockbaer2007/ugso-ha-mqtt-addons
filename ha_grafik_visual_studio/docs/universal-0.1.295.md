# Universal, Radialregler und Material-Vorschauen – 0.1.295

[Inventwo VIS-2 1.10.0](https://github.com/inventwo/ioBroker.vis-2-widgets-inventwo/tree/46f040e761012a9a6d61151e8e03df7fde02ce7b) dient als funktionale Referenz. Eigene Studio-Renderer binden HA-Entitäten und Projektseiten an. Dieses Update ergänzt die im [Vergleich](inventwo-interactive-audit-2026-10-12.md) genannten Funktionsgruppen; es verspricht keine vollständige Pixel- oder Detailgleichheit.

## Deutsch

Material-Design-Vorschauen nutzen ihre bisherigen Paket-SVGs jetzt in der ganzen Innenfläche des Rahmens. Seitenleiste und Widget-Auswahl bleiben kompakt, Hell/Dunkel funktionieren weiterhin. Ein Paketupdate ist dafür nicht erforderlich.

### Universal bedienen

- **Schalten** und **Taster / nächsten Zustand** bleiben erhalten. Unter **Tasterverhalten** lässt sich bewusst **Fester Tastwert** wählen: Jeder Klick schreibt „Wert true“. Ohne diese neue Auswahl bleibt ein altes Projekt beim nächsten Zustand.
- **Haltewert aktivieren** schreibt beim Drücken den Haltewert (ohne eigenen Eintrag „Wert true“) und stellt beim Loslassen den vorher gelesenen Wert wieder her. Maus, Touch und Enter/Leertaste sind unterstützt. Abbruch, Fenster-Fokusverlust und Ausblenden lösen ebenfalls die Rückstellung aus, solange die Seite noch ausgeführt wird. Browserabsturz/Netzverlust garantieren keine Rückstellung; für kritische Verbraucher einen HA-seitigen Timeout vorsehen. Schreibvorgänge sind je Entität geordnet.
- **Erhöhen / Verringern** addiert „Änderung pro Klick“; negative Zahlen verringern. Optionale Unter-/Obergrenze begrenzen den Wert. Numerische HA-Helfer behalten ihre serverseitigen Entitätsgrenzen. Unbekannte Werte sind nicht bedienbar.
- **Navigation** kann eine gespeicherte Zielseite oder die bisherige Ziel-URL öffnen. Die optionale Navigations-PIN ist eine lokale Bedienungshürde, keine Zugriffsberechtigung; sie liegt im Projekt und ersetzt keine HA-Anmeldung.
- **Ansicht im Dialog** öffnet die Zielseite mit Titel, Breite/Höhe, Position, Innenabstand, Eckenradius, Vollbild, optionalem Außenklick und automatischem Schließen. Escape oder Schließen beendet den Dialog. Größen passen sich an den Bildschirm an.
- **HTTP-Aufruf** unterstützt GET im Hintergrund, neuen Tab oder aktuellen Tab. Hintergrundaufrufe laufen im Browser, senden keine Studio-Anmeldedaten und brechen nach 15 Sekunden ab. Der Zielserver muss CORS erlauben; HTTPS-Seiten können HTTP-Ziele als Mixed Content blockieren. Es gibt keinen serverseitigen HTTP-Proxy.

### Universal-Inhalte

Im **Standardzustand** oder einem einzelnen **Zustand** den Inhaltstyp auswählen:

- **Eingebettete Ansicht:** Inhaltsseite auswählen, bei Bedarf **Ansicht einpassen**. Die Zielseite bleibt eine Studio-Projektseite. Zirkuläre Einbettungen und Ketten ab acht Ebenen werden unterbunden; Editor-Vorschauen bedienen die eingebetteten Widgets nicht.
- **Farbwähler:** Farbfläche oder Farbkreis, optional HSV-/RGB-Regler, Alpha und Kelvin. Die Farbausgabe unterstützt HEX, HEX8, RGB, HSL, HSV und CIE-xy. Zahlenmodelle werden als JSON-Liste geschrieben. `input_text` erhält die gewählte Ausgabe, eine `light.*`-Entität RGB über `light.turn_on`. Kelvin geht nur an passende HA-Lichter. Alpha wird in HEX8 ausgegeben; HA-RGB selbst hat keinen Alphakanal. Sensoren sind nur lesbar. Ohne Entität ist die Ausgabe lokal. Entitätsfähigkeiten und Kelvin-Grenzen werden vor dem HA-Schreiben geprüft.
- **Analoguhr:** Lokale Browserzeit, Ziffern und Sekundenzeiger optional, Uhrblatt-/Zeigerfarbe einstellbar. Die Zeiger werden sekündlich aktualisiert.

### Radiale Farbverläufe

In Spurfarbe, aktiver Spurfarbe und Daumenfarbe kann eine CSS-Farbe oder beispielsweise `linear-gradient(90deg, #ff0000 0%, rgb(255, 200, 0) 50%, #00aa66 100%)` stehen. Richtungen wie `to top`, Farbfunktionen und Prozentpositionen funktionieren. Fehlende Positionen werden gleichmäßig zwischen den gesetzten Positionen verteilt. Die Stilübernahme vom Widget bleibt gültig. Bisherige einfache Farben ändern sich nicht.

**Interaktiv-Sprache** wählt DE/EN/FR für Universal und Radialregler unabhängig von der Studio-Oberfläche. Technische Werte, Seiten-/Entitätsnamen und eigene Texte werden nicht übersetzt. Bestehende Eigenschaftsgruppen behalten ihre Schlüssel und gespeicherte Deaktivierungen.

### Unterschiede zur Referenz

Studio verwendet HA-Lichter/Text-/Zahlenhelfer und Studio-Seiten statt beliebiger ioBroker-Datenpunkte und VIS-Ansichten. Farbbestandteile sind keine separat frei zuweisbaren ioBroker-Datenpunkte; der Farbwähler schreibt eine HA-Farbe oder eine formatierte Ausgabe. Die Uhr bietet die oben beschriebenen Optionen, nicht sämtliche Inventwo-Detailparameter für jede Markierung und jeden Zeiger. Dialoge und Farbwähler sind eigene native Renderer. HTTP hängt von Browser/CORS ab. Vorhandene eigene HTML-Inhalte behalten das bisherige Verhalten. Das gesamte Studio-Menü ist weiterhin DE/EN; die hier beschriebenen Widgets unterstützen ihre eigene DE/EN/FR-Auswahl.

## English

Material icons now fill the existing sidebar/selector frame without changing package graphics. Universal retains legacy switch/cycle behavior; opt into **Fixed button value** to write the true value on each click. Hold buttons write the hold value and restore the captured previous value on release/cancel/blur, with ordered writes. A browser/network failure cannot guarantee restoration; use a HA-side timeout for critical devices.

Additional actions: bounded increase/decrease, Studio page navigation with an optional UI-only PIN, configurable page dialog (title, dimensions, padding, corners, position, fullscreen, outside-click and timeout), and browser HTTP GET/new/current tab. Background GET uses no Studio credentials and times out after 15 seconds. CORS and mixed-content rules apply; no server proxy is provided. The PIN is stored in the project and is not authorization.

Choose content in the default or individual state: embedded Studio page with optional scaling and recursion protection; color box/wheel with optional HSV/RGB/alpha/Kelvin sliders; analog clock with optional numbers/seconds and face/hand colors. Color output formats are HEX, HEX8, RGB, HSL, HSV and CIE xy; numeric formats use JSON arrays. `input_text` receives formatted output, HA lights receive validated RGB/Kelvin commands. Alpha is supported in HEX8 output, not in HA RGB. Sensors remain read-only; unbound values stay local.

Radial track/active track/thumb accept CSS colors or `linear-gradient(90deg, red, rgb(255,200,0) 50%, green)`, including direction keywords and interpolated positions. Existing colors and style references are retained. **Interactive language** selects DE/EN/FR for these widgets; user content and technical values remain unchanged. Old property group keys and settings remain valid.

This closes the main functional groups from the review, not every Inventwo parameter: separate arbitrary ioBroker color-component data points, every clock-detail setting and exact pixel parity are not provided. Studio uses HA entities/project pages and original native renderers. The overall Studio shell remains DE/EN.

## Français

Les icônes Material remplissent le cadre existant de la barre latérale et du sélecteur. Universal conserve les anciens cycles ; sélectionner **Valeur fixe du bouton** pour écrire la valeur vraie à chaque clic. Le maintien écrit la valeur configurée puis restaure la valeur précédente au relâchement/annulation/perte de focus, dans l’ordre des commandes. Un arrêt du navigateur ou du réseau ne garantit pas la restauration ; prévoir un délai côté HA pour les appareils critiques.

Nouvelles actions : augmenter/diminuer avec limites, navigation vers une page Studio avec PIN facultatif d’interface, fenêtre configurable (titre, dimensions, marges, coins, position, plein écran, clic extérieur, fermeture automatique) et HTTP GET/nouvel onglet/onglet actuel. GET en arrière-plan ne transmet pas les identifiants Studio et expire après 15 secondes. CORS et les restrictions HTTP/HTTPS s’appliquent ; aucun proxy serveur. Le PIN enregistré dans le projet ne remplace pas l’autorisation HA.

Contenus par défaut ou par état : vue Studio intégrée avec ajustement et protection contre la récursion, zone/cercle de couleur avec curseurs HSV/RGB/alpha/Kelvin facultatifs, horloge analogique (chiffres/trotteuse et couleurs). Formats HEX, HEX8, RGB, HSL, HSV et CIE xy ; tableaux JSON pour les formats numériques. `input_text` reçoit la sortie formatée ; les lumières HA reçoivent des commandes RGB/Kelvin validées. Alpha concerne HEX8, pas RGB HA. Capteurs en lecture seule ; valeurs sans entité locales.

Les pistes et le curseur radial acceptent couleurs CSS ou `linear-gradient(90deg, red, rgb(255,200,0) 50%, green)`, avec directions et positions interpolées. Anciens styles et références conservés. **Langue interactive** choisit DE/EN/FR sans traduire les données utilisateur. Les clés de groupes existantes restent valides.

Les grandes fonctions du rapport sont ajoutées, sans reproduire chaque paramètre Inventwo : pas de points de données ioBroker arbitraires pour chaque composante, ni de tous les détails graphiques d’horloge, ni de parité parfaite des pixels. Studio utilise les entités HA, les pages du projet et ses propres moteurs. L’interface globale reste DE/EN.
