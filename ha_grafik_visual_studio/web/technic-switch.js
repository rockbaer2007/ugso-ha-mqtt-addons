// Original geometric symbols; no traced upstream graphics are used.
export const TECHNIC_SWITCH_ICONS = {
  "Auswahl-AN": "Auswahl", "Desktop-PC-AN": "Desktop-PC", "Knopf-AN": "Button (Power)",
  "Lampe-Bett-AN": "Bettlampe", "Lampe-Hängend-AN": "Hängelampe", "Lampe-Hängend-Rund-AN": "Hängelampe rund",
  "Lampe-Schreibtisch-AN": "Schreibtischlampe", "Lampe-Spots-AN": "Spots", "Lampe-Stripe-RGB-AN": "LED-Streifen RGB",
  "Lampe-Tisch-AN": "Tischlampe", "Link-AN": "Link", "Lüfter-WC-AN": "Lüfter", "Schluessel-AN": "Schlüssel",
  "Smartphone-AN": "Smartphone", "Steckdose-AN": "Steckdose", "TV-AN": "TV",
};
const pending = new Set();
const failedTargets = new Set();
export function technicSwitchState(widget, states = {}, runtime = false) {
  const numeric = widget.valueType === "number";
  const entry = states[widget.entityId], value = widget.entityId ? entry?.state : runtime ? undefined : numeric ? widget.previewOn ? 1 : 0 : widget.previewOn;
  const on = numeric ? [1, "1"].includes(value) ? true : [0, "0"].includes(value) ? false : null
    : [true, "true", "on"].includes(value) ? true : [false, "false", "off"].includes(value) ? false : null;
  const compatible = numeric ? /^input_number\.[a-z0-9_]+$/.test(widget.entityId || "") : /^(switch|light|input_boolean)\.[a-z0-9_]+$/.test(widget.entityId || "");
  return { on, numeric, writable: runtime && !widget.readOnly && compatible && on !== null && !pending.has(widget.entityId) };
}
export function renderTechnicSwitch(widget, doc, { runtime = false, locale = "de", getStates = () => ({}), write = async () => {}, onSettled = () => {} } = {}) {
  const de = locale === "de", current = () => technicSwitchState(widget, getStates(), runtime);
  const root = doc.createElement("div"); root.className = "technic-switch";
  const caption = doc.createElement("span"); caption.className = "technic-window-caption"; caption.textContent = widget.heading ?? "Device"; caption.title = caption.textContent;
  const button = doc.createElement("button"); button.type = "button"; button.className = "technic-switch-button"; button.setAttribute("role", "switch"); button.setAttribute("aria-label", caption.textContent || (de ? "Gerät" : "Device"));
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("aria-hidden", "true");
  svg.style.width = `${Math.min(100, Math.max(10, Number(widget.iconScale) || 80))}%`;
  const shape = (tag, attrs) => { const node = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); svg.append(node); return node; };
  const path = d => shape("path", { d });
  const rect = (x,y,width,height,rx=3) => shape("rect", {x,y,width,height,rx});
  const circle = (cx,cy,r) => shape("circle", {cx,cy,r});
  svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "5"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
  const key = Object.hasOwn(TECHNIC_SWITCH_ICONS, widget.iconKey) ? widget.iconKey : "Knopf-AN";
  let check;
  if (key === "Auswahl-AN") { rect(18,18,64,64,8); check = path("M30 50L45 65L72 34"); }
  else if (key === "Desktop-PC-AN") { rect(10,20,52,40); rect(70,12,20,66); path("M36 60V76M22 76H52M76 24H84M76 34H84"); }
  else if (key === "Smartphone-AN") { rect(28,10,44,80,6); path("M40 20H60M45 80H55"); }
  else if (key === "Steckdose-AN") { rect(12,12,76,76,8); circle(50,50,27); circle(40,50,3); circle(60,50,3); path("M50 23V30M50 70V77"); }
  else if (key === "TV-AN") { rect(10,18,80,52); path("M50 70V84M30 84H70"); }
  else if (key === "Link-AN") { path("M42 65L35 72A18 18 0 0 1 10 47L32 25A18 18 0 0 1 57 25M58 35L65 28A18 18 0 0 1 90 53L68 75A18 18 0 0 1 43 75M35 65L65 35"); }
  else if (key === "Schluessel-AN") { circle(32,32,20); path("M46 46L82 82M65 65L74 56M75 75L84 66"); }
  else if (key === "Lüfter-WC-AN") { circle(50,50,36); circle(50,50,5); path("M50 45Q20 10 29 43L45 50M55 50Q90 20 57 29L50 45M50 55Q80 90 71 57L55 50M45 50Q10 80 43 71L50 55"); }
  else if (key === "Lampe-Stripe-RGB-AN") { rect(10,35,80,30); for (const x of [22,40,58,76]) circle(x,50,4); }
  else if (key === "Lampe-Spots-AN") { path("M10 22H90M25 22V35M50 22V35M75 22V35"); for (const x of [15,40,65]) rect(x,35,20,24); }
  else if (key === "Lampe-Schreibtisch-AN") { path("M20 85H65M42 85L28 55L58 30M58 30L78 45L88 30L68 15Z"); }
  else if (key === "Lampe-Bett-AN") { path("M12 65H88V85M12 85V50M12 58H48V65M70 12V30M55 30H85L92 50H48Z"); }
  else if (key === "Lampe-Hängend-Rund-AN") { path("M50 10V30"); circle(50,56,26); }
  else if (key === "Lampe-Hängend-AN") { path("M50 10V35M35 35H65L82 70H18ZM30 78H70"); }
  else if (key === "Lampe-Tisch-AN") { path("M32 18H68L82 55H18ZM50 55V85M30 85H70"); }
  else { path("M50 12V48M30 25A34 34 0 1 0 70 25"); }
  button.append(svg);
  if (widget.showName && widget.namePosition === "top") root.append(caption);
  root.append(button);
  if (widget.showName && widget.namePosition !== "top") root.append(caption);
  const status = doc.createElement("small"); status.className = "technic-window-status"; status.setAttribute("role", "status"); root.append(status);
  const update = () => { const model = current(); button.disabled = !model.writable; button.setAttribute("aria-checked", model.on === null ? "mixed" : String(model.on)); button.style.color = model.on === true ? widget.colorAN || "#2dd4b0" : widget.colorAUS || "#5f8f8a"; if (check) check.style.visibility = model.on === true ? "visible" : "hidden"; status.textContent = pending.has(widget.entityId) ? de ? "Wird geschaltet …" : "Switching …" : runtime && failedTargets.has(widget.entityId) ? de ? "Schalten fehlgeschlagen. Bitte erneut versuchen." : "Switch failed. Please try again." : model.on === null ? de ? "Unbekannt" : "Unknown" : !runtime && !widget.entityId ? de ? "Vorschau" : "Preview" : ""; };
  update();
  button.addEventListener("click", async event => {
    event.stopPropagation(); const model = current(); if (!model.writable) return;
    failedTargets.delete(widget.entityId); pending.add(widget.entityId); update();
    try { await write(widget.entityId, model.numeric ? model.on ? 0 : 1 : !model.on, model.numeric); }
    catch { failedTargets.add(widget.entityId); }
    finally { pending.delete(widget.entityId); update(); onSettled(); }
  });
  return root;
}
