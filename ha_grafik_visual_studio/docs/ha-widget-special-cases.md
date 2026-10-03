# HA-Sonderfälle der VIS-Widgets

Prüfstand: 1. Oktober 2026. Die Live-Zustands- und Schreibanbindung ist ein separater Arbeitspunkt; lokale Widget-Vorschauen sind keine HA-Serviceaufrufe.

## AckFlag HTML

Home Assistants dokumentiertes Zustandsobjekt enthält Zustand, Attribute, Zeitstempel und Kontext, aber kein ioBroker-ack-Feld. Daraus folgt: AckFlag kann nicht unmittelbar aus einer normalen HA-Entität gelesen werden. Das neue Widget verwendet stattdessen den booleschen Zustand einer ausdrücklich gewählten Bestätigungsentität, beispielsweise eines input_boolean oder binary_sensor. Der Testwert steuert derzeit die Vorschau. Die spätere Anbindung darf eine Bestätigung nicht allein aus dem Erfolg eines Serviceaufrufs ableiten.

Quelle: https://www.home-assistant.io/docs/configuration/state_object/

## Speech to Text (optional)

Die Assist-Pipeline unterstützt Speech to Text und liefert das Erkennungsergebnis über ihre Ereignisse. Für eine HA-native Umsetzung werden eine konfigurierte STT-Pipeline, Audioaufnahme und Streaming an die authentifizierte Pipeline benötigt. Der aktuelle Proxy dient der Entitätenauswahl und implementiert dieses Audioprotokoll nicht.

Die Funktion bleibt optional. Vor ihrer Freigabe sind Mikrofonberechtigung, sicherer Browserkontext, Ingress- und Companion-Unterstützung, Sprachauswahl, Einzel-/Daueraufnahme, Schlüsselwortbehandlung und Übergabe an eine geeignete Textentität auf einer echten HA-Installation zu prüfen. Während dieser Prüfung wurde keine Mikrofonaufnahme gestartet.

Quelle: https://developers.home-assistant.io/docs/voice/pipelines/

## Grenzen der jetzigen Widget-Ergänzungen

- Table bietet lokale JSON-Zeilen, Reihenfolge, Auswahl, Detailvorschau, Header-/Scroll-/Zeilen-/Spaltenoptionen und Druckvorschau. Ereignis-, Bestätigungs- und Ausgewählt-Entitäten sowie Bulb-Zielentitäten bleiben bis zur HA-Schreibanbindung deaktiviert.
- View in Widget zeigt im Editor das Ziel und in der Runtime eine gespeicherte Projektseite. Nicht gespeicherte Änderungen anderer Seiten werden nicht eingebettet. Rekursive Seitenketten werden abgewiesen.
- iframe-Sandbox und Quelle sind je Frame konfigurierbar. Die Zielseite muss Einbettung erlauben. Die allgemeine Scrollanforderung kann an den iframe übergeben werden; getrennte X-/Y-Kontrolle kann bei fremden Ursprüngen ohne Mitwirkung der Zielseite nicht garantiert werden.
- Image 8 ist auf 50 zusätzliche Bilder begrenzt, iframe 8 auf 20 zusätzliche Frames. Der Basisindex ist jeweils 0.
