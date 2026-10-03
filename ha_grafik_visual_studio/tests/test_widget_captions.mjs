import test from "node:test";
import assert from "node:assert/strict";
import { getWidgetSets, getWidgetDefinition, registerWidgetSet, initializeWidgetCaption } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
import "../web/widget-sets/basic2.js";
import "../web/widget-sets/special.js";
import "../web/widget-sets/dataflow.js";

test("CSS General is required for all built-in widgets and future packages", () => {
  for (const definition of getWidgetSets().flatMap(set => set.widgets)) {
    assert.ok(definition.propertyGroups.some(group => group.css && group.label === "CSS Allgemein"), definition.type);
    for (const group of definition.propertyGroups.filter(group => group.css && group.label === "CSS Allgemein")) {
      assert.equal(group.defaultEnabled, true, definition.type);
      assert.equal(group.required, true, definition.type);
    }
  }
  const set = { id: "required-css-test", label: "Package", widgets: [{ type: "required-css-test", label: "Test", defaults: {}, propertyGroups: [{ label: "CSS Allgemein", css: true, defaultEnabled: false, fields: [] }] }] };
  registerWidgetSet(set);
  assert.equal(getWidgetDefinition("required-css-test").propertyGroups[0].required, true);
  assert.equal(set.widgets[0].propertyGroups[0].defaultEnabled, false);
});

test("every built-in widget starts without an automatic caption", () => {
  const definitions = getWidgetSets().flatMap(set => set.widgets);
  assert.ok(definitions.length > 30);
  for (const definition of definitions) {
    assert.equal(definition.defaults.title, "", definition.type);
    const legacy = { type: definition.type, title: definition.legacyDefaultTitle, name: "Editorname" };
    initializeWidgetCaption(legacy);
    assert.equal(legacy.title, "", definition.type);
    assert.equal(legacy.name, "Editorname");
    const custom = { type: definition.type, title: "EG 1 Solarleistung" };
    initializeWidgetCaption(custom);
    assert.equal(custom.title, "EG 1 Solarleistung");
    legacy.title = definition.label;
    initializeWidgetCaption(legacy);
    assert.equal(legacy.title, definition.label, "explicit later edits survive");
  }
});

test("future packages inherit the caption policy without modifying their input", () => {
  const set = { id: "caption-test", label: "Package", widgets: [{ type: "caption-test", label: "Technical type", defaults: { title: "Demo title" }, propertyGroups: [] }] };
  registerWidgetSet(set);
  assert.equal(getWidgetDefinition("caption-test").defaults.title, "");
  assert.equal(set.widgets[0].defaults.title, "Demo title");
  assert.doesNotThrow(() => initializeWidgetCaption({ type: "unavailable-package", title: "Keep" }));
});
