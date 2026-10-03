import { weatherPanels } from "./weather-data.js";
import { renderPackageChart } from "./package-chart.js";
export function renderWeather(w, doc, states = {}, locale = "de") {
  const root = doc.createElement("div"); root.className = "weather-charts";
  const heading = doc.createElement("strong"); heading.textContent = w.headline || states[w.locationEntityId]?.state || ""; heading.style.color = w.headlineColor || "#ffffff";
  if (heading.textContent) root.append(heading);
  const panels = weatherPanels(w, states, locale);
  if (!panels.length) { const message = doc.createElement("p"); message.textContent = locale === "de" ? "Keine Wetterreihen aktiviert" : "No weather series enabled"; root.append(message); }
  for (const panel of panels) {
    const chart = { headline: "", dataCount: panel.series.length, xAxisFormat: w.xAxisFormat || "ddd HH:mm", axisColor: w.xAxisColor || "#ffffff", gridColor: "#45535c", showLegend: w.showLegend !== false };
    panel.series.forEach((s, i) => { const n = i + 1; Object.assign(chart, { [`seriesName${n}`]: s.name, [`seriesData${n}`]: JSON.stringify(s.points), [`seriesUnit${n}`]: s.unit, [`seriesColor${n}`]: s.color, [`seriesType${n}`]: s.type, [`seriesAxis${n}`]: s.axis }); });
    const element = renderPackageChart(chart, doc, {}, locale);
    for (const text of element.querySelectorAll("svg text")) { const x = Number(text.getAttribute("x")); if (x === 52) text.setAttribute("fill", panel.axisColors.left || w.xAxisColor || "#ffffff"); if (x === 580) text.setAttribute("fill", panel.axisColors.right || w.xAxisColor || "#ffffff"); }
    element.querySelectorAll(".package-chart-legend").forEach((legend, index) => {
      legend.style.color = w.legendTextColor || "#000000";
      const swatch = doc.createElement("i"); swatch.className = "package-chart-swatch"; swatch.style.backgroundColor = panel.series[index].color; legend.prepend(swatch);
    });
    root.append(element);
  }
  return root;
}
