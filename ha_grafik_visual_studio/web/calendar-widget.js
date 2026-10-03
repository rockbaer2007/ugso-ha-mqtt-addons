export function calendarDate(value, format = "timestamp") {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  if (format === "iso") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (!match) return null;
    const [, year, month, day] = match.map(Number), date = new Date(0);
    date.setFullYear(year, month - 1, day); date.setHours(0, 0, 0, 0);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }
  const stamp = Number(value), date = new Date(stamp);
  return Number.isFinite(stamp) && !Number.isNaN(date.getTime()) ? date : null;
}
export const calendarIso = date => `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function calendarValue(date, format) {
  if (format === "iso") return calendarIso(date);
  const result = new Date(date); result.setHours(0, 0, 0, 0); return result.getTime();
}
const localDate = (year, month, day) => { const date = new Date(0); date.setFullYear(year, month, day); date.setHours(0, 0, 0, 0); return date; };
const utcDay = date => { const result = new Date(0); result.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate()); result.setUTCHours(0, 0, 0, 0); return result; };
export function calendarWeek(date, type = "iso", firstDay = "monday") {
  const day = utcDay(date);
  if (type === "simple") {
    const first = new Date(day); first.setUTCMonth(0, 1);
    const offset = (first.getUTCDay() - (firstDay === "sunday" ? 0 : 1) + 7) % 7;
    return Math.floor(((day - first) / 86400000 + offset) / 7) + 1;
  }
  day.setUTCDate(day.getUTCDate() + 3 - (day.getUTCDay() + 6) % 7);
  const first = new Date(day); first.setUTCMonth(0, 4);
  first.setUTCDate(first.getUTCDate() + 3 - (first.getUTCDay() + 6) % 7);
  return 1 + Math.round((day - first) / 604800000);
}
export function calendarGrid(year, month, firstDay = "monday") {
  const first = localDate(year, month, 1), offset = (first.getDay() - (firstDay === "sunday" ? 0 : 1) + 7) % 7;
  const count = Math.ceil((offset + localDate(year, month + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, i) => localDate(year, month, i + 1 - offset));
}
export function calendarDayDisabled(widget, date, today = new Date()) {
  const day = calendarIso(date), now = calendarIso(today);
  return Boolean(widget.disablePast && day < now || widget.disableFuture && day > now);
}
export function calendarWritable(widget, entry) {
  if (widget.readOnly || widget.entityAttribute || !entry || ["unknown", "unavailable"].includes(entry.state)) return false;
  return (widget.oidFormat === "iso" ? /^input_text\.[a-z0-9_]+$/ : /^input_number\.[a-z0-9_]+$/).test(widget.entityId || "");
}
export const CALENDAR_STYLES = [
  ["header", ["headerTextColor", "headerIconColor", "headerIconHoverColor"]],
  ["weekdays", ["weekdayTextColor"]],
  ["day", ["dayTextColor", "dayHoverColor", "dayBorderRadius", "dayOutsideMonthTextColor", "dayDisabledTextColor"]],
  ["selected", ["selectedBackgroundColor", "selectedTextColor", "selectedShadowX", "selectedShadowY", "selectedShadowBlur", "selectedShadowSize", "selectedShadowColor"]],
  ["today", ["todayBorderColor", "todayBackgroundColor", "todayTextColor"]],
  ["weekNumber", ["weekNumberTextColor"]],
];
export function calendarStyle(widget, widgets, prefix, visited = new Set()) {
  const keys = CALENDAR_STYLES.find(([name]) => name === prefix)?.[1] || [];
  const local = Object.fromEntries(keys.map(key => [key, widget[key]]));
  if (visited.has(widget.id)) return local;
  const source = widgets.find(w => w.id === widget[`${prefix}FromWidget`] && w.type === "calendar");
  return source ? calendarStyle(source, widgets, prefix, new Set([...visited, widget.id])) : local;
}

export function renderCalendar(widget, document, context) {
  const { runtime, value, entry, widgets, view, language = "de", write } = context;
  const format = widget.oidFormat || "timestamp", selected = calendarDate(widget.entityId ? value : view.localValue ?? value, format);
  const signature = `${format}:${widget.entityId}:${String(value)}`;
  if (view.signature !== signature || view.year === undefined) {
    const initial = selected || new Date(); view.year = initial.getFullYear(); view.month = initial.getMonth(); view.signature = signature;
  }
  const root = document.createElement("div"); root.className = "calendar-widget";
  const styles = Object.assign({}, ...CALENDAR_STYLES.map(([prefix]) => calendarStyle(widget, widgets, prefix)));
  const colors = { headerTextColor: "var(--text)", headerIconColor: "var(--muted)", headerIconHoverColor: "var(--text)", weekdayTextColor: "var(--muted)", dayTextColor: "var(--text)", dayHoverColor: "#5E6B3F26", dayOutsideMonthTextColor: "var(--muted)", dayDisabledTextColor: "#88888866", selectedBackgroundColor: "#5E6B3F", selectedTextColor: "#FFFFFF", todayBorderColor: "#5E6B3F", todayBackgroundColor: "#5E6B3F14", todayTextColor: "var(--text)", weekNumberTextColor: "var(--muted)" };
  for (const [key, fallback] of Object.entries(colors)) root.style.setProperty(`--cal-${key}`, styles[key] || fallback);
  root.style.setProperty("--cal-radius", `${Math.min(100, Math.max(0, Number(styles.dayBorderRadius ?? 50)))}%`);
  root.style.setProperty("--cal-size", `${Math.min(80, Math.max(20, Number(widget.daySize) || 36))}px`);
  root.style.setProperty("--cal-shadow", `${Number(styles.selectedShadowX) || 0}px ${Number(styles.selectedShadowY ?? 2)}px ${Math.max(0, Number(styles.selectedShadowBlur ?? 4))}px ${Number(styles.selectedShadowSize) || 0}px ${styles.selectedShadowColor || "#00000066"}`);
  const interactive = runtime && !widget.readOnly, writable = calendarWritable(widget, entry), canChoose = interactive && (!widget.entityId || writable) && !view.pending;
  const redraw = () => context.refresh();
  const header = document.createElement("div"); header.className = "calendar-header";
  const monthName = month => new Intl.DateTimeFormat(language, { month: "long" }).format(localDate(view.year, month, 1));
  const moveMonth = amount => {
    const date = localDate(view.year, view.month + amount, 1);
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return;
    view.year = date.getFullYear(); view.month = date.getMonth(); redraw();
  };
  const button = (label, text, action, className = "") => { const b = document.createElement("button"); b.type = "button"; b.className = className; b.textContent = text; b.setAttribute("aria-label", label); b.disabled = !interactive; b.addEventListener("pointerdown", e => { if (runtime) e.stopPropagation(); }); b.addEventListener("click", e => { e.stopPropagation(); action(); }); return b; };
  header.append(button(context.text("Vorheriger Monat"), "‹", () => moveMonth(-1)));
  if (widget.allowMonthYearNavigation !== false) {
    const month = document.createElement("select"); month.setAttribute("aria-label", context.text("Monat")); month.disabled = !interactive;
    for (let i = 0; i < 12; i++) { const option = document.createElement("option"); option.value = String(i); option.textContent = monthName(i); month.append(option); }
    month.value = String(view.month); month.addEventListener("change", () => { view.month = Number(month.value); redraw(); });
    const year = document.createElement("input"); year.type = "number"; year.min = "1"; year.max = "9999"; year.value = String(view.year); year.setAttribute("aria-label", context.text("Jahr")); year.disabled = !interactive;
    year.addEventListener("change", () => { if (Number(year.value) >= 1 && Number(year.value) <= 9999) view.year = Math.trunc(Number(year.value)); redraw(); });
    header.append(month, year);
  } else { const title = document.createElement("span"); title.textContent = `${monthName(view.month)} ${view.year}`; header.append(title); }
  header.append(button(context.text("Nächster Monat"), "›", () => moveMonth(1))); root.append(header);
  const grid = document.createElement("div"); grid.className = `calendar-grid${widget.showWeekNumbers ? " with-weeks" : ""}`;
  if (widget.showWeekNumbers) { const week = document.createElement("span"); week.className = "calendar-weekday"; week.textContent = context.text("KW"); grid.append(week); }
  const start = widget.firstDayOfWeek === "sunday" ? 0 : 1;
  for (let i = 0; i < 7; i++) { const label = document.createElement("span"); label.className = "calendar-weekday"; label.textContent = new Intl.DateTimeFormat(language, { weekday: "short" }).format(localDate(2023, 0, 1 + (start + i) % 7)); grid.append(label); }
  const today = new Date();
  for (const [index, date] of calendarGrid(view.year, view.month, widget.firstDayOfWeek).entries()) {
    if (widget.showWeekNumbers && index % 7 === 0) { const week = document.createElement("span"); week.className = "calendar-week-number"; week.textContent = String(calendarWeek(date, widget.weekNumberType, widget.firstDayOfWeek)); grid.append(week); }
    const iso = calendarIso(date), day = button(iso, String(date.getDate()), async () => {
      if (!canChoose || calendarDayDisabled(widget, date)) return;
      const next = calendarValue(date, format);
      if (widget.entityId) { view.pending = true; redraw(); const ok = await write(next); view.pending = false; if (!ok) { view.error = context.text("Datum konnte nicht gespeichert werden."); } else view.error = ""; redraw(); }
      else { view.localValue = next; view.month = date.getMonth(); view.year = date.getFullYear(); redraw(); }
    }, "calendar-day");
    day.disabled = !canChoose || calendarDayDisabled(widget, date);
    if (date.getMonth() !== view.month) day.classList.add("outside-month");
    if (calendarDayDisabled(widget, date)) day.classList.add("blocked-day");
    if (widget.showToday !== false && iso === calendarIso(today)) { day.classList.add("today"); day.setAttribute("aria-current", "date"); }
    if (selected && iso === calendarIso(selected)) { day.classList.add("selected-day"); day.setAttribute("aria-pressed", "true"); }
    grid.append(day);
  }
  root.append(grid);
  if (view.error) { const error = document.createElement("small"); error.className = "calendar-error"; error.setAttribute("role", "alert"); error.textContent = view.error; root.append(error); }
  return root;
}
