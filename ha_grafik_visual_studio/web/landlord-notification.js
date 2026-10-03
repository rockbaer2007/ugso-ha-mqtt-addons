export function notificationDestination(widget) {
  const service = widget.notificationService || "";
  if (!/^notify\.[a-z0-9_]{1,100}$/.test(service) || ["notify.notify", "notify.persistent_notification"].includes(service)) return null;
  if (service === "notify.send_message") return /^notify\.[a-z0-9_]{1,100}$/.test(widget.notifyEntityId || "") ? widget.notifyEntityId : null;
  return widget.notifyEntityId ? null : service;
}

export function renderLandlordNotification(host, widget, doc, runtime, locale, send) {
  // Keep runtime form nodes attached across state refreshes, preserving focus and drafts.
  const signature = JSON.stringify([runtime, locale, widget.notificationService, widget.notifyEntityId, widget.messageType, widget.messageSubject]);
  if (host.firstElementChild?.dataset.notificationSignature === signature) return;
  const de = locale === "de", root = doc.createElement("form"); root.className = "landlord-notification"; root.dataset.notificationSignature = signature;
  const heading = doc.createElement("strong"); heading.textContent = de ? "Meinen Vermieter informieren" : "Inform my landlord";
  const destination = notificationDestination(widget), hint = doc.createElement("small");
  hint.textContent = destination ? `${widget.messageType || "email"} · ${destination}` : de ? "Bitte ein HA-Benachrichtigungsziel konfigurieren." : "Configure an HA notification destination.";
  const priorityLabel = doc.createElement("label"); priorityLabel.textContent = de ? "Priorität" : "Priority";
  const priority = doc.createElement("select"); priority.setAttribute("aria-label", priorityLabel.textContent);
  for (const [value, label] of [["information", de ? "Information" : "Information"], ["important", de ? "Wichtig" : "Important"], ["urgent", de ? "Dringend" : "Urgent"]]) { const option = doc.createElement("option"); option.value = value; option.textContent = label; priority.append(option); }
  priority.value = "information"; priorityLabel.append(priority);
  const messageLabel = doc.createElement("label"); messageLabel.textContent = de ? "Nachricht" : "Message";
  const message = doc.createElement("textarea"); message.rows = 5; message.maxLength = 10000; message.setAttribute("aria-label", messageLabel.textContent); messageLabel.append(message);
  const button = doc.createElement("button"); button.type = "submit"; button.textContent = de ? "Senden" : "Send"; button.disabled = !runtime || !destination;
  priority.disabled = message.disabled = !runtime;
  const status = doc.createElement("small"); status.setAttribute("role", "status"); status.textContent = runtime ? "" : de ? "Editor-Vorschau – Versand nur in der Runtime." : "Editor preview – sending is available in runtime only.";
  let busy = false;
  root.addEventListener("submit", async event => {
    event.preventDefault();
    if (!runtime || !destination || busy) return;
    if (!message.value.trim()) { status.textContent = de ? "Bitte eine Nachricht eingeben." : "Enter a message."; return; }
    busy = true; button.disabled = priority.disabled = message.disabled = true; status.textContent = de ? "Wird übergeben …" : "Submitting …";
    try {
      await send({ service: widget.notificationService, entity_id: widget.notifyEntityId || "", subject: widget.messageSubject || "", priority: priority.value, message: message.value });
      status.textContent = de ? "An Home Assistant übergeben. Zustellung nicht bestätigt." : "Submitted to Home Assistant. Delivery not confirmed.";
      message.value = "";
    } catch { status.textContent = de ? "Übergabe fehlgeschlagen. Nachricht bleibt erhalten." : "Submission failed. Message retained."; }
    finally { busy = false; button.disabled = priority.disabled = message.disabled = false; }
  });
  root.append(heading, hint, priorityLabel, messageLabel, button, status); host.replaceChildren(root);
}
