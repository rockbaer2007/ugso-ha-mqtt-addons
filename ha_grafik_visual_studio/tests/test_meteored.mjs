import test from "node:test";
import assert from "node:assert/strict";
import { meteoredId, createMeteoredController, METEORED_RELOAD_MS } from "../web/meteored.js";
test("Meteored IDs accept provider tokens, reject paths, markup and arbitrary URLs", () => {
  assert.equal(meteoredId(" abc_123-XYZ "), "abc_123-XYZ");
  for (const value of ["", "../foo", "a?foo", "<script>", "https://example.com", "a".repeat(129), 12]) assert.equal(meteoredId(value), "");
});
class Node {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  querySelector(tag) { return this.children.find(n => n.tagName === tag); }
  setAttribute(k, v) { this.attributes[k] = v; }
}
test("hourly reload persists across redraws and stops on disable, ID change and removal", () => {
  const timers = new Map(); let counter = 0;
  const controller = createMeteoredController({ setTimer: (fn, ms) => { timers.set(++counter, { fn, ms }); return counter; }, clearTimer: id => timers.delete(id), now: () => 42 });
  const doc = { createElement: tag => new Node(tag) }, content = new Node("div"), w = { meteoredWidgetId: "abc", enableReload: true };
  const redraw = runtime => { controller.begin(); controller.render(content, w, doc, runtime); controller.end(); };
  redraw(true); const frame = content.children[0]; assert.equal(frame.attributes.sandbox, "allow-scripts"); assert.equal(timers.size, 1);
  redraw(true); assert.equal(content.children[0], frame); assert.equal(counter, 1);
  const timer = [...timers.values()][0]; assert.equal(timer.ms, METEORED_RELOAD_MS); timer.fn(); assert.equal(frame.src, "meteored-frame?widget_id=abc&reload=42");
  w.enableReload = false; redraw(true); assert.equal(timers.size, 0);
  w.enableReload = true; w.meteoredWidgetId = "other"; redraw(true); assert.notEqual(content.children[0], frame); assert.equal(timers.size, 1);
  redraw(false); assert.equal(timers.size, 0); assert.equal(content.children[0].className, "meteored-preview");
  redraw(true); controller.begin(); controller.end(); assert.equal(timers.size, 0);
});
