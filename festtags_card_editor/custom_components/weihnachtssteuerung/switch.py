"""Persistent per-channel pause controls. Pausing leaves the target untouched."""
from homeassistant.components.switch import SwitchEntity
from .entity import ChristmasEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ChannelSwitch(entry.runtime_data, n) for n in range(5)])


class ChannelSwitch(ChristmasEntity, SwitchEntity):
    def __init__(self, runtime, n):
        de = runtime.language.startswith("de")
        super().__init__(runtime, f"channel_{n}", f"{'Steuerung' if de else 'Control'} {n+1}", "mdi:calendar-check")
        self.number = n

    @property
    def available(self):
        return bool(self.coordinator.channels[self.number].get("entity_id")) and super().available

    @property
    def is_on(self):
        return self.coordinator.is_enabled(self.number)

    @property
    def extra_state_attributes(self):
        return self.coordinator.channel_info(self.number)

    async def async_turn_on(self, **kwargs):
        await self.coordinator.async_enable(self.number, True)

    async def async_turn_off(self, **kwargs):
        await self.coordinator.async_enable(self.number, False)
