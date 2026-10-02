const number = (value, fallback, min, max) => {
  const parsed = Number(value ?? fallback);
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
};

export function sliderStyle(widget) {
  const shadow = prefix => `${number(widget[`${prefix}ShadowX`], 0, -100, 100)}px ${number(widget[`${prefix}ShadowY`], 0, -100, 100)}px ${number(widget[`${prefix}ShadowBlur`], 0, 0, 100)}px ${number(widget[`${prefix}ShadowSize`], 0, -100, 100)}px ${widget[`${prefix}ShadowColor`] || "rgba(0,0,0,0.5)"}`;
  return {
    "--slider-rail": widget.sliderRailColor || "#6e6e6e",
    "--slider-active": widget.sliderRailActiveColor || "#29c8b5",
    "--slider-thumb": widget.sliderThumbColor || "#29c8b5",
    "--slider-track-size": `${number(widget.trackWidth, 6, 1, 64)}px`,
    "--slider-track-radius": `${number(widget.trackBorderRadius, 100, 0, 100) * number(widget.trackWidth, 6, 1, 64) / 200}px`,
    "--slider-thumb-size": `${number(widget.thumbSize, 16, 4, 64)}px`,
    "--slider-thumb-radius": `${number(widget.thumbBorderRadius, 100, 0, 100) * number(widget.thumbSize, 16, 4, 64) / 200}px`,
    "--slider-track-shadow": shadow("track"),
    "--slider-thumb-shadow": shadow("thumb"),
  };
}

export function updateSliderFill(range, widget) {
  const min = Number(range.min), max = Number(range.max), value = Number(range.value);
  const percent = max > min ? Math.max(0, Math.min(100, (value - min) / (max - min) * 100)) : 0;
  const mode = widget.trackBarType || "normal";
  const from = mode === "inverted" ? percent : 0;
  const to = mode === "none" ? 0 : mode === "inverted" ? 100 : percent;
  range.style.setProperty("--slider-fill", `linear-gradient(to right, var(--slider-rail) 0%, var(--slider-rail) ${from}%, var(--slider-active) ${from}%, var(--slider-active) ${to}%, var(--slider-rail) ${to}%, var(--slider-rail) 100%)`);
}
