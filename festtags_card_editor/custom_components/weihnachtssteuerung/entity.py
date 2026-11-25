"""Shared entity identity."""
from homeassistant.helpers.update_coordinator import CoordinatorEntity


class ChristmasEntity(CoordinatorEntity):
    _attr_has_entity_name = True

    def __init__(self, runtime, key, name, icon):
        super().__init__(runtime)
        self._attr_unique_id = f"{runtime.entry.entry_id}_{key}"
        self._attr_name = name
        self._attr_icon = icon
        self._attr_device_info = {"identifiers": {("weihnachtssteuerung", runtime.entry.entry_id)},
                                  "name": runtime.entry.title, "manufacturer": "UGSo", "model": "Weihnachtssteuerung",
                                  "sw_version": "0.1.9"}
