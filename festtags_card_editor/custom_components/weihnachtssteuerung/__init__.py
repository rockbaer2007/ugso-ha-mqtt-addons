"""Local, annually recurring Christmas control."""


async def async_setup(hass, config):
    from .editor import async_register_editor
    await async_register_editor(hass)
    return True


async def async_setup_entry(hass, entry):
    from homeassistant.const import Platform
    from .runtime import ChristmasRuntime
    runtime = ChristmasRuntime(hass, entry)
    entry.runtime_data = runtime
    await runtime.async_load()
    await hass.config_entries.async_forward_entry_setups(entry, [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.SWITCH])
    entry.async_on_unload(entry.add_update_listener(_async_update))
    await runtime.async_start()
    return True


async def _async_update(hass, entry):
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass, entry):
    from homeassistant.const import Platform
    if await hass.config_entries.async_unload_platforms(entry, [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.SWITCH]):
        entry.runtime_data.close()
        return True
    return False
