import test from "node:test";
import assert from "node:assert/strict";
import {copyPage, freePageName, readPageTransfer, writePageTransfer} from "../web/page-transfer.js";

test("page transfer preserves order and remaps internal references across surfaces", () => {
  const original = {
    id: "original", name: "Technik", page: {}, visible: false,
    widgets: [
      {id: "collector", type: "text", editorGroupId: "one"},
      {id: "line", type: "svg-line", editorGroupId: "one", startWidgetId: "collector", endCollector: "collector:p1"},
      {id: "tabs", type: "tabs", tabSurfaces: [{id: "surface", page: {}, widgets: [
        {id: "nested", type: "universal-button", defaultState: {colorsFrom: "collector"}, targetPage: "original"},
        {id: "detail", type: "text", detailWidget: "nested", styleFromWidget: "outside"},
      ]}]},
    ],
  };
  const [source] = readPageTransfer(writePageTransfer(original));
  let next = 0;
  const copy = copyPage(source, {
    id: "new-page", name: "Technik (2)", widgetId: () => `new-${++next}`, groupId: () => "new-group",
  });
  assert.deepEqual(copy.widgets.map(widget => widget.id), ["new-1", "new-2", "new-3"]);
  assert.equal(copy.widgets[0].editorGroupId, "new-group");
  assert.equal(copy.widgets[1].editorGroupId, "new-group");
  assert.equal(copy.widgets[1].startWidgetId, "new-1");
  assert.equal(copy.widgets[1].endCollector, "new-1:p1");
  const [surface] = copy.widgets[2].tabSurfaces;
  assert.equal(surface.widgets[0].defaultState.colorsFrom, "new-1");
  assert.equal(surface.widgets[0].targetPage, "new-page");
  assert.equal(surface.widgets[1].detailWidget, "new-4");
  assert.equal(surface.widgets[1].styleFromWidget, "outside");
  assert.equal(copy.visible, false);
  assert.deepEqual(source, original);
  assert.deepEqual(readPageTransfer(JSON.stringify({pages: [original, copy]})), [original, copy]);
  assert.equal(freePageName("Technik", [original, copy]), "Technik (3)");
});

test("page transfer rejects invalid JSON and ambiguous widget identities", () => {
  assert.throws(() => readPageTransfer("{"));
  const widget = {id: "same", type: "text"};
  const page = {id: "a", name: "A", page: {}, widgets: [widget, widget]};
  assert.throws(() => readPageTransfer(writePageTransfer(page)));
});
