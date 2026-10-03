import test from "node:test";
import assert from "node:assert/strict";
import { roomTableHtml } from "../web/heating-rooms.js";
test("room table reads states and attributes without bound preview fallback", () => {
  const w = { tablePreview: "<table>Preview</table>" };
  assert.equal(roomTableHtml(w), w.tablePreview);
  assert.equal(roomTableHtml({ customPreview: "Custom" }, {}, "customPreview"), "Custom");
  w.entityId = "sensor.rooms";
  assert.equal(roomTableHtml(w), "");
  assert.equal(roomTableHtml(w, { "sensor.rooms": { state: "unavailable" } }), "");
  assert.equal(roomTableHtml(w, { "sensor.rooms": { state: "<table>Live</table>" } }), "<table>Live</table>");
  w.tableAttribute = "html";
  assert.equal(roomTableHtml(w, { "sensor.rooms": { state: "Live", attributes: { html: "<table>Attribute</table>" } } }), "<table>Attribute</table>");
  assert.equal(roomTableHtml(w, { "sensor.rooms": { state: "Live" } }), "");
  assert.equal(roomTableHtml(w, { "sensor.rooms": { attributes: { html: "x".repeat(200001) } } }), "");
});
