"""Season visibility."""
from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.util import dt as dt_util
from .engine import season
from .entity import ChristmasEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([SeasonSensor(entry.runtime_data)])


class SeasonSensor(ChristmasEntity, BinarySensorEntity):
    def __init__(self, runtime):
        super().__init__(runtime, "season", "Weihnachtszeit aktiv" if runtime.language.startswith("de") else "Christmas season active", "mdi:calendar-star")

    @property
    def is_on(self):
        return season(self.coordinator.config, dt_util.now().date())[2]
