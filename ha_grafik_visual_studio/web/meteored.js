export const METEORED_RELOAD_MS = 3600000;
export function meteoredId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : "";
}

export function createMeteoredController({ setTimer = setInterval, clearTimer = clearInterval, now = Date.now } = {}) {
  const frames = new Map(); let seen = new Set();
  return {
    begin() { seen = new Set(); },
    render(content, widget, doc, runtime, t = value => value, idKey = "meteoredWidgetId") {
      const id = meteoredId(widget[idKey]);
      if (!runtime || !id) {
        content.replaceChildren();
        const message = doc.createElement("div"); message.className = "meteored-preview";
        const title = doc.createElement("strong"); title.textContent = "METEORED";
        const hint = doc.createElement("span"); hint.textContent = !id ? t("Meteored-Widget-ID eintragen") : `${t("Anzeige in der Runtime")} · ${id}`;
        message.append(title, hint); content.append(message); return;
      }
      const source = `meteored-frame?widget_id=${encodeURIComponent(id)}`;
      let frame = content.querySelector("iframe");
      if (!frame || frame.dataset.source !== source) {
        content.replaceChildren(); frame = doc.createElement("iframe"); frame.className = "widget-frame";
        frame.title = t("METEORED-Wetter-Widget"); frame.setAttribute("sandbox", "allow-scripts");
        frame.dataset.source = source; frame.src = source; content.append(frame);
      }
      seen.add(frame);
      const enabled = widget.enableReload !== false; let entry = frames.get(frame);
      if (entry && entry.enabled !== enabled) { if (entry.timer) clearTimer(entry.timer); frames.delete(frame); entry = null; }
      if (!entry) frames.set(frame, { enabled, timer: enabled ? setTimer(() => { frame.src = `${source}&reload=${now()}`; }, METEORED_RELOAD_MS) : null });
    },
    end() { for (const [frame, entry] of frames) if (!seen.has(frame)) { if (entry.timer) clearTimer(entry.timer); frames.delete(frame); } },
  };
}
