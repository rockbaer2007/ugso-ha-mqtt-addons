# Restliche Studio-Widgets: HA-Prüfung

Stand: 12.10.2026, Studio 0.1.295. Geprüft wurden 62 weitere Widgettypen: 17 eingebaute und 45 aus sieben mitgelieferten Paketen. Basic (48), Interaktiv (11) und Material (49) waren Gegenstand der vorherigen Prüfungen. Der gesamte bekannte Bestand umfasst damit 170 Typen einschließlich der drei Datenflussvarianten.

## Ergebnis

Im geprüften Quellcode und den automatisierten Prüfungen wurde kein neuer blockierender Defekt festgestellt. Die übrigen Widgets passen zum HA-Datenmodell, wenn die unten genannten Entitäten, Einheiten und Voraussetzungen stimmen. Das ist keine Bestätigung, dass jede reale Integration und jedes Gerät funktioniert: Live-Geräte, Companion-App, tatsächliche Recorder-Daten, Mikrofon und externe Einbettung wurden nicht an einer echten HA-Installation geprüft.

| Set / Paket | Typen | HA-Eignung und Voraussetzungen |
| --- | ---: | --- |
| Spezial | 4 | Dashboard zeigt eine HA-Ansicht und benötigt weiterhin HA/Browser-Anmeldung. SVG-Verbindung und Linebox berechnen/transportieren lokale Werte; explizite Ausgaben gehen an unterstützte Helfer. Dashboard wird beim Export nicht mitgenommen. |
| Messinstrumente | 10 | Farbmesser, Wasserstand, Batterie, Bogen, Kompass, Linear-, Radial-, Ring-, Tank- und Thermometeranzeige lesen numerische Zustände. Fehlende/ungültige Werte werden nicht als Null ausgegeben. Minimum, Maximum und Einheit sind passend einzustellen. Reine Anzeigen schreiben keine HA-Werte. |
| Datenfluss | 3 | Berechnung, Verbindung und Konverter arbeiten mit Studio-Wertpaketen und Einheiten. Keine HA-Jinja-Ausführung oder beliebiges JavaScript. Schreibausgaben benötigen ein ausdrücklich gewähltes unterstütztes Ziel; unsichtbare Runtime-Verarbeitung ist beabsichtigt. |
| Calendar+ 0.1.2 | 1 | Liest HA-Kalenderereignisse mit vollständigen/exklusiven Enddaten, mehrerer Quellen, Farben und Details. Kein Kalender-Schreibeditor. Auswahl aller 43 simulierten Kalender wurde separat geprüft. |
| Energy 0.1.1 | 8 | Liest HA-Zustände und Recorder-Verläufe. Für Leistung, Energie, Preise und Vorzeichen müssen Quelle/Faktor/Einheit zusammenpassen. Kein vollständiger Ersatz für die native HA-Energieverwaltung oder deren Langzeitstatistiken. Zählerresets und unbekannte Lücken werden berücksichtigt. |
| Industrial 0.11.7 | 16 | Messanzeigen, Schalter, LCD/LED/Zählwerk/Uhr/Wetter/Heizung. Poti/Regler schreiben an unterstützte `number`/`input_number`-Ziele; Schalter unterstützen passend konfigurierte Schalt-/Zahlen-/Textziele. Eingang/Ausgang und HA-Grenzen werden separat behandelt. Unbekannte Zustände und Nur-Lesen sind geprüft. Eigene Gehäuse-Stile statt Standard-CSS-Gruppen sind beabsichtigt. |
| Printer 0.1.2 | 1 | Lesende Druckeranzeige mit ausdrücklich konfigurierten HA-Zuständen/Attributen. Status, Verbrauchsmaterial und Fehler müssen zur jeweiligen Druckerintegration zugeordnet werden. Keine allgemeine Druckauftragsteuerung. |
| Solar 0.1.4 | 4 | Kopfteil, Batterie, Wechselrichter und Solarpanel lesen HA-Werte und unterstützen Studio-Kopplungen. Leistung/Temperatur/SoC und Einheiten müssen zur Quelle passen. Grafische Verkabelung bedeutet keine automatische Gerätesteuerung. |
| Technic 1.6.1 | 7 | Fenster/Rollo, boolescher Schalter, Lichtdimmer, Raum, Uhr, Thermostat und Statusliste. Schalt-, Helligkeits-, Rollo- und Temperaturbefehle verwenden feste HA-Dienste mit Zustands-/Fähigkeitsprüfungen. Thermostat unterstützt einen einzelnen Sollwert (`climate` oder `input_number`), keinen vollständigen Heiz-/Kühlbereich mit zwei Sollwerten, keine komplette HVAC-/Preset-Verwaltung. |
| Weather/Heating 1.7.1 | 8 | Drei Diagramm-/Wettervarianten, Raum-/Fensterübersicht, Meteored, Vermieter-Benachrichtigung und Heizparameter. JSON-/Attributquellen müssen zur erwarteten Struktur passen. Meteored ist extern und benötigt Internet/Einbettung. Heizparameter schalten nur unterstützte Schalter/Helfer. Benachrichtigung benötigt ein konkretes notify-Ziel; Serviceerfolg bestätigt keine Zustellung. |

## Prüfungen

- Alle 62 Typen aus tatsächlichen eingebauten Definitionen und installierten Paketmanifesten im Editor ausgewählt; Eigenschaften geöffnet.
- Runtime im hellen/dunklen Browser-Theme mit Standardkonfigurationen; keine JavaScript-Ausnahmen und keine unbeabsichtigten Schreibaufrufe. SVG-Geometrie wird auf NaN/Infinity geprüft.
- 383 JavaScript-Tests und 105 Python-Tests bestanden, einschließlich Modell-, Datenfluss-, Grenz-, Schreib- und Fehlerfällen.
- Zusätzlich spezialisierte Browserprüfungen für Kalender+, Energie, Drucker, Solar und Industrial: Live-Zustände und API-Antworten sind simuliert, echte Geräte werden nicht gesteuert.
- Zwölf spezialisierte Browserfälle bestehen; zwei ältere Industrial-Geometrieprüfungen warteten beim Neuzeichnen nicht auf die Elemente. Ihre Wartebedingungen wurden korrigiert und die betroffenen Prüfungen erneut erfolgreich ausgeführt.
- Docker-Build und `/health` mit Version 0.1.295 geprüft.
- Keine gespeicherten Benutzerprojekte, Paket-IDs oder Standardwerte umgeschrieben. Von Python-Tests neu erzeugte ZIP-Zeitstempel wurden nach Inhaltsvergleich verworfen.

## Noch offen / bewusst begrenzt

1. Vollständiges Französisch für die restlichen sieben Pakete und deren Eigenschaften ist nicht vorhanden; überwiegend DE/EN. Basic, Material und neue Universal/Radial-Optionen besitzen eigene DE/EN/FR-Unterstützung. Das ist eine Sprachlücke, keine vollständige Dreisprachigkeit des Studios.
2. Technic-Thermostate decken nicht sämtliche Climate-Funktionen ab. [HA Climate](https://www.home-assistant.io/integrations/climate/) bietet unter anderem Heiz-/Kühlbereiche und weitere Gerätefunktionen.
3. Energieeinheiten/Skalierungen und integrationsabhängige JSON-Attribute benötigen korrekte Zuordnung. Recorder-Verläufe sind nicht dasselbe wie Langzeitstatistiken.
4. HA-Dashboards und externe Webseiten funktionieren nur, wenn Browser-Anmeldung und Einbettungsregeln passen. [HA-Webseiten-Dokumentation](https://www.home-assistant.io/dashboards/iframe/) beschreibt Browserbeschränkungen für Einbettungen.
5. Meteored benötigt Internet. Benachrichtigungen brauchen ein vorhandenes Ziel; kein Testversand an reale Empfänger wurde durchgeführt.
6. Einige ältere lokale Dokumente beschrieben Live-Anbindung noch als zukünftig. `ha-widget-special-cases.md` wurde auf den aktuellen Prüfstand gebracht.

## Quellen und Codepfade

- [HA WebSocket API](https://developers.home-assistant.io/docs/api/websocket/): authentifizierte Zustände, Services und gezielte Antworten.
- [HA Weather](https://www.home-assistant.io/integrations/weather/): Wetterzustände und Forecast-Aktionen. `app/main.py` verwendet `weather.get_forecasts` mit `return_response`.
- `web/widget-sets/{special,gauges,dataflow}.js`, sieben ZIP-Manifeste unter `packages/`, Renderer unter `web/`.
- Fest zugeordnete Aktionen: `app/technic_cover.py`, `technic_light.py`, `technic_temperature.py`, `landlord_notification.py` und `main.py`.
- Reproduzierbare Vollprüfung der Resttypen: `tests/test_remaining_widgets_browser.mjs`; Opt-in mit `STUDIO_TEST_URL` und Playwright.
