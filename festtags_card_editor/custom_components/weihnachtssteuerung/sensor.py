"""Holiday names, dates and next scheduled switch."""
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.util import dt as dt_util
from .entity import ChristmasEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ChristmasSensor(entry.runtime_data, key) for key in ("today", "next", "date", "switch")])


class ChristmasSensor(ChristmasEntity, SensorEntity):
    def __init__(self, runtime, key):
        de = runtime.language.startswith("de")
        names = {"today": ("Aktueller Festtag", "Current observance"), "next": ("Nächster Festtag", "Next observance"),
                 "date": ("Nächstes Festdatum", "Next observance date"), "switch": ("Nächste Schaltung", "Next switch")}
        super().__init__(runtime, key, names[key][0 if de else 1], "mdi:pine-tree" if key == "today" else "mdi:calendar-clock")
        self.key = key
        if key in ("date", "switch"):
            self._attr_device_class = SensorDeviceClass.DATE if key == "date" else SensorDeviceClass.TIMESTAMP

    @property
    def native_value(self):
        runtime = self.coordinator
        if self.key == "today":
            return " · ".join(runtime.names(dt_util.now().date())) or ("Kein Festtag" if runtime.language.startswith("de") else "No observance")
        if self.key == "next":
            return " · ".join(runtime.next_holiday()[1])
        if self.key == "date":
            return runtime.next_holiday()[0]
        values = [runtime.channel_info(n).get("next_switch") for n in range(5)]
        return min((dt_util.parse_datetime(v) for v in values if v), default=None)

    @property
    def extra_state_attributes(self):
        return self.coordinator.overview() if self.key == "today" else None
