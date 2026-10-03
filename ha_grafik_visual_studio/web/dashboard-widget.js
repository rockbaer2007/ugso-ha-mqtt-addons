export function dashboardSize(widget) {
  const clamp = (value, fallback, max) => Math.min(max, Math.max(32, Math.round(Number(value) || fallback)));
  return { width: clamp(widget.width, 300, 800), height: clamp(widget.height, 200, 640) };
}

export function dashboardUrl(widget, origin) {
  const path = String(widget.dashboardPath || "").trim().replace(/^\/+|\/+$/g, "");
  const view = String(widget.dashboardView || "").trim();
  if (!/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i.test(path) || /^(api|auth|runtime|config|hassio|supervisor)(\/|$)/i.test(path)) return "";
  if (view && !/^[a-z0-9_-]+$/i.test(view)) return "";
  try {
    const base = new URL(String(widget.dashboardBaseUrl || origin).trim());
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") return "";
    return new URL(`/${path}${view ? `/${view}` : ""}`, base.origin).href;
  } catch { return ""; }
}
