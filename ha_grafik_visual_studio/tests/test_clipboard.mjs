import test from "node:test";
import assert from "node:assert/strict";
import { copyText } from "../web/clipboard.js";

function modal(result = true) {
  const calls = [];
  const field = { style: {}, focus() { calls.push("focus"); }, select() { calls.push("select"); }, setSelectionRange(start,end) { calls.push([start,end]); }, remove() { calls.push("remove"); } };
  const root = {
    append(element) { assert.equal(element,field); calls.push("append"); },
    ownerDocument: {
      activeElement: { focus() { calls.push("restore"); } },
      createElement(tag) { assert.equal(tag,"textarea"); return field; },
      execCommand(command) { assert.equal(command,"copy"); calls.push(field.value); return result; },
    },
  };
  return { root, calls };
}

test("modern clipboard copies the exact output", async () => {
  const copied = [];
  await copyText("#daa674", {}, { writeText: async value => copied.push(value) });
  assert.deepEqual(copied, ["#daa674"]);
});

test("missing or rejected clipboard API uses the modal fallback for HEX and names", async () => {
  for (const value of ["#daa674", "Desert Sand"]) {
    for (const clipboard of [null, { writeText: async () => { throw Error("Denied"); } }]) {
      const { root, calls } = modal();
      await copyText(value, root, clipboard);
      assert.ok(calls.includes(value));
      assert.deepEqual(calls.slice(-2), ["remove","restore"]);
    }
  }
});

test("failed fallback reports failure and still cleans up", async () => {
  const { root, calls } = modal(false);
  await assert.rejects(copyText("Red",root,null), /rejected/);
  assert.deepEqual(calls.slice(-2), ["remove","restore"]);
});
