"""Minute scheduler, persistent pause switches and change-only service calls."""
import asyncio
from datetime import timedelta
import logging

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .catalog import COUNTRIES, REGIONS, event_dates, country_events, label, observances
from .engine import DEFAULTS, channel_status, season

DOMAIN = "weihnachtssteuerung"
_LOGGER = logging.getLogger(__name__)


class ChristmasRuntime(DataUpdateCoordinator):
    def __init__(self, hass, entry):
        super().__init__(hass, _LOGGER, name=DOMAIN, config_entry=entry)
        self.entry = entry
        self.config = DEFAULTS | entry.data | entry.options
        self.channels = (self.config["channels"] + [{} for _ in range(5)])[:5]
        self.store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}")
        self.enabled = {}
        self.desired = {}
        self.errors = {}
        self._unsubs = []
        self._lock = asyncio.Lock()
        self.async_set_updated_data({})

    async def async_load(self):
        self.enabled = await self.store.async_load() or {}

    def is_enabled(self, n):
        return bool(self.channels[n].get("entity_id")) and self.enabled.get(str(n), True)

    async def async_enable(self, n, enabled):
        self.enabled[str(n)] = enabled
        await self.store.async_save(self.enabled)
        self.desired.pop(n, None)
        await self._async_tick(None)

    async def async_start(self):
        self._unsubs.append(async_track_time_change(self.hass, self._async_tick, second=0))
        targets = [c["entity_id"] for c in self.channels if c.get("entity_id")]
        if targets:
            self._unsubs.append(async_track_state_change_event(self.hass, targets, self._state_change))
        if self.hass.is_running:
            await self._async_tick(None)
        else:
            self._unsubs.append(self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, self._async_tick))

    @callback
    def _state_change(self, event):
        old = event.data.get("old_state")
        new = event.data.get("new_state")
        if new and new.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE) and (
            old is None or old.state in (STATE_UNKNOWN, STATE_UNAVAILABLE)
        ):
            for n, channel in enumerate(self.channels):
                if channel.get("entity_id") == new.entity_id:
                    self.desired.pop(n, None)
            self.hass.async_create_task(self._async_tick(None))
        else:
            self.async_set_updated_data(self.data)

    async def _async_tick(self, event):
        async with self._lock:
            now = dt_util.now()
            for n, channel in enumerate(self.channels):
                if not self.is_enabled(n):
                    continue
                desired, _ = channel_status(self.config, channel, now)
                registered = er.async_get(self.hass).async_get(channel["entity_id"])
                if registered and registered.platform == DOMAIN:
                    self.errors[n] = "Eigenes Steuerungsziel nicht erlaubt / recursive target rejected"
                    continue
                state = self.hass.states.get(channel["entity_id"])
                if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
                    self.errors[n] = "Entität nicht verfügbar / entity unavailable"
                    self.desired.pop(n, None)
                    continue
                if self.desired.get(n) is desired:
                    continue
                try:
                    domain = channel["entity_id"].split(".")[0]
                    await self.hass.services.async_call(domain, "turn_on" if desired else "turn_off",
                                                       {"entity_id": channel["entity_id"]}, blocking=True)
                except Exception as err:
                    self.errors[n] = str(err)
                    _LOGGER.warning("Christmas channel %s could not switch its configured target: %s", n + 1, err)
                else:
                    self.desired[n] = desired
                    self.errors.pop(n, None)
            self.async_set_updated_data({"updated": now.isoformat()})

    def close(self):
        for unsubscribe in self._unsubs:
            unsubscribe()
        self._unsubs.clear()

    @property
    def language(self):
        return self.hass.config.language or "en"

    def names(self, day):
        return [label(key, self.language) for key in observances(day, self.config["country"], self.config["tradition"])]

    def next_holiday(self):
        today = dt_util.now().date()
        keys = country_events(self.config["country"], self.config["tradition"])
        days = [event_dates(y)[k] for y in (today.year, today.year + 1) for k in keys if event_dates(y)[k] > today]
        day = min(days)
        return day, self.names(day)

    def channel_info(self, n):
        channel = self.channels[n]
        if not channel.get("entity_id"):
            return {"number": n + 1, "configured": False}
        now = dt_util.now()
        desired, transition = channel_status(self.config, channel, now)
        start, end, active = season(self.config | channel, now.date())
        entity = self.hass.states.get(channel["entity_id"])
        registry = er.async_get(self.hass)
        switch_id = registry.async_get_entity_id("switch", DOMAIN, f"{self.entry.entry_id}_channel_{n}")
        return {"number": n + 1, "configured": True, "name": channel.get("name") or (entity.name if entity else channel["entity_id"]),
                "entity_id": channel["entity_id"], "switch_entity": switch_id,
                "show_status_icon": channel.get("show_status_icon", False),
                "enabled": self.is_enabled(n), "mode": channel["mode"],
                "on_time": channel["on_time"], "off_time": channel["off_time"],
                "start": start.isoformat(), "end": end.isoformat(), "season_active": active,
                "holidays": [label(k, self.language) for k in channel.get("holidays", [])],
                "desired_on": desired, "state": entity.state if entity else STATE_UNAVAILABLE,
                "next_switch": transition.isoformat() if transition and self.is_enabled(n) else None,
                "error": self.errors.get(n)}

    def overview(self):
        now = dt_util.now()
        start, end, active = season(self.config, now.date())
        country = COUNTRIES[self.config["country"]]
        lang = 0 if self.language.startswith("de") else 1
        advent = event_dates(now.year)["advent_1"]
        advent_week = min(4, (now.date() - advent).days // 7 + 1) if self.config["tradition"] != "julian" and advent <= now.date() <= event_dates(now.year)["christmas_eve"] else 0
        next_day, next_names = self.next_holiday()
        return {"christmas_control": True, "country": self.config["country"], "country_name": country[1 + lang],
                "region": REGIONS[self.config["region"]][lang], "tradition": self.config["tradition"],
                "names": self.names(now.date()), "season_start": start.isoformat(), "season_end": end.isoformat(),
                "season_active": active, "channels": [self.channel_info(n) for n in range(5)],
                "timezone": self.hass.config.time_zone,
                "event_ids": observances(now.date(), self.config["country"], self.config["tradition"]),
                "next_holiday_names": next_names, "next_holiday_date": next_day.isoformat(),
                "advent_week": advent_week,
                "image_folder": self.config.get("image_folder", "/local/weihnachtssteuerung/bilder"),
                "image_mapping": self.config.get("country_images", {}).get(self.config["country"], {}),
                "image_labels": {key: label(key, self.language) for key in self.config.get("country_images", {}).get(self.config["country"], {})},
                "images_enabled": self.config.get("show_images", False),
                "effects": self.config.get("effects", {}),
                "note": "Fest- und Brauchtumskalender; kein gesetzlicher Feiertagskalender."}
