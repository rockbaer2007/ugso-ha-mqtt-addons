from __future__ import annotations

import json
import logging
import os
import signal
import threading
import time
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qs, urlparse

import paho.mqtt.client as mqtt
import requests


LOG = logging.getLogger("parcel_to_mqtt")
DEFAULT_BASE_TOPIC = "parcel"
DEFAULT_DISCOVERY_PREFIX = "homeassistant"
MAX_DEFAULT_PARCELS = 6
DEBUG_LOG_FILE = "/data/provider_debug.log"
DEBUG_LOG_MAX_LINES = 100
DHL_AUTH_URL = (
    "https://login.dhl.de/af5f9bb6-27ad-4af4-9445-008e7a5cddb8/login/authorize"
    "?redirect_uri=dhllogin://de.deutschepost.dhl/login"
    "&state=eyJycyI6dHJ1ZSwicnYiOmZhbHNlLCJmaWQiOiJhcHAtbG9naW4tbWVoci1mb290ZXIiLCJoaWQiOiJhcHAtbG9naW4tbWVoci1oZWFkZXIiLCJycCI6ZmFsc2V9"
    "&client_id=83471082-5c13-4fce-8dcb-19d2a3fca413"
    "&response_type=code"
    "&scope=openid%20offline_access"
    "&claims=%7B%22id_token%22:%7B%22email%22:null,%22post_number%22:null,%22twofa%22:null,%22service_mask%22:null,%22deactivate_account%22:null,%22last_login%22:null,%22customer_type%22:null,%22display_name%22:null,%22data_confirmation_required%22:null%7D%7D"
    "&nonce=&login_hint=&prompt=login&ui_locales=de-DE"
    "&code_challenge=MAhrhXXZP-Owy-R7ruyB7Fn-Z8ODW6qxCoHg4uXELCw"
    "&code_challenge_method=S256"
)
DHL_CODE_VERIFIER = "zmVs5AKfGvv45a9aUvuOid9a_erOirp7XL1sn9kWT_o"
DHL_CLIENT_ID = "83471082-5c13-4fce-8dcb-19d2a3fca413"
DHL_SESSION_FILE = "/data/dhl_session.json"


@dataclass(frozen=True)
class Options:
    dhl_enabled: bool
    dhl_tracking_numbers: list[str]
    dhl_login_code: str
    hermes_enabled: bool
    hermes_tracking_numbers: list[str]
    gls_enabled: bool
    gls_tracking_numbers: list[str]
    gls_postal_code: str
    dpd_enabled: bool
    dpd_tracking_numbers: list[str]
    ups_enabled: bool
    ups_tracking_numbers: list[str]
    amazon_enabled: bool
    deutsche_post_enabled: bool
    deutsche_post_tracking_numbers: list[str]
    fedex_enabled: bool
    fedex_tracking_numbers: list[str]
    interval: int
    max_parcels: int
    log_response_details: bool
    mqtt_host: str
    mqtt_port: int
    mqtt_username: str
    mqtt_password: str
    discovery_prefix: str
    base_topic: str
    retain: bool


@dataclass(frozen=True)
class Parcel:
    index: int
    tracking_number: str
    carrier: str
    status: str
    status_group: str
    last_event: str
    last_event_time: str
    destination: str
    raw: dict[str, Any]


class ParcelPoller:
    def __init__(self, options: Options) -> None:
        self.options = options
        self.clients = []
        if options.dhl_enabled:
            self.clients.append(DhlClient(options))
        if options.hermes_enabled:
            self.clients.append(HermesClient(options))
        if options.gls_enabled:
            self.clients.append(GlsClient(options))
        self.clients.extend(planned_provider_clients(options))

    def poll(self) -> list[Parcel]:
        parcels: list[Parcel] = []
        for client in self.clients:
            parcels.extend(client.poll())
        indexed = [
            replace(parcel, index=index)
            for index, parcel in enumerate(parcels[: self.options.max_parcels], start=1)
        ]
        return indexed


class DhlClient:
    def __init__(self, options: Options) -> None:
        self.options = options
        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json",
            "content-type": "application/json",
            "accept-language": "de-de",
            "user-agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
            ),
        })

    def poll(self) -> list[Parcel]:
        tracking_numbers = list(self.options.dhl_tracking_numbers)
        account_numbers = self.fetch_account_tracking_numbers()
        for tracking_number in account_numbers:
            if tracking_number and tracking_number not in tracking_numbers:
                tracking_numbers.append(tracking_number)
        if not tracking_numbers:
            return []
        try:
            response = self.session.get(
                "https://www.dhl.de/int-verfolgen/data/search",
                params={
                    "piececode": ",".join(tracking_numbers),
                    "noRedirect": "true",
                    "language": "de",
                    "cid": "app",
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            debug_provider_exchange(
                self.options,
                provider="DHL",
                phase="tracking",
                request_data={
                    "method": "GET",
                    "url": response.url,
                    "tracking_numbers": tracking_numbers,
                },
                response=response,
                response_data=data,
            )
            shipments = data.get("sendungen", []) if isinstance(data, dict) else []
            if not isinstance(shipments, list):
                return []
            active_shipments = [
                shipment for shipment in shipments
                if value_at(shipment, ["sendungsinfo", "sendungsliste"]) != "ARCHIVIERT"
            ]
            return [self.normalize_parcel(item) for item in active_shipments]
        except Exception as exc:
            LOG.warning("Could not fetch DHL parcel data: %s", exc)
            return []

    def fetch_account_tracking_numbers(self) -> list[str]:
        session_data = self.ensure_account_session()
        if not session_data:
            return []
        try:
            self.session.cookies.set("dhli", session_data["id_token"], domain=".dhl.de")
            response = self.session.get(
                "https://www.dhl.de/int-verfolgen/data/search",
                params={"noRedirect": "true", "language": "de", "cid": "app"},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            debug_provider_exchange(
                self.options,
                provider="DHL",
                phase="account_list",
                request_data={
                    "method": "GET",
                    "url": response.url,
                    "account_session": bool(session_data.get("id_token")),
                },
                response=response,
                response_data=data,
            )
            shipments = data.get("sendungen", []) if isinstance(data, dict) else []
            if not isinstance(shipments, list):
                return []
            return [
                str(item.get("id") or "").strip()
                for item in shipments
                if isinstance(item, dict)
                and str(item.get("id") or "").strip()
                and value_at(item, ["sendungsinfo", "sendungsliste"]) != "ARCHIVIERT"
            ]
        except Exception as exc:
            LOG.warning("Could not fetch DHL account parcel list: %s", exc)
            return []

    def ensure_account_session(self) -> dict[str, Any] | None:
        session_data = self.load_session()
        if session_data and session_data.get("refresh_token"):
            refreshed = self.refresh_session(session_data["refresh_token"])
            if refreshed:
                return refreshed
        if self.options.dhl_login_code:
            return self.login_with_code(self.options.dhl_login_code)
        return None

    def login_with_code(self, login_code: str) -> dict[str, Any] | None:
        code = dhl_code_from_url(login_code)
        if not code:
            LOG.warning("DHL login code is not valid. Open %s and paste the dhllogin:// URL into dhl_login_code.", DHL_AUTH_URL)
            return None
        try:
            response = self.session.post(
                "https://login.dhl.de/af5f9bb6-27ad-4af4-9445-008e7a5cddb8/login/token",
                headers={
                    "Host": "login.dhl.de",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json, text/plain, */*",
                    "Origin": "https://login.dhl.de",
                    "Authorization": "Basic ODM0NzEwODItNWMxMy00ZmNlLThkY2ItMTlkMmEzZmNhNDEzOg==",
                    "User-Agent": "DHLPaket_PROD/1367 CFNetwork/1240.0.4 Darwin/20.6.0",
                    "Accept-Language": "de-de",
                },
                data={
                    "redirect_uri": "dhllogin://de.deutschepost.dhl/login",
                    "grant_type": "authorization_code",
                    "code_verifier": DHL_CODE_VERIFIER,
                    "code": code,
                },
                timeout=30,
            )
            response.raise_for_status()
            session_data = response.json()
            debug_provider_exchange(
                self.options,
                provider="DHL",
                phase="login",
                request_data={
                    "method": "POST",
                    "url": response.url,
                    "body": {
                        "redirect_uri": "dhllogin://de.deutschepost.dhl/login",
                        "grant_type": "authorization_code",
                        "code_verifier": DHL_CODE_VERIFIER,
                        "code": code,
                    },
                },
                response=response,
                response_data=session_data,
            )
            self.save_session(session_data)
            LOG.info("DHL account login successful. The stored refresh token will be reused on the next starts.")
            return session_data
        except Exception as exc:
            LOG.warning("DHL account login failed: %s", exc)
            return None

    def refresh_session(self, refresh_token: str) -> dict[str, Any] | None:
        try:
            response = self.session.post(
                "https://login.dhl.de/af5f9bb6-27ad-4af4-9445-008e7a5cddb8/login/token",
                headers={
                    "Host": "login.dhl.de",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json, text/plain, */*",
                    "Origin": "https://login.dhl.de",
                    "User-Agent": "DHLPaket_PROD/1367 CFNetwork/1240.0.4 Darwin/20.6.0",
                    "Accept-Language": "de-de",
                },
                data={
                    "client_id": DHL_CLIENT_ID,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                timeout=30,
            )
            response.raise_for_status()
            session_data = response.json()
            debug_provider_exchange(
                self.options,
                provider="DHL",
                phase="refresh",
                request_data={
                    "method": "POST",
                    "url": response.url,
                    "body": {
                        "client_id": DHL_CLIENT_ID,
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                    },
                },
                response=response,
                response_data=session_data,
            )
            self.save_session(session_data)
            return session_data
        except Exception as exc:
            LOG.info("DHL refresh token could not be used: %s", exc)
            return None

    @staticmethod
    def load_session() -> dict[str, Any] | None:
        try:
            if os.path.exists(DHL_SESSION_FILE):
                with open(DHL_SESSION_FILE, encoding="utf-8") as handle:
                    data = json.load(handle)
                return data if isinstance(data, dict) else None
        except Exception as exc:
            LOG.warning("Could not read stored DHL session: %s", exc)
        return None

    @staticmethod
    def save_session(session_data: dict[str, Any]) -> None:
        try:
            with open(DHL_SESSION_FILE, "w", encoding="utf-8") as handle:
                json.dump(session_data, handle)
        except Exception as exc:
            LOG.warning("Could not store DHL session: %s", exc)

    @staticmethod
    def normalize_parcel(item: dict[str, Any]) -> Parcel:
        status_text = first_text(
            value_at(item, ["sendungsdetails", "sendungsverlauf", "kurzStatus"]),
            value_at(item, ["sendungsdetails", "sendungsverlauf", "status"]),
            value_at(item, ["sendungsinfo", "status"]),
        )
        last_event, last_event_time = dhl_last_event(item)
        status_group = normalize_status_group(f"{status_text} {last_event}")
        return Parcel(
            index=0,
            tracking_number=str(item.get("id") or ""),
            carrier="DHL",
            status=status_text or human_status(status_group),
            status_group=status_group,
            last_event=last_event,
            last_event_time=last_event_time,
            destination=str(value_at(item, ["sendungsinfo", "zielland"]) or ""),
            raw=item,
        )


class HermesClient:
    def __init__(self, options: Options) -> None:
        self.options = options
        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json",
            "x-language": "de",
            "referer": "https://www.myhermes.de/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        })

    def poll(self) -> list[Parcel]:
        parcels = []
        for tracking_number in self.options.hermes_tracking_numbers:
            try:
                response = self.session.get(
                    f"https://api.my-deliveries.de/tnt/v2/shipments/search/{tracking_number}",
                    timeout=30,
                )
                if response.status_code in (400, 404):
                    LOG.info("Hermes parcel %s is unknown or not scanned yet", tracking_number)
                    continue
                response.raise_for_status()
                data = response.json()
                debug_provider_exchange(
                    self.options,
                    provider="Hermes",
                    phase="tracking",
                    request_data={
                        "method": "GET",
                        "url": response.url,
                        "tracking_number": tracking_number,
                    },
                    response=response,
                    response_data=data,
                )
                if isinstance(data, list) and data and isinstance(data[0], dict):
                    parcels.append(self.normalize_parcel(tracking_number, data[0]))
            except Exception as exc:
                LOG.warning("Could not fetch Hermes parcel %s: %s", tracking_number, exc)
        return parcels

    @staticmethod
    def normalize_parcel(tracking_number: str, item: dict[str, Any]) -> Parcel:
        history = item.get("parcelProgress")
        latest = history[0] if isinstance(history, list) and history and isinstance(history[0], dict) else {}
        raw_status = first_text(latest.get("parcelStatus"), latest.get("status"), item.get("status"), item.get("state"))
        last_event = first_text(latest.get("historyText"), latest.get("status"), item.get("statusText"), raw_status)
        status_group = normalize_status_group(f"{raw_status} {last_event}")
        return Parcel(
            index=0,
            tracking_number=first_text(item.get("barcode"), item.get("trackingCode"), tracking_number),
            carrier="Hermes",
            status=last_event or human_status(status_group),
            status_group=status_group,
            last_event=last_event,
            last_event_time=first_text(latest.get("timestamp"), latest.get("date"), item.get("eta")),
            destination=first_text(
                value_at(item, ["recipient", "city"]),
                value_at(item, ["receiver", "city"]),
                value_at(item, ["deliveryAddress", "city"]),
            ),
            raw=item,
        )


class GlsClient:
    def __init__(self, options: Options) -> None:
        self.options = options
        self._warned = False

    def poll(self) -> list[Parcel]:
        if not self.options.gls_tracking_numbers:
            return []
        if not self.options.gls_postal_code:
            LOG.warning("GLS tracking numbers are configured, but gls_postal_code is empty")
            return []
        if not self._warned:
            LOG.warning("GLS direct tracking is prepared but not active yet; GLS Germany needs a guest bearer session before polling can be enabled")
            self._warned = True
        return []


class PlannedProviderClient:
    def __init__(self, provider: str, reason: str) -> None:
        self.provider = provider
        self.reason = reason
        self._warned = False

    def poll(self) -> list[Parcel]:
        if not self._warned:
            LOG.warning("%s configuration is prepared, but active polling is not connected yet: %s", self.provider, self.reason)
            self._warned = True
        return []


def planned_provider_clients(options: Options) -> list[PlannedProviderClient]:
    clients: list[PlannedProviderClient] = []
    if options.dpd_enabled:
        clients.append(PlannedProviderClient("DPD", "waiting for a stable account, session or official API flow"))
    if options.ups_enabled:
        clients.append(PlannedProviderClient("UPS", "waiting for a stable account or official API flow"))
    if options.amazon_enabled:
        clients.append(PlannedProviderClient("Amazon Logistics", "waiting for a browser/account connector that can handle OTP and captcha steps safely"))
    if options.deutsche_post_enabled:
        clients.append(PlannedProviderClient("Deutsche Post letters", "waiting for a stable letter-tracking connector"))
    if options.fedex_enabled:
        clients.append(PlannedProviderClient("FedEx", "waiting for a stable direct or official API flow"))
    return clients


class MqttPublisher:
    def __init__(self, options: Options) -> None:
        self.options = options
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="parcel-to-mqtt")
        if options.mqtt_username:
            self.client.username_pw_set(options.mqtt_username, options.mqtt_password)
        self._published_discovery = False

    def connect(self) -> None:
        LOG.info("Using MQTT broker %s:%s as user '%s'", self.options.mqtt_host, self.options.mqtt_port, self.options.mqtt_username or "<empty>")
        self.client.on_connect = self._on_connect
        self.client.connect(self.options.mqtt_host, self.options.mqtt_port, keepalive=60)
        self.client.loop_start()

    def disconnect(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()

    def publish_results(self, parcels: list[Parcel]) -> None:
        if not self._published_discovery:
            self.publish_discovery()
            self._published_discovery = True
        self._publish(f"{self.options.base_topic}/status", "online")
        self._publish(f"{self.options.base_topic}/last_update", datetime.now(timezone.utc).isoformat())
        summary = parcel_summary(parcels)
        self._publish_json(f"{self.options.base_topic}/all", [parcel_to_dict(parcel) for parcel in parcels])
        for key, value in summary.items():
            self._publish(f"{self.options.base_topic}/{key}", str(value))
        for index in range(1, self.options.max_parcels + 1):
            parcel = next((item for item in parcels if item.index == index), None)
            prefix = f"{self.options.base_topic}/parcels/{index:02d}"
            self._publish(f"{prefix}/status", parcel.status if parcel else "")
            self._publish_json(f"{prefix}/attributes", parcel_to_dict(parcel) if parcel else empty_parcel_attributes(index))
        LOG.info("Published %s parcel tracking entries", len(parcels))

    def publish_discovery(self) -> None:
        self._publish_config("binary_sensor", "connection", {
            "name": "Parcel Verbindung",
            "unique_id": "parcel_to_mqtt_connection",
            "state_topic": f"{self.options.base_topic}/status",
            "payload_on": "online",
            "payload_off": "offline",
            "device_class": "connectivity",
            "device": self._device(),
        })
        self._publish_config("sensor", "last_update", {
            "name": "Parcel letzte Aktualisierung",
            "unique_id": "parcel_to_mqtt_last_update",
            "state_topic": f"{self.options.base_topic}/last_update",
            "device_class": "timestamp",
            "device": self._device(),
        })
        self._publish_config("sensor", "all", {
            "name": "Parcel Sendungen",
            "unique_id": "parcel_to_mqtt_all",
            "state_topic": f"{self.options.base_topic}/total",
            "json_attributes_topic": f"{self.options.base_topic}/all",
            "icon": "mdi:package-variant-closed",
            "device": self._device(),
        })
        counters = {
            "total": ("Parcel Gesamt", "mdi:package-variant-closed"),
            "registered": ("Parcel Angemeldet", "mdi:package-plus"),
            "in_transit": ("Parcel Unterwegs", "mdi:truck-fast"),
            "out_for_delivery": ("Parcel In Zustellung", "mdi:truck-delivery"),
            "at_pickup_point": ("Parcel Abholstelle", "mdi:store-marker"),
            "delivered": ("Parcel Zugestellt", "mdi:package-check"),
            "returning": ("Parcel Ruecksendung", "mdi:package-up"),
            "exception": ("Parcel Problem", "mdi:package-alert"),
            "unknown": ("Parcel Unbekannt", "mdi:package-question"),
        }
        for key, (name, icon) in counters.items():
            self._publish_config("sensor", key, {
                "name": name,
                "unique_id": f"parcel_to_mqtt_{key}",
                "state_topic": f"{self.options.base_topic}/{key}",
                "state_class": "measurement",
                "icon": icon,
                "device": self._device(),
            })
        for index in range(1, self.options.max_parcels + 1):
            self._publish_config("sensor", f"parcel_{index:02d}", {
                "name": f"Parcel {index:02d}",
                "unique_id": f"parcel_to_mqtt_parcel_{index:02d}",
                "state_topic": f"{self.options.base_topic}/parcels/{index:02d}/status",
                "json_attributes_topic": f"{self.options.base_topic}/parcels/{index:02d}/attributes",
                "icon": "mdi:package-variant-closed",
                "device": self._device(),
            })

    def _on_connect(self, client: mqtt.Client, userdata: Any, flags: Any, reason_code: Any, properties: Any) -> None:
        LOG.info("Connected to MQTT broker with result %s", reason_code)

    def _publish_config(self, component: str, object_id: str, payload: dict[str, Any]) -> None:
        self._publish_json(f"{self.options.discovery_prefix}/{component}/parcel_to_mqtt/{object_id}/config", payload, retain=True)

    def _publish_json(self, topic: str, payload: Any, retain: bool | None = None) -> None:
        self._publish(topic, json.dumps(payload, separators=(",", ":"), ensure_ascii=False), retain=retain)

    def _publish(self, topic: str, payload: str, retain: bool | None = None) -> None:
        self.client.publish(topic, payload, qos=0, retain=self.options.retain if retain is None else retain)

    @staticmethod
    def _device() -> dict[str, Any]:
        return {
            "identifiers": ["parcel_to_mqtt"],
            "name": "Parcel to MQTT",
            "manufacturer": "UGSo Software",
            "model": "Parcel Tracking App",
        }


def value_at(data: Any, path: list[str]) -> Any:
    current = data
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def first_text(*values: Any) -> str:
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return ""


def debug_provider_exchange(
    options: Options,
    provider: str,
    phase: str,
    request_data: dict[str, Any],
    response: requests.Response | None = None,
    response_data: Any = None,
) -> None:
    if not options.log_response_details:
        return
    payload = {
        "time": datetime.now(timezone.utc).isoformat(),
        "provider": provider,
        "phase": phase,
        "request": redact_debug_value(request_data),
        "response": {
            "status_code": response.status_code if response is not None else None,
            "url": response.url if response is not None else "",
            "body": redact_debug_value(response_data),
        },
    }
    line = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
    LOG.info("Provider debug %s/%s: %s", provider, phase, line[:8000])
    append_debug_line(line)


def append_debug_line(line: str) -> None:
    try:
        existing: list[str] = []
        if os.path.exists(DEBUG_LOG_FILE):
            with open(DEBUG_LOG_FILE, encoding="utf-8") as handle:
                existing = handle.read().splitlines()
        existing.append(line)
        with open(DEBUG_LOG_FILE, "w", encoding="utf-8") as handle:
            handle.write("\n".join(existing[-DEBUG_LOG_MAX_LINES:]) + "\n")
    except Exception as exc:
        LOG.warning("Could not write provider debug log: %s", exc)


def redact_debug_value(value: Any) -> Any:
    sensitive_names = {
        "authorization",
        "code",
        "code_verifier",
        "dhl_login_code",
        "id_token",
        "refresh_token",
        "access_token",
        "token",
        "password",
        "cookie",
        "dhli",
    }
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            key_text = str(key)
            if key_text.lower() in sensitive_names or "token" in key_text.lower() or "password" in key_text.lower():
                redacted[key] = "***"
            else:
                redacted[key] = redact_debug_value(item)
        return redacted
    if isinstance(value, list):
        return [redact_debug_value(item) for item in value]
    if isinstance(value, str) and len(value) > 2000:
        return value[:2000] + "...<truncated>"
    return value


def dhl_last_event(item: dict[str, Any]) -> tuple[str, str]:
    history = value_at(item, ["sendungsdetails", "sendungsverlauf"])
    if isinstance(history, dict):
        events = history.get("events") or history.get("ereignisse") or history.get("eventsProgressbar")
        if isinstance(events, list) and events:
            latest = events[-1] if isinstance(events[-1], dict) else {}
            return (
                first_text(latest.get("status"), latest.get("text"), latest.get("description"), latest.get("ort")),
                first_text(latest.get("datum"), latest.get("zeit"), latest.get("timestamp"), latest.get("time")),
            )
    return (
        first_text(value_at(item, ["sendungsdetails", "sendungsverlauf", "status"]), value_at(item, ["sendungsinfo", "sendungsname"])),
        first_text(value_at(item, ["sendungsdetails", "sendungsverlauf", "datum"]), value_at(item, ["sendungsdetails", "sendungsverlauf", "zeit"])),
    )


def normalize_status_group(status: str) -> str:
    text = status.lower().replace("-", "_").replace(" ", "_")
    compact = text.replace("_", "")
    if ("wird" in text and "zugestellt" in text) or "in_zustellung" in text or "out_for_delivery" in text or "outfordelivery" in compact:
        return "out_for_delivery"
    if "pickup" in text or "abhol" in text or "paketshop" in text or "parcelshop" in text or "filiale" in text:
        return "at_pickup_point"
    if "delivered" in text or "zugestellt" in text or "ausgeliefert" in text:
        return "delivered"
    if "return" in text or "retoure" in text or "rueck" in text or "zurück" in text:
        return "returning"
    if "registered" in text or "angekuendigt" in text or "angekündigt" in text or "elektronisch" in text or "daten" in text:
        return "registered"
    if "zustellung" in text:
        return "out_for_delivery"
    if "transit" in text or "transport" in text or "unterwegs" in text or "bearbeitung" in text or "info_received" in text or "inforeceived" in compact:
        return "in_transit"
    if "exception" in text or "expired" in text or "failed" in text or "problem" in text or "fehler" in text:
        return "exception"
    return "unknown"


def human_status(group: str) -> str:
    return {
        "registered": "Angemeldet",
        "delivered": "Zugestellt",
        "at_pickup_point": "Abholstelle",
        "out_for_delivery": "In Zustellung",
        "in_transit": "Unterwegs",
        "returning": "Ruecksendung",
        "exception": "Problem",
        "unknown": "Unbekannt",
    }.get(group, "Unbekannt")


def parcel_summary(parcels: list[Parcel]) -> dict[str, int]:
    summary = {
        "total": len(parcels),
        "registered": 0,
        "in_transit": 0,
        "out_for_delivery": 0,
        "at_pickup_point": 0,
        "delivered": 0,
        "returning": 0,
        "exception": 0,
        "unknown": 0,
    }
    for parcel in parcels:
        summary[parcel.status_group] = summary.get(parcel.status_group, 0) + 1
    return summary


def parcel_to_dict(parcel: Parcel) -> dict[str, Any]:
    return {
        "index": parcel.index,
        "tracking_number": parcel.tracking_number,
        "carrier": parcel.carrier,
        "status": parcel.status,
        "status_group": parcel.status_group,
        "last_event": parcel.last_event,
        "last_event_time": parcel.last_event_time,
        "destination": parcel.destination,
    }


def empty_parcel_attributes(index: int) -> dict[str, Any]:
    return {
        "index": index,
        "tracking_number": "",
        "carrier": "",
        "status": "",
        "status_group": "",
        "last_event": "",
        "last_event_time": "",
        "destination": "",
    }


def parse_tracking_numbers(value: Any) -> list[str]:
    if isinstance(value, list):
        items = value
    else:
        items = str(value or "").replace("\n", ",").split(",")
    result = []
    for item in items:
        text = str(item).strip()
        if text and text not in result:
            result.append(text)
    return result


def parse_dhl_numbers(value: Any) -> list[str]:
    return parse_tracking_numbers(value)


def dhl_code_from_url(value: str) -> str:
    text = str(value or "").strip()
    if not text.startswith("dhllogin://"):
        return ""
    query = parse_qs(urlparse(text).query)
    return first_text(*(query.get("code") or []))


def option_group(raw: dict[str, Any], name: str) -> dict[str, Any]:
    value = raw.get(name)
    return value if isinstance(value, dict) else {}


def option_value(raw: dict[str, Any], group: str, key: str, legacy_key: str, default: Any = "") -> Any:
    grouped = option_group(raw, group)
    if key in grouped:
        return grouped.get(key)
    return raw.get(legacy_key, default)


def option_bool(raw: dict[str, Any], group: str, key: str, legacy_key: str | None, default: bool) -> bool:
    grouped = option_group(raw, group)
    if key in grouped:
        return bool(grouped.get(key))
    if legacy_key and legacy_key in raw:
        return bool(raw.get(legacy_key))
    return default


def load_options() -> Options:
    raw = {}
    options_file = os.environ.get("OPTIONS_FILE", "/data/options.json")
    if os.path.exists(options_file):
        with open(options_file, encoding="utf-8") as handle:
            raw = json.load(handle)
    mqtt = load_mqtt_service()
    return Options(
        dhl_enabled=option_bool(raw, "dhl", "enabled", None, True),
        dhl_tracking_numbers=parse_tracking_numbers(option_value(raw, "dhl", "tracking_numbers", "dhl_tracking_numbers")),
        dhl_login_code=str(option_value(raw, "dhl", "login_code", "dhl_login_code")).strip(),
        hermes_enabled=option_bool(raw, "hermes", "enabled", None, True),
        hermes_tracking_numbers=parse_tracking_numbers(option_value(raw, "hermes", "tracking_numbers", "hermes_tracking_numbers")),
        gls_enabled=option_bool(raw, "gls", "enabled", None, bool(parse_tracking_numbers(raw.get("gls_tracking_numbers", "")))),
        gls_tracking_numbers=parse_tracking_numbers(option_value(raw, "gls", "tracking_numbers", "gls_tracking_numbers")),
        gls_postal_code=str(option_value(raw, "gls", "postal_code", "gls_postal_code")).strip(),
        dpd_enabled=option_bool(raw, "dpd", "enabled", None, False),
        dpd_tracking_numbers=parse_tracking_numbers(option_value(raw, "dpd", "tracking_numbers", "dpd_tracking_numbers")),
        ups_enabled=option_bool(raw, "ups", "enabled", None, False),
        ups_tracking_numbers=parse_tracking_numbers(option_value(raw, "ups", "tracking_numbers", "ups_tracking_numbers")),
        amazon_enabled=option_bool(raw, "amazon", "enabled", None, False),
        deutsche_post_enabled=option_bool(raw, "deutsche_post", "enabled", None, False),
        deutsche_post_tracking_numbers=parse_tracking_numbers(option_value(raw, "deutsche_post", "tracking_numbers", "deutsche_post_tracking_numbers")),
        fedex_enabled=option_bool(raw, "fedex", "enabled", None, False),
        fedex_tracking_numbers=parse_tracking_numbers(option_value(raw, "fedex", "tracking_numbers", "fedex_tracking_numbers")),
        interval=max(30, int(option_value(raw, "general", "interval", "interval", 60))),
        max_parcels=max(1, min(20, int(option_value(raw, "general", "max_parcels", "max_parcels", MAX_DEFAULT_PARCELS)))),
        log_response_details=option_bool(raw, "general", "log_response_details", "log_response_details", False),
        mqtt_host=str(raw.get("mqtt_host") or mqtt.get("host") or "core-mosquitto"),
        mqtt_port=int(raw.get("mqtt_port") or mqtt.get("port") or 1883),
        mqtt_username=str(raw.get("mqtt_username") or mqtt.get("username") or ""),
        mqtt_password=str(raw.get("mqtt_password") or mqtt.get("password") or ""),
        discovery_prefix=str(raw.get("discovery_prefix", DEFAULT_DISCOVERY_PREFIX)).strip("/"),
        base_topic=str(raw.get("base_topic", DEFAULT_BASE_TOPIC)).strip("/"),
        retain=bool(raw.get("retain", True)),
    )


def load_mqtt_service() -> dict[str, Any]:
    service_file = "/services/mqtt"
    if not os.path.exists(service_file):
        return {}
    try:
        with open(service_file, encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except Exception as exc:
        LOG.warning("Could not read MQTT service file: %s", exc)
        return {}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    stop_event = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_args: stop_event.set())
    signal.signal(signal.SIGINT, lambda *_args: stop_event.set())
    options = load_options()
    publisher = MqttPublisher(options)
    client = ParcelPoller(options)
    publisher.connect()
    try:
        while not stop_event.is_set():
            try:
                parcels = client.poll()
                publisher.publish_results(parcels)
            except Exception as exc:
                LOG.exception("Polling failed: %s", exc)
                publisher._publish(f"{options.base_topic}/status", "offline")
            stop_event.wait(options.interval * 60)
    finally:
        publisher._publish(f"{options.base_topic}/status", "offline")
        publisher.disconnect()


if __name__ == "__main__":
    main()
