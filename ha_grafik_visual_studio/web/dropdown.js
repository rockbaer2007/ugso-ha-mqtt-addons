export const dropdownCount = (value, max = 200) => Math.min(max, Math.max(0, Math.trunc(Number(value) || 0)));
const unavailable = entry => !entry || ["unknown", "unavailable"].includes(entry.state);
const numeric = value => String(value ?? "").trim() !== "" && Number.isFinite(Number(value));
export function dropdownOptions(widget, entry) {
  const options = widget.useCustomOptions ? Array.from({ length: dropdownCount(widget.countCustomOptions) }, (_, i) => ({ value: String(widget[`optionValue${i + 1}`] ?? ""), text: String(widget[`optionText${i + 1}`] ?? "") })) : (Array.isArray(entry?.attributes?.options) ? entry.attributes.options.slice(0, 200).filter(value => typeof value === "string").map(value => ({ value, text: value })) : []);
  return options.filter((option, i) => options.findIndex(item => item.value === option.value) === i);
}
export function dropdownLabel(widget, option) {
  if (!option) return "—";
  const value = widget.showValue !== false, text = widget.showText !== false;
  return value && text && option.text && option.text !== option.value ? `${option.value} - ${option.text}` : text && option.text ? option.text : option.value;
}
export function dropdownWritable(widget, entry, options) {
  if (widget.readOnly || widget.entityAttribute || !options.length) return false;
  if (!widget.entityId) return true;
  if (unavailable(entry)) return false;
  if (/^(input_select|select)\.[a-z0-9_]+$/.test(widget.entityId)) return Array.isArray(entry.attributes?.options) && options.some(item => entry.attributes.options.includes(item.value));
  return /^input_(number|text)\.[a-z0-9_]+$/.test(widget.entityId) && options.some(option => dropdownOptionAllowed(widget, entry, option));
}
export function dropdownOptionAllowed(widget, entry, option) {
  if (!option) return false;
  if (/^(input_select|select)\./.test(widget.entityId || "")) return entry?.attributes?.options?.includes(option.value) === true;
  if (/^input_number\./.test(widget.entityId || "")) return numeric(option.value);
  if (/^input_text\./.test(widget.entityId || "")) return option.value.length <= 255;
  return !widget.entityId;
}
export function dropdownBackground(widget, states, value) {
  const actual = widget.bgEntityId ? states[widget.bgEntityId]?.state : value;
  if (actual == null || ["unknown", "unavailable"].includes(actual)) return null;
  for (let i = 1; i <= dropdownCount(widget.countBgConditions, 20); i++) {
    const expected = widget[`bgValue${i}`], operator = widget[`bgOperator${i}`] || "===";
    const numbers = numeric(actual) && numeric(expected), a = numbers ? Number(actual) : String(actual), b = numbers ? Number(expected) : String(expected ?? "");
    const match = ({ "===": a === b, "!=": a !== b, ">": a > b, "<": a < b, ">=": a >= b, "<=": a <= b })[operator];
    if (match && widget[`bgColor${i}`]) return widget[`bgColor${i}`];
  }
  return null;
}
export const DROPDOWN_STYLE_KEYS = ["dropdownFontSize", "dropdownTextColor", "dropdownBackgroundColor", "dropdownHighlightColor", "dropdownBorderColor", "dropdownBorderWidth", "dropdownBorderRadius", "titleFontSize", "titleColor", "titleBgFromCondition", "titlePaddingTop", "titlePaddingBottom", "titlePaddingLeft", "titlePaddingRight", ...["shadow", "widgetShadow"].flatMap(prefix => ["X", "Y", "Blur", "Spread", "Color"].map(key => prefix + key))];
export function dropdownStyle(widget, widgets) {
  let source = widget; const seen = new Set([widget.id]);
  while (source.dropdownFromWidget) { const next = widgets.find(item => item.type === "dropdown" && item.id === source.dropdownFromWidget); if (!next || seen.has(next.id)) break; source = next; seen.add(next.id); }
  return Object.fromEntries(DROPDOWN_STYLE_KEYS.map(key => [key, source[key]]));
}
const clamp = (value, fallback, min, max) => Math.min(max, Math.max(min, numeric(value) ? Number(value) : fallback));
export function renderDropdown(widget, doc, context) {
  const root = doc.createElement("div"), title = doc.createElement("div"), button = doc.createElement("button"), menu = doc.createElement("div");
  root.className = "styled-dropdown"; title.className = "dropdown-title"; button.className = "dropdown-trigger"; menu.className = "dropdown-menu";
  const entry = context.states[widget.entityId], options = dropdownOptions(widget, entry), value = widget.entityId ? (unavailable(entry) ? null : entry.state) : widget.state ?? "";
  const style = dropdownStyle(widget, context.widgets), conditional = dropdownBackground(widget, context.states, value);
  root.style.setProperty("--dropdown-highlight", style.dropdownHighlightColor || "#8FA455");
  root.style.setProperty("--dropdown-border", style.dropdownBorderColor || "#646464");
  root.style.fontSize = `${clamp(style.dropdownFontSize, 16, 8, 100)}px`; root.style.color = style.dropdownTextColor || "#FFFFFF";
  const shadow = prefix => `${clamp(style[prefix + "X"], prefix === "shadow" ? 2 : 0, -50, 50)}px ${clamp(style[prefix + "Y"], prefix === "shadow" ? 2 : 0, -50, 50)}px ${clamp(style[prefix + "Blur"], prefix === "shadow" ? 4 : 0, 0, 50)}px ${clamp(style[prefix + "Spread"], 0, -50, 50)}px ${style[prefix + "Color"] || "#00000080"}`;
  root.style.boxShadow = shadow("widgetShadow");
  title.textContent = String(widget.dropdownTitle || ""); title.hidden = !title.textContent; title.style.fontSize = `${clamp(style.titleFontSize, 12, 8, 100)}px`; title.style.color = style.titleColor || "#B4B4B4";
  title.style.padding = ["Top", "Right", "Bottom", "Left"].map(key => `${clamp(style["titlePadding" + key], key === "Top" ? 2 : key === "Bottom" ? 4 : 0, 0, 100)}px`).join(" ");
  if (style.titleBgFromCondition && conditional) title.style.backgroundColor = conditional;
  button.type = "button"; button.textContent = dropdownLabel(widget, options.find(item => item.value === String(value)) || (value == null ? null : { value: String(value), text: "" }));
  button.setAttribute("aria-label", widget.dropdownTitle || widget.name || "Dropdown"); button.title = button.textContent;
  const enabled = context.runtime && dropdownWritable(widget, entry, options);
  button.disabled = !enabled; button.classList.toggle("display-only", widget.readOnly === true);
  button.setAttribute("role", enabled ? "combobox" : "button"); button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-haspopup", "listbox");
  menu.id = `dropdown-menu-${widget.id}`; menu.setAttribute("role", "listbox"); menu.setAttribute("aria-label", widget.dropdownTitle || "Dropdown"); button.setAttribute("aria-controls", menu.id); menu.hidden = true;
  for (const node of [button, menu]) { node.style.backgroundColor = conditional || style.dropdownBackgroundColor || "#323232"; node.style.border = `${clamp(style.dropdownBorderWidth, 1, 0, 20)}px solid var(--dropdown-border)`; node.style.borderRadius = `${clamp(style.dropdownBorderRadius, 4, 0, 100)}px`; node.style.boxShadow = shadow("shadow"); }
  const close = () => { menu.hidden = true; button.setAttribute("aria-expanded", "false"); root.classList.remove("is-open"); };
  let active = Math.max(0, options.findIndex(item => item.value === String(value)));
  const optionNodes = options.map((option, i) => {
    const node = doc.createElement("button"); node.type = "button"; node.className = "dropdown-option"; node.setAttribute("role", "option"); node.setAttribute("aria-selected", String(option.value === String(value))); node.textContent = dropdownLabel(widget, option); node.title = node.textContent; node.disabled = !dropdownOptionAllowed(widget, entry, option); node.tabIndex = -1;
    const choose = () => { if (!enabled || node.disabled) return; close(); button.textContent = dropdownLabel(widget, option); button.focus(); context.write(option.value); };
    node.addEventListener("click", choose); node.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); choose(); } }); menu.append(node); return node;
  });
  const focusOption = index => { const allowed = optionNodes.map((node, i) => node.disabled ? -1 : i).filter(i => i >= 0); if (!allowed.length) return; active = allowed.includes(index) ? index : index < active ? allowed[allowed.length - 1] : allowed[0]; optionNodes[active].focus(); };
  const open = () => { if (!enabled) return; menu.hidden = false; button.setAttribute("aria-expanded", "true"); root.classList.add("is-open"); focusOption(active); };
  button.addEventListener("click", () => menu.hidden ? open() : close());
  root.addEventListener("keydown", event => {
    if (event.key === "Escape") { close(); button.focus(); event.preventDefault(); }
    else if (enabled && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (menu.hidden) open();
      else { let index = event.key === "Home" ? 0 : event.key === "End" ? optionNodes.length - 1 : active + (event.key === "ArrowDown" ? 1 : -1); const direction = ["ArrowUp", "End"].includes(event.key) ? -1 : 1; while (index >= 0 && index < optionNodes.length && optionNodes[index].disabled) index += direction; focusOption(index); }
    }
  });
  root.addEventListener("focusout", event => { if (!root.contains(event.relatedTarget)) close(); });
  root.append(title, button, menu); return root;
}
