import { calendarDate, calendarIso, calendarWeek } from "./calendar-widget.js";

export const EVENT_VIEWS = { month: "dayGridMonth", week: "timeGridWeek", day: "timeGridDay", year: "multiMonthYear", listDay: "listDay", listWeek: "listWeek", listMonth: "listMonth", listYear: "listYear" };
export const EVENT_STYLES = [
  ["fcHeader", ["fcHeaderTextColor", "fcHeaderFontSize", "fcHeaderButtonTextColor", "fcHeaderButtonBackgroundColor", "fcHeaderButtonBorderColor", "fcHeaderButtonBorderRadius", "fcHeaderButtonHoverTextColor", "fcHeaderButtonHoverBackgroundColor"]],
  ["fcWeekdays", ["fcWeekdayTextColor", "fcWeekdayBackgroundColor", "fcWeekdayFontSize"]],
  ["fcDay", ["fcDayTextColor", "fcDayFontSize", "fcDayOutsideMonthTextColor", "fcWeekendBackgroundColor", "fcWeekNumberTextColor", "fcWeekNumberBackgroundColor", "fcWeekNumberFontSize"]],
  ["fcToday", ["fcTodayBackgroundColor", "fcTodayTextColor", "fcTodayBorderColor", "fcTodayBorderWidth", "fcShowNowIndicator", "fcNowIndicatorColor"]],
  ["fcEvent", ["fcEventBackgroundColor", "fcEventTextColor", "fcEventBorderColor", "fcEventBorderRadius", "fcEventFontSize", "fcMoreTextColor"]],
  ["fcBorder", ["fcShowBorders", "fcBorderWidth", "fcBorderColor"]],
];
const count = value => Math.min(20, Math.max(0, Math.trunc(Number(value) || 0)));
export function eventSources(widget) {
  return count(widget.countCalendarSources) ? Array.from({ length: count(widget.countCalendarSources) }, (_, i) => ({ entityId: widget[`calendar${i}EntityId`] || "", color: widget[`calendar${i}Color`] || "", label: widget[`calendar${i}Label`] || "" })) : [{ entityId: widget.entityId || "", color: "", label: "" }];
}
export function eventStyle(widget, widgets, prefix, visited = new Set()) {
  const keys = EVENT_STYLES.find(([name]) => name === prefix)?.[1] || [];
  const local = Object.fromEntries(keys.map(key => [key, widget[key]]));
  if (visited.has(widget.id)) return local;
  visited.add(widget.id);
  const source = widgets.find(item => item.type === "event-calendar" && item.id === widget[`${prefix}FromWidget`]);
  return source && !visited.has(source.id) ? eventStyle(source, widgets, prefix, visited) : local;
}
function eventDate(value, allDay) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return calendarDate(value, "iso") ? value : null;
  if (typeof value !== "number" && !(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))) return null;
  if (typeof value === "string" && !calendarDate(value.slice(0, 10), "iso")) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : allDay ? calendarIso(date) : date.toISOString();
}
export function normalizeEvents(input, source, widget) {
  const items = typeof input === "string" ? JSON.parse(input) : input;
  if (!Array.isArray(items)) throw new Error("Termine müssen eine JSON-Liste sein.");
  return items.map(item => {
    if (!item || typeof item !== "object") throw new Error("Ungültiger Termin.");
    const rawStart = item.start ?? item._date;
    const allDay = Boolean(item.allDay ?? item._allDay ?? (typeof rawStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawStart)));
    const title = item.title ?? item.summary ?? item.event;
    const start = eventDate(rawStart, allDay), rawEnd = item.end ?? item._end;
    const parsedEnd = rawEnd === undefined || rawEnd === null || rawEnd === "" ? undefined : eventDate(rawEnd, allDay);
    if (typeof title !== "string" || !start || parsedEnd === null || parsedEnd && parsedEnd < start) throw new Error("Ungültiger Titel oder Zeitraum im Termin.");
    const end = parsedEnd === start ? undefined : parsedEnd;
    const sourceColor = source.color || item.color || item._calColor || "";
    let color = sourceColor || widget.fcEventBackgroundColor || "#5E6B3F";
    for (let i = 0; i < count(widget.countEventColorRules); i++) {
      const text = String(widget[`eventRule${i}Title`] || "");
      if (text && title.toLocaleLowerCase().includes(text.toLocaleLowerCase()) && widget[`eventRule${i}Color`]) { color = widget[`eventRule${i}Color`]; break; }
    }
    return { title, start, ...(end ? { end } : {}), allDay, backgroundColor: color, borderColor: widget.fcEventBorderColor || color, textColor: widget.fcEventTextColor || "#FFFFFF", extendedProps: { sourceColor: sourceColor || widget.fcEventBackgroundColor || "#5E6B3F" } };
  });
}
const controllers = new Map(), nativeCache = new Map(), views = new Map();
export function cleanupEventCalendars() {
  for (const [root, controller] of controllers) if (!root.isConnected) { controller.calendar.destroy(); controller.observer.disconnect(); clearInterval(controller.timer); controllers.delete(root); }
}
async function nativeEvents(ids, info) {
  if (!ids.length) return {};
  const key = JSON.stringify([ids, info.startStr, info.endStr]);
  const cached = nativeCache.get(key);
  if (cached && Date.now() - cached.time < 60000) return cached.promise;
  const query = new URLSearchParams({ start: info.startStr, end: info.endStr });
  ids.forEach(id => query.append("entity_id", id));
  const promise = fetch(`api/calendar-events?${query}`, { cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Kalender konnten nicht geladen werden."); return data.calendars; });
  nativeCache.set(key, { time: Date.now(), promise });
  if (nativeCache.size > 30) nativeCache.delete(nativeCache.keys().next().value);
  try { return await promise; } catch (error) { nativeCache.delete(key); throw error; }
}
export function renderEventCalendar(widget, document, context) {
  const root = document.createElement("div"); root.className = "event-calendar";
  const host = document.createElement("div"), notice = document.createElement("div"), legend = document.createElement("div");
  host.className = "event-calendar-host"; notice.className = "event-calendar-notice"; notice.setAttribute("role", "status"); legend.className = "event-calendar-legend";
  root.append(host, notice, legend);
  const styles = Object.assign({}, ...EVENT_STYLES.map(([prefix]) => eventStyle(widget, context.widgets, prefix)));
  for (const [key, value] of Object.entries(styles)) if (value !== undefined && value !== "") root.style.setProperty(`--${key}`, typeof value === "number" || /^\d+(\.\d+)?$/.test(value) ? `${value}px` : String(value));
  root.style.setProperty("--fc-border-color", styles.fcShowBorders === false ? "transparent" : styles.fcBorderColor || "#88888840");
  if (styles.fcShowBorders === false) root.classList.add("event-calendar-no-borders");
  const sources = eventSources(widget);
  if (widget.fcShowLegend !== false) for (const source of sources.filter(item => item.label)) { const entry = document.createElement("span"), dot = document.createElement("i"); dot.style.backgroundColor = source.color || styles.fcEventBackgroundColor || "#5E6B3F"; entry.append(dot, document.createTextNode(source.label)); legend.append(entry); }
  if (!context.runtime) root.style.pointerEvents = "none";
  queueMicrotask(() => {
    if (!root.isConnected) return;
    if (!globalThis.FullCalendar) { notice.textContent = context.text("Kalenderdarstellung nicht verfügbar."); return; }
    const previous = views.get(context.key), view = EVENT_VIEWS[widget.fcView] || EVENT_VIEWS.month;
    const calendar = new globalThis.FullCalendar.Calendar(host, {
      initialView: view, initialDate: previous?.view === widget.fcView ? previous.date : undefined,
      locale: context.language.startsWith("de") ? "de" : "en", firstDay: widget.firstDayOfWeek === "sunday" ? 0 : 1,
      height: "100%", editable: false, selectable: false, navLinks: false, eventDisplay: "block",
      headerToolbar: widget.fcShowHeader === false ? false : { left: "title", center: "", right: widget.fcAllowNavigation === false || !context.runtime ? "" : "prev,next today" },
      weekNumbers: widget.fcShowWeekNumbers === true, weekNumberCalculation: date => calendarWeek(date, widget.fcWeekNumberType || "iso", widget.firstDayOfWeek),
      dayMaxEvents: Number(widget.fcMaxEventsPerDay) > 0 ? Number(widget.fcMaxEventsPerDay) : false,
      nowIndicator: styles.fcShowNowIndicator !== false,
      datesSet: () => views.set(context.key, { date: calendar.getDate(), view: widget.fcView }),
      eventDidMount: ({ el, event, view }) => { const color = event.extendedProps.sourceColor; if (view.type.startsWith("list")) { const dot = el.querySelector(".fc-list-event-dot"); if (dot) dot.style.borderColor = color; el.style.backgroundColor = event.backgroundColor; el.style.color = event.textColor; } else el.style.borderLeft = `4px solid ${color}`; },
      events: async (info, success) => {
        const events = [], errors = [];
        let native = {};
        try { native = await nativeEvents([...new Set(sources.filter(source => /^calendar\.[a-z0-9_]+$/.test(source.entityId)).map(source => source.entityId))], info); } catch (error) { errors.push(error.message); }
        for (const source of sources) {
          const isNative = source.entityId.startsWith("calendar.");
          const raw = isNative ? native[source.entityId] : source.entityId ? context.states[source.entityId]?.state : count(widget.countCalendarSources) ? null : widget.eventJson;
          if (raw === undefined || raw === null || raw === "") { if (source.entityId && !isNative) errors.push(`${source.entityId}: ${context.text("Keine Terminliste verfügbar.")}`); continue; }
          try { events.push(...normalizeEvents(raw, source, { ...widget, ...styles })); } catch (error) { errors.push(`${source.label || source.entityId}: ${context.text(error.message)}`); }
        }
        notice.textContent = [...new Set(errors)].join(" "); success(events);
      },
    });
    calendar.render();
    const observer = new ResizeObserver(() => calendar.updateSize()); observer.observe(host);
    const timer = setInterval(() => { if (!document.hidden && root.isConnected) calendar.refetchEvents(); }, 60000);
    controllers.set(root, { calendar, observer, timer });
  });
  return root;
}
