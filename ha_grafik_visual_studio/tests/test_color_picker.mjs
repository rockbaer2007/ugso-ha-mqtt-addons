import test from "node:test";
import assert from "node:assert/strict";
import { hsvHex, hexHsv, nearestColor } from "../web/color-picker.js";
test("wheel converts primary, neutral and arbitrary colors without drift", () => {
  assert.equal(hsvHex(0,1,1),"#ff0000");
  assert.equal(hsvHex(120,1,1),"#00ff00");
  assert.equal(hsvHex(240,1,1),"#0000ff");
  for (const hex of ["#000000","#ffffff","#29c8b5","#123456"]) {
    const hsv=hexHsv(hex); assert.equal(hsvHex(hsv.hue,hsv.saturation,hsv.value),hex);
  }
});
test("name matching distinguishes exact and nearest matches", () => {
  const names=[{name:"Black",hex:"#000000"},{name:"White",hex:"#ffffff"}];
  assert.equal(nearestColor("#ffffff",names).exact,true);
  assert.deepEqual(nearestColor("#000001",names),{name:"Black",hex:"#000000",exact:false});
});
