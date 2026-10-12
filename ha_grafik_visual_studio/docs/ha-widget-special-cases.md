# HA-Sonderfälle der VIS-Widgets

Prüfstand: 12. Oktober 2026, Studio 0.1.295. Unterstützte Widgets lesen Live-Zustände und verwenden fest zugeordnete HA-Aktionen; lokale Editor-Vorschauen führen keine HA-Schreibaktionen aus. [Restprüfung aller weiteren 62 Widgettypen](remaining-widget-audit-2026-10-12.md).

## AckFlag HTML

Home Assistants dokumentiertes Zustandsobjekt enthält Zustand, Attribute, Zeitstempel und Kontext, aber kein ioBroker-ack-Feld. AckFlag verwendet eine ausdrücklich gewählte Bestätigungsentität oder ein konfiguriertes Attribut. Ein erfolgreicher Serviceaufruf wird nicht automatisch als Bestätigung gewertet. Die Runtime liest die gewählte Quelle; Vorschauwerte ersetzen keinen unbekannten Live-Zustand.

Quelle: https://www.home-assistant.io/docs/configuration/state_object/

## Speech to Text (optional)

Die Assist-Pipeline unterstützt Speech to Text und liefert das Erkennungsergebnis über ihre Ereignisse. Für eine HA-native Umsetzung werden eine konfigurierte STT-Pipeline, Audioaufnahme und Streaming an die authentifizierte Pipeline benötigt. Der aktuelle Proxy dient der Entitätenauswahl und implementiert dieses Audioprotokoll nicht.

Seit 0.1.293 gibt es eine optionale Browser-Spracherkennung mit Einzel-/Daueraufnahme, Schlüsselwortbehandlung und Übergabe an geeignete Textentitäten. Sie verwendet nicht die HA-Assist-Pipeline. Verfügbarkeit, Mikrofonberechtigung, sicherer Browserkontext, Ingress und Companion hängen vom Browser ab und müssen auf dem Zielgerät geprüft werden. Während der automatisierten Prüfung wurde keine reale Mikrofonaufnahme gestartet.

Quelle: https://developers.home-assistant.io/docs/voice/pipelines/

## Grenzen der jetzigen Widget-Ergänzungen

- Table bietet JSON-Zeilen, Reihenfolge, Auswahl, Details, Header-/Scroll-/Zeilen-/Spaltenoptionen und Druckvorschau. Zusätzliche Ereignis-/Bestätigungs-/Auswahlaktionen sind ausdrücklich zu konfigurieren; unterstützte HA-Ziele werden geprüft. Bulb unterstützt passende Schaltentitäten. Die separat angebotene Interaktiv-Tabelle ist dagegen lesend.
- View in Widget zeigt im Editor das Ziel und in der Runtime eine gespeicherte Projektseite. Nicht gespeicherte Änderungen anderer Seiten werden nicht eingebettet. Rekursive Seitenketten werden abgewiesen.
- iframe-Sandbox und Quelle sind je Frame konfigurierbar. Die Zielseite muss Einbettung erlauben. Die allgemeine Scrollanforderung kann an den iframe übergeben werden; getrennte X-/Y-Kontrolle kann bei fremden Ursprüngen ohne Mitwirkung der Zielseite nicht garantiert werden.
- Image 8 unterstützt maximal Index 200 (201 Einträge), iframe 8 maximal 20 zusätzliche Frames. Der Basisindex ist jeweils 0.
