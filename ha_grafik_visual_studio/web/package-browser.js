import { uiText } from "./localization.js";

export function compareVersions(left, right) {
  const a = String(left).split(".").map(Number), b = String(right).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

const warning = "Externe Pakete installierst du auf eigenes Risiko. Prüfe Quelle, Lizenz und Inhalt. Sichere dein Projekt vor der Installation.";
export function packageIcon(manifest, kind) {
  const image = document.createElement("img");
  image.className = "settings-package-image";
  image.src = manifest?.iconData || (kind === "widget" ? "icons/view-grid.svg" : "icons/toolbox.svg");
  image.alt = "";
  return image;
}
function element(tag, text = "", className = "") {
  const node = document.createElement(tag); node.textContent = uiText(text); node.className = className; return node;
}
function githubAlert() {
  const icon = document.createElement("img");
  icon.src = "icons/alert.svg";
  icon.className = "package-github-alert";
  icon.alt = "";
  return icon;
}
async function responseJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || uiText("Katalog oder Download ist derzeit nicht erreichbar."));
  return result;
}

export function mountPackageBrowser(kind, { installedPackages, install, version }) {
  const prefix = kind === "widget" ? "widget" : "tool";
  const panel = document.querySelector(`#settings-panel-${kind === "widget" ? "widgets" : "tools"}`);
  const local = panel.querySelector(".settings-package-install");
  const host = element("div", "", "package-source-browser");
  const sources = element("div", "", "package-source-tabs");
  const remote = element("div", "", "package-source-content"); remote.hidden = true;
  const notice = element("p", warning, "package-risk-notice");
  const localNotice = element("p", warning, "property-hint");
  const acceptance = element("label", "", "settings-check");
  const consent = document.createElement("input"); consent.type = "checkbox";
  const clearConsentError = () => {
    acceptance.classList.remove("package-consent-error");
    consent.removeAttribute("aria-invalid");
  };
  consent.addEventListener("change", () => {
    if (!consent.checked) return;
    clearConsentError();
    if (message.textContent === uiText("Bitte zuerst das Installationsrisiko bestätigen.")) message.textContent = "";
  });
  acceptance.append(consent, element("span", "Ich habe den Hinweis gelesen und akzeptiere das Installationsrisiko."));
  const message = document.querySelector(`#${prefix}-package-message`);
  const buttons = new Map(); let generation = 0;
  const load = async source => {
    const requestId = ++generation;
    for (const [id, button] of buttons) button.setAttribute("aria-pressed", String(id === source));
    local.hidden = source !== "local"; remote.hidden = source === "local"; remote.replaceChildren();
    localNotice.hidden = source !== "local";
    consent.checked = false;
    clearConsentError();
    if (source === "local") return;
    notice.replaceChildren(...(source === "github" ? [githubAlert()] : []), document.createTextNode(uiText(warning)));
    remote.append(notice, acceptance);
    if (source === "github") {
      const label = element("label", "Direkter GitHub-Dateilink (.wg / .tp)");
      const input = document.createElement("input"); input.type = "url"; input.placeholder = `https://github.com/…/blob/…/paket.${kind === "widget" ? "wg" : "tp"}`; label.append(input);
      const button = element("button", "Installieren"); button.type = "button";
      button.onclick = () => void download(input.value.trim(), "", button);
      remote.append(label, button); return;
    }
    const reload = element("button", "Katalog aktualisieren"); reload.type = "button"; reload.onclick = () => void load("catalog"); remote.append(reload);
    const list = element("div", "", "package-catalog-list"); remote.append(list);
    message.textContent = uiText("Katalog wird geladen …");
    try {
      const [catalog, installed] = await Promise.all([responseJson("api/package-catalog"), installedPackages()]);
      if (generation !== requestId) return;
      const entries = catalog.packages.filter(item => item.kind === kind);
      for (const item of entries) {
        const row = element("article", "", "package-catalog-entry");
        const current = installed.find(manifest => manifest.id === item.id);
        const heading = element("div", "", "package-card-heading");
        heading.append(packageIcon(current, kind), element("strong", item.name));
        row.append(heading, element("p", item.description, "property-hint"));
        const sameOrNewer = current && compareVersions(current.version, item.version) >= 0;
        const unsupported = item.minimum_studio_version && compareVersions(version, item.minimum_studio_version) < 0;
        row.append(element("p", `${item.id} · ${item.version} · ${item.license}`, "settings-package-meta"));
        row.append(element("p", current ? `${uiText("Installiert")}: ${current.version}` : "Nicht installiert", "settings-package-meta"));
        if (item.minimum_studio_version) row.append(element("p", `${uiText("Studio ab")}: ${item.minimum_studio_version}`, "settings-package-meta"));
        if (["ugso.widget-test", "ugso.tools-test"].includes(item.id)) row.append(element("p", "Dies sind reine Testpakete, um die Funktionen kennenzulernen.", "package-test-notice"));
        const button = element("button", sameOrNewer ? "Installiert" : current ? "Aktualisieren" : "Installieren"); button.type = "button"; button.disabled = Boolean(sameOrNewer || unsupported);
        button.onclick = () => void download(item.download_url, item.sha256, button, item);
        row.append(button); list.append(row);
      }
      if (!entries.length) list.append(element("p", "Keine passenden Pakete im Katalog."));
      const link = element("a", "Katalog und Zusatztools im Browser öffnen");
      const destination = new URL(catalog.catalog_url);
      if (!["https:", "http:"].includes(destination.protocol)) throw new Error("Ungültiger Katalog-Link.");
      destination.searchParams.set("kind", "helper"); link.href = destination.href; link.target = "_blank"; link.rel = "noopener noreferrer"; remote.append(link);
      message.textContent = "";
    } catch (error) { if (generation === requestId) message.textContent = error.message; }
  };
  async function download(url, sha256, button, expected = null) {
    if (!consent.checked) {
      acceptance.classList.add("package-consent-error");
      consent.setAttribute("aria-invalid", "true");
      message.textContent = uiText("Bitte zuerst das Installationsrisiko bestätigen.");
      acceptance.scrollIntoView({ block: "center" });
      consent.focus({ preventScroll: true });
      return;
    }
    button.disabled = true;
    message.textContent = uiText("Paket wird heruntergeladen und geprüft …");
    try {
      const query = new URLSearchParams({ url, kind, sha256 });
      const response = await fetch(`api/package-download?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error);
      await install(kind, await response.blob(), expected, true);
      message.textContent = uiText("Paket installiert. Einstellungen wurden aktualisiert.");
    } catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
  }
  for (const [source, text] of [["local", "Lokal"], ["catalog", "Katalog"], ["github", "GitHub"]]) {
    const button = element("button", text); button.type = "button"; button.setAttribute("aria-pressed", String(source === "local")); button.onclick = () => void load(source); buttons.set(source, button); sources.append(button);
    if (source === "github") button.prepend(githubAlert());
  }
  host.append(remote); panel.insertBefore(host, local);
  panel.insertBefore(sources, host);
  panel.insertBefore(localNotice, local);
  return {
    open: () => load("catalog"),
    refresh: async () => { if (buttons.get("catalog").getAttribute("aria-pressed") === "true") await load("catalog"); },
  };
}
