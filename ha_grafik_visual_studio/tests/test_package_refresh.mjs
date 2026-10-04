import assert from "node:assert/strict";
import { registerWidgetSet, unregisterExternalWidgetSets, getWidgetSets, getWidgetDefinition } from "../web/widget-registry.js";
import { compareVersions } from "../web/package-browser.js";

function widget(type, text) { return { type, label: type, defaults: { text }, propertyGroups: [] }; }
registerWidgetSet({ id: "core", label: "Core", widgets: [widget("core/label", "Core")] });
registerWidgetSet({ id: "test.package", label: "External", externalPackage: true, widgets: [widget("test.package/label", "Before")] });
unregisterExternalWidgetSets();
assert.equal(getWidgetDefinition("core/label").defaults.text, "Core");
assert.deepEqual(getWidgetSets().map(set => set.id), ["core"]);
registerWidgetSet({ id: "test.package", label: "External", externalPackage: true, widgets: [widget("test.package/label", "After")] });
assert.equal(getWidgetDefinition("test.package/label").defaults.text, "After");
assert.equal(compareVersions("0.1.204", "0.1.203"), 1);
assert.equal(compareVersions("1.9.0", "1.10.0"), -1);
assert.equal(compareVersions("1.2.0", "1.2.0"), 0);
console.log("External definitions refresh without losing core widgets; numeric version ordering verified.");
