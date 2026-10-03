// Browser-local clock. A single host ticker updates text without redrawing widgets.
const clocks = new WeakMap();
const pad = value => String(value).padStart(2, "0");
const bounded = (value, fallback, max) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Number(value))) : fallback;
export function technicClockText(widget, now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return { time: "—", date: "—" };
  const hour = now.getHours(), twelve = widget.timeFormat === "12h";
  const time = `${twelve ? hour % 12 || 12 : pad(hour)}:${pad(now.getMinutes())}${widget.showSeconds ? `:${pad(now.getSeconds())}` : ""}${twelve ? hour >= 12 ? " PM" : " AM" : ""}`;
  const language = ["de", "en", "fr", "es", "it", "nl"].includes(widget.language) ? widget.language : "de";
  const month = ["short", "long"].includes(widget.monthFormat) ? new Intl.DateTimeFormat(language, { month: widget.monthFormat }).format(now) : pad(now.getMonth() + 1);
  const parts = { D: widget.leadingZeroDay === false ? String(now.getDate()) : pad(now.getDate()), M: month, Y: widget.yearFormat === "short" ? pad(now.getFullYear() % 100) : String(now.getFullYear()) };
  const order = ["DMY", "MDY", "YMD"].includes(widget.order) ? widget.order : "DMY";
  let date = [...order].map(key => parts[key]).join(widget.separator === "space" ? " " : [".", "-", "/", " "].includes(widget.separator) ? widget.separator : ".");
  if (widget.weekday !== "off") {
    const long = widget.weekday === "long";
    const day = new Intl.DateTimeFormat(language, { weekday: long ? "long" : "short" }).format(now).replace(/[.,]$/, "");
    date = `${day}${long ? "," : "."} ${date}`;
  }
  return { time, date };
}
export function updateTechnicClocks(doc, now = new Date()) {
  for (const root of doc.querySelectorAll(".technic-clock")) {
    const clock = clocks.get(root); if (!clock) continue;
    const text = technicClockText(clock.widget, now);
    for (const key of ["time", "date"]) if (clock[key].textContent !== text[key]) clock[key].textContent = text[key];
  }
}
export function renderTechnicClock(widget, doc, now = new Date()) {
  const root = doc.createElement("div"); root.className = "technic-clock";
  const column = widget.layout === "column", align = { left: "flex-start", center: "center", right: "flex-end" }[widget.align] || "flex-start";
  Object.assign(root.style, { flexDirection: column ? "column" : "row", justifyContent: column ? "center" : align, alignItems: column ? align : "baseline", gap: `${bounded(widget.gap, 14, 100)}px`, backgroundColor: widget.colorBg || "transparent", borderRadius: `${bounded(widget.borderRadius, 0, 100)}px` });
  const text = technicClockText(widget, now), clock = { widget };
  for (const key of ["time", "date"]) {
    const node = doc.createElement("span"); clock[key] = node; node.textContent = text[key]; node.hidden = widget[key === "time" ? "showTime" : "showDate"] === false;
    node.style.color = widget[`${key}Color`] || (key === "time" ? "#2ecfbf" : "#7a9490"); node.style.fontSize = `${Math.max(8, bounded(widget[`${key}FontSize`], key === "time" ? 40 : 15, 200))}px`; node.style.fontWeight = (widget[`${key}Bold`] ?? key === "time") ? "700" : "400";
    root.append(node);
  }
  clocks.set(root, clock); return root;
}
