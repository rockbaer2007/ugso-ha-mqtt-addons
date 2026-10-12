import { speechResult } from "./basic-behavior.js";
import { basicLocale, basicText } from "./basic-locales.js";
const speech = new Map();
export function cleanupBasicRuntime() {
  for (const [key, entry] of speech) if (!entry.node.isConnected) { entry.recognition?.abort(); speech.delete(key); }
}
export function renderBasicSpecial(widget, doc, context) {
  const locale = basicLocale(widget, context.locale), text = value => basicText(value, locale);
  if (widget.type === "fullscreen") {
    const button = doc.createElement("button"); button.type = "button"; button.className = "fullscreen-button";
    button.dataset.basicFullscreen = widget.fullscreenStyle || "legacy";
    const update = () => {
      const on = Boolean(doc.fullscreenElement); button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", text(on ? "Vollbild beenden" : "Vollbild")); button.title = button.getAttribute("aria-label");
      if (widget.fullscreenStyle === "icon") {
        button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${on ? "M14 14H19V16H16V19H14V14M14 10V5H16V8H19V10H14M10 14V19H8V16H5V14H10M10 10H5V8H8V5H10V10Z" : "M5 5H10V7H7V10H5V5M14 5H19V10H17V7H14V5M5 14H7V17H10V19H5V14M17 14H19V19H14V17H17V14Z"}"/></svg>`;
      } else button.textContent = widget.buttonText || text("Vollbild");
    };
    update(); button.disabled = !context.runtime;
    doc.addEventListener("fullscreenchange", update);
    // An observer releases the document listener when the renderer removes this node.
    const observer = new doc.defaultView.MutationObserver(() => { if (!button.isConnected) { doc.removeEventListener("fullscreenchange", update); observer.disconnect(); } });
    observer.observe(doc.body, { childList: true, subtree: true });
    button.addEventListener("click", async event => {
      event.stopPropagation(); if (!context.runtime) return;
      try { if (doc.fullscreenElement) await doc.exitFullscreen(); else await doc.documentElement.requestFullscreen(); }
      catch { context.error(text("Vollbild nicht verfügbar")); }
    }); return button;
  }
  if (widget.type === "runtime-exit") {
    const button = doc.createElement("button"); button.type = "button"; button.disabled = !context.runtime;
    button.className = `basic-exit ${widget.exitVariant || "outlined"}`; if (widget.htmlContent) context.html(button, widget.htmlContent); else button.textContent = text("Runtime verlassen");
    if (widget.exitIcon) { const image = doc.createElement("img"); image.width = image.height = 24; context.icon(image, widget.exitIcon); image.alt = ""; button.prepend(image); }
    button.addEventListener("click", event => { event.stopPropagation(); if (!context.runtime) return;
      if (widget.closeWindow) doc.defaultView.close();
      const url = context.safeUrl(widget.redirectUrl) || new URL("?mode=editor", doc.baseURI).href;
      doc.defaultView.location.assign(url);
    }); return button;
  }
  if (widget.type !== "speech-to-text") return null;
  const { state: localState, ...settings } = widget;
  const key = context.key, signature = JSON.stringify([settings, locale, context.runtime]);
  let entry = speech.get(key);
  if (entry?.signature === signature) {
    entry.context = context;
    const ready = context.runtime && Boolean(doc.defaultView.SpeechRecognition || doc.defaultView.webkitSpeechRecognition) && context.ready(widget.entityId, "text");
    entry.node.querySelector("button").disabled = !ready;
    if (!ready && entry.listening) entry.recognition?.abort();
    return entry.node;
  }
  entry?.recognition?.abort();
  const node = doc.createElement("div"); node.className = "basic-speech";
  const button = doc.createElement("button"); button.type = "button"; const output = doc.createElement("span"); output.setAttribute("aria-live", "polite");
  entry = { node, signature, context, listening: false, recognition: null }; speech.set(key, entry);
  const Recognition = doc.defaultView.SpeechRecognition || doc.defaultView.webkitSpeechRecognition;
  const paint = status => {
    button.replaceChildren(); const icon = widget[`speechImage${status}`] || "mdi:microphone";
    if (!widget.speechNoImage) { const image = doc.createElement("img"); image.width = image.height = Math.min(200, Math.max(8, Number(widget.speechIconSize) || 32)); entry.context.icon(image, icon); image.alt = ""; button.append(image); }
    const label = text(entry.listening ? "Aufnahme stoppen" : "Aufnahme starten"); button.setAttribute("aria-label", label); button.title = label; button.setAttribute("aria-pressed", String(entry.listening));
    if (widget.speechButtonText || widget.speechNoImage) button.append(doc.createTextNode(widget.speechButtonText || label));
  };
  paint("Inactive"); button.disabled = !context.runtime || !Recognition || !context.ready(widget.entityId, "text");
  if (!Recognition) output.textContent = text("Spracherkennung nicht verfügbar");
  button.addEventListener("click", event => {
    event.stopPropagation(); if (button.disabled) return;
    if (entry.listening) { entry.recognition?.stop(); return; }
    const recognition = new Recognition(); entry.recognition = recognition;
    recognition.lang = widget.speechLanguage || `${locale}-${{de:"DE",en:"GB",fr:"FR"}[locale]}`;
    recognition.continuous = widget.speechContinuous === true || ["startstop", "continuous"].includes(widget.speechMode); recognition.interimResults = true;
    recognition.onstart = () => { entry.listening = true; paint("Started"); };
    recognition.onaudiostart = () => paint("Active");
    recognition.onresult = event => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index], value = speechResult(result[0].transcript, widget.keywords, widget.speechKeywordOnly ? "keywords" : "text");
        output.textContent = widget.speechNoText || widget.speechNoResults ? "" : result[0].transcript; output.style.color = widget.speechKeywordColor || ""; paint("Detected");
        if (result.isFinal && value && node.isConnected && !node.closest("[inert]") && entry.context.ready(widget.entityId, value)) { entry.context.write(widget.entityId, value); output.style.color = widget.speechSentColor || ""; paint("Sent"); if (widget.speechMode === "single") recognition.stop(); }
      }
    };
    recognition.onerror = event => { output.textContent = `${text("Spracherkennung fehlgeschlagen")}: ${event.error}`; };
    recognition.onend = () => { entry.listening = false; paint("Inactive"); };
    try { recognition.start(); } catch { entry.listening = false; output.textContent = text("Spracherkennung fehlgeschlagen"); }
  });
  node.append(button, output); return node;
}
