"""Independent HA -> external MQTT client, with explicit command permissions."""

import json
import logging
import os
import queue
import re
import signal
import ssl
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import NamedTemporaryFile

import paho.mqtt.client as mqtt

LOG = logging.getLogger("mqtt-client")
ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
ATTRIBUTE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]*$")
TOGGLE_COMMAND_DOMAINS = {"switch", "light", "input_boolean", "fan"}
VALUE_COMMAND_DOMAINS = {"input_number", "number", "input_select", "select", "input_text", "text"}
PRESS_COMMAND_DOMAINS = {"button", "input_button"}
COMMAND_DOMAINS = TOGGLE_COMMAND_DOMAINS | VALUE_COMMAND_DOMAINS | PRESS_COMMAND_DOMAINS
OPTIONS_PATH = Path(os.environ.get("MQTT_CLIENT_OPTIONS", "/data/options.json"))
INGRESS_PORT = int(os.environ.get("MQTT_CLIENT_INGRESS_PORT", "8099"))
APP_VERSION = "0.1.9"
DEVICE_SUFFIXES = (
    "Energieeinspeisung",
    "Last Response Time",
    "Signal Strength",
    "Link Quality",
    "Failed Pings",
    "Neu starten",
    "Gesamtenergie",
    "Stromstärke",
    "Überhitzung",
    "Überspannung",
    "Überstrom",
    "Überlast",
    "Temperatur",
    "Feuchtigkeit",
    "Spannung",
    "Leistung",
    "Batterie",
    "Firmware",
    "Uptime",
    "Status",
    "Energie",
    "Energy",
    "Power",
    "Voltage",
    "Current",
    "Battery",
    "Humidity",
    "RSSI",
    "Signal",
    "Switch",
    "Schalter",
    "Update",
)


def ascii_slug_text(value):
    text = str(value).casefold()
    replacements = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}
    for source, target in replacements.items():
        text = text.replace(source, target)
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


DEVICE_OBJECT_SUFFIXES = tuple(f"_{ascii_slug_text(suffix)}" for suffix in DEVICE_SUFFIXES)


INDEX_HTML = """<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MQTT-Client</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: var(--primary-background-color, #111827); color: var(--primary-text-color, #f9fafb); }
    main { max-width: 1120px; margin: 0 auto; padding: 24px 16px 32px; }
    h1 { font-size: 1.35rem; margin: 0 0 18px; font-weight: 650; }
    h2 { font-size: 1rem; margin: 0 0 10px; font-weight: 650; }
    form, .panel { border: 1px solid rgba(148, 163, 184, .35); border-radius: 8px; padding: 14px; background: var(--ha-card-background, rgba(15, 23, 42, .38)); }
    form { display: grid; gap: 14px; margin-bottom: 16px; }
    label { display: grid; gap: 6px; font-size: .93rem; }
    input { box-sizing: border-box; width: 100%; border: 1px solid rgba(148, 163, 184, .55); border-radius: 8px; padding: 11px 12px; font: inherit; background: rgba(15, 23, 42, .18); color: inherit; }
    input:focus { outline: 2px solid #03a9f4; outline-offset: 1px; }
    .row { display: grid; grid-template-columns: 1fr 120px; gap: 12px; }
    .status { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; font-weight: 650; }
    .dot { width: 14px; height: 14px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, .18); }
    .status.connected .dot { background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, .18); }
    .hint, .message, .sub { color: var(--secondary-text-color, #94a3b8); font-size: .85rem; }
    .hint { margin: -4px 0 2px; }
    button { border: 0; border-radius: 8px; padding: 10px 14px; font: inherit; font-weight: 650; color: #fff; background: #03a9f4; cursor: pointer; }
    button.secondary { color: inherit; background: rgba(148, 163, 184, .2); }
    button.danger { background: #ef4444; }
    button:disabled { opacity: .55; cursor: default; }
    .message { min-height: 1.35em; }
    .entity-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; }
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .toolbar input { padding: 9px 10px; }
    .list { display: grid; gap: 8px; max-height: 460px; overflow: auto; padding-right: 4px; }
    .device { width: 100%; text-align: left; color: inherit; background: rgba(148, 163, 184, .12); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; }
    .device:hover { background: rgba(3, 169, 244, .18); }
    .devicePopup { width: min(920px, calc(100vw - 28px)); }
    .deviceSections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; max-height: 62vh; overflow: auto; }
    .deviceSection { border: 1px solid rgba(148, 163, 184, .25); border-radius: 10px; padding: 12px; background: rgba(148, 163, 184, .08); }
    .deviceSection h3 { margin: 0 0 10px; font-size: .98rem; }
    .deviceRows { display: grid; gap: 6px; }
    .entity, .selected { width: 100%; text-align: left; color: inherit; background: rgba(148, 163, 184, .12); display: grid; gap: 2px; }
    .entity:hover, .selected:hover { background: rgba(3, 169, 244, .18); }
    .selected { grid-template-columns: 1fr auto; align-items: center; }
    .name { font-weight: 650; overflow-wrap: anywhere; }
    .meta { color: var(--secondary-text-color, #94a3b8); font-size: .78rem; overflow-wrap: anywhere; }
    .check.bidirectional { display: none; }
    .check.bidirectional.visible { display: flex; }
    dialog { width: min(560px, calc(100vw - 28px)); border: 1px solid rgba(148, 163, 184, .4); border-radius: 8px; padding: 0; background: var(--ha-card-background, #111827); color: inherit; }
    dialog::backdrop { background: rgba(0, 0, 0, .45); }
    .dialog-body { display: grid; gap: 14px; padding: 18px; }
    .checks { display: grid; gap: 8px; max-height: 260px; overflow: auto; }
    .check { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; background: rgba(148, 163, 184, .12); }
    .check input { width: auto; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 820px) { .entity-grid, .row, .deviceSections { grid-template-columns: 1fr; } main { padding-top: 18px; } }
  </style>
</head>
<body>
  <main>
    <h1>MQTT-Client</h1>
    <div id="status" class="status"><span class="dot"></span><span>Keine Verbindung</span></div>
    <form id="form" autocomplete="off">
      <div class="row">
        <label>IP oder Hostname
          <input id="broker_host" name="broker_host" required placeholder="192.168.1.20">
        </label>
        <label>Port
          <input id="broker_port" name="broker_port" type="number" min="1" max="65535" value="1883" required>
        </label>
      </div>
      <label>Username
        <input id="username" name="username" autocomplete="username">
      </label>
      <label>Passwort
        <input id="password" name="password" type="password" autocomplete="new-password" placeholder="unverändert lassen">
      </label>
      <p class="hint">Standardport für den ioBroker-MQTT-Adapter: 1883.</p>
      <button id="save" type="submit">Speichern und verbinden</button>
      <div id="message" class="message"></div>
    </form>

    <section class="entity-grid">
      <div class="panel">
        <h2>Geräte</h2>
        <div class="toolbar">
          <input id="filter" type="search" placeholder="Gerät oder Entität suchen">
          <button id="reload" class="secondary" type="button">Neu laden</button>
        </div>
        <div id="entityList" class="list"></div>
      </div>
      <div class="panel">
        <h2>Übertragung</h2>
        <p class="sub">Ausgewählte States und Attribute werden an MQTT gesendet.</p>
        <div id="selectedList" class="list"></div>
        <div id="selectionMessage" class="message"></div>
      </div>
    </section>
  </main>

  <dialog id="deviceDialog" class="devicePopup">
    <div class="dialog-body">
      <div>
        <h2 id="deviceDialogTitle">Gerät</h2>
        <div id="deviceDialogMeta" class="meta"></div>
      </div>
      <label class="check"><input id="deviceSelectAll" type="checkbox"> Alle States dieses Geräts übertragen</label>
      <div id="deviceSections" class="deviceSections"></div>
      <div class="actions">
        <button id="closeDeviceDialog" class="secondary" type="button">Schließen</button>
      </div>
    </div>
  </dialog>

  <dialog id="entityDialog">
    <div class="dialog-body">
      <div>
        <h2 id="dialogTitle">Entität</h2>
        <div id="dialogMeta" class="meta"></div>
      </div>
      <label class="check"><input id="stateCheck" type="checkbox"> State übertragen</label>
      <label id="commandRow" class="check bidirectional"><input id="commandCheck" type="checkbox"> Bidirektional / Werte schreiben</label>
      <div>
        <h2>Attribute</h2>
        <div id="attributeList" class="checks"></div>
      </div>
      <div class="actions">
        <button id="removeEntity" class="danger" type="button">Entfernen</button>
        <button id="closeDialog" class="secondary" type="button">Abbrechen</button>
        <button id="saveEntity" type="button">Übernehmen</button>
      </div>
    </div>
  </dialog>

  <script>
    const form = document.getElementById('form');
    const statusBox = document.getElementById('status');
    const message = document.getElementById('message');
    const save = document.getElementById('save');
    const filter = document.getElementById('filter');
    const entityList = document.getElementById('entityList');
    const selectedList = document.getElementById('selectedList');
    const selectionMessage = document.getElementById('selectionMessage');
    const deviceDialog = document.getElementById('deviceDialog');
    const deviceSections = document.getElementById('deviceSections');
    const deviceSelectAll = document.getElementById('deviceSelectAll');
    const dialog = document.getElementById('entityDialog');
    const stateCheck = document.getElementById('stateCheck');
    const commandRow = document.getElementById('commandRow');
    const commandCheck = document.getElementById('commandCheck');
    const attributeList = document.getElementById('attributeList');
    let catalog = [];
    let devices = [];
    let selectedStates = new Set();
    let selectedAttributes = new Set();
    let commandEntities = new Set();
    let activeEntity = null;
    let activeDevice = null;
    const commandDomains = new Set(['switch', 'light', 'input_boolean', 'fan', 'input_number', 'number', 'input_select', 'select', 'input_text', 'text', 'button', 'input_button']);

    function setStatus(data) {
      statusBox.classList.toggle('connected', Boolean(data.connected));
      statusBox.querySelector('span:last-child').textContent = data.text || 'Keine Verbindung';
    }

    function attrKey(entity, attr) {
      return `${entity}:${attr}`;
    }

    function entityLabel(item) {
      return item.name || item.entity_id;
    }

    function deviceMatches(device, term) {
      if (!term) return true;
      if ((device.name || '').toLowerCase().includes(term)) return true;
      return (device.entities || []).some((item) => {
        return entityLabel(item).toLowerCase().includes(term) || item.entity_id.toLowerCase().includes(term);
      });
    }

    function isCommandEntity(entityId) {
      return commandDomains.has(entityId.split('.')[0]);
    }

    function entityDomain(item) {
      return item.entity_id.split('.')[0];
    }

    function entitySection(item) {
      const domain = entityDomain(item);
      const label = `${entityLabel(item)} ${item.entity_id}`.toLowerCase();
      if (label.match(/diagnose|diagnostic|überhitz|overheat|überlast|overload|failed|ping|response|rssi|signal|uptime|status/)) return 'Diagnose';
      if (['update', 'button', 'input_button'].includes(domain) || label.match(/firmware|konfiguration|configuration|restart|neu starten/)) return 'Konfiguration';
      if (['switch', 'light', 'input_boolean', 'fan', 'cover', 'lock', 'input_number', 'number', 'input_select', 'select', 'input_text', 'text'].includes(domain)) return 'Steuerung';
      return 'Sensoren';
    }

    function deviceCountLabel(device) {
      const count = (device.entities || []).length;
      return count === 1 ? '1 Entität' : `${count} Entitäten`;
    }

    function selectedSummary(entityId) {
      const attrs = [...selectedAttributes].filter((entry) => entry.startsWith(`${entityId}:`));
      const parts = [];
      if (selectedStates.has(entityId)) parts.push('State');
      if (attrs.length) parts.push(`${attrs.length} Attribute`);
      if (commandEntities.has(entityId)) parts.push('bidirektional');
      return parts.length ? ` · ${parts.join(' · ')}` : '';
    }

    function deviceStateEntities(device) {
      return (device?.entities || []).map((item) => item.entity_id);
    }

    function renderLists() {
      const term = filter.value.trim().toLowerCase();
      entityList.innerHTML = '';
      devices
        .filter((device) => deviceMatches(device, term))
        .forEach((device) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'device';
          button.innerHTML = `<span class="name"></span><span class="meta"></span>`;
          button.querySelector('.name').textContent = device.name || 'Gerät';
          button.querySelector('.meta').textContent = deviceCountLabel(device);
          button.addEventListener('click', () => openDevice(device.id));
          entityList.appendChild(button);
        });
      if (!entityList.children.length) {
        entityList.innerHTML = '<div class="sub">Kein Gerät gefunden.</div>';
      }

      selectedList.innerHTML = '';
      const selectedIds = new Set([...selectedStates, ...[...selectedAttributes].map((entry) => entry.split(':')[0])]);
      [...selectedIds].sort().forEach((entity) => {
        const attrs = [...selectedAttributes].filter((entry) => entry.startsWith(`${entity}:`)).map((entry) => entry.slice(entity.length + 1));
        const item = catalog.find((entry) => entry.entity_id === entity);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'selected';
        button.innerHTML = `<span><span class="name"></span><span class="meta"></span></span><span>Bearbeiten</span>`;
        button.querySelector('.name').textContent = item ? entityLabel(item) : entity;
        const parts = [];
        if (selectedStates.has(entity)) parts.push('State');
        if (attrs.length) parts.push(`${attrs.length} Attribute`);
        if (commandEntities.has(entity)) parts.push('bidirektional');
        button.querySelector('.meta').textContent = parts.join(' · ') || 'Keine Auswahl';
        button.addEventListener('click', () => openEntity(entity));
        selectedList.appendChild(button);
      });
      if (!selectedIds.size) {
        selectedList.innerHTML = '<div class="sub">Noch keine Entität ausgewählt.</div>';
      }
    }

    function openDevice(deviceId) {
      activeDevice = devices.find((device) => device.id === deviceId);
      if (!activeDevice) return;
      if ((activeDevice.entities || []).length === 1) {
        openEntity(activeDevice.entities[0].entity_id);
        return;
      }
      document.getElementById('deviceDialogTitle').textContent = activeDevice.name || 'Gerät';
      document.getElementById('deviceDialogMeta').textContent = deviceCountLabel(activeDevice);
      const deviceStates = deviceStateEntities(activeDevice);
      const selectedCount = deviceStates.filter((entity) => selectedStates.has(entity)).length;
      deviceSelectAll.checked = Boolean(deviceStates.length && selectedCount === deviceStates.length);
      deviceSelectAll.indeterminate = Boolean(selectedCount && selectedCount < deviceStates.length);
      deviceSections.innerHTML = '';
      const groups = new Map([['Steuerung', []], ['Sensoren', []], ['Konfiguration', []], ['Diagnose', []]]);
      (activeDevice.entities || []).forEach((item) => groups.get(entitySection(item)).push(item));
      groups.forEach((items, title) => {
        if (!items.length) return;
        const section = document.createElement('section');
        section.className = 'deviceSection';
        section.innerHTML = '<h3></h3><div class="deviceRows"></div>';
        section.querySelector('h3').textContent = title;
        const rows = section.querySelector('.deviceRows');
        items.forEach((item) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'entity';
          button.innerHTML = '<span class="name"></span><span class="meta"></span>';
          button.querySelector('.name').textContent = entityLabel(item);
          button.querySelector('.meta').textContent = `${item.entity_id} · ${item.state} · ${item.iobroker_type} · ${item.attributes.length} Attribute${selectedSummary(item.entity_id)}`;
          button.addEventListener('click', () => {
            deviceDialog.close();
            openEntity(item.entity_id);
          });
          rows.appendChild(button);
        });
        deviceSections.appendChild(section);
      });
      if (!deviceSections.children.length) {
        deviceSections.innerHTML = '<div class="sub">Keine Entitäten gefunden.</div>';
      }
      deviceDialog.showModal();
    }

    function openEntity(entityId) {
      activeEntity = catalog.find((item) => item.entity_id === entityId) || { entity_id: entityId, name: entityId, state: '', attributes: [] };
      document.getElementById('dialogTitle').textContent = entityLabel(activeEntity);
      document.getElementById('dialogMeta').textContent = activeEntity.state ? `${activeEntity.entity_id} · aktueller State: ${activeEntity.state}` : activeEntity.entity_id;
      stateCheck.checked = selectedStates.has(entityId);
      commandCheck.checked = commandEntities.has(entityId);
      commandRow.classList.toggle('visible', isCommandEntity(entityId));
      attributeList.innerHTML = '';
      activeEntity.attributes.forEach((attr) => {
        const label = document.createElement('label');
        label.className = 'check';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = attr;
        input.checked = selectedAttributes.has(attrKey(entityId, attr));
        const span = document.createElement('span');
        span.textContent = attr;
        label.append(input, span);
        attributeList.appendChild(label);
      });
      if (!activeEntity.attributes.length) attributeList.innerHTML = '<div class="sub">Keine Attribute gefunden.</div>';
      dialog.showModal();
    }

    async function saveSelections() {
      selectionMessage.textContent = 'Speichere Auswahl...';
      const response = await fetch('./api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: [...selectedStates], entity_attributes: [...selectedAttributes], command_entities: [...commandEntities] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Auswahl konnte nicht gespeichert werden');
      selectionMessage.textContent = 'Auswahl gespeichert.';
      renderLists();
    }

    async function loadConfig() {
      const response = await fetch('./api/config', { cache: 'no-store' });
      const data = await response.json();
      form.broker_host.value = data.broker_host || '';
      form.broker_port.value = data.broker_port || 1883;
      form.username.value = data.username || '';
      selectedStates = new Set(data.entities || []);
      selectedAttributes = new Set(data.entity_attributes || []);
      commandEntities = new Set(data.command_entities || []);
      setStatus(data.status || {});
      renderLists();
    }

    async function loadEntities() {
      entityList.innerHTML = '<div class="sub">Lade Entitäten...</div>';
      const response = await fetch('./api/entities', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Entitäten konnten nicht geladen werden');
      catalog = data.entities || [];
      devices = data.devices || [{ id: 'all', name: 'Alle Entitäten', entities: catalog }];
      renderLists();
    }

    async function refreshStatus() {
      try {
        const response = await fetch('./api/status', { cache: 'no-store' });
        setStatus(await response.json());
      } catch (error) {
        setStatus({ connected: false, text: 'Keine Verbindung' });
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.disabled = true;
      message.textContent = 'Speichere...';
      const payload = {
        broker_host: form.broker_host.value.trim(),
        broker_port: Number(form.broker_port.value || 1883),
        username: form.username.value.trim()
      };
      if (form.password.value) payload.password = form.password.value;
      try {
        const response = await fetch('./api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
        form.password.value = '';
        message.textContent = 'Gespeichert. Verbindung wird aufgebaut...';
        setStatus(data.status || {});
      } catch (error) {
        message.textContent = error.message;
      } finally {
        save.disabled = false;
      }
    });

    document.getElementById('saveEntity').addEventListener('click', async () => {
      if (!activeEntity) return;
      if (stateCheck.checked) selectedStates.add(activeEntity.entity_id);
      else selectedStates.delete(activeEntity.entity_id);
      if (isCommandEntity(activeEntity.entity_id) && commandCheck.checked) {
        selectedStates.add(activeEntity.entity_id);
        commandEntities.add(activeEntity.entity_id);
      } else {
        commandEntities.delete(activeEntity.entity_id);
      }
      activeEntity.attributes.forEach((attr) => selectedAttributes.delete(attrKey(activeEntity.entity_id, attr)));
      attributeList.querySelectorAll('input:checked').forEach((input) => selectedAttributes.add(attrKey(activeEntity.entity_id, input.value)));
      try {
        await saveSelections();
        dialog.close();
      } catch (error) {
        selectionMessage.textContent = error.message;
      }
    });

    document.getElementById('removeEntity').addEventListener('click', async () => {
      if (!activeEntity) return;
      selectedStates.delete(activeEntity.entity_id);
      commandEntities.delete(activeEntity.entity_id);
      [...selectedAttributes].forEach((entry) => { if (entry.startsWith(`${activeEntity.entity_id}:`)) selectedAttributes.delete(entry); });
      try {
        await saveSelections();
        dialog.close();
      } catch (error) {
        selectionMessage.textContent = error.message;
      }
    });

    document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
    document.getElementById('closeDeviceDialog').addEventListener('click', () => deviceDialog.close());
    deviceSelectAll.addEventListener('change', async () => {
      if (!activeDevice) return;
      deviceStateEntities(activeDevice).forEach((entity) => {
        if (deviceSelectAll.checked) selectedStates.add(entity);
        else {
          selectedStates.delete(entity);
          commandEntities.delete(entity);
        }
      });
      try {
        await saveSelections();
        openDevice(activeDevice.id);
      } catch (error) {
        selectionMessage.textContent = error.message;
      }
    });
    document.getElementById('reload').addEventListener('click', () => loadEntities().catch((error) => entityList.innerHTML = `<div class="sub">${error.message}</div>`));
    filter.addEventListener('input', renderLists);

    loadConfig().catch((error) => message.textContent = error.message || 'Konfiguration konnte nicht geladen werden.');
    loadEntities().catch((error) => entityList.innerHTML = `<div class="sub">${error.message}</div>`);
    setInterval(refreshStatus, 3000);
  </script>
</body>
</html>"""


class RuntimeStatus:
    def __init__(self):
        self.lock = threading.Lock()
        self.connected = False
        self.message = "Keine Verbindung"

    def set_connected(self, connected, message=None):
        with self.lock:
            self.connected = connected
            self.message = message or ("Verbunden" if connected else "Keine Verbindung")

    def snapshot(self):
        with self.lock:
            return {"connected": self.connected, "text": self.message}


@dataclass(frozen=True)
class Config:
    host: str
    port: int
    username: str
    password: str
    tls: bool
    client_id: str
    prefix: str
    interval: int
    entities: tuple
    entity_attributes: tuple
    command_entities: tuple

    @classmethod
    def load(cls, options):
        host = str(options.get("broker_host", "")).strip()
        prefix = str(options.get("topic_prefix", "ha_external")).strip().strip("/")
        client_id = str(options.get("client_id", "ugso-ha-mqtt-client")).strip()
        if not host or any(c in host for c in "/\x00\r\n"):
            raise ValueError("broker_host muss einen Hostnamen oder eine IP enthalten")
        if not prefix or prefix.startswith("$") or any(c in prefix for c in "+#\x00"):
            raise ValueError("topic_prefix darf keine MQTT-Platzhalter enthalten")
        if not client_id or "\x00" in client_id:
            raise ValueError("client_id muss gesetzt sein")
        port = int(options.get("broker_port", 1883))
        interval = int(options.get("poll_interval", 5))
        if not 1 <= port <= 65535 or not 1 <= interval <= 300:
            raise ValueError("Port oder Abfrageintervall liegt außerhalb des erlaubten Bereichs")
        entities = validate_entities(options.get("entities", []), "entities")
        commands = validate_entities(options.get("command_entities", []), "command_entities")
        entity_attributes = validate_entity_attributes(options.get("entity_attributes", []))
        if not set(commands).issubset(entities):
            raise ValueError("command_entities muss eine Teilmenge von entities sein")
        if any(entity.split('.')[0] not in COMMAND_DOMAINS for entity in commands):
            raise ValueError("Befehle sind nur für unterstützte steuerbare Domains erlaubt")
        return cls(host, port, str(options.get("username", "")), str(options.get("password", "")),
                   bool(options.get("tls", False)), client_id, prefix, interval, entities, entity_attributes, commands)

    def topic(self, entity, suffix):
        return f"{self.prefix}/{entity}/{suffix}"


def validate_entities(values, key):
    if not isinstance(values, list) or any(not isinstance(v, str) or not ENTITY.fullmatch(v) for v in values):
        raise ValueError(f"{key} muss eine Liste konkreter Entity-IDs sein")
    return tuple(dict.fromkeys(values))


def validate_entity_attributes(values):
    if not isinstance(values, list):
        raise ValueError("entity_attributes muss eine Liste sein")
    clean = []
    for value in values:
        if not isinstance(value, str) or ":" not in value:
            raise ValueError("entity_attributes muss Werte im Format entity_id:attribut enthalten")
        entity, attribute = value.split(":", 1)
        if not ENTITY.fullmatch(entity) or not ATTRIBUTE.fullmatch(attribute) or any(c in attribute for c in "+#/\x00"):
            raise ValueError("entity_attributes enthält einen ungültigen Wert")
        clean.append(f"{entity}:{attribute}")
    return tuple(dict.fromkeys(clean))


def encode_mqtt_payload(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float, str)):
        return str(value)
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def mqtt_command(entity, payload):
    domain = entity.split(".", 1)[0]
    if domain in TOGGLE_COMMAND_DOMAINS:
        service = {"ON": "turn_on", "OFF": "turn_off"}.get(payload.upper())
        if service is None:
            raise ValueError("nur ON/OFF erlaubt")
        return service
    if domain in {"input_number", "number"}:
        try:
            value = float(payload)
        except ValueError as error:
            raise ValueError("Zahl erwartet") from error
        return ("set_value", {"value": value})
    if domain in {"input_select", "select"}:
        if not payload:
            raise ValueError("Option darf nicht leer sein")
        return ("select_option", {"option": payload})
    if domain in {"input_text", "text"}:
        return ("set_value", {"value": payload})
    if domain in PRESS_COMMAND_DOMAINS:
        if payload and payload.upper() not in {"PRESS", "ON", "TRUE", "1"}:
            raise ValueError("PRESS erwartet")
        return "press"
    raise ValueError("Domain nicht unterstützt")


def _strip_device_suffix(name):
    clean = " ".join(str(name).replace("_", " ").split())
    for suffix in DEVICE_SUFFIXES:
        pattern = re.compile(rf"^(.+?)(?:\s+-|\s+)?\s+{re.escape(suffix)}$", re.IGNORECASE)
        match = pattern.match(clean)
        if match and len(match.group(1).strip()) >= 3:
            return match.group(1).strip(" -_")
    return clean


def _strip_object_suffix(object_id):
    clean = object_id.casefold()
    for suffix in DEVICE_OBJECT_SUFFIXES:
        if clean.endswith(suffix) and len(clean) > len(suffix) + 2:
            return object_id[:-len(suffix)]
    return object_id


def device_name_for_entity(entity_id, name, attributes):
    for key in ("device_name", "device", "device_id"):
        value = attributes.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    friendly = str(name or entity_id)
    base = _strip_device_suffix(friendly)
    if base and base != entity_id:
        return base
    try:
        object_id = entity_id.split(".", 1)[1]
    except IndexError:
        return base or entity_id
    object_id = _strip_object_suffix(object_id)
    return " ".join(part for part in object_id.replace("_", " ").split()).strip() or entity_id


def device_id_for_name(name):
    slug = re.sub(r"[^a-z0-9]+", "_", str(name).casefold()).strip("_")
    return slug or "device"


def mqtt_slug(value):
    return ascii_slug_text(value) or "wert"


def topic_value_name_for_entity(entity_id, name, device_name):
    friendly = " ".join(str(name or entity_id).split())
    device = " ".join(str(device_name or "").split())
    value = friendly
    if device and friendly.casefold().startswith(device.casefold()):
        value = friendly[len(device):].strip(" -_:")
    if not value or value == entity_id:
        try:
            domain, object_id = entity_id.split(".", 1)
        except ValueError:
            return entity_id
        if domain in TOGGLE_COMMAND_DOMAINS:
            return "switch"
        if domain in PRESS_COMMAND_DOMAINS:
            return "button"
        device_slug = mqtt_slug(device)
        object_slug = mqtt_slug(_strip_object_suffix(object_id))
        prefix = f"{device_slug}_"
        if object_slug.startswith(prefix) and len(object_slug) > len(prefix):
            object_slug = object_slug[len(prefix):]
        if not object_slug or object_slug == device_slug:
            return "switch" if domain in TOGGLE_COMMAND_DOMAINS else domain
        return object_slug
    return value


def device_topic_for_entity(entity_id, state_entry):
    attributes = state_entry.get("attributes", {})
    if not isinstance(attributes, dict):
        attributes = {}
    name = attributes.get("friendly_name") or entity_id
    device_name = device_name_for_entity(entity_id, name, attributes)
    value_name = topic_value_name_for_entity(entity_id, name, device_name)
    return f"{mqtt_slug(device_name)}/{mqtt_slug(value_name)}"


def iobroker_mapping(entity_id, state, attributes):
    domain = entity_id.split(".", 1)[0]
    device_class = str(attributes.get("device_class", "")).lower()
    state_value = str(state).lower()
    if device_class == "press" or domain in PRESS_COMMAND_DOMAINS:
        return {"state_type": "press", "iobroker_type": "button"}
    if domain in {"switch", "input_boolean", "binary_sensor"} or state_value in {"on", "off", "true", "false"}:
        return {"state_type": "state_boolean", "iobroker_type": "switch"}
    if domain in {"input_number", "number"}:
        return {"state_type": "state_number", "iobroker_type": "number"}
    if device_class == "text" or domain in {"input_text", "text", "input_select", "select"}:
        return {"state_type": "state", "iobroker_type": "state"}
    try:
        float(str(state))
    except ValueError:
        return {"state_type": "state", "iobroker_type": "state"}
    return {"state_type": "state_number", "iobroker_type": "number"}


class HomeAssistant:
    def __init__(self, token, base_url="http://supervisor/core/api"):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def request(self, path, data=None):
        request = urllib.request.Request(
            f"{self.base_url}/{path}",
            data=None if data is None else json.dumps(data).encode(),
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.load(response)

    def states(self):
        states = self.request("states")
        if not isinstance(states, list):
            raise ValueError("Invalid HA states response")
        return {state["entity_id"]: state["state"] for state in states}

    def full_states(self):
        states = self.request("states")
        if not isinstance(states, list):
            raise ValueError("Invalid HA states response")
        return states

    def command(self, entity, service, data=None):
        payload = {"entity_id": entity}
        if data:
            payload.update(data)
        return self.request(f"services/{entity.split('.')[0]}/{service}", payload)


class Bridge:
    def __init__(self, config, ha, client=None, status=None):
        self.config = config
        self.ha = ha
        self.status = status
        self.connected = threading.Event()
        self.stop = threading.Event()
        self.commands = queue.Queue(maxsize=50)
        self.generation = 0
        self.sent_generation = -1
        self.sent = {}
        self.availability = f"{config.prefix}/availability"
        self.attribute_map = {}
        for entry in config.entity_attributes:
            entity, attribute = entry.split(":", 1)
            self.attribute_map.setdefault(entity, []).append(attribute)
        self.command_topics = {config.topic(entity, "set"): entity for entity in config.command_entities}
        self.subscribed_command_topics = set()
        self.client = client or mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                                            client_id=config.client_id, clean_session=True)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)
        self.client.max_queued_messages_set(100)
        if config.username:
            self.client.username_pw_set(config.username, config.password)
        if config.tls:
            self.client.tls_set_context(ssl.create_default_context())
        self.client.will_set(self.availability, "offline", qos=1, retain=True)

    def topic(self, entity, suffix, state_entry=None):
        if state_entry:
            return f"{self.config.prefix}/{device_topic_for_entity(entity, state_entry)}/{suffix}"
        return self.config.topic(entity, suffix)

    def refresh_command_topics(self, states):
        topics = {self.config.topic(entity, "set"): entity for entity in self.config.command_entities}
        for entity in self.config.command_entities:
            entry = states.get(entity)
            if entry:
                topics[self.topic(entity, "set", entry)] = entity
        self.command_topics = topics
        if self.connected.is_set():
            for topic in sorted(set(topics) - self.subscribed_command_topics):
                self.client.subscribe(topic, qos=0)
                self.subscribed_command_topics.add(topic)

    def on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            LOG.warning("MQTT-Anmeldung fehlgeschlagen: %s", reason_code)
            if self.status:
                self.status.set_connected(False, "Keine Verbindung")
            return
        self.generation += 1
        self.subscribed_command_topics.clear()
        for topic in self.command_topics:
            # QoS 0 avoids replay of QoS 1 command deliveries after reconnect.
            client.subscribe(topic, qos=0)
            self.subscribed_command_topics.add(topic)
        self.connected.set()
        if self.status:
            self.status.set_connected(True, "Verbunden")
        LOG.info("Mit externem MQTT-Broker verbunden")

    def on_disconnect(self, client, userdata, flags, reason_code, properties):
        self.connected.clear()
        if self.status:
            self.status.set_connected(False, "Keine Verbindung")
        LOG.info("MQTT-Verbindung getrennt; automatischer Wiederaufbau aktiv")

    def on_message(self, client, userdata, message):
        entity = self.command_topics.get(message.topic)
        if entity is None or message.retain or len(message.payload) > 256:
            return
        try:
            payload = message.payload.decode("utf-8").strip()
        except UnicodeDecodeError:
            return
        try:
            command = mqtt_command(entity, payload)
        except ValueError as error:
            LOG.warning("Ungültiger Befehl verworfen (%s)", error)
            return
        try:
            self.commands.put_nowait((time.monotonic(), self.generation, entity, command))
        except queue.Full:
            LOG.warning("Befehlswarteschlange voll; Befehl verworfen")

    def publish(self, topic, payload):
        info = self.client.publish(topic, payload, qos=1, retain=True)
        if info.rc != mqtt.MQTT_ERR_SUCCESS:
            raise ConnectionError("MQTT publish failed")
        info.wait_for_publish(timeout=5)
        if not info.is_published():
            raise ConnectionError("MQTT publish acknowledgement timed out")

    def poll(self):
        generation = self.generation
        if generation != self.sent_generation:
            self.sent.clear()
            self.sent_generation = generation
        states = {state["entity_id"]: state for state in self.ha.full_states()}
        self.refresh_command_topics(states)
        polled_entities = sorted(set(self.config.entities) | set(self.attribute_map))
        for entity in polled_entities:
            entry = states.get(entity, {"state": "unavailable", "attributes": {}})
            state = str(entry.get("state", "unavailable"))
            if entity in self.config.entities and self.sent.get(("state", entity)) != state:
                self.publish(self.topic(entity, "state", entry if entity in states else None), state)
                self.sent[("state", entity)] = state
            attributes = entry.get("attributes", {})
            if not isinstance(attributes, dict):
                attributes = {}
            for attribute in self.attribute_map.get(entity, []):
                value = encode_mqtt_payload(attributes.get(attribute, "unavailable"))
                key = ("attribute", entity, attribute)
                if self.sent.get(key) != value:
                    self.publish(self.topic(entity, f"attribute/{attribute}", entry if entity in states else None), value)
                    self.sent[key] = value
        self.publish(self.availability, "online")

    def process_command(self, command):
        created, generation, entity, service = command
        if self.connected.is_set() and generation == self.generation and time.monotonic() - created <= 10:
            if isinstance(service, tuple):
                self.ha.command(entity, service[0], service[1])
            else:
                self.ha.command(entity, service)

    def run(self):
        self.client.connect_async(self.config.host, self.config.port, keepalive=30)
        self.client.loop_start()
        next_poll = 0
        try:
            while not self.stop.is_set():
                if not self.connected.wait(timeout=1):
                    continue
                if time.monotonic() >= next_poll:
                    try:
                        self.poll()
                    except (OSError, ValueError, RuntimeError, KeyError) as error:
                        # Never log HTTP bodies, options, credentials or state payloads.
                        LOG.warning("Zustandsabgleich fehlgeschlagen (%s)", type(error).__name__)
                        try:
                            self.publish(self.availability, "offline")
                        except (OSError, RuntimeError, ValueError):
                            pass
                    next_poll = time.monotonic() + self.config.interval
                try:
                    command = self.commands.get(timeout=min(0.5, max(0, next_poll - time.monotonic())))
                except queue.Empty:
                    continue
                try:
                    self.process_command(command)
                    next_poll = 0
                except (OSError, ValueError) as error:
                    LOG.warning("HA-Befehl fehlgeschlagen (%s); keine Wiederholung", type(error).__name__)
        finally:
            try:
                if self.connected.is_set():
                    self.publish(self.availability, "offline")
            except (OSError, RuntimeError, ValueError):
                pass
            self.client.disconnect()
            self.client.loop_stop()


class AppController:
    def __init__(self, options_path, token, bridge_factory=Bridge):
        self.options_path = Path(options_path)
        self.token = token
        self.bridge_factory = bridge_factory
        self.ha = HomeAssistant(self.token)
        self.lock = threading.Lock()
        self.status = RuntimeStatus()
        self.bridge = None
        self.thread = None

    def read_options(self):
        return json.loads(self.options_path.read_text(encoding="utf-8"))

    def write_options(self, options):
        self.options_path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile("w", encoding="utf-8", dir=self.options_path.parent, delete=False) as handle:
            json.dump(options, handle, indent=2)
            handle.write("\n")
            temp_path = Path(handle.name)
        temp_path.replace(self.options_path)

    def start(self):
        with self.lock:
            try:
                config = Config.load(self.read_options())
            except (OSError, ValueError, TypeError) as error:
                LOG.info("MQTT-Client wartet auf gültige Broker-Konfiguration (%s)", type(error).__name__)
                self.status.set_connected(False, "Keine Verbindung")
                return None
            self._start_locked(config)
            return config

    def stop(self):
        with self.lock:
            self._stop_locked()

    def _start_locked(self, config):
        self.status.set_connected(False, "Keine Verbindung")
        self.bridge = self.bridge_factory(config, self.ha, status=self.status)
        self.thread = threading.Thread(target=self.bridge.run, name="mqtt-bridge", daemon=True)
        self.thread.start()

    def _stop_locked(self):
        if self.bridge:
            self.bridge.stop.set()
        thread = self.thread
        self.bridge = None
        self.thread = None
        if thread and thread.is_alive():
            thread.join(timeout=8)
        self.status.set_connected(False, "Keine Verbindung")

    def public_config(self):
        options = self.read_options()
        return {
            "broker_host": options.get("broker_host", ""),
            "broker_port": options.get("broker_port", 1883),
            "username": options.get("username", ""),
            "has_password": bool(options.get("password")),
            "entities": options.get("entities", []),
            "entity_attributes": options.get("entity_attributes", []),
            "command_entities": options.get("command_entities", []),
            "status": self.status.snapshot(),
        }

    def update_connection(self, payload):
        with self.lock:
            options = self.read_options()
            for key in ("broker_host", "broker_port", "username"):
                if key in payload:
                    options[key] = payload[key]
            if "password" in payload:
                options["password"] = payload["password"]
            config = Config.load(options)
            self.write_options(options)
            self._stop_locked()
            self._start_locked(config)
        return self.public_config()

    def update_selections(self, payload):
        with self.lock:
            options = self.read_options()
            entities = validate_entities(payload.get("entities", []), "entities")
            entity_attributes = validate_entity_attributes(payload.get("entity_attributes", []))
            requested_commands = validate_entities(payload.get("command_entities", []), "command_entities")
            commands = [entity for entity in requested_commands
                        if entity in entities and entity.split(".")[0] in COMMAND_DOMAINS]
            options["entities"] = list(entities)
            options["entity_attributes"] = list(entity_attributes)
            options["command_entities"] = commands
            self.write_options(options)
            self._stop_locked()
            try:
                config = Config.load(options)
            except (ValueError, TypeError):
                config = None
            if config:
                self._start_locked(config)
        return self.public_config()

    def entity_catalog(self):
        states = self.ha.full_states()
        entities = []
        device_map = {}
        for state in states:
            entity_id = state.get("entity_id", "")
            attributes = state.get("attributes", {})
            if not ENTITY.fullmatch(entity_id) or not isinstance(attributes, dict):
                continue
            name = attributes.get("friendly_name") or entity_id
            mapping = iobroker_mapping(entity_id, state.get("state", ""), attributes)
            device_name = device_name_for_entity(entity_id, name, attributes)
            entity = {
                "entity_id": entity_id,
                "name": str(name),
                "device_name": device_name,
                "state": str(state.get("state", "")),
                "command_supported": entity_id.split(".")[0] in COMMAND_DOMAINS,
                "state_type": mapping["state_type"],
                "iobroker_type": mapping["iobroker_type"],
                "attributes": sorted(str(attr) for attr in attributes if ATTRIBUTE.fullmatch(str(attr))),
            }
            entities.append(entity)
            device_key = device_id_for_name(device_name)
            device = device_map.setdefault(device_key, {"id": device_key, "name": device_name, "entities": []})
            device["entities"].append(entity)
        entities.sort(key=lambda item: (item["name"].casefold(), item["entity_id"]))
        devices = sorted(device_map.values(), key=lambda item: (item["name"].casefold(), item["id"]))
        for device in devices:
            device["entities"].sort(key=lambda item: (item["name"].casefold(), item["entity_id"]))
        return {"entities": entities, "devices": devices}


def make_handler(controller):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            LOG.debug("Web UI: " + fmt, *args)

        def send_json(self, status, data):
            body = json.dumps(data).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path.endswith("/api/config"):
                try:
                    self.send_json(HTTPStatus.OK, controller.public_config())
                except (OSError, ValueError, TypeError) as error:
                    self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})
                return
            if self.path.endswith("/api/status"):
                self.send_json(HTTPStatus.OK, controller.status.snapshot())
                return
            if self.path.endswith("/api/entities"):
                try:
                    self.send_json(HTTPStatus.OK, controller.entity_catalog())
                except (OSError, ValueError, TypeError, KeyError) as error:
                    self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})
                return
            body = INDEX_HTML.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if not (self.path.endswith("/api/config") or self.path.endswith("/api/selections")):
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                if self.path.endswith("/api/selections"):
                    result = controller.update_selections(payload)
                else:
                    result = controller.update_connection(payload)
                self.send_json(HTTPStatus.OK, result)
            except (json.JSONDecodeError, ValueError, TypeError) as error:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            except OSError as error:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": type(error).__name__})

    return Handler


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        LOG.error("Home-Assistant-API-Zugang fehlt (SUPERVISOR_TOKEN)")
        return 1
    controller = AppController(OPTIONS_PATH, token)
    config = controller.start()
    server = ThreadingHTTPServer(("0.0.0.0", INGRESS_PORT), make_handler(controller))

    def shutdown(*_):
        controller.stop()
        threading.Thread(target=server.shutdown, name="web-shutdown", daemon=True).start()

    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, shutdown)
    if config:
        LOG.info("MQTT-Client %s: %d Entitäten, %d Befehlsfreigaben", APP_VERSION,
                 len(config.entities), len(config.command_entities))
    else:
        LOG.info("MQTT-Client %s: Weboberfläche bereit, Broker noch nicht konfiguriert", APP_VERSION)
    LOG.info("Weboberfläche auf Port %d aktiv", INGRESS_PORT)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        controller.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
