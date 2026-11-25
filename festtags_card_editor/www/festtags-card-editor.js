/* Festtags-Card-Editor 0.1.11. No bundled pictures or remote assets. */
export function filterEntityTargets(targets,query){
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return targets.filter(target=>{
    const text=`${target.name||""} ${target.area||""} ${target.device||""} ${target.entity_id}`.toLocaleLowerCase();
    return words.every(word=>text.includes(word));
  });
}
export function effectFileOptions(files,selected=[]){
  return [...new Set([...files,...selected].filter(file=>typeof file==="string"&&file))].sort((a,b)=>a.localeCompare(b));
}
export function calendarEventKeys(model,country,tradition){
  const keys=model.country_events[country]||[];
  const julian=["nativity_fast","orthodox_eve","orthodox_christmas"];
  if(tradition==="western")return keys.filter(key=>!julian.includes(key));
  if(tradition==="julian")return keys.filter(key=>julian.includes(key)||key==="new_years_eve"||key==="new_year");
  return keys;
}
class FesttagsCardEditor extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:"open"}); this._openChannel = 0; this._dirty = false;
    this._beforeUnload = event => { if (this._dirty) { event.preventDefault(); event.returnValue = ""; } };
    this._outsidePicker = event => {
      const path=event.composedPath();
      const keep=[...this.shadowRoot.querySelectorAll(".entity-picker")].find(picker=>path.includes(picker));
      this.closeEntityPickers(keep);
    };
  }
  connectedCallback() {
    window.addEventListener("beforeunload", this._beforeUnload);
    document.addEventListener("pointerdown",this._outsidePicker);
    if (this.hasAttribute("standalone")) this.load();
  }
  disconnectedCallback() { window.removeEventListener("beforeunload", this._beforeUnload);document.removeEventListener("pointerdown",this._outsidePicker); }
  closeEntityPickers(keep){
    for(const picker of this.shadowRoot.querySelectorAll(".entity-picker")){
      if(picker===keep)continue;
      picker.querySelector(".entity-popup").hidden=true;
      picker.querySelector(".entity-trigger").setAttribute("aria-expanded","false");
    }
  }
  entityPicker(parent,targets,value,change,n){
    const picker=this.node("div","",parent,"entity-picker");
    this.node("div",this.t("Entität","Entity"),picker,"entity-label");
    const selected=targets.find(t=>t.entity_id===value);
    const head=this.node("div","",picker,"entity-head");
    const trigger=this.node("button","",head,"entity-trigger");trigger.type="button";
    trigger.setAttribute("aria-label",this.t("Entität auswählen","Select entity"));
    trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls",`entity-popup-${n}`);
    const icon=target=>target?.entity_id?.startsWith("light.")?"☀":target?.entity_id?.startsWith("input_boolean.")?"☑":"⏻";
    this.node("span",icon(selected),trigger,"entity-icon").setAttribute("aria-hidden","true");
    const current=this.node("span","",trigger,"entity-text");
    this.node("strong",selected?.name||value||this.t("Entität auswählen","Select entity"),current);
    this.node("small",[selected?.area,selected?.device].filter(Boolean).join(" › ")||value||this.t("Nicht verwenden","Unused"),current);
    this.node("span","▾",trigger,"entity-arrow").setAttribute("aria-hidden","true");
    if(value){const clear=this.button(head,"×",()=>change(""),"entity-clear");clear.setAttribute("aria-label",this.t("Entität entfernen","Clear entity"));}
    const popup=this.node("div","",picker,"entity-popup");popup.id=`entity-popup-${n}`;popup.hidden=true;
    const search=this.node("input","",popup);search.type="search";search.placeholder=this.t("Durchsuchen","Search");search.autocomplete="off";
    search.setAttribute("aria-label",this.t("Entitäten durchsuchen","Search entities"));
    const list=this.node("div","",popup,"entity-results");list.setAttribute("role","group");list.setAttribute("aria-label",this.t("Passende Entitäten","Matching entities"));
    const count=this.node("div","",popup,"muted entity-count");count.setAttribute("aria-live","polite");
    const update=()=>{
      list.replaceChildren();const matches=filterEntityTargets(targets,search.value);
      for(const target of matches){
        const row=this.button(list,"",()=>change(target.entity_id),"entity-result");
        row.setAttribute("aria-pressed",String(target.entity_id===value));
        this.node("span",target.entity_id===value?"✓":icon(target),row,"entity-icon").setAttribute("aria-hidden","true");
        const text=this.node("span","",row,"entity-text");this.node("strong",target.name||target.entity_id,text);
        const context=[target.area,target.device].filter(Boolean).join(" › ");if(context)this.node("small",context,text);
        this.node("small",target.entity_id,text,"entity-id");
      }
      count.textContent=matches.length?`${matches.length} ${this.t("Treffer","matches")}`:this.t("Keine passenden Entitäten gefunden.","No matching entities found.");
    };
    const open=()=>{this.closeEntityPickers();popup.hidden=false;trigger.setAttribute("aria-expanded","true");search.value="";update();search.focus();};
    trigger.onclick=()=>{if(popup.hidden)open();else{this.closeEntityPickers();trigger.focus();}};
    trigger.onkeydown=event=>{if(event.key==="ArrowDown"){event.preventDefault();open();}};
    search.oninput=update;
    picker.onkeydown=event=>{
      if(event.key==="Escape"){event.preventDefault();this.closeEntityPickers();trigger.focus();}
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){
        if(popup.hidden)return;const rows=[...list.querySelectorAll("button")];if(!rows.length)return;
        const index=rows.indexOf(this.shadowRoot.activeElement);event.preventDefault();
        rows[index<0?(event.key==="ArrowDown"?0:rows.length-1):(index+(event.key==="ArrowDown"?1:-1)+rows.length)%rows.length].focus();
      }
    };
    picker.onfocusout=event=>{if(!picker.contains(event.relatedTarget)){popup.hidden=true;trigger.setAttribute("aria-expanded","false");}};
    return picker;
  }
  set hass(value) { this._hass = value; if (!this.model && !this._loading) this.load(); }
  set panel(value) { this._panel = value; }
  async request(path, options = {}) {
    const headers = {...options.headers};
    if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    let response;
    if (this._hass) response = await this._hass.fetchWithAuth(`/api/weihnachtssteuerung/${path}`, {...options, headers});
    else {
      if (options.method === "POST") headers["X-Festtags-CSRF"] = this._csrf;
      response = await fetch(`api/${path}`, {...options, headers});
    }
    if(!this._hass && options.method==="POST" && response.status===403 && !options._retried){
      const fresh=await fetch("api/bootstrap");
      if(fresh.ok){
        const bootstrap=await fresh.json();
        if(bootstrap.csrf && bootstrap.csrf!==this._csrf){
          this._csrf=bootstrap.csrf;
          return this.request(path,{...options,_retried:true});
        }
      }
    }
    const text=await response.text();let result;
    try{result=JSON.parse(text);}catch{
      throw new Error(this.t(`Speichern/Anfrage fehlgeschlagen (HTTP ${response.status}). Änderungen bleiben im Editor.`,`Request failed (HTTP ${response.status}). Changes remain in the editor.`));
    }
    if (!response.ok) throw new Error(result.error || result.error_en || `HTTP ${response.status}`);
    return result;
  }
  async load() {
    this._loading = true;
    try {
      if (!this._hass) {
        const bootstrap = await (await fetch("api/bootstrap")).json(); this._csrf = bootstrap.csrf;
        if (bootstrap.installation?.restart_required) this._restartRequired = true;
      }
      this.model = await this.request("editor");
      this._entry = this.model.entries.find(e => e.entry_id === this._entry?.entry_id) || this.model.entries[0] ||
        {entry_id:"",title:"Weihnachtssteuerung",config:structuredClone(this.model.defaults)};
      this.config = structuredClone(this._entry.config);
      this.config.channels = [...(this.config.channels || []), {}, {}, {}, {}, {}].slice(0,5);
      this.config.country_images ||= {};
      this._imageCountry ||= this.config.country;
      this._imageRegion = this.model.countries[this._imageCountry][0];
      this._dirty = false; this.render();
    } catch (error) { this.renderError(error); }
    finally { this._loading = false; }
  }
  get de() { return (this._hass?.locale?.language || navigator.language || "de").startsWith("de"); }
  t(de, en) { return this.de ? de : en; }
  markDirty() {
    this._dirty = true;
    const status = this.shadowRoot.querySelector("[data-save-status]");
    if (status) status.textContent = this.t("Ungespeicherte Änderungen", "Unsaved changes");
    const save = this.shadowRoot.querySelector("[data-save]"); if (save) save.classList.add("dirty");
  }
  node(tag, text, parent, cls) {
    const el = document.createElement(tag); if (text) el.textContent = text; if (cls) el.className = cls;
    if (parent) parent.append(el); return el;
  }
  field(parent, title, value, change, {type="text", options, disabled=false, multiple=false, transient=false} = {}) {
    const label = this.node("label", title, parent);
    const input = document.createElement(options ? "select" : "input");
    if (options) for (const [key, name] of options) { const option=this.node("option",name,input); option.value=key; }
    else { input.type=type; if (type==="time") input.step="60"; }
    if (multiple) input.multiple=true;
    if (type==="checkbox") input.checked=!!value; else input.value=value ?? "";
    input.disabled=disabled;
    input.addEventListener(options || type==="checkbox" ? "change" : "input", () => {
      change(type==="checkbox" ? input.checked : input.value); if(!transient)this.markDirty();
    });
    label.append(input); return input;
  }
  button(parent, title, action, cls="") {
    const button=this.node("button",title,parent,cls); button.type="button";
    button.onclick=async()=>{try {await action();} catch(error){this.status(error.message,true);}}; return button;
  }
  status(message, error=false) {
    this._statusMessage={message,error};
    const node=this.shadowRoot.querySelector("[data-message]");
    if (node) {node.textContent=message;node.classList.toggle("error",error);}
  }
  renderError(error) {
    this.shadowRoot.replaceChildren();
    this.node("h2","Festtags-Card-Editor",this.shadowRoot);
    this.node("p",this.t("Integration noch nicht erreichbar. Nach dem Einrichten oder Aktualisieren HA neu starten und erneut laden.","Integration not available yet. Restart HA after installing or updating, then reload."),this.shadowRoot);
    this.node("p",String(error.message || error),this.shadowRoot);
    this.button(this.shadowRoot,this.t("Erneut laden","Retry"),()=>this.load());
    if (!this._hass && this._csrf) this.button(this.shadowRoot,this.t("Integration einrichten","Set up integration"),async()=>{
      await this.request("setup",{method:"POST",body:"{}"});await this.load();
    });
    if (!this._hass && this._csrf) this.button(this.shadowRoot,this.t("Home Assistant neu starten","Restart Home Assistant"),async()=>{
      await this.request("restart",{method:"POST",body:"{}"}); this.renderError(new Error(this.t("Neustart ausgelöst; anschließend erneut laden.","Restart requested; reload afterwards.")));
    });
  }
  render() {
    this.shadowRoot.replaceChildren();
    const style=this.node("style","",this.shadowRoot);
    style.textContent=`:host{display:block;font:14px system-ui;color:var(--primary-text-color,#eee);background:var(--primary-background-color,#111820);min-height:100vh}*{box-sizing:border-box}main{max-width:1100px;margin:auto;padding:18px}.bar{position:sticky;top:0;background:var(--card-background-color,#1b2530);padding:12px;border-radius:12px;z-index:2;display:flex;align-items:center;gap:10px;flex-wrap:wrap}h1{font-size:22px;margin:0;flex:1}h2{font-size:17px;margin:0 0 12px}.box,details.channel{background:var(--card-background-color,#1b2530);border:1px solid var(--divider-color,#394652);border-radius:12px;padding:14px;margin-top:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}input,select,textarea{min-width:0;width:100%;border:1px solid var(--divider-color,#465263);border-radius:7px;background:var(--secondary-background-color,#101923);color:inherit;font:inherit;padding:8px;min-height:36px}input[type=time]{max-width:160px}input[type=checkbox]{width:19px;min-height:19px;align-self:flex-start}button{min-height:36px;min-width:115px;padding:7px 13px;background:var(--primary-color,#177c9a);color:var(--text-primary-color,#fff);border:0;border-radius:8px;cursor:pointer}button.dirty{background:#b64531}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.actions button{flex:1}.muted{color:var(--secondary-text-color,#a9b7c7);font-size:12px;overflow-wrap:anywhere}.error{color:var(--error-color,#ff9292)}summary{cursor:pointer;font-weight:600}details.channel[open] summary{margin-bottom:14px}.checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:10px}.checks label{flex-direction:row;align-items:center}.files{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px}img{width:90px;height:90px;object-fit:contain;background:#202830;border-radius:9px}.mapping{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 70px;gap:8px;align-items:center;padding:7px 0;border-top:1px solid var(--divider-color,#394652);overflow-wrap:anywhere}.mapping button{min-width:60px;background:#7d3f3f}textarea{height:95px;resize:vertical}@media(max-width:600px){main{padding:10px}.grid,.checks{grid-template-columns:1fr}.bar{position:static}h1{flex-basis:100%;font-size:20px}.mapping{grid-template-columns:minmax(0,1fr) 70px}.mapping span:nth-child(2){grid-column:1}.mapping button{grid-column:2;grid-row:1/3}}`;
    style.textContent+=`.entity-picker{position:relative;min-width:0}.entity-label{font-size:13px;margin-bottom:6px}.entity-head{display:flex;align-items:stretch;background:var(--secondary-background-color,#303030);border-radius:5px;border-bottom:1px solid #888}.entity-head button{background:transparent;color:inherit;border-radius:4px;min-width:0}.entity-trigger{display:flex;align-items:center;gap:12px;text-align:left;width:100%;padding:10px 12px;min-height:56px}.entity-icon{font-size:23px;width:28px;flex:0 0 28px;text-align:center;color:var(--secondary-text-color,#b8b8b8)}.entity-text{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.entity-text strong{font-size:14px;font-weight:500;overflow-wrap:anywhere}.entity-text small{font-size:12px;color:var(--secondary-text-color,#aaa);overflow-wrap:anywhere}.entity-arrow{font-size:18px;color:var(--secondary-text-color,#aaa)}button.entity-clear{font-size:25px;width:38px;padding:4px}.entity-popup{position:absolute;top:100%;left:0;right:0;z-index:6;background:var(--card-background-color,#202020);border:1px solid var(--divider-color,#555);border-radius:6px;box-shadow:0 8px 20px #0008;padding:12px 0 0}.entity-popup[hidden]{display:none}.entity-popup input{width:calc(100% - 24px);margin:0 12px 10px;border-color:var(--primary-color,#03a9f4);background:transparent}.entity-results{max-height:310px;overflow-y:auto;overscroll-behavior:contain}.entity-results button.entity-result{display:flex;align-items:center;gap:12px;min-width:0;width:100%;padding:12px 14px;text-align:left;border-radius:0;background:transparent;color:inherit;border-bottom:1px solid var(--divider-color,#383838)}.entity-result[aria-pressed=true]{background:var(--primary-background-color,#001d28)!important}.entity-result:hover,.entity-result:focus-visible{background:var(--secondary-background-color,#343434)!important}.entity-id{font-family:monospace;font-size:10px!important}.entity-count{padding:7px 12px}button:focus-visible{outline:2px solid var(--primary-color,#03a9f4);outline-offset:-2px}`;
    const main=this.node("main","",this.shadowRoot);
    const bar=this.node("div","",main,"bar"); this.node("h1","Festtags-Card-Editor",bar);
    const save=this.button(bar,this.t("Speichern","Save"),()=>this.save()); save.dataset.save="";
    this.button(bar,this.t("Neu laden","Reload"),()=>this.load());
    const status=this.node("span",this.t("Gespeichert","Saved"),bar,"muted"); status.dataset.saveStatus="";
    if(!this._hass)this.button(bar,this.t("Card-Ressource einrichten","Register card resource"),async()=>{await this.request("resource",{method:"POST",body:"{}"});this.status(this.t("Card-Ressource eingerichtet. Dashboard bei Bedarf neu laden.","Card resource registered. Reload the dashboard if needed."));});
    const message=this.node("p","",bar);message.dataset.message="";message.style.cssText="flex-basis:100%;margin:0;overflow-wrap:anywhere";
    message.setAttribute("role","status");message.setAttribute("aria-live","polite");
    if(this._statusMessage)this.status(this._statusMessage.message,this._statusMessage.error);
    if(this.model.entries.length>1) this.field(main,this.t("Konfiguration","Configuration"),this._entry.entry_id,value=>{this._entry=this.model.entries.find(e=>e.entry_id===value);this.config=structuredClone(this._entry.config);this.render();},{options:this.model.entries.map(e=>[e.entry_id,e.title])});
    const c=this.config, lang=this.de?0:1;
    const location=this.node("section","",main,"box");this.node("h2",this.t("Region und Land","Region and country"),location);
    const locGrid=this.node("div","",location,"grid");
    this.field(locGrid,this.t("Region","Region"),c.region,value=>{
      c.region=value;c.country=Object.keys(this.model.countries).find(k=>this.model.countries[k][0]===value);this.render();
    },{options:Object.entries(this.model.regions).map(([key,names])=>[key,names[lang]])});
    this.field(locGrid,this.t("Land","Country"),c.country,value=>{c.country=value;this.render();},{options:Object.entries(this.model.countries).filter(([,v])=>v[0]===c.region).map(([key,names])=>[key,names[1+lang]])});
    this.field(locGrid,this.t("Tradition","Tradition"),c.tradition,value=>{c.tradition=value;this.render();},{options:[["western",this.t("25. Dezember","25 December")],["julian",this.t("7. Januar (julianisch)","7 January (Julian)")],["both",this.t("Beide","Both")]]});
    this.node("p",this.t("Fest- und Brauchtumstermine; keine vollständige Liste gesetzlicher Feiertage.","Observances and traditions; not a complete statutory holiday list."),location,"muted");
    const season=this.node("section","",main,"box");this.node("h2",this.t("Standardzeitraum der Saison","Default season range"),season);this.periodFields(season,c);
    for(let n=0;n<5;n++) this.channel(main,n);
    this.images(main);
    this.effects(main);
    const card=this.node("section","",main,"box"); this.node("h2",this.t("Anzeige-Card","Display card"),card);
    this.field(card,this.t("Eigene Festtagsbilder anzeigen","Show own observance pictures"),c.show_images||false,value=>{c.show_images=value;},{type:"checkbox"});
    const yaml=this.node("textarea","",card);yaml.readOnly=true;
    yaml.value="type: custom:weihnachtssteuerung-card\ntitle: Weihnachtssteuerung\n";
    this.node("p",this.t("Die Card übernimmt die Bildoption und Zuordnungen aus dieser Konfiguration. In der Card kann show_images zusätzlich überschrieben werden.","The card uses this configuration's image option and mappings. show_images can also be overridden in the card."),card,"muted");
    if(this._dirty) this.markDirty();
  }
  periodFields(parent,target) {
    const grid=this.node("div","",parent,"grid");
    const options=[["custom",this.t("Eigenes Datum (TT.MM.)","Custom date (DD.MM.)")],...Object.entries(this.model.events).map(([key,v])=>[key,v[this.de?0:1]])];
    this.field(grid,this.t("Beginn am","Start on"),target.start_rule,value=>{target.start_rule=value;this.render();},{options});
    this.field(grid,this.t("Eigenes Anfangsdatum","Custom start date"),target.start_date,value=>{target.start_date=value;},{disabled:target.start_rule!=="custom"});
    this.field(grid,this.t("Ende einschließlich","End inclusive"),target.end_rule,value=>{target.end_rule=value;this.render();},{options});
    this.field(grid,this.t("Eigenes Enddatum","Custom end date"),target.end_date,value=>{target.end_date=value;},{disabled:target.end_rule!=="custom"});
  }
  channel(parent,n) {
    const c=this.config, channel=c.channels[n];
    const details=this.node("details","",parent,"channel"); details.dataset.channel=String(n);details.open=this._openChannel===n;
    details.ontoggle=()=>{if(details.open){this._openChannel=n;for(const other of this.shadowRoot.querySelectorAll("details.channel")) if(other!==details)other.open=false;}};
    this.node("summary",`${this.t("Steuerung","Control")} ${n+1} · ${channel.name || channel.entity_id || this.t("Nicht eingerichtet","Not configured")}`,details);
    const grid=this.node("div","",details,"grid");
    const allTargets=[...(this.model.targets||[])];
    if(channel.entity_id&&!allTargets.some(t=>t.entity_id===channel.entity_id))allTargets.push({entity_id:channel.entity_id,name:channel.entity_id});
    this.entityPicker(grid,allTargets,channel.entity_id||"",value=>{
      c.channels[n]=value?{mode:"period",on_time:"16:00:00",off_time:"23:00:00",holidays:[],...channel,entity_id:value}:{};
      this.markDirty();this.render();
      this.shadowRoot.querySelector(`[data-channel="${n}"] .entity-trigger`)?.focus();
    },n);
    if(!channel.entity_id)return;
    this.field(grid,this.t("Statussymbol anzeigen","Show status icon"),channel.show_status_icon||false,value=>{channel.show_status_icon=value;},{type:"checkbox"});
    this.field(grid,this.t("Name","Name"),channel.name||"",value=>{channel.name=value;});
    this.field(grid,this.t("Betriebsart","Mode"),channel.mode,value=>{channel.mode=value;this.render();},{options:[["period",this.t("Täglich im Zeitraum","Daily within date range")],["holidays",this.t("Nur ausgewählte Festtage","Selected observances only")]]});
    this.field(grid,this.t("Einschalten um","Turn on at"),channel.on_time.slice(0,5),value=>{channel.on_time=value+":00";},{type:"time"});
    this.field(grid,this.t("Ausschalten um","Turn off at"),channel.off_time.slice(0,5),value=>{channel.off_time=value+":00";},{type:"time"});
    if(channel.mode==="period") {
      this.field(grid,this.t("Standardzeitraum übernehmen","Use default season range"),!channel.start_rule,value=>{
        for(const key of ["start_rule","start_date","end_rule","end_date"])if(value)delete channel[key];else channel[key]=c[key];this.render();
      },{type:"checkbox"});
      if(channel.start_rule)this.periodFields(details,channel);
    } else {
      const checks=this.node("div","",details,"checks");
      const keys=[...new Set([...calendarEventKeys(this.model,c.country,c.tradition),...(channel.holidays||[])])];
      for(const key of keys)this.field(checks,this.model.events[key][this.de?0:1],(channel.holidays||[]).includes(key),checked=>{
        channel.holidays=[...new Set(checked?[...(channel.holidays||[]),key]:(channel.holidays||[]).filter(k=>k!==key))];
      },{type:"checkbox"});
    }
  }
  images(parent) {
    const box=this.node("section","",parent,"box");this.node("h2",this.t("Eigene Bilder pro Land und Festtag","Own pictures by country and observance"),box);
    this.node("p",this.t("Es werden keine Bilder mitgeliefert. Lade nur Bilder hoch, die du verwenden darfst. PNG, JPG, WebP und GIF; bis 5 MiB und 16 Megapixel. Bestehende Dateien werden nicht überschrieben.","No pictures are included. Upload only pictures you may use. PNG, JPG, WebP and GIF; up to 5 MiB and 16 MP. Existing files are never overwritten."),box,"muted");
    const grid=this.node("div","",box,"grid");
    this.field(grid,this.t("Bilderordner unter /local/","Image folder under /local/"),this.config.image_folder||"/local/weihnachtssteuerung/bilder",value=>{this.config.image_folder=value;});
    const files=this.node("input","",grid);files.type="file";files.accept="image/png,image/jpeg,image/webp,image/gif";files.multiple=true;files.setAttribute("aria-label",this.t("Eigene Bilder hochladen","Upload own pictures"));
    files.onchange=async()=>{
      try{let n=0;for(const file of files.files){
        this.status(`${this.t("Upload","Upload")} ${++n}/${files.files.length}: ${file.name}`);
        const body=new FormData();body.append("folder",this.config.image_folder||"/local/weihnachtssteuerung/bilder");body.append("file",file);
        await this.request("images",{method:"POST",body});
      } await this.readFiles();this.status(this.t("Bilder hochgeladen. Jetzt Festtag und Datei zuordnen und speichern.","Pictures uploaded. Assign an observance and file, then save."));}
      catch(error){this.status(error.message,true);}
    };
    this.field(grid,this.t("Region für Bildzuordnung","Image mapping region"),this._imageRegion,value=>{this._imageRegion=value;this._imageCountry=Object.keys(this.model.countries).find(k=>this.model.countries[k][0]===value);this._imageEvent=null;this.render();},{transient:true,options:Object.entries(this.model.regions).map(([k,v])=>[k,v[this.de?0:1]])});
    this.field(grid,this.t("Land für Bildzuordnung","Image mapping country"),this._imageCountry,value=>{this._imageCountry=value;this._imageEvent=null;this.render();},{transient:true,options:Object.entries(this.model.countries).filter(([,v])=>v[0]===this._imageRegion).map(([k,v])=>[k,v[this.de?1:2]])});
    const keys=this.model.country_events[this._imageCountry];this._imageEvent ||= keys[0];
    this.field(grid,this.t("Festtag für Bildzuordnung","Image mapping observance"),this._imageEvent,value=>{this._imageEvent=value;this.render();},{transient:true,options:keys.map(k=>[k,this.model.events[k][this.de?0:1]])});
    const assigned=this.config.country_images[this._imageCountry]||{};
    const filename=this.field(grid,this.t("Dateiname im Bilderordner","Filename in image folder"),assigned[this._imageEvent]||"",()=>{},{transient:true});
    filename.setAttribute("list","festtags-image-files");
    const list=this.node("datalist","",box);list.id="festtags-image-files";for(const file of this._files||[]){const option=this.node("option",file,list);option.value=file;}
    const actions=this.node("div","",box,"actions");
    this.button(actions,this.t("Ordner einlesen","Read folder"),()=>this.readFiles());
    this.button(actions,this.t("Bild zuordnen","Assign picture"),()=>{
      if(!filename.value.trim())throw new Error(this.t("Dateiname fehlt","Filename missing"));
      this.config.country_images[this._imageCountry]||={};this.config.country_images[this._imageCountry][this._imageEvent]=filename.value.trim();this.markDirty();this.render();
    });
    for(const [event,file]of Object.entries(assigned)){
      const row=this.node("div","",box,"mapping");this.node("span",this.model.events[event][this.de?0:1],row);this.node("span",file,row);
      this.button(row,this.t("Lösen","Unassign"),()=>{delete assigned[event];this.markDirty();this.render();});
    }
    const preview=assigned[this._imageEvent];if(preview){const img=this.node("img","",box);img.alt=this.model.events[this._imageEvent][this.de?0:1];img.src=this.imageURL(preview);img.onerror=()=>{img.hidden=true;};}
    this.node("p",this.t("Zuordnung lösen entfernt nur die Verknüpfung, keine Bilddatei. GIF-Animationen bleiben erhalten. Region/Land der Zuordnung kann von der gerade aktiven Konfiguration abweichen.","Unassign only removes the mapping, never the file. GIF animations are preserved. Mapping region/country can differ from the active configuration."),box,"muted");
  }
  effects(parent){
    const e=this.config.effects||={};
    e.folder||=(this.config.image_folder||"/local/weihnachtssteuerung/bilder").replace(/\/[^/]+\/?$/,"")+"/background";
    const box=this.node("section","",parent,"box");this.node("h2",this.t("Hintergrund und Dekoration","Background and decoration"),box);
    this.node("p",this.t("Eigene Dateien im separaten Ordner background neben bilder. Alle Effekte sind optional; 100 % Transparenz bedeutet unsichtbar. Texte und Buttons bleiben darüber bedienbar.","Own files in the separate background folder beside bilder. All effects are optional; 100% transparency means invisible. Text and controls remain above the effects."),box,"muted");
    const grid=this.node("div","",box,"grid");
    this.field(grid,this.t("Hintergrundmodus","Background mode"),e.mode||"off",v=>{e.mode=v;},{options:[["off",this.t("Aus","Off")],["image",this.t("Bild / GIF","Image / GIF")],["snow",this.t("Schneefall","Snowfall")],["image_snow",this.t("Bild + Schneefall","Image + snowfall")]]});
    this.field(grid,this.t("Hintergrundordner","Background folder"),e.folder,v=>{e.folder=v;this._effectFiles=[];});
    const upload=this.node("input","",grid);upload.type="file";upload.multiple=true;upload.accept="image/png,image/jpeg,image/webp,image/gif";upload.setAttribute("aria-label",this.t("Hintergründe hochladen","Upload backgrounds"));
    upload.onchange=async()=>{try{for(const file of upload.files){const body=new FormData();body.append("folder",e.folder);body.append("file",file);await this.request("images",{method:"POST",body});}await this.readEffectFiles();this.status(this.t("Dateien hochgeladen. Hintergrund/Dekoration wählen und speichern.","Files uploaded. Select background/decoration and save."));}catch(error){this.status(error.message,true);}};
    this.button(grid,this.t("Hintergrundordner einlesen","Read background folder"),()=>this.readEffectFiles());
    const fileOptions=[["",this.t("Keine Datei","No file")],...effectFileOptions(this._effectFiles||[],[e.background_file,e.decoration_file]).map(file=>[file,file])];
    for(const [key,de,en]of [["background_file","Hintergrunddatei","Background file"],["decoration_file","Dekorationsdatei (GIF möglich)","Decoration file (GIF supported)"]]){
      this.field(grid,this.t(de,en),e[key]||"",v=>{e[key]=v;},{options:fileOptions});
    }
    this.field(grid,this.t("Dekoration anzeigen","Show decoration"),e.decoration_enabled||false,v=>{e.decoration_enabled=v;},{type:"checkbox"});
    this.field(grid,this.t("Schneefall trotzdem animieren","Animate snowfall anyway"),e.force_snow||false,v=>{e.force_snow=v;},{type:"checkbox"});
    this.field(grid,this.t("Schneeflockengröße","Snowflake size"),e.snow_size||"medium",v=>{e.snow_size=v;},{options:[["small",this.t("Klein","Small")],["medium",this.t("Mittel","Medium")],["large",this.t("Groß","Large")]]});
    this.node("p",this.t("Bewusste Ausnahme von Bewegung reduzieren, nur für diese Card. Ein Schneefallmodus muss ausgewählt sein; Pause bei unsichtbarer Card/Seite bleibt aktiv.","Explicit override of reduced motion for this card only. Select a snowfall mode; offscreen/hidden-page pausing stays enabled."),box,"muted");
    for(const [key,de,en,defaultValue,min,max]of [
      ["background_transparency","Hintergrund: Transparenz (%)","Background: transparency (%)",40,0,100],
      ["background_size","Hintergrund: Größe (%)","Background: size (%)",100,50,200],
      ["background_x","Hintergrund: Position X (%)","Background: X position (%)",50,0,100],
      ["background_y","Hintergrund: Position Y (%)","Background: Y position (%)",50,0,100],
      ["decoration_transparency","Dekoration: Transparenz (%)","Decoration: transparency (%)",30,0,100],
      ["decoration_size","Dekoration: Breite (% der Card)","Decoration: width (% of card)",30,5,100],
      ["decoration_x","Dekoration: Position X (%)","Decoration: X position (%)",80,0,100],
      ["decoration_y","Dekoration: Position Y (%)","Decoration: Y position (%)",100,0,100],
      ["darkness","Abdunklung (%)","Darkening (%)",25,0,90],["snow_count","Anzahl Schneeflocken","Snowflake count",12,6,40]]){
      const input=this.field(grid,this.t(de,en),e[key]??defaultValue,v=>{e[key]=v===""?null:Number(v);},{type:"number"});input.min=min;input.max=max;input.step=1;input.style.maxWidth="145px";
    }
    this.node("p",this.t("Position 0/0 = links oben, 100/100 = rechts unten. Hintergrund wird flächig zugeschnitten; Dekoration proportional eingepasst. Schneefall pausiert außerhalb des sichtbaren Bereichs und berücksichtigt reduzierte Bewegung.","Position 0/0 = top left, 100/100 = bottom right. Background fills/crops; decoration preserves its aspect ratio. Snowfall pauses offscreen and respects reduced motion."),box,"muted");
  }
  async readEffectFiles(){const result=await this.request(`images?folder=${encodeURIComponent(this.config.effects.folder)}`);this._effectFiles=result.files;this.render();}
  imageURL(file){return (this.config.image_folder||"/local/weihnachtssteuerung/bilder").replace(/\/$/,"")+"/"+encodeURIComponent(file);}
  async readFiles(){const result=await this.request(`images?folder=${encodeURIComponent(this.config.image_folder||"/local/weihnachtssteuerung/bilder")}`);this._files=result.files;this.render();}
  async save(){
    if(this._saving)return;
    this._saving=true;
    const button=this.shadowRoot.querySelector("[data-save]");if(button)button.disabled=true;
    try{
    this.status(this.t("Wird gespeichert …","Saving …"));
    const result=await this.request("editor",{method:"POST",body:JSON.stringify({entry_id:this._entry.entry_id,config:this.config})});
    if(result.entry_id)this._entry.entry_id=result.entry_id;
    this._dirty=false;await this.load();this.status(this.t("Gespeichert. Zeitpläne und Card werden aktualisiert.","Saved. Schedules and card are updating."));
    }catch(error){
      this.status(this.t("Nicht gespeichert: ","Not saved: ")+error.message,true);
      return false;
    }finally{
      this._saving=false;
      const current=this.shadowRoot.querySelector("[data-save]");if(current)current.disabled=false;
    }
    return true;
  }
}
if(!customElements.get("festtags-card-editor"))customElements.define("festtags-card-editor",FesttagsCardEditor);
