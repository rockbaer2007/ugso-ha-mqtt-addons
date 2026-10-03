export function migrationHint(widget, key) {
  if (widget.type === "iframe" && key === "noSandbox") return "Kein Sandkasten hebt die Einschränkung der eingebetteten Seite auf. Anmeldung und Einbettung richten sich weiterhin nach Browser und Zielseite; kein HA-Helfer nötig.";
  if (widget.type === "iframe" && key === "refreshInterval") return "0 deaktiviert regelmäßiges Neuladen. Millisekunden aktualisieren die eingebettete Seite, nicht HA-Entitäten.";
  if (widget.type === "iframe" && key === "noCacheBuster") return "Aktualisiert mit unveränderter URL. Ohne Haken wird ein Zeitstempel als URL-Parameter ergänzt; vorhandene Parameter und Sprungmarken bleiben erhalten.";
  if (widget.type === "red-number" && key === "entityId") return "Liest einen Zahlenwert; kein HA-Helfer nötig. Bei 0, false oder fehlendem Zahlenwert wird die Anzeige in der Runtime ausgeblendet. Im Editor bleibt sie bearbeitbar.";
  if (widget.type === "bool-svg" && key === "svgOpacity") return "Im Editor bleibt das SVG mindestens zu 20 % sichtbar. In der Runtime gilt die eingestellte Durchsichtigkeit vollständig.";
  if (widget.type === "view-in-widget-8" && key === "entityId") return "Die HA-Entität liefert den Seitenindex 0, 1, 2 …; false/off entspricht 0, true/on entspricht 1. Es wird nur gelesen, kein zusätzlicher HA-Helfer benötigt. Ohne Entität wird Seite [0] verwendet.";
  if (widget.type === "view-in-widget-8" && key === "count") return "Höchster Index: 1 ergibt Seite [0] und Seite [1]. Eingebettet werden Studio-Projektseiten; alle benötigten Seiten müssen beim späteren Projekt-Export enthalten sein. Keine HA-Dashboards.";
  if (widget.type === "view-in-widget" && key === "targetPage") return "Bettet eine Studio-Projektseite ein; kein HA-Helfer nötig. Für HA-Dashboards gibt es Dashboard in widget unter Spezial. Rekursive Seiteneinbettung wird verhindert.";
  if (widget.type === "dashboard-in-widget" && key === "dashboardPath") return "HA-Dashboard auswählen oder Pfad eintragen, zum Beispiel /lovelace. Anmeldung erfolgt über die normale HA-Browsersitzung; kein HA-Helfer oder Token im Widget nötig. Maximal 800 × 640 px.";
  if (widget.type === "dashboard-in-widget" && key === "dashboardBaseUrl") return "Im HA-Ingress leer lassen: Die aktuelle HA-Adresse wird verwendet. Bei direktem Studio-Zugriff die HA-Basis-URL eintragen, zum Beispiel https://ha.example.org. Einbettung hängt von Anmeldung und Browserregeln ab.";
  if (widget.type === "input-value" && key === "withEnter") return "Enter bestätigt die Eingabe immer. withEnter ergänzt eine Bestätigungstaste; Auto-setzen bleibt unabhängig davon aktiv. Ohne Auto-setzen wird beim Verlassen nicht geschrieben.";
  if (widget.type === "input-value" && key === "noStyle") return "Mit Style: Voranstellen ist die Feldbeschriftung, Anhängen der Hilfstext. Ohne Style: bereinigtes HTML vor und hinter einem einfachen Eingabefeld.";
  if (widget.type === "string" && key === "entityAttribute") return "ioBroker-Attributdatenpunkte wie friendly_name entsprechen HA-Attributen: Entität auswählen und hier friendly_name eintragen. Leer zeigt den Zustand. Kein HA-Helfer nötig.";
  if (widget.type === "string" && key === "state") return "Testtext gilt nur im Editor. Der Entitätswert und der Testtext bleiben Text; nur HTML davor und dahinter wird formatiert.";
  if (widget.type === "filter-dropdown" && key === "filterEntries") return "Filterwerte entsprechen den Filterwörtern der Widgets auf dieser Seite. Kein HA-Helfer nötig. Textfarben werden als HEX gespeichert; Standard gilt beim Start der Runtime.";
  if (widget.type === "navigation" && key === "navHtml") return "HTML wird bereinigt angezeigt; eingebettete Skripte werden nicht ausgeführt. Seitenwechsel benötigt keinen HA-Helfer.";
  if (widget.type === "navigation" && key === "subView") return "VIS2-Unteransichten dienen speziellen Navigationssystemen, zum Beispiel Jaeger Design. Diese Funktion ist in Studio noch nicht angebunden; Tabs sind davon unabhängig.";
  if (widget.type === "html" && key === "htmlContent") return "HTML wird bereinigt angezeigt. Eingebettete Skripte und Event-Handler werden nicht ausgeführt; keine HA-Schreibentität nötig.";
  if (widget.type === "html" && key === "refreshInterval") return "0 oder leer deaktiviert die Aktualisierung. Millisekunden bauen den HTML-Inhalt neu auf; das ist keine HA-Abfragezeit.";
  if (widget.type === "bar" && key === "barBorder") return "CSS-Rand angeben, zum Beispiel 2px solid blue. Eine einzelne 2 ist keine vollständige CSS-Randangabe.";
  if (widget.type === "bar" && key === "barShadow") return "VIS2 nennt dieses Feld Durchsichtigkeit, speichert aber shadow: CSS-Schatten, zum Beispiel 2px 2px 4px #0008.";
  if (widget.type === "bar" && key === "invert") return "Ändert die Wachstumsrichtung, nicht den Füllstand: horizontal von rechts, vertikal von unten.";
  if (widget.type === "html-state" && key === "clickUrl") return "Die URL wird per GET vom Browser aufgerufen, nicht über den ioBroker-Server. Browser- und Netzwerkregeln gelten.";
  if (key === "outputHelperEntityId") return "Benötigt einen input_number-Helfer für das berechnete Ergebnis. Ohne HA-Ausgabe bleibt die Berechnung lokal.";
  if (widget.type === "table") {
    if (key === "entityId") return "Liest JSON-Zeilen aus einem HA-Zustand. Ohne Entität wird Static JSON verwendet.";
    if (key === "eventEntityId") return "Liest einzelne JSON-Ereigniszeilen. Zum Lesen ist kein zusätzlicher Helfer nötig.";
    if (key === "ackEntityId") return "Benötigt einen passenden input_text- oder input_number-Helfer für die Bestätigung; Typ und Länge müssen zum Wert passen.";
    if (key === "selectedEntityId") return "Benötigt einen input_text-Helfer für die ausgewählte JSON-Zeile. Die maximale Textlänge des Helfers beachten.";
  }
  if (["extraTrueEntityId", "extraFalseEntityId"].includes(key)) return "Diese zusätzlichen Schreibziele sind noch nicht angebunden; hier wird derzeit kein HA-Wert geschrieben.";
  if (key !== "entityId") return "";
  if (widget.type === "bar") return "Liest einen Zahlenwert, zum Beispiel Solarleistung. Es wird kein HA-Wert geschrieben und kein zusätzlicher Helfer benötigt.";
  if (widget.readOnly === true) return "Nur Anzeige: Die Entität wird gelesen, nicht geschaltet. Dafür ist kein zusätzlicher Helfer nötig.";
  if (widget.type === "slider") return "Benötigt einen input_number-Helfer. Minimum, Maximum und Schrittweite müssen zum Helfer passen.";
  if (widget.type === "input-value") return "Benötigt einen input_number-Helfer für Zahlen oder einen input_text-Helfer für Text.";
  if (widget.type === "html-state") return "Schreibt einen festen Wert an switch, light, input_boolean oder einen passenden input_number-/input_text-Helfer. Ein Sensor ist kein Schreibziel.";
  if (widget.type === "bool-select") return "Schaltet switch, light oder input_boolean; für 0/1 benötigt es einen passenden input_number- oder input_text-Helfer.";
  if (widget.type === "bool-svg") return "Schaltet switch, light oder input_boolean; für 0/1 benötigt es einen passenden input_number- oder input_text-Helfer.";
  if (widget.type === "bulb") return "Schaltet switch, light oder input_boolean. Für numerische Min-/Max-Werte wird ein input_number-Helfer benötigt.";
  if (["button", "toggle", "checkbox", "bool-svg", "bool-html-control"].includes(widget.type)) return "Benötigt eine schaltbare HA-Entität: switch, light oder input_boolean. Ein Sensor ist kein Schreibziel.";
  if (widget.type === "universal-button" && ["switch", "button"].includes(widget.interaction)) return "Benötigt eine schaltbare HA-Entität oder einen passenden input_number-/input_text-Helfer für den gewählten Zustand.";
  if (widget.type === "ackflag-html") return "HA hat kein ioBroker-ack-Flag. Eine eigene Bestätigungsentität liefert den Anzeigezustand.";
  if (["value-list-text", "value-list-html", "value-list-html-style"].includes(widget.type)) return "Die HA-Entität liefert den Listenindex, nicht den angezeigten Text. Zum Anzeigen ist kein zusätzlicher Helfer nötig.";
  return "";
}
