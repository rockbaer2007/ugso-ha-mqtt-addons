import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFavorites, addFavorite } from "../web/color-favorites.js";
test("favorites validate persisted data and reject duplicates", () => {
  assert.deepEqual(normalizeFavorites(["#AABBCC", "#aabbcc", "bad", null]), ["#aabbcc"]);
  assert.deepEqual(normalizeFavorites({}), []);
});
test("full lists reject additions and deleting compacts order", () => {
  const colors = Array.from({length:15}, (_,i) => "#" + i.toString(16).padStart(6,"0"));
  assert.deepEqual(addFavorite(colors,"#ffffff"),colors);
  const removed = colors.filter((_,i) => i !== 4);
  assert.equal(removed[4],colors[5]);
  assert.equal(addFavorite(removed,"#ffffff").at(-1),"#ffffff");
});
