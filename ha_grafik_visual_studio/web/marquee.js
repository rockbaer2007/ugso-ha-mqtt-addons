const cache = new Map();
const seen = new Set();
const bounded = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) && value !== "" ? Number(value) : fallback));

export function marqueeOptions(widget, value) {
  return { text: String(widget.entityId ? value ?? "—" : widget.marqueeText ?? ""), direction: widget.direction === "right" ? "right" : "left", speed: bounded(widget.speed, 80, 10, 500), repeat: Math.trunc(bounded(widget.textRepeat, 3, 1, 200)), gap: bounded(widget.gap, 50, 0, 1000), pause: widget.pauseOnHover === true, reducedMotion: widget.respectReducedMotion !== false };
}

export function marqueeGeometry(textWidth, viewportWidth, options) {
  const unit = Math.max(1, textWidth + options.gap);
  const copies = Math.max(options.repeat, Math.ceil(viewportWidth / unit) + 1);
  const distance = copies * unit;
  return { copies, distance, duration: distance / options.speed * 1000 };
}

export function beginMarquees() { seen.clear(); }
export function finishMarquees() {
  for (const [key, entry] of cache) if (!seen.has(key)) { entry.observer?.disconnect(); entry.animation?.cancel(); cache.delete(key); }
}

export function renderMarquee(widget, doc, { runtime = false, value, key = widget.id } = {}) {
  const options = marqueeOptions(widget, value);
  const signature = JSON.stringify(options);
  if (runtime) {
    seen.add(key);
    const old = cache.get(key);
    if (old?.signature === signature) { queueMicrotask(old.measure); return old.root; }
    if (old) { old.observer?.disconnect(); old.animation?.cancel(); cache.delete(key); }
  }
  const root = doc.createElement("div"); root.className = "marquee-viewport";
  Object.assign(root.style, { width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", textAlign: "left" });
  root.setAttribute("role", "img"); root.setAttribute("aria-label", options.text);
  const track = doc.createElement("div"); track.setAttribute("aria-hidden", "true");
  Object.assign(track.style, { display: "flex", flex: "0 0 auto", whiteSpace: "pre", width: "max-content" });
  root.append(track);
  const makeGroup = copies => {
    const group = doc.createElement("div"); Object.assign(group.style, { display: "flex", flex: "0 0 auto", gap: `${options.gap}px`, paddingRight: `${options.gap}px` });
    for (let index = 0; index < copies; index++) { const span = doc.createElement("span"); span.textContent = options.text; group.append(span); }
    return group;
  };
  track.append(makeGroup(runtime ? 1 : options.repeat));
  if (!runtime || !options.text) return root;
  const entry = { root, signature, animation: null, observer: null, geometry: "", hovered: false, measure: null };
  const reducedMotion = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
  entry.measure = () => {
    if (!root.isConnected) return;
    const span = track.querySelector("span");
    const geometry = marqueeGeometry(span.getBoundingClientRect().width, root.clientWidth, options);
    const stamp = JSON.stringify([geometry.distance, geometry.copies]);
    if (stamp === entry.geometry) return;
    entry.geometry = stamp;
    const elapsed = entry.animation?.currentTime ?? 0;
    entry.animation?.cancel();
    track.replaceChildren(makeGroup(geometry.copies), makeGroup(geometry.copies));
    const quiet = options.reducedMotion && reducedMotion?.matches;
    root.dataset.motion = quiet ? "reduced" : track.animate ? "running" : "unsupported";
    root.dataset.period = String(geometry.distance);
    root.dataset.duration = String(geometry.duration);
    if (quiet || !track.animate) return;
    entry.animation = track.animate([{ transform: "translateX(0)" }, { transform: `translateX(-${geometry.distance}px)` }], { duration: geometry.duration, iterations: Infinity, easing: "linear", direction: options.direction === "right" ? "reverse" : "normal" });
    entry.animation.currentTime = elapsed;
    if (entry.hovered) entry.animation.pause();
  };
  if (options.pause) {
    root.addEventListener("pointerenter", () => { entry.hovered = true; entry.animation?.pause(); });
    root.addEventListener("pointerleave", () => { entry.hovered = false; entry.animation?.play(); });
  }
  if (doc.defaultView?.ResizeObserver) { entry.observer = new doc.defaultView.ResizeObserver(entry.measure); entry.observer.observe(root); }
  cache.set(key, entry); queueMicrotask(entry.measure);
  return root;
}
