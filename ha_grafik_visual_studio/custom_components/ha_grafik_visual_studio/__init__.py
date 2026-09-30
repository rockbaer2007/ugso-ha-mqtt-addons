"""Register separate Home Assistant sidebar panels for editor and runtime."""

from pathlib import Path

import voluptuous as vol
from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

DOMAIN = "ha_grafik_visual_studio"
URL_BASE = f"/api/{DOMAIN}"
PANEL_JS = Path(__file__).parent / "www" / "panel.js"
CONFIG_SCHEMA = vol.Schema(
    {DOMAIN: vol.Any(None, vol.Schema({}))},
    extra=vol.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the panel module and both sidebar entries."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(PANEL_JS.parent), False)]
    )

    for name, title, icon, path in (
        ("ha-grafik-editor", "HA Grafik Editor", "mdi:view-dashboard-edit", "/editor"),
        ("ha-grafik-runtime", "HA Grafik Runtime", "mdi:monitor-dashboard", "/runtime"),
    ):
        await panel_custom.async_register_panel(
            hass,
            webcomponent_name="ha-grafik-ingress-panel",
            frontend_url_path=name,
            module_url=f"{URL_BASE}/panel.js",
            sidebar_title=title,
            sidebar_icon=icon,
            require_admin=True,
            config={"addon_suffix": "_ha_grafik_visual_studio", "path": path},
        )

    return True
