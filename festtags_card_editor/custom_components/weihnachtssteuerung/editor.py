"""Authenticated local editor and bounded image uploads; no raw credentials."""
from io import BytesIO
import json
from pathlib import Path
import re
import warnings

from aiohttp import web
from PIL import Image, UnidentifiedImageError

from homeassistant.components.http import HomeAssistantView
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.helpers import entity_registry as er

from .catalog import COUNTRIES, EVENTS, REGIONS, country_events
from .engine import DEFAULTS
from .validation import DEFAULT_IMAGE_FOLDER, editor_config, folder_parts, image_filename

DOMAIN = "weihnachtssteuerung"
VERSION = "0.1.6"
MAX_IMAGE = 5 * 1024 * 1024


def admin(request):
    user = request.get("hass_user")
    if user is None or not user.is_admin:
        raise web.HTTPForbidden()


def image_path(hass, folder):
    root = Path(hass.config.path("www")).resolve()
    path = root.joinpath(*folder_parts(folder)).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Bilderordner außerhalb von www / image folder outside www")
    return path


def save_image(hass, folder, filename, content):
    """Validate image content in an executor and never overwrite an existing file."""
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(BytesIO(content)) as image:
            if image.format not in {"PNG", "JPEG", "GIF", "WEBP"} or image.width * image.height > 16_000_000:
                raise ValueError("PNG/JPG/WebP/GIF bis 16 Megapixel / supported images up to 16 MP")
            extension = {"PNG": ".png", "JPEG": ".jpg", "GIF": ".gif", "WEBP": ".webp"}[image.format]
            image.verify()
    # Filename is cosmetic. The validated content determines the safe extension.
    stem = re.sub(r"[^\w .-]", "_", Path(filename.replace("\\", "/")).stem, flags=re.UNICODE).strip(" .")[:80] or "bild"
    directory = image_path(hass, folder)
    directory.mkdir(parents=True, exist_ok=True)
    for n in range(1, 10001):
        target = directory / f"{stem}{'' if n == 1 else '-' + str(n)}{extension}"
        try:
            with target.open("xb") as output:
                output.write(content)
        except FileExistsError:
            continue
        return target.name
    raise ValueError("Zu viele gleichnamige Dateien / too many duplicate filenames")


def list_images(hass, folder):
    directory = image_path(hass, folder)
    if not directory.is_dir():
        return []
    result = []
    for path in directory.iterdir():
        if len(result) >= 1000:
            break
        if path.is_file() and not path.is_symlink():
            try:
                image_filename(path.name)
            except ValueError:
                continue
            result.append(path.name)
    return sorted(result, key=str.casefold)


class EditorView(HomeAssistantView):
    url = "/api/weihnachtssteuerung/editor"
    name = "api:weihnachtssteuerung:editor"
    requires_auth = True

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request):
        admin(request)
        from homeassistant.helpers import area_registry as ar, device_registry as dr
        entities, devices, areas = er.async_get(self.hass), dr.async_get(self.hass), ar.async_get(self.hass)
        targets = []
        for state in self.hass.states.async_all(["light", "switch", "input_boolean"]):
            entry = entities.async_get(state.entity_id)
            if entry and entry.platform == DOMAIN:
                continue
            device = devices.async_get(entry.device_id) if entry and entry.device_id else None
            area_id = (entry.area_id if entry else None) or (device.area_id if device else None)
            area = areas.async_get_area(area_id) if area_id else None
            targets.append({"entity_id": state.entity_id, "name": state.name,
                            "area": area.name if area else "",
                            "device": (device.name_by_user or device.name or "") if device else ""})
        return self.json({"version": VERSION, "entries": [
            {"entry_id": entry.entry_id, "title": entry.title,
             "config": DEFAULTS | {"image_folder": DEFAULT_IMAGE_FOLDER, "country_images": {}} | entry.data | entry.options}
            for entry in self.hass.config_entries.async_entries(DOMAIN)],
            "regions": REGIONS, "countries": COUNTRIES, "events": EVENTS,
            "defaults": DEFAULTS | {"image_folder": DEFAULT_IMAGE_FOLDER, "country_images": {}, "show_images": False},
            "targets": targets,
            "country_events": {c: list(country_events(c, "both")) for c in COUNTRIES}})

    async def post(self, request):
        admin(request)
        try:
            content = bytearray()
            async for chunk in request.content.iter_chunked(16384):
                content.extend(chunk)
                if len(content) > 128 * 1024:
                    raise ValueError("Einstellungen zu groß / settings too large")
            payload = json.loads(content)
            config = editor_config(payload.get("config"))
            entry_id = payload.get("entry_id", "")
            entry = self.hass.config_entries.async_get_entry(entry_id) if entry_id else None
            if entry_id and (entry is None or entry.domain != DOMAIN):
                raise ValueError("Eintrag nicht gefunden / entry not found")
            registry = er.async_get(self.hass)
            for channel in config["channels"]:
                if not channel.get("entity_id"):
                    continue
                registered = registry.async_get(channel["entity_id"])
                if registered and registered.platform == DOMAIN:
                    raise ValueError("Eigene Steuerschalter sind kein Ziel / recursive target")
                if self.hass.states.get(channel["entity_id"]) is None:
                    raise ValueError("Entität nicht gefunden / entity not found")
            if entry is None:
                flow = await self.hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"}, data={"region": config["region"]})
                created = await self.hass.config_entries.flow.async_configure(flow["flow_id"], {"country": config["country"], "tradition": config["tradition"], "name": "Weihnachtssteuerung"})
                entry = created.get("result")
                if entry is None:
                    raise ValueError("Einrichtung fehlgeschlagen / setup failed")
            self.hass.config_entries.async_update_entry(entry, options=config)
        except (ValueError, TypeError, KeyError, AttributeError) as err:
            return self.json({"error": str(err)}, status_code=400)
        return self.json({"saved": True, "entry_id": entry.entry_id})


class ImagesView(HomeAssistantView):
    url = "/api/weihnachtssteuerung/images"
    name = "api:weihnachtssteuerung:images"
    requires_auth = True

    def __init__(self, hass):
        self.hass = hass

    async def get(self, request):
        admin(request)
        try:
            result = await self.hass.async_add_executor_job(list_images, self.hass, request.query.get("folder", DEFAULT_IMAGE_FOLDER))
        except (ValueError, OSError):
            return self.json({"error": "Ungültiger Bilderordner / invalid image folder"}, status_code=400)
        return self.json({"files": result})

    async def post(self, request):
        admin(request)
        try:
            reader = await request.multipart()
            folder = DEFAULT_IMAGE_FOLDER
            filename = "bild"
            content = None
            fields = 0
            async for part in reader:
                fields += 1
                if fields > 2 or part.name not in {"folder", "file"}:
                    raise ValueError("Ungültiger Upload / invalid upload")
                data = bytearray()
                limit = 2048 if part.name == "folder" else MAX_IMAGE
                while chunk := await part.read_chunk(65536):
                    data.extend(chunk)
                    if len(data) > limit:
                        raise ValueError("Datei maximal 5 MiB / maximum file size 5 MiB")
                if part.name == "folder":
                    folder = data.decode("utf-8")
                else:
                    filename, content = part.filename or "bild", bytes(data)
            if not content:
                raise ValueError("Keine Bilddatei / no image file")
            result = await self.hass.async_add_executor_job(save_image, self.hass, folder, filename, content)
        except (ValueError, OSError, AssertionError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            return self.json({"error": "Upload abgelehnt: PNG/JPG/WebP/GIF, maximal 5 MiB und 16 Megapixel, lokaler Bilderordner.",
                              "error_en": "Upload rejected: PNG/JPG/WebP/GIF, maximum 5 MiB and 16 MP, local image folder."}, status_code=400)
        return self.json({"filename": result})


async def async_register_editor(hass):
    hass.http.register_view(EditorView(hass))
    hass.http.register_view(ImagesView(hass))
    await async_register_panel(hass, frontend_url_path="festtags-card-editor", webcomponent_name="festtags-card-editor",
                               sidebar_title=None, sidebar_icon="mdi:calendar-edit", require_admin=True,
                               module_url=f"/local/weihnachtssteuerung/festtags-card-editor.js?v={VERSION}",
                               config_panel_domain=DOMAIN)
