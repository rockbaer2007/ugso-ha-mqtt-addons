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
