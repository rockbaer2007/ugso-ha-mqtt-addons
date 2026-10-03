import test from "node:test";
import assert from "node:assert/strict";
import { viewCount, viewIndex } from "../web/stateful-view.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";

test("Stateful views use an inclusive highest index, including a single index-zero slot", () => {
  assert.equal(viewCount({}), 1);
  assert.equal(viewCount({ count: 0 }), 0);
  assert.equal(viewCount({ count: 100 }), 50);
  assert.equal(viewCount({ count: "invalid" }), 1);
  for (const value of [0, "0", false, "false", "off"]) assert.equal(viewIndex({ count: 1 }, value), 0);
  for (const value of [1, "1", true, "true", "on"]) assert.equal(viewIndex({ count: 1 }, value), 1);
  assert.equal(viewIndex({ count: 0 }, 1), -1);
});

test("Invalid or disabled view indexes cannot silently select page zero", () => {
  for (const value of [null, undefined, "", " ", "unknown", "unavailable", -1, 1.5, 2, Infinity]) assert.equal(viewIndex({ count: 1 }, value), -1);
  assert.equal(viewIndex({ count: 1, enabledPropertyGroups: { "indexed-view-in-widget-8-1": false } }, 1), -1);
});

test("Stateful view defaults preserve geometry and disable optional CSS", () => {
  const widget = getWidgetDefinition("view-in-widget-8");
  assert.equal(widget.defaults.width, 300);
  assert.equal(widget.defaults.height, 200);
  assert.deepEqual(widget.propertyGroups.filter(group => group.css && group.defaultEnabled).map(group => group.label), ["CSS Allgemein"]);
  assert.equal(widget.propertyGroups.find(group => group.label === "Allgemein").fields.find(field => field.key === "count").min, 0);
});
