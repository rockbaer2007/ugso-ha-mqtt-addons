/* Weihnachtssteuerung 0.1.12 - no libraries, trackers or bundled pictures. */
export function statusIcon(state){
  return state==="on"?"mdi:lightbulb":state==="off"?"mdi:lightbulb-outline":"mdi:alert-circle-outline";
}
export function effectSettings(value={}){
  const number=(key,fallback,min,max)=>typeof value[key]==="number"&&Number.isFinite(value[key])?Math.max(min,Math.min(max,value[key])):fallback;
  const folder=value.folder||"/local/weihnachtssteuerung/background";
  const source=file=>imageSources({images_enabled:true,image_folder:folder,event_ids:["effect"],image_mapping:{effect:file}})[0]?.src;
  const mode=["off","image","snow","image_snow"].includes(value.mode)?value.mode:"off";
  return {background:["image","image_snow"].includes(mode)?source(value.background_file):null,
    decoration:value.decoration_enabled===true?source(value.decoration_file):null,snow:["snow","image_snow"].includes(mode),forceSnow:value.force_snow===true,
    backgroundOpacity:1-number("background_transparency",40,0,100)/100,backgroundSize:number("background_size",100,50,200),
    backgroundX:number("background_x",50,0,100),backgroundY:number("background_y",50,0,100),
    decorationOpacity:1-number("decoration_transparency",30,0,100)/100,decorationSize:number("decoration_size",30,5,100),
    decorationX:number("decoration_x",80,0,100),decorationY:number("decoration_y",100,0,100),
    diameter:number("snow_diameter",{small:2,medium:4,large:8}[value.snow_size]||4,1,20),
    darkness:number("darkness",25,0,90)/100,count:Math.round(number("snow_count",12,6,40))};
}
export function imageSources(attributes, config = {}) {
  if (!(config.show_images ?? attributes.images_enabled ?? false)) return [];
  const folder=attributes.image_folder || "/local/weihnachtssteuerung/bilder";
  let decoded;
  try { decoded=decodeURIComponent(folder).replace(/\/$/,""); } catch { return []; }
  if(!decoded.startsWith("/local/") || /[\\\0?#:]/.test(decoded) || decoded.slice(7).split("/").some(p=>!p||p==="."||p==="..")) return [];
  const mapping=attributes.image_mapping || {};
  let keys=[...new Set(attributes.event_ids || [])].filter(key=>mapping[key]);
  if(!keys.length && attributes.advent_week && mapping[`advent_${attributes.advent_week}`]) keys=[`advent_${attributes.advent_week}`];
  return keys.flatMap(key=>{
    const file=mapping[key];
    if(typeof file!=="string" || /[/\\\0?#:]/.test(file) || !/\.(png|jpe?g|webp|gif|svg)$/i.test(file))return [];
    return [{key,src:decoded+"/"+encodeURIComponent(file),alt:attributes.image_labels?.[key] || key}];
  });
}
class WeihnachtssteuerungCard extends HTMLElement {
  connectedCallback(){
    if(typeof IntersectionObserver!=="undefined"){
      this._visibility?.disconnect();this._visibility=new IntersectionObserver(entries=>{this._onscreen=entries[0].isIntersecting;this._pauseSnow();});this._visibility.observe(this);
    }
    this._pageVisibility=()=>this._pauseSnow();document.addEventListener?.("visibilitychange",this._pageVisibility);this._pauseSnow();
  }
  disconnectedCallback(){this._visibility?.disconnect();document.removeEventListener?.("visibilitychange",this._pageVisibility);this._effectsNode?.classList?.add("paused");}
  _pauseSnow(){this._effectsNode?.classList?.toggle("paused",document.hidden||this._onscreen===false);}
  _effects(settings){
    const key=JSON.stringify(settings);
    if(key===this._effectsKey)return this._effectsNode;
    this._effectsKey=key;const layer=document.createElement("div");layer.className=settings.forceSnow?"effects force-snow":"effects";layer.setAttribute("aria-hidden","true");
    const image=(src,cls,css)=>{if(!src)return;const img=document.createElement("img");img.className=cls;img.alt="";img.src=src;img.style.cssText=css;img.onerror=()=>{img.hidden=true;};layer.append(img);};
    image(settings.background,"effect-background",`opacity:${settings.backgroundOpacity};object-position:${settings.backgroundX}% ${settings.backgroundY}%;transform:scale(${settings.backgroundSize/100});transform-origin:${settings.backgroundX}% ${settings.backgroundY}%`);
    image(settings.decoration,"effect-decoration",`opacity:${settings.decorationOpacity};width:${settings.decorationSize}%;left:${settings.decorationX}%;top:${settings.decorationY}%;transform:translate(-${settings.decorationX}%,-${settings.decorationY}%)`);
    if(settings.snow)for(let i=0;i<settings.count;i++){
      const flake=document.createElement("span");flake.className="snowflake";
      flake.style.cssText=`left:${(i*61)%100}%;width:${settings.diameter}px;height:${settings.diameter}px;border-radius:50%;background:white;animation-duration:${10+i%9}s;animation-delay:-${i%17}s`;layer.append(flake);
    }
    if(settings.background||settings.decoration||settings.snow){const dim=document.createElement("div");dim.className="effect-dim";dim.style.opacity=settings.darkness;layer.append(dim);}
    this._effectsNode=layer;this._pauseSnow();return layer;
  }
  setConfig(config) {
    this.config = { title: "Weihnachtssteuerung", ...config };
    this._renderSignature = null;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }
  set hass(hass) { this._hass = hass; this._render(); }
  getCardSize() { return 5; }
  static getStubConfig() { return { type: "custom:weihnachtssteuerung-card" }; }
  static getConfigElement() { return document.createElement("weihnachtssteuerung-card-editor"); }
  _render() {
    if (!this.shadowRoot || !this._hass) return;
    const hass = this._hass;
    const de = (hass.locale?.language || hass.language || "en").startsWith("de");
    const tr = (a, b) => de ? a : b;
    const entity = this.config.entity ? hass.states[this.config.entity] :
      Object.values(hass.states).find(e => e.attributes?.christmas_control);
    const signature=JSON.stringify([this.config,de,entity?.state,entity?.attributes,
      ...(entity?.attributes?.channels||[]).map(c=>[hass.states[c.entity_id]?.state,hass.states[c.switch_entity]?.state])]);
    if(signature===this._renderSignature)return;
    this._renderSignature=signature;
    const style = document.createElement("style");
    style.textContent = `:host{display:block}ha-card{padding:16px;overflow:hidden}.head{display:flex;gap:10px;align-items:center}h2{font-size:20px;margin:0;overflow-wrap:anywhere}.meta{color:var(--secondary-text-color);font-size:13px;margin:6px 0 12px}.fest{padding:10px;border-radius:10px;background:var(--secondary-background-color);margin-bottom:12px}.row{padding:10px 0;border-top:1px solid var(--divider-color);display:grid;grid-template-columns:minmax(0,1fr) 84px;gap:8px}.name{font-weight:600;overflow-wrap:anywhere}.detail{font-size:12px;color:var(--secondary-text-color);overflow-wrap:anywhere;margin-top:4px}button{width:84px;min-height:36px;border:1px solid var(--divider-color);border-radius:9px;color:var(--primary-text-color);background:var(--secondary-background-color);cursor:pointer;align-self:center}button.active{background:var(--primary-color);color:var(--text-primary-color,#fff)}.error{color:var(--error-color)}a{color:var(--primary-color)}.state{font-weight:normal;font-size:12px}.pictures{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:10px 0}.pictures img{max-width:100%;height:110px;object-fit:contain;border-radius:10px}`;
    style.textContent+=`ha-card{position:relative;isolation:isolate}.content{position:relative;z-index:1}.effects{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:inherit;pointer-events:none}.effect-background{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.effect-decoration{position:absolute;height:auto;max-height:100%;object-fit:contain}.effect-dim{position:absolute;inset:0;background:#000}.snowflake{position:absolute;top:-10%;color:white;text-shadow:0 0 3px #fff;animation:snow-fall linear infinite}.paused .snowflake{animation-play-state:paused}@keyframes snow-fall{from{transform:translateY(0)}to{transform:translateY(120cqh)}}.effects{container-type:size}@supports not (height:1cqh){@keyframes snow-fall{from{top:-10%}to{top:110%}}}@media(prefers-reduced-motion:reduce){.effects:not(.force-snow) .snowflake{animation:none;top:35%}}`;
    const card = this._cardRoot || document.createElement("ha-card");
    const previousEffects=this._effectsNode;
    const effects=this._effects(effectSettings(entity?.attributes?.effects));
    if(!this._cardRoot){card.append(effects);this.shadowRoot.append(style,card);this._cardRoot=card;}
    else if(previousEffects!==effects){previousEffects?.remove();card.prepend(effects);}
    this._content?.remove();
    const content=document.createElement("div");content.className="content";card.append(content);
    this._content=content;
    const add = (tag, text, cls, parent = content) => {
      const node = document.createElement(tag); node.textContent = text; if (cls) node.className = cls;
      parent.append(node); return node;
    };
    add("h2", `🎄 ${this.config.title}`);
    if (!entity) {
      add("p", tr("Festtagssensor nicht gefunden. Integration einrichten oder Sensor in der Card auswählen.", "Observance sensor not found. Set up the integration or select its sensor in this card."));
    } else {
      const a = entity.attributes;
      const format = value => {
        if (!value) return "–";
        const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
        if (Number.isNaN(parsed.getTime())) return value;
        return new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", {
          timeZone: a.timezone || hass.config.time_zone,
          day: "2-digit", month: "2-digit", year: "numeric",
          ...(value.length > 10 ? { hour: "2-digit", minute: "2-digit" } : {})
        }).format(parsed);
      };
      add("div", `${a.region || ""} · ${a.country_name || ""}`, "meta");
      add("div", entity.state, "fest");
      if(a.next_holiday_names?.length)add("div",`${tr("Nächster Festtag", "Next observance")}: ${a.next_holiday_names.join(" · ")} · ${format(a.next_holiday_date)}`,"meta");
      const sources=imageSources(a,this.config);
      const mediaKey=JSON.stringify(sources);
      if(mediaKey!==this._mediaKey){
        this._mediaKey=mediaKey;this._media=document.createElement("div");this._media.className="pictures";
        for(const source of sources){const img=document.createElement("img");img.src=source.src;img.alt=source.alt;img.decoding="async";img.onerror=()=>{img.hidden=true;};this._media.append(img);}
      }
      if(sources.length)content.append(this._media);
      add("div", `${tr("Saison", "Season")}: ${format(a.season_start)} – ${format(a.season_end)} · ${a.season_active ? tr("aktiv", "active") : tr("außerhalb", "outside season")}`, "meta");
      const channels = (a.channels || []).filter(c => c.configured);
      if (!channels.length) add("p", tr("Noch keine Steuerung eingerichtet. Unter Integration → Konfigurieren bis zu fünf Entitäten auswählen.", "No controls configured. Select up to five entities under Integration → Configure."));
      for (const channel of channels) {
        const row = add("div", "", "row");
        const info = add("div", "", "", row);
        const raw = hass.states[channel.entity_id]?.state || "unavailable";
        const targetState = ({on:tr("Ein", "On"),off:tr("Aus", "Off"),unknown:tr("Unbekannt", "Unknown"),unavailable:tr("Nicht verfügbar", "Unavailable")})[raw] || raw;
        const name=add("div", "", "name", info);
        if(channel.show_status_icon){
          const icon=add("ha-icon","","status-icon",name);icon.setAttribute("icon",statusIcon(raw));
          icon.setAttribute("role","img");icon.setAttribute("aria-label",targetState||tr("Unbekannt","Unknown"));
          icon.title=targetState||tr("Unbekannt","Unknown");
          icon.style.cssText=`--mdc-icon-size:24px;color:${raw==="on"?"var(--state-light-active-color, #ffc107)":"var(--secondary-text-color)"};flex:0 0 24px`;
          name.style.cssText="display:flex;align-items:center;gap:8px";
        }
        add("span",`${channel.number}. ${channel.name}`,"",name);
        add("div", `${channel.mode === "holidays" ? tr("Nur Festtage", "Observances only") : tr("Täglich im Zeitraum", "Daily in range")} · ${channel.on_time.slice(0,5)}–${channel.off_time.slice(0,5)} · ${targetState}`, "detail", info);
        if (channel.mode === "period") add("div", `${format(channel.start)} – ${format(channel.end)}`, "detail", info);
        if (channel.mode === "holidays") add("div", channel.holidays.join(", "), "detail", info);
        add("div", channel.enabled ? `${tr("Nächste Schaltung", "Next switch")}: ${format(channel.next_switch)}` : tr("Steuerung pausiert", "Control paused"), "detail", info);
        if (channel.error) add("div", channel.error, "detail error", info);
        const enabled = channel.switch_entity ? hass.states[channel.switch_entity]?.state === "on" : channel.enabled;
        const button = add("button", enabled ? tr("Aktiv", "Active") : tr("Pausiert", "Paused"), enabled ? "active" : "", row);
        button.setAttribute("aria-label", `${enabled ? tr("Pausieren", "Pause") : tr("Aktivieren", "Enable")}: ${channel.name}`);
        button.disabled = !channel.switch_entity;
        button.onclick = () => hass.callService("switch", enabled ? "turn_off" : "turn_on", { entity_id: channel.switch_entity })
          .catch(error => { add("div", String(error), "error", info); });
      }
    }
  }
}
class WeihnachtssteuerungCardEditor extends HTMLElement {
  set hass(value) { this._hass = value; this._render(); }
  setConfig(value) { this.config = value; if (!this.shadowRoot) this.attachShadow({mode:"open"}); this._render(); }
  _render() {
    if (!this.shadowRoot || !this.config) return;
    const de = (this._hass?.locale?.language || "de").startsWith("de");
    this.shadowRoot.replaceChildren();
    const style = document.createElement("style");
    style.textContent = "label{display:block;margin:12px 0}input,select{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:var(--primary-text-color)}";
    this.shadowRoot.append(style);
    const field = (title, element, key) => {
      const label = document.createElement("label"); label.textContent = title; label.append(element); this.shadowRoot.append(label);
      element.value = this.config[key] || "";
      element.onchange = () => {
        const config = {...this.config, [key]:element.value}; if (!config.entity) delete config.entity;
        this.config = config;
        this.dispatchEvent(new CustomEvent("config-changed", {detail:{config}, bubbles:true, composed:true}));
      };
    };
    field(de ? "Titel" : "Title", document.createElement("input"), "title");
    const select = document.createElement("select");
    const automatic = document.createElement("option"); automatic.value = ""; automatic.textContent = de ? "Automatisch erkennen" : "Auto-detect"; select.append(automatic);
    for (const entity of Object.values(this._hass?.states || {}).filter(e => e.attributes?.christmas_control)) {
      const option = document.createElement("option"); option.value = entity.entity_id;
      option.textContent = entity.attributes.friendly_name || entity.entity_id; select.append(option);
    }
    field(de ? "Festtagssensor" : "Observance sensor", select, "entity");
    const imageLabel=document.createElement("label");imageLabel.textContent=de?"Eigene Festtagsbilder anzeigen":"Show own observance pictures";
    const chosen=this.config.entity ? this._hass?.states[this.config.entity] : Object.values(this._hass?.states||{}).find(e=>e.attributes?.christmas_control);
    const toggle=document.createElement("input");toggle.type="checkbox";toggle.checked=this.config.show_images??chosen?.attributes?.images_enabled??false;
    toggle.onchange=()=>{const config={...this.config,show_images:toggle.checked};this.config=config;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config},bubbles:true,composed:true}));};imageLabel.append(toggle);this.shadowRoot.append(imageLabel);
    const hint=document.createElement("p");hint.textContent=de?"Bilder hochladen und pro Land/Festtag zuordnen: Festtags-Card-Editor in der Seitenleiste. Keine Bilder im Paket.":"Upload pictures and assign them by country/observance in the sidebar's Festtags-Card-Editor. No pictures are bundled.";this.shadowRoot.append(hint);
  }
}
if (!customElements.get("weihnachtssteuerung-card")) customElements.define("weihnachtssteuerung-card", WeihnachtssteuerungCard);
if (!customElements.get("weihnachtssteuerung-card-editor")) customElements.define("weihnachtssteuerung-card-editor", WeihnachtssteuerungCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "weihnachtssteuerung-card")) window.customCards.push({
  type:"weihnachtssteuerung-card", name:"Weihnachtssteuerung", preview:true,
  description:"Region, Festtage und bis zu fünf Weihnachts-Zeitsteuerungen."
});
