import test from "node:test";
import assert from "node:assert/strict";
import { dashboardUrl, dashboardSize, dashboardExportWidgets } from "../web/dashboard-widget.js";
import { getWidgetDefinition } from "../web/widget-registry.js";
import "../web/widget-sets/core.js";
import "../web/widget-sets/special.js";

test("Export notices include dashboards nested in own tabs but exclude ordinary widgets", () => {
  const dashboard = { type: "dashboard-in-widget", id: "nested-dashboard" };
  const widgets = [{ type: "number" }, { type: "tabs", tabSurfaces: [null, { widgets: [{ type: "tabs", tabSurfaces: [{ widgets: [dashboard] }] }] }] }];
  assert.deepEqual(dashboardExportWidgets(widgets), [dashboard]);
  assert.deepEqual(dashboardExportWidgets([{ type: "number" }]), []);
});

test("Dashboard targets use the HA origin and optional view without credentials", () => {
  assert.equal(dashboardUrl({ dashboardPath: "/lovelace" }, "https://ha.example.org"), "https://ha.example.org/lovelace");
  assert.equal(dashboardUrl({ dashboardPath: "/dashboard-solar/", dashboardView: "energie", dashboardBaseUrl: "http://home.local:8123/" }, "https://studio.example.org"), "http://home.local:8123/dashboard-solar/energie");
  for (const dashboardPath of ["", "javascript:alert(1)", "/runtime", "/api/states", "/lovelace?token=secret", "/lovelace/../runtime", "https://other.example.org/lovelace"]) assert.equal(dashboardUrl({ dashboardPath }, "https://ha.example.org"), "", dashboardPath);
  for (const dashboardBaseUrl of ["https://user:secret@ha.example.org", "https://ha.example.org/?token=secret", "https://ha.example.org/sub", "javascript:alert(1)"]) assert.equal(dashboardUrl({ dashboardPath: "/lovelace", dashboardBaseUrl }, "https://ha.example.org"), "");
  assert.equal(dashboardUrl({ dashboardPath: "/lovelace", dashboardView: "../auth" }, "https://ha.example.org"), "");
});

test("Dashboard dimensions are bounded and page embedding remains a separate widget", () => {
  assert.deepEqual(dashboardSize({}), { width: 300, height: 200 });
  assert.deepEqual(dashboardSize({ width: 2000, height: 1000 }), { width: 800, height: 640 });
  assert.deepEqual(dashboardSize({ width: -1, height: 12 }), { width: 32, height: 32 });
  const dashboard = getWidgetDefinition("dashboard-in-widget");
  assert.equal(dashboard.propertyGroups.filter(group => group.css && group.defaultEnabled).length, 1);
  assert.equal(getWidgetDefinition("view-in-widget").defaults.width, 300);
  assert.equal(getWidgetDefinition("view-in-widget").defaults.targetPage, "");
});
