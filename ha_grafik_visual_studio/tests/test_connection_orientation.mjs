import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../web/app.js", import.meta.url), "utf8");
const source = app.slice(app.indexOf("function connectionRoute("), app.indexOf("function closestConnectionSegmentIndex("));
const route = new Function("connectionEndpoint", "mathLeadPoint", `${source}; return connectionRoute;`)(
  (line, side) => ({ x: line[`${side}X`], y: line[`${side}Y`] }), () => null,
);

test("vertical orthogonal routes turn at target height to either side", () => {
  for (const endX of [50, 550]) {
    const line = { pathMode: "orthogonal", verticalStart: true, startX: 200, startY: 140, endX, endY: 400, startWidgetId: "solar", endWidgetId: "battery" };
    const expected = [{ x: 200, y: 140 }, { x: 200, y: 400 }, { x: endX, y: 400 }];
    assert.deepEqual(route(line, []), expected);
    assert.deepEqual(route(line, [], true), [...expected].reverse());
    assert.equal(line.startWidgetId, "solar");
    assert.equal(line.endWidgetId, "battery");
  }
});

test("horizontal routing and explicit intermediate points remain intact", () => {
  const line = { pathMode: "orthogonal", startX: 200, startY: 140, endX: 550, endY: 400 };
  assert.deepEqual(route(line, []), [{ x: 200, y: 140 }, { x: 375, y: 140 }, { x: 375, y: 400 }, { x: 550, y: 400 }]);
  const point = { id: "manual", x: 210, y: 300 };
  const result = route({ ...line, verticalStart: true, connectionPoints: [point] }, []);
  assert.equal(result[1].point, point);
  assert.equal(result[1].x, 210);
});
