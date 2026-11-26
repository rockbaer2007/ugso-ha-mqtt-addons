# Logic Studio Pro 0.1.131 – HA-typische Entitätenauswahl

Stand: 26. November 2026. Lokal geprüfter Release-Stand. Noch nicht auf HA installiert oder dort getestet.

## Geprüfter Codeumfang

Der aktuelle Paketstand 0.1.130 aus `ugso-ha-mqtt-addons/ha_logic_studio_pro`
war die Grundlage. Das ältere, umfangreich veränderte separate Entwicklungsrepo
wurde nicht verändert. Vor der Bearbeitung wurde der vollständige Paketstand
als ZIP unter `M:/repos/_backups/logic-pro-0130-before-ha-picker-20261126-095237.zip`
gesichert.

- `web/pro.js`: gemeinsame Auswahl für Rules samt Assistent, Blocks A/JS,
  Importzuordnungen, Bereichs-/Labelzuordnung, HA-YAML einschließlich Verknüpfung
  zu HA-Automation/Skript sowie JavaScript-/TypeScript-Einfügen.
- `web/ha-client.js`: Funktionsplan, einschließlich Zustand/Attribut und
  BOOL-/Zahlen-/Text-/Helligkeits-Ausgangsmodus.
- `web/entity-picker.js` und CSS: gemeinsame Suchoberfläche, Symbol, Anzeigename,
  Bereich/Gerät, technische ID, Zustand, Auswahlmarkierung, Tastatur und Pagination.
- `server.py`: ausschließlich lesender Katalog, Suche nach ID/Name/Bereich/Gerät,
  mehrere Domänenfilter, Drei-Sekunden-Zustandscache und Kontextcache. Fehlen
  Bereichs-/Gerätedaten, bleibt die Entitätsliste nutzbar.
- Weitere Fundstellen in Import/Export und YAML-Vorschau sind Quell-/Projekt-
  oder Informationsanzeigen. Sie führen keine zusätzliche Entitätsauswahl aus.
  Die Blockly-Vendor-Bundles verwenden den gemeinsamen Auswahl-Callback und
  wurden nicht aus dem älteren Entwicklungsstand neu erzeugt.

Gespeicherte Projekt-/Entitäts-IDs und JSON-Mehrfachlisten bleiben unverändert.
Manuelle Eingabe bleibt aufklappbar verfügbar. Eine Auswahl erteilt keine
Runtime-Berechtigung. `runtime_read_entities`, `runtime_write_entities` und die
übrigen Freigaben bleiben unverändert. Kein HA-Token gelangt in den Browser.

## Prüfungen

- 34 Node-Tests erfolgreich, darunter zehn DOM-/Pickerprüfungen: Suche beim
  Tippen, veraltete Antworten, Pagination, Tastatur, DE/EN/FR, fehlende gespeicherte
  IDs, Mehrfachauswahl, Textsicherheit und Funktionsplan-Attribut-/Moduserhalt.
- Sechs Python-Serverprüfungen erfolgreich, darunter Katalogsuche, Domänen- und
  Ausgangsfilter, Kontextvalidierung, Ausfallrückfall und Cache.
- Browser-Modulgraph von `web/pro.js` und `web/app.js` mit esbuild als ES-Module
  kompiliert; geänderte Stylesheets ebenfalls geprüft. Die bereits vorhandene
  doppelte Übersetzung `HA-Entität auswählen` in `web/locales.js` erzeugt eine
  bestehende Build-Warnung; der neue Picker übersetzt seine Beschriftungen selbst.
- Isolierter Chromium-Test mit künstlichen Projekten: JavaScript, TypeScript,
  HA-YAML, Rules, Blocks A, Blocks JS und eingebetteter Funktionsplan geöffnet;
  jeweilige Auswahl geöffnet und eine ID übernommen. Keine Browserfehler.
- Desktop und 390 × 844 px geprüft. Screenshot und Dialoggrenzen kontrolliert.
- Alle Browseranfragen wurden lokal beantwortet; kein echter Netzwerkaufruf,
  keine Runtime-Ausführung, kein Schreibzugriff auf eine HA-Installation.
- `git diff --check` erfolgreich.

Der Chromium-Prüflauf liegt lokal unter
`M:/repos/_reports/logic-pro-picker-browser.mjs`, sein Ergebnis unter
`M:/repos/_reports/logic-pro-picker-browser-results.json`. Die Screenshots liegen
im selben Ordner. Bestehende Projekte, Kopplungen und App-Einstellungen wurden
nicht verändert. Ein Test auf einem freigegebenen HA-Testsystem steht noch aus.

## HA-Kontextdaten

Die Katalogergänzung nutzt die dokumentierten lesenden Template-Funktionen
[area_name](https://www.home-assistant.io/template-functions/area_name/) und
[device_attr](https://www.home-assistant.io/template-functions/device_attr/).
Es werden ausschließlich Bereichs- und Gerätenamen angefordert.
