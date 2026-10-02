import test from "node:test";
import assert from "node:assert/strict";
import { sliderStyle, updateSliderFill } from "../web/slider-style.js";

test("slider appearance maps independent track and thumb settings and bounds dimensions", () => {
  const style = sliderStyle({ trackWidth: 10, trackBorderRadius: 100, thumbSize: 16, thumbBorderRadius: 50,
    sliderRailColor: "#6e6e6e", sliderRailActiveColor: "#5e6b3f", sliderThumbColor: "#455618",
    trackShadowX: 2, trackShadowY: 2, trackShadowBlur: 2, trackShadowSize: 1, trackShadowColor: "rgba(0,0,0,1)" });
  assert.equal(style["--slider-track-radius"], "5px");
  assert.equal(style["--slider-thumb-radius"], "4px");
  assert.equal(style["--slider-track-shadow"], "2px 2px 2px 1px rgba(0,0,0,1)");
  assert.equal(style["--slider-thumb-shadow"], "0px 0px 0px 0px rgba(0,0,0,0.5)");
  assert.equal(style["--slider-active"], "#5e6b3f");
  assert.equal(style["--slider-thumb"], "#455618");
  assert.equal(sliderStyle({ trackWidth: -10, thumbSize: Infinity })["--slider-track-size"], "1px");
  assert.equal(sliderStyle({ thumbSize: Infinity })["--slider-thumb-size"], "16px");
});

test("fill handles negative ranges, incoming values, inverted and no-fill modes", () => {
  let fill;
  const range = { min: "-200", max: "200", value: "0", style: { setProperty: (_key, value) => { fill = value; } } };
  updateSliderFill(range, {});
  assert.match(fill, /--slider-active\) 0%, var\(--slider-active\) 50%/);
  range.value = "100";
  updateSliderFill(range, { trackBarType: "inverted" });
  assert.match(fill, /--slider-active\) 75%, var\(--slider-active\) 100%/);
  updateSliderFill(range, { trackBarType: "none" });
  assert.match(fill, /--slider-active\) 0%, var\(--slider-active\) 0%/);
  range.max = range.min;
  updateSliderFill(range, {});
  assert.ok(!fill.includes("NaN"));
});
