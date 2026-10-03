export function migrationHint(widget, key) {
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
  if (widget.readOnly === true) return "Nur Anzeige: Die Entität wird gelesen, nicht geschaltet. Dafür ist kein zusätzlicher Helfer nötig.";
  if (widget.type === "slider") return "Benötigt einen input_number-Helfer. Minimum, Maximum und Schrittweite müssen zum Helfer passen.";
  if (widget.type === "input-value") return "Benötigt einen input_number-Helfer für Zahlen oder einen input_text-Helfer für Text.";
  if (widget.type === "html-state") return "Schreibt einen festen Wert an switch, light, input_boolean oder einen passenden input_number-/input_text-Helfer. Ein Sensor ist kein Schreibziel.";
  if (widget.type === "bool-select") return "Schaltet switch, light oder input_boolean; für 0/1 benötigt es einen passenden input_number- oder input_text-Helfer.";
  if (widget.type === "bulb") return "Schaltet switch, light oder input_boolean. Für numerische Min-/Max-Werte wird ein input_number-Helfer benötigt.";
  if (["button", "toggle", "checkbox", "bool-svg", "bool-html-control"].includes(widget.type)) return "Benötigt eine schaltbare HA-Entität: switch, light oder input_boolean. Ein Sensor ist kein Schreibziel.";
  if (widget.type === "universal-button" && ["switch", "button"].includes(widget.interaction)) return "Benötigt eine schaltbare HA-Entität oder einen passenden input_number-/input_text-Helfer für den gewählten Zustand.";
  if (widget.type === "ackflag-html") return "HA hat kein ioBroker-ack-Flag. Eine eigene Bestätigungsentität liefert den Anzeigezustand.";
  if (["value-list-text", "value-list-html", "value-list-html-style"].includes(widget.type)) return "Die HA-Entität liefert den Listenindex, nicht den angezeigten Text. Zum Anzeigen ist kein zusätzlicher Helfer nötig.";
  return "";
}
