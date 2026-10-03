import test from "node:test";
import assert from "node:assert/strict";
import { technicRoomBindings, technicRoomRows, technicRoomUrl, renderTechnicRoom, closeTechnicRoom, syncTechnicRoom } from "../web/technic-room.js";
const widget = { id: "room", roomName: "Wohnzimmer", rowCount: 2, rowLabel1: "Temperatur", rowEntityId1: "sensor.temperature", decimals1: 1, unit1: "°C", valueType2: "bool", rowLabel2: "Fenster", rowEntityId2: "binary_sensor.window", extraEntityIds2: "binary_sensor.door, binary_sensor.window", trueText2: "Offen", falseText2: "Geschlossen" };
const states = { "sensor.temperature": { state: "21.56" }, "binary_sensor.window": { state: "off" }, "binary_sensor.door": { state: "on" } };
test("numeric formatting and Boolean AND/OR use all declared live bindings", () => {
  assert.deepEqual(technicRoomBindings(widget), Object.keys(states));
  const rows = technicRoomRows(widget, states);
  assert.equal(rows[0].text, "21,6 °C"); assert.equal(rows[1].text, "Geschlossen");
  assert.equal(technicRoomRows({ ...widget, logic2: "or" }, states)[1].text, "Offen");
  assert.equal(technicRoomRows(widget, states, "en")[0].text, "21.6 °C");
});
test("unknown values, unavailable states and empty numbers never become false or zero", () => {
  for (const raw of [null, "", " ", "unknown", "unavailable", true]) assert.equal(technicRoomRows(widget, { ...states, "sensor.temperature": { state: raw } })[0].text, "—");
  assert.equal(technicRoomRows(widget, { ...states, "binary_sensor.door": { state: "unavailable" } })[1].text, "—");
  assert.equal(technicRoomRows({ rowCount: 100 }).length, 10);
});
test("local popup URLs preserve the host and reject recursive and overlong chains", () => {
  const url = new URL(technicRoomUrl("http://localhost:8132/?tabsWidget=w&tabsIndex=1", "p", "home", "room"));
  assert.equal(url.origin, "http://localhost:8132"); assert.equal(url.searchParams.get("page"), "room"); assert.equal(url.searchParams.get("embedded"), "1"); assert.equal(url.searchParams.get("chain"), "home"); assert.equal(url.searchParams.has("tabsWidget"), false);
  for (const [target, chain] of [["home", []], ["room", ["room"]], ["room", Array(8).fill("other")], ["", []]]) assert.equal(technicRoomUrl(url.href, "p", "home", target, chain), null);
});
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.dataset = {}; this.listeners = {}; this.attributes = {}; }
  append(...children) { this.children.push(...children); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, listener) { this.listeners[key] = listener; }
  showModal() { this.open = true; }
  close() { this.open = false; this.listeners.close?.(); }
  remove() { this.removed = true; }
  getBoundingClientRect() { return { left: 10, right: 200, top: 10, bottom: 200 }; }
}
const document = () => ({ createElement: tag => new Element(tag), body: new Element("body") });
const click = target => target.listeners.click?.({ target, stopPropagation() {} });
test("editor only selects; runtime navigation leaves the room caption intact", () => {
  const doc = document(); let navigated = 0;
  const context = { popupUrl: "http://localhost/?page=room", states, navigate: () => navigated++ };
  click(renderTechnicRoom(widget, doc, context)); assert.equal(doc.body.children.length, 0);
  const root = renderTechnicRoom({ ...widget, clickMode: "switchView" }, doc, { ...context, runtime: true });
  click(root); assert.equal(navigated, 1); assert.equal(root.children[0].textContent, "Wohnzimmer");
});
test("popup survives polling, closes on navigation/removal and respects outside-click setting", () => {
  const doc = document(), config = { ...widget, popupUseOffset: true, popupOffsetX: 40, popupOffsetY: 80, popupWidth: 400, popupHeight: 300, closeOnOutsideClick: false };
  const context = { runtime: true, popupUrl: "http://localhost/?page=room", states };
  syncTechnicRoom("home", ["room"]); const root = renderTechnicRoom(config, doc, context); click(root);
  const dialog = doc.body.children.at(-1); assert.equal(dialog.open, true); assert.equal(dialog.style.width, "400px"); assert.match(dialog.style.left, /40px/); assert.equal(dialog.children.at(-1).src, context.popupUrl);
  renderTechnicRoom(config, doc, context); syncTechnicRoom("home", ["room"]); assert.equal(dialog.open, true);
  dialog.listeners.click({ target: dialog, clientX: 0, clientY: 0 }); assert.equal(dialog.open, true);
  syncTechnicRoom("other", []); assert.equal(dialog.removed, true);
  click(renderTechnicRoom(widget, doc, context)); const next = doc.body.children.at(-1);
  next.listeners.click({ target: next, clientX: 50, clientY: 50 }); assert.equal(next.open, true);
  next.listeners.click({ target: next, clientX: 0, clientY: 0 }); assert.equal(next.removed, true);
  closeTechnicRoom();
});
test("keyboard opening and automatic closing also work without a close button", async () => {
  const doc = document(), root = renderTechnicRoom({ ...widget, autoCloseSeconds: .01, showCloseButton: false }, doc, { runtime: true, popupUrl: "http://localhost/?page=room" });
  root.listeners.keydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
  const dialog = doc.body.children.at(-1); assert.equal(dialog.children.length, 1);
  await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(dialog.removed, true); closeTechnicRoom();
});
