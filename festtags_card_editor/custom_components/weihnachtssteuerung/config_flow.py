"""Region -> country setup, season defaults and five independent channels."""
from copy import deepcopy

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers import entity_registry as er

from .catalog import COUNTRIES, EVENTS, REGIONS, country_events, label
from .engine import DEFAULTS, bounds, custom_date, validate_channel

DOMAIN = "weihnachtssteuerung"


def select(options, *, multiple=False):
    return selector.SelectSelector(selector.SelectSelectorConfig(options=options, multiple=multiple, mode="dropdown"))


def language(flow):
    return 0 if (flow.hass.config.language or "en").startswith("de") else 1


def region_schema(flow, current):
    return vol.Schema({vol.Required("region", default=current["region"]): select([
        {"value": key, "label": names[language(flow)]} for key, names in REGIONS.items()])})


def country_schema(flow, current, *, name=False):
    countries = [{"value": code, "label": names[1 + language(flow)]}
                 for code, names in COUNTRIES.items() if names[0] == current["region"]]
    default = current["country"] if any(c["value"] == current["country"] for c in countries) else countries[0]["value"]
    schema = {vol.Required("country", default=default): select(countries),
              vol.Required("tradition", default=current["tradition"]): select([
                  {"value": "western", "label": "25. Dezember" if language(flow) == 0 else "25 December"},
                  {"value": "julian", "label": "7. Januar (julianisch)" if language(flow) == 0 else "7 January (Julian)"},
                  {"value": "both", "label": "Beide Traditionen" if language(flow) == 0 else "Both traditions"}])}
    if name:
        schema[vol.Required("name", default="Weihnachtssteuerung")] = str
    return vol.Schema(schema)


def period_schema(flow, current):
    rules = [{"value": "custom", "label": "Eigenes Datum (TT.MM.)" if language(flow) == 0 else "Custom date (DD.MM.)"}]
    rules += [{"value": key, "label": label(key, flow.hass.config.language or "en")} for key in EVENTS]
    return {vol.Required("start_rule", default=current["start_rule"]): select(rules),
            vol.Required("start_date", default=current["start_date"]): str,
            vol.Required("end_rule", default=current["end_rule"]): select(rules),
            vol.Required("end_date", default=current["end_date"]): str}


def validate_period(config):
    for prefix in ("start", "end"):
        if config[f"{prefix}_rule"] == "custom":
            custom_date(config[f"{prefix}_date"], 2001)
    bounds(config, 2026)


class ChristmasConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self):
        self._config = deepcopy(DEFAULTS)

    async def async_step_user(self, user_input=None):
        if user_input is not None:
            self._config.update(user_input)
            return await self.async_step_country()
        return self.async_show_form(step_id="user", data_schema=region_schema(self, self._config))

    async def async_step_country(self, user_input=None):
        if user_input is not None:
            allowed = {code for code, value in COUNTRIES.items() if value[0] == self._config["region"]}
            if user_input["country"] not in allowed:
                return self.async_abort(reason="invalid_country")
            self._config.update({k: v for k, v in user_input.items() if k != "name"})
            return self.async_create_entry(title=user_input["name"].strip() or "Weihnachtssteuerung", data=self._config)
        return self.async_show_form(step_id="country", data_schema=country_schema(self, self._config, name=True))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return ChristmasOptionsFlow()


class ChristmasOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        self._config = deepcopy(DEFAULTS | self.config_entry.data | self.config_entry.options)
        return self.async_show_menu(step_id="init", menu_options=["location", "season", *[f"channel_{n}" for n in range(1, 6)]])

    async def async_step_location(self, user_input=None):
        if user_input is not None:
            self._config.update(user_input)
            return await self.async_step_country()
        return self.async_show_form(step_id="location", data_schema=region_schema(self, self._config))

    async def async_step_country(self, user_input=None):
        if user_input is not None:
            allowed = {code for code, value in COUNTRIES.items() if value[0] == self._config["region"]}
            if user_input["country"] not in allowed:
                return self.async_abort(reason="invalid_country")
            self._config.update(user_input)
            return self.async_create_entry(title="", data=self._config)
        return self.async_show_form(step_id="country", data_schema=country_schema(self, self._config))

    async def async_step_season(self, user_input=None):
        errors = {}
        if user_input is not None:
            try:
                validate_period(self._config | user_input)
            except (ValueError, KeyError):
                errors["base"] = "invalid_date"
            else:
                self._config.update(user_input)
                return self.async_create_entry(title="", data=self._config)
        return self.async_show_form(step_id="season", data_schema=vol.Schema(period_schema(self, self._config)), errors=errors)

    async def _channel(self, n, user_input):
        channels = (self._config["channels"] + [{} for _ in range(5)])[:5]
        channel = channels[n]
        errors = {}
        if user_input is not None:
            try:
                validate_channel(user_input)
                target = er.async_get(self.hass).async_get(user_input.get("entity_id", ""))
                if target and target.platform == DOMAIN:
                    errors["base"] = "recursive_target"
                elif user_input.get("entity_id") and any(c.get("entity_id") == user_input["entity_id"] for i, c in enumerate(channels) if i != n):
                    errors["base"] = "duplicate_target"
                elif not user_input.get("use_default_period", True):
                    validate_period(self._config | user_input)
            except (ValueError, KeyError):
                errors["base"] = "invalid_channel"
            if not errors:
                saved = dict(user_input)
                if saved.pop("use_default_period", True):
                    for key in ("start_rule", "start_date", "end_rule", "end_date"):
                        saved.pop(key, None)
                channels[n] = saved
                self._config["channels"] = channels
                return self.async_create_entry(title="", data=self._config)
            channel = channel | user_input
        lang = self.hass.config.language or "en"
        keys = set(country_events(self._config["country"], self._config["tradition"])) | set(channel.get("holidays", []))
        defaults = [k for k in ("advent_1", "advent_2", "advent_3", "advent_4", "nicholas", "christmas_eve", "christmas", "orthodox_eve", "orthodox_christmas") if k in keys]
        schema = {
            vol.Optional("entity_id", default=channel.get("entity_id", vol.UNDEFINED)): selector.EntitySelector(selector.EntitySelectorConfig(
                domain=["light", "switch", "input_boolean"],
                exclude_entities=[entry.entity_id for entry in er.async_get(self.hass).entities.values() if entry.platform == DOMAIN])),
            vol.Optional("name", default=channel.get("name", "")): str,
            vol.Required("mode", default=channel.get("mode", "period")): select([
                {"value": "period", "label": "Täglich von Anfang bis Ende" if language(self) == 0 else "Every day in the date range"},
                {"value": "holidays", "label": "Nur an ausgewählten Festtagen" if language(self) == 0 else "Selected observances only"}]),
            vol.Required("on_time", default=channel.get("on_time", "16:00:00")): selector.TimeSelector(),
            vol.Required("off_time", default=channel.get("off_time", "23:00:00")): selector.TimeSelector(),
            vol.Required("holidays", default=channel.get("holidays", defaults)): select([
                {"value": k, "label": label(k, lang)} for k in EVENTS if k in keys], multiple=True),
            vol.Required("use_default_period", default="start_rule" not in channel): bool,
            **period_schema(self, self._config | channel),
        }
        return self.async_show_form(step_id=f"channel_{n+1}", data_schema=vol.Schema(schema), errors=errors)

    async def async_step_channel_1(self, user_input=None):
        return await self._channel(0, user_input)

    async def async_step_channel_2(self, user_input=None):
        return await self._channel(1, user_input)

    async def async_step_channel_3(self, user_input=None):
        return await self._channel(2, user_input)

    async def async_step_channel_4(self, user_input=None):
        return await self._channel(3, user_input)

    async def async_step_channel_5(self, user_input=None):
        return await self._channel(4, user_input)
