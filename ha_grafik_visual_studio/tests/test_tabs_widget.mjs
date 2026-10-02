import test from "node:test";
import assert from "node:assert/strict";
import { tabCount, tabSize, ownTabSurface, allProjectWidgets, tabTarget, canEmbedTab, reidentifyTabWidgets } from "../web/tabs-widget.js";

test("own tab surfaces keep separate contents and follow the owner size", () => {
  const widget = { id: "widget-1", width: 715, height: 284 };
  assert.equal(tabCount(widget), 4);
  assert.equal(tabCount({ tabCount: 200 }), 20);
  const first = ownTabSurface(widget, 0), fourth = ownTabSurface(widget, 3);
  first.widgets.push({ id: "widget-2", x: 20, y: 30 });
  assert.equal(fourth.widgets.length, 0);
  assert.deepEqual(tabSize(widget), { width: 715, height: 240 });
  widget.tabsVertical = true; ownTabSurface(widget, 0);
  assert.equal(first.page.width, 595);
  assert.equal(tabSize({ width: 160, tabsVertical: true }).width, 80);
  assert.equal(first.widgets[0].x, 20);
  const saved = JSON.parse(JSON.stringify({ pages: [{ widgets: [widget] }] }));
  assert.equal(allProjectWidgets(saved).length, 2);
});

test("page references and recursion guards prevent direct and indirect cycles", () => {
  assert.equal(tabTarget({ id: "w" }, 0, "p"), "p/w/0");
  assert.equal(tabTarget({ tabSource0: "page", tabPage0: "p2" }, 0, "p"), "p2");
  assert.equal(canEmbedTab("p", "p", []), false);
  assert.equal(canEmbedTab("p2", "p", ["p2"]), false);
  assert.equal(canEmbedTab("p2", "p", Array(8).fill("other")), false);
  assert.equal(canEmbedTab("p2", "p", []), true);
});

test("tab copies preserve positions while remapping child ids groups and connections", () => {
  const owner = { id: "copy", tabSurfaces: [{ widgets: [
    { id: "a", x: 10, editorGroupId: "g" }, { id: "b", editorGroupId: "g" },
    { id: "line", startWidgetId: "a", endWidgetId: "b", startCollector: "a:top" },
  ] }] };
  let id = 0; reidentifyTabWidgets(owner, () => `new-${++id}`, () => "new-group");
  const widgets = owner.tabSurfaces[0].widgets;
  assert.equal(widgets[0].x, 10);
  assert.equal(widgets[0].editorGroupId, "new-group");
  assert.equal(widgets[1].editorGroupId, "new-group");
  assert.equal(widgets[2].startWidgetId, "new-1");
  assert.equal(widgets[2].startCollector, "new-1:top");
});
