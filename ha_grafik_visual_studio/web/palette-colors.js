export const PALETTE_COLORS = {
  "ha-grafik-basic2": "#46571C",
  "ha-grafik-special": "#244D63",
  "ha-grafik-dataflow": "#563D70",
  "ha-grafik-gauges": "hsl(38 40% 26%)",
};
const reservedHues = [77, 201, 270, 38];
const distance = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

// Keep removed packages reserved so reinstalling restores their original color.
export function allocatePaletteColors(ids, saved = {}) {
  const colors = Object.create(null), hues = [...reservedHues];
  for (const [id, color] of Object.entries(saved)) {
    const match = /^hsl\((\d+(?:\.\d+)?) 40% 26%\)$/.exec(String(color));
    if (PALETTE_COLORS[id] || id === "ha-grafik-core" || !match) continue;
    const hue = Number(match[1]);
    if (hue >= 360 || hues.includes(hue)) continue;
    colors[id] = color; hues.push(hue);
  }
  for (const id of ids) {
    if (id === "ha-grafik-core" || PALETTE_COLORS[id] || colors[id]) continue;
    let hue = -1, score = -1;
    for (let candidate = 0; candidate < 360; candidate++) {
      if (hues.includes(candidate)) continue;
      const gap = Math.min(...hues.map(existing => distance(candidate, existing)));
      if (gap > score) { hue = candidate; score = gap; }
    }
    if (hue < 0) {
      const sorted = [...hues].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        const gap = (i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360) - sorted[i];
        if (gap > score) { hue = (sorted[i] + gap / 2) % 360; score = gap; }
      }
    }
    colors[id] = `hsl(${hue} 40% 26%)`;
    hues.push(hue);
  }
  return colors;
}
