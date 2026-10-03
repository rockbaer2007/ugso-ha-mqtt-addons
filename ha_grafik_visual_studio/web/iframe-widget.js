export function mediaRefreshUrl(source, baseUrl, refresh, noQuery, timestamp = Date.now()) {
  if (!refresh || noQuery || source.startsWith("data:")) return source;
  const url = new URL(source, baseUrl);
  url.searchParams.set("_gvs", String(timestamp));
  return url.href;
}

export function iframeOptions(widget) {
  return {
    sandbox: widget.noSandbox === true ? null : "allow-scripts allow-forms",
    border: widget.noFrame !== false ? "0" : "1px solid currentColor",
    scrolling: widget.scrollX || widget.scrollY ? "yes" : "no",
    overflowX: widget.scrollX ? "scroll" : "hidden",
    overflowY: widget.scrollY ? "scroll" : "hidden",
  };
}

export function iframeCount(widget) {
  const count = Number(widget.count ?? 2);
  return Number.isFinite(count) ? Math.max(1, Math.min(20, Math.trunc(count))) : 2;
}

export function iframeIndex(widget, value) {
  const index = value == null || value === false || ["false", "off"].includes(value) ? 0 : value === true || ["true", "on"].includes(value) ? 1 : typeof value === "string" && !value.trim() ? NaN : Number(value);
  return Number.isInteger(index) && index >= 0 && index <= iframeCount(widget) && widget.enabledPropertyGroups?.[`indexed-iframe-8-${index}`] !== false ? index : -1;
}
