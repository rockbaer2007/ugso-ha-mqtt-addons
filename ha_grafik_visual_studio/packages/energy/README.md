# UGSo Energy 0.1.0

Eigenständiges externes Set für Grafik Visual Studio **0.1.255 oder neuer**.
Installieren: Einstellungen → Widget-Pakete → Lokal → `ugso.energy.wg`.
Danach Browser mit Strg+F5 neu laden. Kein Industrial-Stil und keine ioBroker-Laufzeit nötig.

Vorbild: [ioBroker.vis-2-widgets-energy](https://github.com/ioBroker/ioBroker.vis-2-widgets-energy),
MIT, bluefox und Mitwirkende. Eigenständige HA-Anpassung von **rockbaer2007**;
keine unveränderte Portierung. Originalquelle und geprüfter Stand stehen in UPSTREAM.txt.

## Acht Widgets

- Energiefluss: Haus, Netz und 1–10 Zusatzknoten, Farben, Multiplikatoren, zweiter Wert und umkehrbare animierte Flussrichtung.
- Energieverbrauch: Recorder-Zählerdifferenzen oder Summen pro Stunde/Tag/Monat; bis sechs Reihen.
- Verbrauchsvergleich: aktuelle Werte von bis sechs Geräten, Balken, Linie oder Kreis, Sortierung und eigene Einheiten.
- Zeitauswahl: Tag/Woche/Monat/Jahr, Datum, vorher/nachher/heute; lokal im Dashboard, ohne HA-Schreibzugriff.
- Autarkie/Eigenverbrauch: zwei Ringe aus Erzeugung, Netzbezug/Einspeisung und optionalem Hausverbrauch.
- Batterie: Ladezustand, Leistung, Kapazität, gespeicherte Energie und rechnerische Restzeit.
- Kosten: kWh × Bezugspreis + tägliche Grundgebühr − Einspeisevergütung; Live-Zähler oder Recorder-Zeitraum.
- Dynamischer Preis: JSON-Array im Zustand oder Attribut, automatische Zeit-/Preisfeld-Erkennung, negative Preise, günstig/teuer/aktuell und Durchschnitt.

Alle Messquellen bieten die Entitätenauswahl. Ohne konfigurierte oder gültige Daten bleibt die Anzeige unbekannt — keine erfundenen Messwerte. Multiplikatoren rechnen Einheiten explizit um; W wird nicht automatisch zu Wh. Autarkie benötigt gleichartige W- oder kWh-Werte. Netz positiv = Bezug, negativ = Einspeisung; eine separate Einspeiseentität überschreibt die negative Netzkomponente.

## Recorder und Zeitraum

Beim Verbrauch und Kosten-Verlauf kann `ID der Zeitauswahl` auf das Zeitauswahl-Widget derselben Seite zeigen (z. B. `widget-3`). Sonst gelten eigener Zeitraum und Datum. Recorder muss die numerischen Entitäten aufbewahren. Maximal 366 Tage, sechs Entitäten und 20.000 Zustände je Reihe; zu große Antworten werden mit Hinweis abgebrochen statt gekürzt berechnet. Tages-/Wochen-/Monats-/Jahresgrenzen folgen der lokalen Browserzeitzone. Fehlende, unbekannte oder zurückgesetzte Zähler erzeugen Lücken; ein Reset wird nicht als Verbrauch gewertet. Historische Kosten benötigen Verbrauchs-/Einspeisezähler in kWh, keine Leistungssensoren. Datenmodus `sum` summiert einzelne Verbrauchsmengen und eignet sich nicht für kumulative Zähler.

Anders als das Original nutzt diese Version HA-Recorder-Zustände und lokale Zeitraumwahl, keine ioBroker-History-Instanz oder OID zur Zeitraumsteuerung. Keine Langzeitstatistik und keine automatische Integration von Leistung. Fehlen Recorder-Daten, werden keine Tages-/Monatssummen aus Live-Werten vorgetäuscht. Preise akzeptieren Arrays, `prices/today/data/values/result`, Zeitfelder `startsAt/start_timestamp/start/date/x` und Preisfelder `total/marketprice/price/value/y`. Array aus Zahlen = Stunden des heutigen lokalen Tages. Preisfaktor muss zur Quelle passen (z. B. 100 für EUR/kWh → ct/kWh, 0.1 für EUR/MWh → ct/kWh).

## English

Separate declarative Home Assistant widget set inspired by the MIT-licensed
[ioBroker Energy widgets](https://github.com/ioBroker/ioBroker.vis-2-widgets-energy).
Requires Studio 0.1.255+. Eight widgets cover flow, consumption, live comparison,
local period selection, self-sufficiency, battery, costs and hourly prices.
Numeric entity selection, explicit unit factors, unknown-state handling and
read-only Recorder integration are included. This is an independent adaptation,
not an exact React/vis-2 port. Recorder retention limits historical availability;
no long-term statistics or automatic power-to-energy integration is provided.
