import { uiText } from "./localization.js";
import { copyText } from "./clipboard.js";
import { favoritesKey, normalizeFavorites } from "./color-favorites.js";

export function hsvHex(hue, saturation, value) {
  const h = ((hue % 360) + 360) % 360 / 60;
  const c = value * saturation, x = c * (1 - Math.abs(h % 2 - 1)), m = value - c;
  const rgb = h < 1 ? [c,x,0] : h < 2 ? [x,c,0] : h < 3 ? [0,c,x] : h < 4 ? [0,x,c] : h < 5 ? [x,0,c] : [c,0,x];
  return "#" + rgb.map(channel => Math.round((channel + m) * 255).toString(16).padStart(2,"0")).join("");
}

export function hexHsv(hex) {
  const rgb = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16)/255);
  const [r,g,b] = rgb, max = Math.max(...rgb), delta = max - Math.min(...rgb);
  const hue = !delta ? 0 : max === r ? 60 * ((g-b)/delta % 6) : max === g ? 60 * ((b-r)/delta+2) : 60 * ((r-g)/delta+4);
  return { hue: (hue+360)%360, saturation: max ? delta/max : 0, value: max };
}

export function nearestColor(hex, names) {
  const rgb = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16));
  let best = null, distance = Infinity;
  for (const item of names) {
    const difference = [1,3,5].reduce((sum,index,channel) => sum + (rgb[channel]-parseInt(item.hex.slice(index,index+2),16)) ** 2, 0);
    if (difference < distance) { best = item; distance = difference; }
    if (!difference) break;
  }
  return best ? { ...best, exact: distance === 0 } : null;
}

let dialog, namesPromise;
export async function openColorPicker(initial = "#29c8b5") {
  if (!dialog) {
    dialog = document.createElement("dialog"); dialog.className = "studio-dialog color-picker-dialog";
    dialog.innerHTML = `<h2>${uiText("Colorpicker")}</h2>
      <p>${uiText("Farbe wählen und HEX oder Farbnamen kopieren. Farbnamen sind keine CSS-Farbwerte.")}</p>
      <div class="cp-tabs" role="tablist">
        <button id="cp-picker-tab" role="tab" aria-selected="true" aria-controls="cp-picker-panel" type="button">${uiText("Colorpicker")}</button>
        <button id="cp-favorites-tab" role="tab" aria-selected="false" aria-controls="cp-favorites-panel" type="button">${uiText("Favoriten")}</button>
      </div>
      <section id="cp-picker-panel" role="tabpanel" aria-labelledby="cp-picker-tab"><div class="color-picker-body"><div>
        <canvas width="256" height="256" tabindex="0" role="slider" aria-label="${uiText("Farbkreis")}" aria-valuemin="0" aria-valuemax="360"></canvas>
        <label>${uiText("Helligkeit")}<input class="cp-brightness" type="range" min="0" max="100" value="100"></label>
      </div><div class="color-picker-fields">
        <div class="cp-swatch" aria-hidden="true"></div>
        <label>HEX<input class="cp-hex" maxlength="7" pattern="#[0-9a-fA-F]{6}" spellcheck="false"></label>
        <label>${uiText("Ausgabe")}<select class="cp-format"><option value="hex">HEX</option><option value="name">${uiText("Farbname")}</option></select></label>
        <output class="cp-name"></output><small class="cp-match"></small>
        <button class="cp-copy primary" type="button">${uiText("Kopieren")}</button>
        <output class="cp-full" role="status"></output>
        <button class="cp-save-favorite" type="button">${uiText("Als Favorit speichern")}</button>
        <output class="cp-status" role="status" aria-live="polite"></output>
      </div></div></section>
      <section id="cp-favorites-panel" role="tabpanel" aria-labelledby="cp-favorites-tab" hidden>
        <p class="cp-count"></p><button class="cp-migrate" type="button" hidden>${uiText("Lokale Favoriten übernehmen")}</button><div class="cp-favorites-list"></div>
        <output class="cp-favorites-status" role="status" aria-live="polite"></output>
      </section>
      <p class="property-hint">Color names: <a href="https://github.com/meodai/color-names" target="_blank" rel="noopener">David Aerne / meodai</a> (MIT).
      <a href="color-names-LICENSE.txt" target="_blank" rel="noopener">${uiText("Lizenz")}</a></p>
      <div class="dialog-actions"><button class="cp-close" type="button">${uiText("Schließen")}</button></div>`;
    document.body.append(dialog);
  }
  if (dialog.open) return;
  const $ = selector => dialog.querySelector(selector);
  const canvas = $("canvas"), ctx = canvas.getContext("2d");
  const hex = $(".cp-hex"), brightness = $(".cp-brightness"), copy = $(".cp-copy");
  let hsv = hexHsv(initial), color = initial, nearest = null, names = [];
  let favorites = [], localFavorites = [], canEdit = false, busy = false;
  try { localFavorites = normalizeFavorites(JSON.parse(localStorage.getItem(favoritesKey) || "[]")); }
  catch { /* Shared favorites do not depend on browser storage. */ }
  const selectTab = favoriteTab => {
    $("#cp-picker-panel").hidden = favoriteTab;
    $("#cp-favorites-panel").hidden = !favoriteTab;
    $("#cp-picker-tab").setAttribute("aria-selected", String(!favoriteTab));
    $("#cp-favorites-tab").setAttribute("aria-selected", String(favoriteTab));
  };
  $("#cp-picker-tab").onclick = () => selectTab(false);
  $("#cp-favorites-tab").onclick = () => { selectTab(true); loadFavorites(); };
  selectTab(false);
  const favoriteState = () => {
    $(".cp-full").textContent = favorites.length === 15 ? uiText("Favoriten voll") : "";
    $(".cp-save-favorite").disabled = !canEdit || busy || favorites.length === 15 || favorites.includes(color);
    $(".cp-migrate").hidden = !canEdit || !localFavorites.length;
    $(".cp-migrate").disabled = busy || favorites.length === 15;
  };
  const requestFavorites = async request => {
    const response = await fetch("api/color-favorites", request ? {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request)
    } : { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw Error(uiText(data.error || "Favoriten konnten nicht geladen werden."));
    favorites = normalizeFavorites(data.favorites); canEdit = true;
    renderFavorites(); favoriteState();
  };
  const loadFavorites = async () => {
    try { await requestFavorites(); $(".cp-favorites-status").textContent = ""; }
    catch (error) { canEdit = false; favorites = []; renderFavorites(); favoriteState(); $(".cp-favorites-status").textContent = error.message; }
  };
  const saveFavorites = async request => {
    if (!canEdit || busy) return false;
    busy = true; favoriteState(); renderFavorites();
    try { await requestFavorites(request); return true; }
    catch (error) { $(".cp-status").textContent = $(".cp-favorites-status").textContent = error.message; return false; }
    finally { busy = false; favoriteState(); renderFavorites(); }
  };
  const renderFavorites = () => {
    $(".cp-count").textContent = `${favorites.length} / 15`;
    const list = $(".cp-favorites-list"); list.replaceChildren();
    favorites.forEach((hex, index) => {
      const match = nearestColor(hex, names);
      const row = document.createElement("div"); row.className = "cp-favorite-row";
      const choose = document.createElement("button"); choose.type = "button"; choose.className = "cp-favorite-choose";
      const swatch = document.createElement("span"); swatch.className = "cp-favorite-swatch"; swatch.style.background = hex;
      const label = document.createElement("span"); label.textContent = `${index + 1}. ${hex}${match ? " · " + match.name : ""}`;
      choose.append(swatch, label);
      choose.onclick = () => { hsv = hexHsv(hex); update(); selectTab(false); };
      const iconButton = (icon, title) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "cp-favorite-action";
        button.title = title; button.setAttribute("aria-label", title);
        const image = document.createElement("img"); image.src = `icons/${icon}.svg`; image.alt = ""; button.append(image);
        return button;
      };
      const copyHex = iconButton("copy-clip", `HEX ${uiText("Kopieren")}: ${hex}`);
      copyHex.onclick = async () => {
        try { await copyText(hex, dialog); $(".cp-favorites-status").textContent = uiText("Kopiert") + ": " + hex; }
        catch { $(".cp-favorites-status").textContent = uiText("Kopieren nicht verfügbar. Ausgabe markieren und manuell kopieren."); }
      };
      const remove = iconButton("trash", `${uiText("Favorit löschen")}: ${hex}`);
      remove.disabled = busy || !canEdit;
      remove.setAttribute("aria-label", `${uiText("Favorit löschen")}: ${hex}`);
      remove.onclick = async () => { if (await saveFavorites({ action: "delete", hex })) $(".cp-favorites-status").textContent = uiText("Favorit gelöscht"); };
      row.append(choose, copyHex, remove); list.append(row);
    });
  };
  const draw = () => {
    const pixels = ctx.createImageData(256,256);
    for (let y=0;y<256;y++) for (let x=0;x<256;x++) {
      const dx=x-128, dy=y-128, saturation=Math.hypot(dx,dy)/124;
      if (saturation>1) continue;
      const value=hsvHex(Math.atan2(dy,dx)*180/Math.PI,saturation,hsv.value);
      const offset=(y*256+x)*4;
      [1,3,5].forEach((index,channel) => { pixels.data[offset+channel]=parseInt(value.slice(index,index+2),16); });
      pixels.data[offset+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const angle=hsv.hue*Math.PI/180;
    ctx.beginPath(); ctx.arc(128+124*hsv.saturation*Math.cos(angle),128+124*hsv.saturation*Math.sin(angle),5,0,2*Math.PI);
    ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.stroke(); ctx.strokeStyle="#111"; ctx.lineWidth=1; ctx.stroke();
    canvas.setAttribute("aria-valuenow", String(Math.round(hsv.hue)));
    canvas.setAttribute("aria-valuetext", color);
  };
  const update = (redraw=true) => {
    color=hsvHex(hsv.hue,hsv.saturation,hsv.value); hex.value=color; brightness.value=Math.round(hsv.value*100);
    $(".cp-swatch").style.background=color;
    nearest=nearestColor(color,names);
    $(".cp-name").textContent=nearest?.name || "";
    $(".cp-match").textContent=nearest ? uiText(nearest.exact ? "Exakter Farbname" : "Nächster Farbname") + " · " + nearest.hex : "";
    $(".cp-status").textContent="";
    favoriteState();
    if (redraw) draw();
  };
  const pick = event => {
    const rect=canvas.getBoundingClientRect(), dx=(event.clientX-rect.left)*256/rect.width-128, dy=(event.clientY-rect.top)*256/rect.height-128;
    hsv.hue=(Math.atan2(dy,dx)*180/Math.PI+360)%360; hsv.saturation=Math.min(1,Math.hypot(dx,dy)/124); update();
  };
  canvas.onpointerdown = event => { canvas.setPointerCapture(event.pointerId); pick(event); };
  canvas.onpointermove = event => { if (canvas.hasPointerCapture(event.pointerId)) pick(event); };
  canvas.onkeydown = event => {
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    if (event.key==="ArrowLeft" || event.key==="ArrowRight") hsv.hue=(hsv.hue+(event.key==="ArrowLeft" ? -1 : 1)+360)%360;
    else hsv.saturation=Math.max(0,Math.min(1,hsv.saturation+(event.key==="ArrowUp" ? .01 : -.01)));
    update();
  };
  brightness.oninput=()=> { hsv.value=Number(brightness.value)/100; update(); };
  hex.oninput=()=> { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { hsv=hexHsv(hex.value); update(); } };
  copy.onclick=async()=> {
    const output=$(".cp-format").value==="name" ? nearest?.name : color;
    if (!output) return;
    try { await copyText(output, dialog); $(".cp-status").textContent=uiText("Kopiert"); }
    catch { $(".cp-status").textContent=uiText("Kopieren nicht verfügbar. Ausgabe markieren und manuell kopieren."); }
  };
  $(".cp-save-favorite").onclick = async () => {
    const selected = color;
    if (await saveFavorites({ action: "add", hex: selected })) $(".cp-status").textContent = uiText(favorites.includes(selected) ? "Favorit gespeichert" : "Favoriten voll");
  };
  $(".cp-migrate").onclick = async () => {
    if (await saveFavorites({ action: "merge", colors: localFavorites })) {
      localFavorites = localFavorites.filter(value => !favorites.includes(value));
      try { localStorage.setItem(favoritesKey, JSON.stringify(localFavorites)); } catch { /* Keep original local copy if storage is unavailable. */ }
      favoriteState();
      $(".cp-favorites-status").textContent = uiText(localFavorites.length ? "Favoriten voll" : "Favorit gespeichert");
    }
  };
  $(".cp-close").onclick=()=>dialog.close();
  copy.disabled=true; update(); renderFavorites(); dialog.showModal();
  loadFavorites();
  try {
    namesPromise ??= fetch("color-names.json").then(response => { if (!response.ok) throw Error("Color names unavailable"); return response.json(); });
    names=await namesPromise; copy.disabled=false; update(false); renderFavorites();
  } catch {
    namesPromise=null; copy.disabled=false; $(".cp-format").value="hex";
    $(".cp-status").textContent=uiText("Farbnamen konnten nicht geladen werden. HEX bleibt verfügbar.");
  }
}
