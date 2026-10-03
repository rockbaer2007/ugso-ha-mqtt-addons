const number = v => (typeof v === "number" || typeof v === "string" && v.trim()) && Number.isFinite(Number(v)) ? Number(v) : null;
export const WEATHER_KEYS = ["rain", "tempMax", "tempMin", "cloud", "chance"];
export function weatherBindings(w) {
  if (w.weatherSource === "individual") return [w.forecastType === "daily" ? "day" : "time", ...WEATHER_KEYS].flatMap(key => Array.from({ length: w.forecastType === "daily" ? 5 : 24 }, (_, i) => ({ entityId: w[`${key}${i + 1}EntityId`] || "", attribute: "" })));
  return w.entityId ? (w.weatherSource === "json" ? [{ entityId: w.entityId, attribute: w.forecastAttribute || "" }] : ["temperature_unit", "precipitation_unit", "friendly_name"].map(attribute => ({ entityId: w.entityId, attribute }))) : [];
}
function normalize(row) {
  if (!row || typeof row !== "object") return null;
  const raw = row.datetime ?? row.time, time = typeof raw === "number" || typeof raw === "string" && /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : Date.parse(raw);
  if (!Number.isFinite(new Date(time).getTime())) return null;
  return { time, rain: number(row.rain ?? row.precipitation), tempMax: number(row.tempMax ?? row.temperature), tempMin: number(row.tempMin ?? row.templow), cloud: number(row.cloud ?? row.cloud_coverage), chance: number(row.chance ?? row.precipitation_probability) };
}
export function weatherRows(w, states = {}) {
  let source;
  if (w.weatherSource === "individual") source = Array.from({ length: w.forecastType === "daily" ? 5 : 24 }, (_, i) => {
    const row = { datetime: states[w[`${w.forecastType === "daily" ? "day" : "time"}${i + 1}EntityId`]]?.state };
    WEATHER_KEYS.forEach(key => { row[key] = states[w[`${key}${i + 1}EntityId`]]?.state; }); return row;
  });
  else if (!w.entityId) source = w.forecastPreview;
  else if (w.weatherSource === "json") source = w.forecastAttribute ? states[w.entityId]?.attributes?.[w.forecastAttribute] : states[w.entityId]?.state;
  else source = states[w.entityId]?.weatherForecasts?.[w.forecastType || "daily"];
  try { if (typeof source === "string") source = JSON.parse(source); } catch { return []; }
  if (!Array.isArray(source) || source.length > 20000) return [];
  return source.map(normalize).filter(Boolean).sort((a, b) => a.time - b.time).slice(0, w.forecastType === "hourly" ? 24 : 5);
}
export function weatherPanels(w, states = {}, locale = "de") {
  const rows = weatherRows(w, states), source = states[w.entityId], de = locale === "de", groups = [];
  const series = (key, name, color, unit, axis, transform = v => v) => ({ name, color, unit, axis: axis === "right" ? "right" : "left", points: rows.map(row => [row.time, row[key] == null ? null : transform(row[key])]), type: key === "rain" ? "bar" : "line" });
  if (w.temperatureVisible !== false) groups.push({ axisColor: w.temperatureAxisColor, series: [series("tempMax", de ? "Temperatur max." : "Temperature max.", w.temperatureMaxColor || "#ff0000", source?.attributes?.temperature_unit || w.temperatureUnit || "°C", w.temperatureAxis), series("tempMin", de ? "Temperatur min." : "Temperature min.", w.temperatureMinColor || "#0000ff", source?.attributes?.temperature_unit || w.temperatureUnit || "°C", w.temperatureAxis)] });
  if (w.rainVisible) groups.push({ separate: w.rainSeparate, axisColor: w.rainAxisColor, series: [series("rain", de ? "Regen" : "Rain", w.rainColor || "#0000ff", source?.attributes?.precipitation_unit || w.rainUnit || "mm", w.rainAxis)] });
  if (w.cloudsVisible) groups.push({ separate: w.cloudsSeparate, axisColor: w.cloudsAxisColor, series: [series("cloud", w.sunOrCloud === "cloud" ? de ? "Wolken" : "Clouds" : de ? "Sonnenanteil" : "Sun fraction", w.cloudsColor || "#ffff00", "%", w.cloudsAxis, v => w.sunOrCloud === "cloud" ? v : 100 - v)] });
  if (w.chanceVisible) groups.push({ separate: w.chanceSeparate, axisColor: w.chanceAxisColor, series: [series("chance", de ? "Regenwahrscheinlichkeit" : "Rain probability", w.chanceColor || "#0000ff", "%", w.chanceAxis)] });
  const panels = [];
  for (const group of groups) {
    const item = group.series[0], main = panels.find(panel => !panel.separate && !panel.series.some(s => s.axis === item.axis && s.unit !== item.unit));
    // Avoid combining unrelated units on one axis.
    if (!group.separate && main && !main.series.some(s => s.axis === item.axis && s.unit !== item.unit)) { main.series.push(...group.series); main.axisColors[item.axis] = group.axisColor; }
    else panels.push({ separate: !!group.separate, series: [...group.series], axisColors: { [item.axis]: group.axisColor } });
  }
  return panels;
}
