export function extendBasic(widget) {
  widget.basicWidget = true;
  widget.defaults.basicLocale = "auto";
  widget.defaults.basicHtmlMode = "sanitized";
  const sizes = { link: [200,130], "screen-resolution": [170,75], "ackflag-html": [76,76], checkbox: [40,30], sensor: [60,18], "string-raw": [50,20], "image-source": [60,40], "time-value": [50,20], "timestamp-value": [50,20], timestamp: [50,20], "last-changed": [50,20], "value-list-text": [60,20], "value-list-html": [60,20], "value-list-html-style": [100,30], "bool-display": [76,76], "bool-select": [90,30], "bool-html-control": [76,76], "html-state": [76,76], table: [300,150], fullscreen: [43,43], "speech-to-text": [500,77], "runtime-exit": [70,30] };
  if (sizes[widget.type]) [widget.defaults.width, widget.defaults.height] = sizes[widget.type];
  if (widget.type === "fullscreen") widget.defaults.fullscreenStyle = "icon";
  if (widget.type === "table") widget.defaults.tableStyle = "modern";
  if (["checkbox", "bool-select", "bar"].includes(widget.type)) widget.defaults.basicControlStyle = "modern";
  if (["time-value", "timestamp-value", "timestamp", "last-changed"].includes(widget.type)) widget.defaults.dateMode = "localized";
  const data = widget.propertyGroups.find(group => ["Daten", "Allgemein"].includes(group.label));
  const add = (...fields) => {
    if (data) data.fields.push(...fields);
    else widget.propertyGroups.push({ label: "Allgemein", fields });
  };
  const select = (key, label, options, value) => ({ key, label, type: "select", options, default: value, refreshProperties: true });
  const toggle = (key, label) => ({ key, label, type: "checkbox", default: false });
  const field = (key, label, type) => ({ key, label, ...(type ? { type } : {}) });
  widget.propertyGroups.push({ id: "basic-language", required: true, label: "Basic-Sprache", fields: [select("basicLocale", "Basic-Sprache", [{ value: "auto", label: "Automatisch" }, { value: "de", label: "Deutsch" }, { value: "en", label: "English" }, { value: "fr", label: "Français" }], "auto")] });
  widget.propertyGroups.at(-1).fields.push(select("basicHtmlMode", "HTML-Modus", [{ value: "legacy", label: "Bisheriges Verhalten" }, { value: "sanitized", label: "Bereinigtes HTML" }], "legacy"));
  if (widget.type === "sensor") {
    widget.propertyGroups.push({ id: "basic-number", label: "Erweiterte Zahlenformatierung", fields: [select("numberMode", "Zahlenmodus", [{ value: "legacy", label: "Bisheriges Verhalten" }, { value: "reference", label: "VIS-2-kompatibel" }], "legacy"), toggle("automaticDigits", "Nachkommastellen automatisch"), toggle("thousandsSeparator", "Tausendertrennung"), field("qualityEntityId", "Qualitätsentität"), field("qualityClassTrue", "CSS-Klasse bei true"), field("qualityClassFalse", "CSS-Klasse bei false")] });
  }
  if (["bool-display", "bool-html-control"].includes(widget.type)) {
    add(select("booleanMode", "Bool-Modus", [{ value: "legacy", label: "Bisheriges Verhalten" }, { value: "reference", label: "VIS-2-kompatibel" }], "legacy"), field("min", "Minimum"), field("max", "Maximum"));
    if (widget.type === "bool-html-control") add(field("prefix", "HTML voranstellen", "html"), field("suffix", "HTML anhängen", "html"));
  }
  if (["bool-html-control", "bulb"].includes(widget.type)) {
    let extra = widget.propertyGroups.find(group => group.masterKey === "extraControlEnabled");
    if (!extra) { extra = { id: "basic-extra-control", label: "Extrasteuerung", masterKey: "extraControlEnabled", defaultEnabled: false, fields: [field("extraUrlTrue", "URL bei true"), field("extraUrlFalse", "URL bei false"), field("extraTrueEntityId", "Objekt ID bei true"), field("extraFalseEntityId", "Objekt ID bei false"), field("extraValueTrue", "Wert für ID bei true"), field("extraValueFalse", "Wert für ID bei false")] }; widget.propertyGroups.push(extra); }
    delete extra.hint;
    extra.fields = extra.fields.map(entry => ({ ...entry, disabled: false }));
    extra.fields.push(select("extraUrlMode", "URL-Aktion", [{ value: "open", label: "Fenster öffnen" }, { value: "request", label: "URL aufrufen" }], "open"));
    extra.fields.push(select("extraActionMode", "Steuerungsziel", [{ value: "add", label: "Hauptziel und Zusatzaktion" }, { value: "replace", label: "Nur separates Ziel" }], "add"));
  }
  if (widget.type === "link") add(select("linkTarget", "Zielfenster", ["_self", "_blank", "_parent", "_top"], "_self"));
  if (widget.type === "note") add(toggle("noteHtml", "Bereinigtes HTML anzeigen"));
  if (widget.type === "screen-resolution") { widget.defaults.screenDetails = true; add(toggle("screenDetails", "Projekt- und Seitendetails anzeigen")); }
  if (widget.type === "ackflag-html") {
    add(select("ackMode", "Bestätigungsquelle", [{ value: "legacy", label: "Bisheriger Entitätszustand" }, { value: "entity", label: "Bestätigungsentität" }], "legacy"), field("ackEntityId", "Bestätigungsentität"), field("ackAttribute", "Bestätigungsattribut"));
    widget.propertyGroups.find(group => ["Daten", "Allgemein"].includes(group.label)).hint = "HA hat kein ioBroker-ACK-Flag. Wähle eine eigene Bestätigungsentität oder ein Attribut.";
  }
  if (["checkbox", "bool-select", "bar"].includes(widget.type)) add(select("basicControlStyle", "Steuerelement-Stil", [{ value: "legacy", label: "Bisheriges Verhalten" }, { value: "native", label: "Nativ" }, { value: "modern", label: "Modern" }], "legacy"));
  if (widget.type === "fullscreen") add(select("fullscreenStyle", "Vollbild-Darstellung", [{ value: "legacy", label: "Text" }, { value: "icon", label: "Symbol" }], "icon"));
  if (widget.type === "table") add(select("tableStyle", "Tabellen-Darstellung", [{ value: "legacy", label: "Bisheriges Verhalten" }, { value: "classic", label: "Klassisch" }, { value: "modern", label: "Modern" }], "legacy"));
  if (widget.type === "navigation") {
    const target = data.fields.find(entry => entry.key === "subView"); if (target) { target.disabled = false; target.type = "widget"; target.label = "Ziel-Widget der Unteransicht"; }
  }
  if (["time-value", "timestamp-value", "timestamp", "last-changed"].includes(widget.type)) {
    add(select("dateMode", "Zeitformat-Modus", [{ value: "legacy", label: "Bisheriges Verhalten" }, { value: "localized", label: "Lokalisiert" }], "legacy"));
    add(select("dateUnit", "Zeitstempel-Einheit", [{ value: "auto", label: "Automatisch" }, { value: "seconds", label: "Sekunden" }, { value: "milliseconds", label: "Millisekunden" }], "auto"));
    const format = data.fields.find(entry => entry.key === "dateFormat"); if (format) { format.type = "text"; delete format.options; }
  }
  return widget;
}

export function missingBasic(cssGroups) {
  const make = (type, label, icon, fields, defaults) => extendBasic({ type, label, icon, defaults: { width: 150, height: 60, ...defaults }, propertyGroups: [{ label: "Allgemein", fields }, ...cssGroups().map(group => ({ ...group, defaultEnabled: false }))] });
  return [
    make("speech-to-text", "Speech to Text", "🎙", [
      { key: "entityId", label: "Home-Assistant-Entität" }, { key: "speechMode", label: "Sprachmodus", type: "select", options: [{ value: "single", label: "Einmal" }, { value: "startstop", label: "Start / Stopp" }, { value: "continuous", label: "Fortlaufend" }] },
      { key: "speechKeywordOnly", label: "Nur Schlüsselwörter senden", type: "checkbox" },
      { key: "speechLanguage", label: "Erkennungssprache", type: "select", options: ["de-DE", "en-GB", "en-US", "fr-FR"] }, { key: "keywords", label: "Schlüsselwörter", type: "textarea" },
      { key: "speechContinuous", label: "Fortlaufende Erkennung", type: "checkbox" }, { key: "speechNoText", label: "Ergebnis ausblenden", type: "checkbox" },
      { key: "speechNoImage", label: "Symbol ausblenden", type: "checkbox" }, { key: "speechNoResults", label: "Ergebnis nicht anzeigen", type: "checkbox" },
      { key: "speechKeywordColor", label: "Schlüsselwortfarbe", type: "color" }, { key: "speechSentColor", label: "Gesendete Textfarbe", type: "color" },
      ...["Inactive", "Active", "Started", "Detected", "Sent"].map(state => ({ key: `speechImage${state}`, label: `Sprachsymbol ${state}`, previewImage: true })),
      { key: "speechIconSize", label: "Symbolgröße in Pixel", type: "number", min: 8, max: 200 }, { key: "speechButtonText", label: "Schaltflächentext" },
    ], { speechMode: "single", speechLanguage: "de-DE", speechIconSize: 32 }),
    make("runtime-exit", "HTML logout", "↪", [
      { key: "htmlContent", label: "HTML", type: "html" }, { key: "redirectUrl", label: "Rückkehr-URL" }, { key: "closeWindow", label: "Fenster schließen", type: "checkbox" },
      { key: "exitVariant", label: "Variante", type: "select", options: ["contained", "outlined", "text"] }, { key: "exitIcon", label: "Symbol", previewImage: true },
    ], { htmlContent: "", redirectUrl: "/" }),
  ];
}
