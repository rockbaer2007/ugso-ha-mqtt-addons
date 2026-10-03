import test from "node:test";
import assert from "node:assert/strict";
import { notificationDestination, renderLandlordNotification } from "../web/landlord-notification.js";
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.value = ""; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  get firstElementChild() { return this.children[0]; }
  setAttribute() {}
  addEventListener(event, fn) { this.listeners[event] = fn; }
}
const doc = { createElement: tag => new Node(tag) };
const widget = { notificationService: "notify.landlord", messageType: "email", messageSubject: "Flat" };
test("notification destination must be explicit; entity only for send_message", () => {
  assert.equal(notificationDestination(widget), "notify.landlord");
  for (const service of ["", "light.turn_on", "notify.notify", "notify.persistent_notification", "notify.send_message"]) assert.equal(notificationDestination({ notificationService: service }), null);
  assert.equal(notificationDestination({ notificationService: "notify.send_message", notifyEntityId: "notify.landlord" }), "notify.landlord");
  assert.equal(notificationDestination({ ...widget, notifyEntityId: "notify.other" }), null);
});
test("editor cannot send; runtime retains draft nodes and prevents empty/duplicate submissions", async () => {
  const host = new Node("div"); let calls = [], resolve;
  const send = data => { calls.push(data); return new Promise(done => { resolve = done; }); };
  renderLandlordNotification(host, widget, doc, false, "de", send);
  await host.firstElementChild.listeners.submit({ preventDefault() {} }); assert.equal(calls.length, 0);
  renderLandlordNotification(host, widget, doc, true, "de", send);
  const form = host.firstElementChild, message = form.children[3].children[0], priority = form.children[2].children[0], button = form.children[4], status = form.children[5];
  await form.listeners.submit({ preventDefault() {} }); assert.equal(calls.length, 0);
  message.value = "Repair request"; priority.value = "urgent";
  renderLandlordNotification(host, widget, doc, true, "de", send); assert.equal(host.firstElementChild, form); assert.equal(message.value, "Repair request");
  const pending = form.listeners.submit({ preventDefault() {} }); await form.listeners.submit({ preventDefault() {} });
  assert.equal(calls.length, 1); assert.equal(button.disabled, true); assert.equal(message.disabled, true);
  assert.equal(calls[0].priority, "urgent"); resolve(); await pending;
  assert.equal(message.value, ""); assert.equal(button.disabled, false); assert.match(status.textContent, /Zustellung nicht bestätigt/);
});
test("failed submission preserves message and permits deliberate retry", async () => {
  const host = new Node("div");
  renderLandlordNotification(host, widget, doc, true, "en", async () => { throw new Error("offline"); });
  const form = host.firstElementChild, message = form.children[3].children[0]; message.value = "Draft";
  await form.listeners.submit({ preventDefault() {} }); assert.equal(message.value, "Draft"); assert.match(form.children[5].textContent, /failed/); assert.equal(form.children[4].disabled, false);
});
