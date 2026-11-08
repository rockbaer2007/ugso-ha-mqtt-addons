# Palette und eingebettete Runtime – lokaler Test 0.1.298

## Deutsch

Die Widgetpalette zeigt drei gleichmäßige Kacheln pro Zeile mit Namen und Miniatur. Messinstrumente verwenden ihre eigenen Renderer mit Vorschauwerten; Geräte und Uhr erhalten eigene statische Miniaturen. Vorhandene Paketbilder bleiben erhalten. Mauszeiger oder Tastaturfokus zeigen eine größere Vorschau und eine Kurzbeschreibung. UGSo-Sets sowie SVG-Line/LineBox/Math bleiben namensbasiert. Die Suche, aufklappbare Sets und vorhandenen Farbeinstellungen bleiben erhalten.

Neben den Seitenreitern startet **▶** die Runtime nach erfolgreichem Speichern; **■** beendet sie. Eine isolierte Runtime überlagert ausschließlich die Arbeitsfläche. Palette, Eigenschaften und Bearbeitungswerkzeuge sind währenddessen ausgegraut und gesperrt, einschließlich Tastenkürzeln. Seitenwechsel und das separate Runtime-Fenster bleiben verfügbar. Stoppen entfernt die Runtime; Auswahl, Verlauf, Editorseite und Scrollposition bleiben erhalten. Eine fehlgeschlagene Speicherung startet keine Runtime. Die bisherigen Editor/Runtime-Menülinks entfallen; **Neuer Tab** bleibt bestehen.

Es werden keine Projekte migriert und keine Zugangsdaten geändert. Seitenmeldungen des eingebetteten Fensters werden nur von dessen eigener Quelle, gleichem Origin und bekannten sichtbaren Projektseiten akzeptiert. Eingebettete Tabs-Widgets behalten ihren Kontext. Die Runtime kann wie bisher echte HA-Geräte steuern; die Palette selbst ist keine aktive Gerätesteuerung.

Prüfung am 08.11.2026: 20 gezielte JavaScript- und 17 Python-Paketprüfungen erfolgreich. Lokal Miniaturen, Tastaturvorschau, Start/Stopp und Seitenwechsel geprüft. Auf .177 (HA 2026.11.0/ARM64) und .193 (HA 2026.10.4/amd64) lokale App von 0.1.297 auf 0.1.298 aktualisiert; Projekt nach Neuladen erhalten, Start/Stopp und Seitenwechsel bestätigt. Auf .177 Auswahl nach Stoppen erhalten, separates Runtime-Fenster geöffnet und SVG-Line ohne Miniatur nachgewiesen. Keine echten Geräte für diese UI-Prüfung geschaltet. Studio bleibt auf beiden Hosts installiert.

Frische Vollsicherungen vor der Änderung: .177 `832d0f41` (199,26 MB), .193 `c74d7c22` (177,38 MB). PC-Quellstand: `Downloads/Studio-vor-Palette-Runtime-0.1.298-20261108.zip`. Bestehende Projekte, eigene Widgets und Einstellungen erhalten. Keine Veröffentlichung dieser Version beauftragt.

Bereinigung nach ausdrücklicher Einzelfreigabe: ausschließlich das alte Vollbackup `3c252cf9` auf .177 gelöscht. Drei neuere Vollbackups und das App-Update-Backup bleiben erhalten. Auf .193 liegen drei Vollbackups; keine Löschung notwendig.

## English

The palette now uses three equal tiles per row, with names and miniatures. Gauges use their own preview renderers; device/clock artwork is Studio-owned and existing package images are retained. Hover or keyboard focus opens a larger preview and description. UGSo and SVG line/LineBox/Math entries remain name-only. Search, collapsible sets and saved colors remain available.

**▶** beside the page tabs saves first and starts an isolated runtime over the canvas; **■** stops it. Editor tools, palette, properties and shortcuts are locked/dimmed. Page navigation and the separate runtime window remain available. Stopping preserves the editor page, selection, history and scroll. Failed saves do not start runtime. The old menu mode links are removed; the separate-window link remains. Frame page messages are checked against the frame source, origin and visible project pages. No credentials or projects are migrated.

20 focused JavaScript and 17 Python package checks passed. Verified local previews and real HA update/start/stop/page navigation on .177 and .193; selection restoration and the separate runtime window also checked on .177. Existing projects/settings retained. No real devices operated for this UI test; no publication requested.

## Français

La palette présente trois tuiles identiques par ligne, avec noms et miniatures. Les instruments utilisent leur propre rendu de démonstration ; les appareils/horloges ont des miniatures originales et les images des paquets sont conservées. Survol ou focus clavier : aperçu agrandi et description. Les entrées UGSo et SVG-Line/LineBox/Math restent uniquement nommées. Recherche, groupes repliables et couleurs enregistrées conservés.

**▶** près des onglets sauvegarde puis démarre une exécution isolée au-dessus de la surface ; **■** l’arrête. Outils, palette, propriétés et raccourcis sont grisés/verrouillés. Navigation entre pages et fenêtre séparée restent disponibles. L’arrêt conserve page, sélection, historique et défilement de l’éditeur. Une sauvegarde échouée empêche le démarrage. Les anciens liens de mode du menu sont retirés ; le lien de fenêtre séparée reste présent. Les messages de page sont validés par source de fenêtre, origine et pages visibles du projet. Aucun identifiant ni projet n’est migré.

20 vérifications JavaScript ciblées et 17 Python réussies. Aperçus locaux et mise à jour/démarrage/arrêt/navigation HA vérifiés sur .177 et .193 ; restauration de sélection et fenêtre séparée également sur .177. Projets et réglages conservés. Aucun appareil réel commandé pendant ce test d’interface ; aucune publication demandée.

## Screenshots

- [Palette mit Vorschau, .177](images/0.1.298/177-palette-help.jpg)
- [Palette mit Vorschau, .193](images/0.1.298/193-palette-help.jpg)
- [Inline-Runtime .177](images/0.1.298/177-inline-runtime.jpg)
- [Inline-Runtime .193](images/0.1.298/193-inline-runtime.jpg)
- [Editor nach dem Test](images/0.1.298/177-editor-final.jpg)
