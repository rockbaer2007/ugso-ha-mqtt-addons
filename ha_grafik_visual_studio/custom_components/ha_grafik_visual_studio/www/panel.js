class HaGrafikIngressPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._loaded = false;
    this._opening = false;
    this._onMessage = (event) => { void this._handleMessage(event); };
    window.addEventListener("message", this._onMessage);
  }

  disconnectedCallback() {
    window.removeEventListener("message", this._onMessage);
  }

  set hass(value) {
    this._hass = value;
    if (!this._loaded) {
      this._loaded = true;
      this._openPanel();
    }
  }

  set panel(value) {
    this._panel = value;
    this._openPanel();
  }

  async _handleMessage(event) {
    if (!this._frame || event.source !== this._frame.contentWindow || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.type !== "ha-grafik:entities-request" || typeof message.requestId !== "string") return;
    try {
      const [entities, devices, states] = await Promise.all([
        this._hass.callWS({ type: "config/entity_registry/list" }),
        this._hass.callWS({ type: "config/device_registry/list" }),
        this._hass.callWS({ type: "get_states" }),
      ]);
      this._frame.contentWindow.postMessage({
        type: "ha-grafik:entities-response",
        requestId: message.requestId,
        entities,
        devices,
        states,
      }, location.origin);
    } catch (error) {
      this._frame.contentWindow.postMessage({
        type: "ha-grafik:entities-response",
        requestId: message.requestId,
        error: error.message || "Home-Assistant-Daten konnten nicht gelesen werden.",
      }, location.origin);
    }
  }

  async _openPanel() {
    if (!this._hass || !this._panel || this._frame || this._opening) return;
    this._opening = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100%; }
        iframe { display: block; width: 100%; height: 100%; border: 0; }
        p { padding: 16px; font: 14px sans-serif; }
      </style>
      <p>HA Grafik Visual Studio wird geöffnet …</p>`;
    try {
      const addonSuffix = this._panel.config.addon_suffix;
      const result = await this._hass.callWS({
        type: "supervisor/api",
        endpoint: "/addons",
        method: "get",
      });
      const addon = (result.addons || []).find((item) => item.slug.endsWith(addonSuffix) && item.ingress);
      if (!addon) throw new Error("Das installierte HA Grafik Visual Studio Add-on wurde nicht gefunden.");
      if (!addon.ingress_url) throw new Error("Home Assistant hat keine Ingress-Adresse für das Add-on geliefert.");

      const session = await this._hass.callWS({
        type: "supervisor/api",
        endpoint: "/ingress/session",
        method: "post",
        data: this._hass.user?.id ? { user_id: this._hass.user.id } : {},
      });
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `ingress_session=${session.session}; path=/api/hassio_ingress/; SameSite=Strict${secure}`;

      const frame = document.createElement("iframe");
      frame.title = this._panel.config.path === "/runtime" ? "HA Grafik Runtime" : "HA Grafik Editor";
      const ingressUrl = new URL(addon.ingress_url, location.origin);
      if (ingressUrl.origin !== location.origin) throw new Error("Die Ingress-Adresse verweist auf einen unerwarteten Host.");
      const ingressBase = ingressUrl.pathname.endsWith("/") ? ingressUrl.pathname : `${ingressUrl.pathname}/`;
      frame.src = `${ingressBase}${this._panel.config.path.replace(/^\/+/, "")}`;
      this.shadowRoot.replaceChildren(this.shadowRoot.querySelector("style"), frame);
      this._frame = frame;
    } catch (error) {
      const message = document.createElement("p");
      message.textContent = `Panel konnte nicht geöffnet werden: ${error.message}`;
      this.shadowRoot.replaceChildren(this.shadowRoot.querySelector("style"), message);
    } finally {
      this._opening = false;
    }
  }
}

customElements.define("ha-grafik-ingress-panel", HaGrafikIngressPanel);
