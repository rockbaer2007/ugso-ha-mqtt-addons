import test from "node:test";
import assert from "node:assert/strict";
import { marqueeOptions, marqueeGeometry, beginMarquees, finishMarquees, renderMarquee } from "../web/marquee.js";

test("entity sources take precedence and preserve zero and literal HTML", () => {
  assert.equal(marqueeOptions({ marqueeText: "<b>News</b>" }).text, "<b>News</b>");
  assert.equal(marqueeOptions({ entityId: "sensor.news", marqueeText: "ignored" }, 0).text, "0");
  assert.equal(marqueeOptions({ entityId: "sensor.news" }).text, "—");
});
test("invalid motion settings clamp to supported bounds", () => {
  const options = marqueeOptions({ direction: "up", speed: 9999, textRepeat: -2, gap: -1 });
  assert.deepEqual([options.direction, options.speed, options.repeat, options.gap], ["left", 500, 1, 0]);
  assert.equal(marqueeOptions({ speed: "bad" }).speed, 80);
});
test("short text fills the viewport and speed stays constant across copy counts", () => {
  const options = marqueeOptions({ gap: 10, speed: 80, textRepeat: 3 });
  const first = marqueeGeometry(20, 300, options);
  assert.ok(first.distance > 300);
  const second = marqueeGeometry(20, 300, { ...options, repeat: 20 });
  for (const item of [first, second]) assert.equal(item.distance / (item.duration / 1000), 80);
});
class Element {
  constructor() { this.children = []; this.style = {}; this.dataset = {}; this.attributes = {}; this.listeners = {}; this.isConnected = true; this.clientWidth = 300; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  querySelector() { return this.children[0]?.children[0]; }
  getBoundingClientRect() { return { width: 90 }; }
  animate(frames, config) { return this.animation = { frames, config, currentTime: 0, state: "running", pause() { this.state = "paused"; }, play() { this.state = "running"; }, cancel() { this.state = "cancelled"; } }; }
}
const doc = { createElement: () => new Element(), defaultView: { matchMedia: () => ({ matches: false }) } };
test("editor preview remains static and does not interpret HTML", () => {
  const root = renderMarquee({ marqueeText: "<img onerror=x>", textRepeat: 3 }, doc);
  assert.equal(root.children[0].children.length, 1);
  assert.equal(root.children[0].children[0].children[0].textContent, "<img onerror=x>");
  assert.equal(root.children[0].animation, undefined);
});
test("animation survives redraw, pauses on hover, reverses right and cleans up", async () => {
  const widget = { id: "test", marqueeText: "News", direction: "right", pauseOnHover: true };
  beginMarquees(); const root = renderMarquee(widget, doc, { runtime: true }); await Promise.resolve(); finishMarquees();
  const animation = root.children[0].animation;
  assert.equal(animation.config.direction, "reverse"); assert.equal(root.children[0].children.length, 2);
  animation.currentTime = 1234;
  root.listeners.pointerenter(); assert.equal(animation.state, "paused");
  beginMarquees(); assert.equal(renderMarquee(widget, doc, { runtime: true }), root); await Promise.resolve(); finishMarquees();
  assert.equal(animation.currentTime, 1234); assert.equal(animation.state, "paused");
  root.listeners.pointerleave(); assert.equal(animation.state, "running");
  beginMarquees(); finishMarquees(); assert.equal(animation.state, "cancelled");
});
test("reduced-motion preference suppresses animation", async () => {
  const quietDoc = { ...doc, defaultView: { matchMedia: () => ({ matches: true }) } };
  beginMarquees(); const root = renderMarquee({ id: "quiet", marqueeText: "News" }, quietDoc, { runtime: true }); await Promise.resolve(); finishMarquees();
  assert.equal(root.children[0].animation, undefined);
  beginMarquees(); finishMarquees();
});

test("resize extends the loop while retaining elapsed time and pixel speed", async () => {
  const widget = { id: "resize", marqueeText: "News", speed: 80 };
  beginMarquees(); const root = renderMarquee(widget, doc, { runtime: true }); await Promise.resolve(); finishMarquees();
  const first = root.children[0].animation; first.currentTime = 700;
  root.clientWidth = 1000;
  beginMarquees(); renderMarquee(widget, doc, { runtime: true }); await Promise.resolve(); finishMarquees();
  const next = root.children[0].animation;
  assert.equal(first.state, "cancelled"); assert.equal(next.currentTime, 700);
  assert.ok(Number(root.dataset.period) > 1000);
  assert.equal(Number(root.dataset.period) / (next.config.duration / 1000), 80);
  beginMarquees(); finishMarquees();
});

test("changed HA text replaces the loop and releases its old animation", async () => {
  const widget = { id: "live", entityId: "sensor.news" };
  beginMarquees(); const old = renderMarquee(widget, doc, { runtime: true, value: "First" }); await Promise.resolve(); finishMarquees();
  const animation = old.children[0].animation;
  beginMarquees(); const next = renderMarquee(widget, doc, { runtime: true, value: "Second" }); await Promise.resolve(); finishMarquees();
  assert.notEqual(next, old); assert.equal(animation.state, "cancelled"); assert.equal(next.attributes["aria-label"], "Second");
  beginMarquees(); finishMarquees();
});
