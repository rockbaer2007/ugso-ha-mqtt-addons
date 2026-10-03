import { CALENDAR_STYLES } from "../calendar-widget.js";
const color = (label, key) => ({ label, key, type: "color" });
const groups = [
  ["Kopfzeile", [color("Textfarbe Kopfzeile", "headerTextColor"), color("Symbolfarbe Kopfzeile", "headerIconColor"), color("Symbolfarbe Kopfzeile (Hover)", "headerIconHoverColor")]],
  ["Wochentage", [color("Textfarbe Wochentage", "weekdayTextColor")]],
  ["Tag", [color("Textfarbe Tag", "dayTextColor"), color("Hover-Farbe Tag", "dayHoverColor"), { label: "Rahmenradius Tag (%)", key: "dayBorderRadius", type: "range", min: 0, max: 100 }, color("Textfarbe Tag außerhalb des Monats", "dayOutsideMonthTextColor"), color("Textfarbe gesperrter Tag", "dayDisabledTextColor")]],
  ["Ausgewählter Tag", [color("Hintergrundfarbe ausgewählter Tag", "selectedBackgroundColor"), color("Textfarbe ausgewählter Tag", "selectedTextColor"), ...[["X-Versatz (px)", "X", -100], ["Y-Versatz (px)", "Y", -100], ["Unschärfe (px)", "Blur", 0], ["Größe (px)", "Size", -100]].map(([label, suffix, min]) => ({ label, key: `selectedShadow${suffix}`, type: "number", min, max: 100 })), color("Schattenfarbe", "selectedShadowColor")]],
  ["Heute", [color("Rahmenfarbe Heute", "todayBorderColor"), color("Hintergrundfarbe Heute", "todayBackgroundColor"), color("Textfarbe Heute", "todayTextColor")]],
  ["Kalenderwoche", [color("Textfarbe Kalenderwoche", "weekNumberTextColor")]],
];
export const calendarDefinition = {
  type: "calendar", label: "Calendar", searchTerms: ["Kalender", "Datepicker", "Datum"], icon: "▦",
  defaults: { width: 320, height: 350, entityId: "", state: "", oidFormat: "timestamp", readOnly: false, showToday: true, disablePast: false, disableFuture: false, allowMonthYearNavigation: true, firstDayOfWeek: "monday", showWeekNumbers: false, weekNumberType: "iso", daySize: 36, dayBorderRadius: 50, dayHoverColor: "#5E6B3F26", selectedBackgroundColor: "#5E6B3F", selectedTextColor: "#FFFFFF", selectedShadowX: 0, selectedShadowY: 2, selectedShadowBlur: 4, selectedShadowSize: 0, selectedShadowColor: "#00000066", todayBorderColor: "#5E6B3F", todayBackgroundColor: "#5E6B3F14", borderWidth: 0, radius: 0, padding: 0, backgroundColor: "transparent", cssOverflowX: "visible", cssOverflowY: "visible" },
  propertyGroups: [
    { label: "Allgemein", fields: [
      { label: "Home-Assistant-Entität", key: "entityId", refreshProperties: true },
      { label: "Format des Datenpunktwerts", key: "oidFormat", type: "select", refreshProperties: true, options: [{ value: "timestamp", label: "Zeitstempel (Zahl, ms)" }, { value: "iso", label: "ISO-Datum (JJJJ-MM-TT)" }] },
      { label: "Testdatum (nur Editor)", key: "state" },
      { label: "Schreibgeschützt", key: "readOnly", type: "checkbox" },
      { label: "Heute hervorheben", key: "showToday", type: "checkbox" },
      { label: "Vergangene Tage sperren", key: "disablePast", type: "checkbox" },
      { label: "Zukünftige Tage sperren", key: "disableFuture", type: "checkbox" },
      { label: "Monats-/Jahresnavigation erlauben", key: "allowMonthYearNavigation", type: "checkbox" },
      { label: "Erster Wochentag", key: "firstDayOfWeek", type: "select", options: [{ value: "monday", label: "Montag" }, { value: "sunday", label: "Sonntag" }] },
      { label: "Kalenderwochen anzeigen", key: "showWeekNumbers", type: "checkbox", refreshProperties: true },
      { label: "Art der Kalenderwoche", key: "weekNumberType", type: "select", showWhen: { key: "showWeekNumbers", value: true }, options: [{ value: "iso", label: "ISO-8601" }, { value: "simple", label: "Einfach" }] },
      { label: "Größe der Tageszellen (px)", key: "daySize", type: "range", min: 20, max: 80 },
    ] },
    ...groups.map(([label, fields], i) => ({ label: `CSS Kalender – ${label}`, css: true, defaultEnabled: true, fields: [{ label: "Vom Widget", key: `${CALENDAR_STYLES[i][0]}FromWidget`, type: "widget" }, ...fields] })),
    { label: "Größe und Position", fields: [{ label: "Breite (px)", key: "width", type: "number", min: 16 }, { label: "Höhe (px)", key: "height", type: "number", min: 16 }, { label: "X (px)", key: "x", type: "number", min: 0 }, { label: "Y (px)", key: "y", type: "number", min: 0 }] },
  ],
};
