export function roomTableHtml(widget, states = {}, previewKey = "tablePreview") {
  const entry = states[widget.entityId];
  const value = widget.entityId ? widget.tableAttribute ? entry?.attributes?.[widget.tableAttribute] : entry?.state : widget[previewKey];
  return typeof value === "string" && value.length <= 200000 && !["unknown", "unavailable"].includes(value) ? value : "";
}

// Rebuild passive table markup. Source HTML never enters the live document.
export function appendRoomTable(parent, markup, doc) {
  const template = doc.createElement("template"); template.innerHTML = markup;
  const allowed = new Set("TABLE THEAD TBODY TFOOT TR TD TH CAPTION COLGROUP COL SPAN DIV P BR STRONG B EM I U".split(" "));
  const blocked = new Set("SCRIPT STYLE IFRAME OBJECT EMBED SVG MATH FORM INPUT BUTTON SELECT TEXTAREA LINK META".split(" "));
  let count = 0;
  function copy(node, target, depth = 0) {
    if (++count > 5000 || depth > 40) return;
    if (node.nodeType === 3) { target.append(doc.createTextNode(node.textContent)); return; }
    if (node.nodeType !== 1 || blocked.has(node.tagName)) return;
    if (!allowed.has(node.tagName)) { for (const child of node.childNodes) copy(child, target, depth + 1); return; }
    const element = doc.createElement(node.tagName.toLowerCase());
    for (const key of ["colspan", "rowspan"]) if (/^\d{1,2}$/.test(node.getAttribute(key) || "")) element.setAttribute(key, node.getAttribute(key));
    for (const key of ["color", "background-color", "border-color"]) {
      const value = node.style.getPropertyValue(key);
      if (/^(#[a-f\d]{3,8}|[a-z]+|rgba?\([\d.,%\s]+\))$/i.test(value)) element.style.setProperty(key, value);
    }
    for (const key of ["text-align", "font-weight", "font-style", "border-style"]) {
      const value = node.style.getPropertyValue(key);
      if (/^[a-z]+$|^[1-9]00$/i.test(value)) element.style.setProperty(key, value);
    }
    for (const key of ["font-size", "padding", "border-width", "width"]) {
      const value = node.style.getPropertyValue(key);
      if (/^\d{1,3}(\.\d{1,2})?(px|em|%)?$/.test(value)) element.style.setProperty(key, value);
    }
    for (const child of node.childNodes) copy(child, element, depth + 1);
    target.append(element);
  }
  for (const node of template.content.childNodes) copy(node, parent);
}

export function renderHeatingRooms(widget, doc, states = {}, locale = "de", previewKey = "tablePreview") {
  const root = doc.createElement("div"); root.className = "heating-rooms";
  const heading = doc.createElement("strong"); heading.textContent = locale === "de" ? "Übersicht über Heizräume" : "Heating Rooms Overview"; heading.style.color = widget.headlineColor || "#ffffff"; root.append(heading);
  const output = doc.createElement("div"); output.className = "heating-rooms-table";
  const markup = roomTableHtml(widget, states, previewKey);
  if (markup) appendRoomTable(output, markup, doc);
  if (!output.textContent.trim()) output.textContent = locale === "de" ? "Keine Raumtabelle verfügbar" : "No room table available";
  root.append(output); return root;
}
