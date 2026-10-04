"""Bounded HTTPS downloads from the UGSo catalog and public GitHub files."""
import hashlib
import json
import os
import re
from urllib.parse import urljoin, urlparse
from urllib.request import Request, HTTPRedirectHandler, ProxyHandler, build_opener

CATALOG_URL = os.environ.get("HA_GRAFIK_CATALOG_URL", "https://visualstudio.ugso-software.de").rstrip("/")
MAX_BYTES = 2_000_000
GITHUB_HOSTS = {"github.com", "raw.githubusercontent.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"}


def checked_url(url):
    parsed = urlparse(url)
    base = urlparse(CATALOG_URL)
    catalog = parsed.scheme == base.scheme and parsed.netloc == base.netloc
    local_preview = catalog and base.scheme == "http" and base.hostname in {"127.0.0.1", "localhost"}
    if parsed.username or parsed.password or parsed.fragment or len(url) > 2000:
        raise ValueError("Ungültiger Download-Link.")
    if not (parsed.scheme == "https" and parsed.port in {None, 443} or local_preview):
        raise ValueError("Downloads benötigen HTTPS.")
    if not catalog and parsed.hostname not in GITHUB_HOSTS:
        raise ValueError("Nur der UGSo-Katalog und öffentliche GitHub-Dateien sind erlaubt.")
    return url


class CheckedRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        checked_url(newurl)
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def download_bytes(url, limit=MAX_BYTES):
    checked_url(url)
    opener = build_opener(ProxyHandler({}), CheckedRedirect())
    with opener.open(Request(url, headers={"User-Agent": "UGSo-Grafik-Visual-Studio"}), timeout=15) as response:
        body = response.read(limit + 1)
    if len(body) > limit:
        raise ValueError("Die heruntergeladene Datei ist zu groß.")
    return body


def catalog_packages():
    document = json.loads(download_bytes(CATALOG_URL + "/api/v1/catalog"))
    if document.get("schema_version") != "1.0" or not isinstance(document.get("packages"), list):
        raise ValueError("Unbekanntes Katalogformat.")
    packages = []
    for item in document["packages"][:500]:
        if not isinstance(item, dict) or item.get("kind") not in {"widget", "tool"}:
            continue
        kind = item["kind"]
        suffix = "wg" if kind == "widget" else "tp"
        area = "widget" if kind == "widget" else "tools"
        if not re.fullmatch(r"[a-z][a-z0-9.-]{1,79}", str(item.get("id", ""))):
            raise ValueError("Ungültige Paket-ID im Katalog.")
        if not re.fullmatch(r"\d+\.\d+\.\d+", str(item.get("version", ""))):
            raise ValueError("Ungültige Paketversion im Katalog.")
        if item.get("minimum_studio_version") and not re.fullmatch(r"\d+\.\d+\.\d+", str(item["minimum_studio_version"])):
            raise ValueError("Ungültige benötigte Studio-Version im Katalog.")
        expected = f"/downloads/{area}/{item['id']}-{item['version']}.{suffix}"
        if item.get("download_url") != expected or not re.fullmatch(r"[a-f0-9]{64}", str(item.get("sha256", ""))):
            raise ValueError("Ungültiger Download oder Prüfsumme im Katalog.")
        packages.append({key: str(item.get(key) or "")[:4000] for key in ["id", "kind", "name", "description", "version", "license", "minimum_studio_version", "download_url", "sha256"]})
    return {"packages": packages, "catalog_url": CATALOG_URL}


def package_download(url, kind, sha256=""):
    if kind not in {"widget", "tool"}:
        raise ValueError("Unbekannter Pakettyp.")
    if url.startswith("/downloads/"):
        if not sha256:
            raise ValueError("Katalog-Downloads benötigen eine Prüfsumme.")
        url = urljoin(CATALOG_URL + "/", url)
    parsed = urlparse(checked_url(url))
    if parsed.hostname == "github.com" and "/blob/" in parsed.path:
        url = "https://raw.githubusercontent.com/" + parsed.path.lstrip("/").replace("/blob/", "/", 1)
    suffix = ".wg" if kind == "widget" else ".tp"
    if not urlparse(url).path.lower().endswith((suffix, suffix + ".zip")):
        raise ValueError("Bitte einen direkten GitHub-Dateilink zu einer .wg- oder .tp-Datei angeben.")
    if sha256 and not re.fullmatch(r"[a-f0-9]{64}", sha256):
        raise ValueError("Ungültige SHA-256-Prüfsumme.")
    body = download_bytes(url)
    if sha256 and hashlib.sha256(body).hexdigest() != sha256:
        raise ValueError("Die SHA-256-Prüfsumme stimmt nicht mit dem Katalog überein.")
    return body
