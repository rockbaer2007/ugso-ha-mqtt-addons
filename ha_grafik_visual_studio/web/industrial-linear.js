export const isIndustrialLinear = widget => ["ugso.industrial/linear", "ugso.industrial/linear-slim"].includes(widget?.type);
export const linearSlim = widget => widget?.type === "ugso.industrial/linear-slim";
export const linearSpan = widget => Math.max(2, Math.min(4, Math.trunc(Number(widget.linearSpan) || 2)));
export function linearSize(widget, changed="height") {
  const minHeight=linearSlim(widget)?32:64, ratio=linearSpan(widget)*(linearSlim(widget)?2:1);
  const extra=(linearSpan(widget)-1)*2*housingSpace(widget);
  const height=Math.max(minHeight,Math.min(Math.floor((4096-extra)/ratio),Math.round(changed==="width"?(Number(widget.width)-extra)/ratio:Number(widget.height)||minHeight)));
  return {height,width:height*ratio+extra,linearSpan:linearSpan(widget)};
}
import { housingSpace } from "./housing-snap.js";

