from __future__ import annotations

import json
import logging
import os
import re
import signal
import threading
import time
from base64 import b64encode
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from hashlib import md5
from html import escape
from typing import Any
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree

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
DHL_TRACKING_PATTERN = re.compile(r"^[A-Z0-9]{10,40}$")


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
    dpd_postal_code: str
    dpd_username: str
    dpd_password: str
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
    name: str
    status: str
    status_group: str
    delivery_status: int
    direction: str
    direction_raw: str
    last_event: str
    last_event_time: str
    destination: str
    recipient_name: str
    recipient_location: str
    events: list[dict[str, Any]]
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
        if options.dpd_enabled:
            self.clients.append(DpdClient(options))
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
        if account_numbers:
            LOG.info("DHL account provided %s active parcel number(s)", len(account_numbers))
        for tracking_number in account_numbers:
            if tracking_number and tracking_number not in tracking_numbers:
                tracking_numbers.append(tracking_number)
        if not tracking_numbers:
            LOG.info("DHL has no manual or account parcel numbers to poll")
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
            LOG.info("DHL account session is not available; only manual tracking numbers can be used")
            return []
        try:
            id_token = str(session_data.get("id_token") or "")
            access_token = str(session_data.get("access_token") or "")
            if id_token:
                self.session.cookies.set("dhli", id_token, domain=".dhl.de")
            headers = {"Authorization": f"Bearer {access_token}"} if access_token else None
            response = self.session.get(
                "https://www.dhl.de/int-verfolgen/data/search",
                params={"noRedirect": "true", "language": "de", "cid": "app"},
                headers=headers,
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
                    "account_session": bool(id_token or access_token),
                },
                response=response,
                response_data=data,
            )
            shipments = data.get("sendungen", []) if isinstance(data, dict) else []
            if not isinstance(shipments, list):
                LOG.warning("DHL account parcel list returned an unexpected response")
                return []
            LOG.info("DHL account parcel list returned %s raw shipment item(s)", len(shipments))
            numbers = []
            for item in shipments:
                if not isinstance(item, dict):
                    continue
                if value_at(item, ["sendungsinfo", "sendungsliste"]) == "ARCHIVIERT":
                    continue
                for tracking_id in dhl_tracking_ids(item):
                    if tracking_id not in numbers:
                        numbers.append(tracking_id)
            if not numbers:
                LOG.info(
                    "DHL account parcel list was read, but no active parcel numbers were found. Enable general.log_response_details for a masked DHL response log."
                )
            return numbers
        except Exception as exc:
            LOG.warning("Could not fetch DHL account parcel list: %s", exc)
            return []

    def ensure_account_session(self) -> dict[str, Any] | None:
        session_data = self.load_session()
        if session_data and session_data.get("refresh_token"):
            refreshed = self.refresh_session(session_data["refresh_token"])
            if refreshed:
                LOG.info("DHL account session refreshed successfully")
                return refreshed
        if self.options.dhl_login_code:
            return self.login_with_code(self.options.dhl_login_code)
        LOG.info("DHL login code is empty and no reusable DHL session is stored")
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
            LOG.info(
                "DHL account login successful. Access token: %s, refresh token: %s. The stored refresh token will be reused on the next starts.",
                "yes" if session_data.get("access_token") else "no",
                "yes" if session_data.get("refresh_token") else "no",
            )
            return session_data
        except requests.HTTPError as exc:
            LOG.warning("DHL account login failed: %s", describe_http_error(exc))
            return None
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
        except requests.HTTPError as exc:
            LOG.info("DHL refresh token could not be used: %s", describe_http_error(exc))
            return None
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
        status_group = dpd_status_group(item.get("status_id"), f"{status_text} {last_event}")
        if item.get("delivered"):
            status_group = "delivered"
        progress = int(value_at(item, ["sendungsdetails", "sendungsverlauf", "fortschritt"]) or 0)
        return Parcel(
            index=0,
            tracking_number=dhl_tracking_id(item),
            carrier="DHL",
            name=first_text(value_at(item, ["sendungsinfo", "sendungsname"]), value_at(item, ["sendungsdetails", "quelle"])),
            status=status_text or human_status(status_group),
            status_group=status_group,
            delivery_status=delivery_status(progress, status_group),
            direction=parcel_direction(item),
            direction_raw=parcel_direction_raw(item),
            last_event=last_event,
            last_event_time=last_event_time,
            destination=str(value_at(item, ["sendungsinfo", "zielland"]) or ""),
            recipient_name=first_text(value_at(item, ["panEmpfaenger", "name"]), value_at(item, ["empfaenger", "name"])),
            recipient_location=first_text(value_at(item, ["panEmpfaenger", "ort"]), value_at(item, ["empfaenger", "ort"])),
            events=dhl_events(item),
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
            name=first_text(item.get("name"), item.get("senderName"), value_at(item, ["sender", "name"])),
            status=last_event or human_status(status_group),
            status_group=status_group,
            delivery_status=delivery_status(0, status_group),
            direction=parcel_direction(item),
            direction_raw=parcel_direction_raw(item),
            last_event=last_event,
            last_event_time=first_text(latest.get("timestamp"), latest.get("date"), item.get("eta")),
            destination=first_text(
                value_at(item, ["recipient", "city"]),
                value_at(item, ["receiver", "city"]),
                value_at(item, ["deliveryAddress", "city"]),
            ),
            recipient_name=first_text(value_at(item, ["recipient", "name"]), value_at(item, ["receiver", "name"])),
            recipient_location=first_text(
                value_at(item, ["recipient", "city"]),
                value_at(item, ["receiver", "city"]),
                value_at(item, ["deliveryAddress", "city"]),
            ),
            events=generic_events(history),
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


class DpdClient:
    """Track DPD account parcels and optionally manual parcel numbers."""

    VERIFY_URL = "https://www.mydpd.at/jws.php/parcel/verify"
    SERVICE_URL = "https://api.paketnavigator.de/services/v1/Navigator3Service.asmx"
    NAMESPACE = "https://cloud.dpd.com/"
    PARTNER_NAME = "Android Paketnavigator3"
    PARTNER_TOKEN = "A33363237662F5945576"
    PARTNER_PASSWORD = "272 WetFd2mpXrgD"
    API_VERSION = 100
    LANGUAGE = "de_DE"
    SESSION_FILE = "/data/dpd_session.json"

    def __init__(self, options: Options) -> None:
        self.options = options
        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json",
            "content-type": "application/json",
            "accept-language": "de-DE,de;q=0.9",
            "origin": "https://www.mydpd.at",
            "referer": "https://www.mydpd.at/",
            "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        })

    def poll(self) -> list[Parcel]:
        account_parcels = self.fetch_account_parcels()
        manual_parcels = self.fetch_manual_parcels()
        if not account_parcels and not manual_parcels:
            LOG.info("DPD has no account parcels or usable manual tracking numbers")
        return account_parcels + manual_parcels

    def fetch_manual_parcels(self) -> list[Parcel]:
        if not self.options.dpd_tracking_numbers:
            return []
        if not self.options.dpd_postal_code:
            LOG.warning("DPD manual tracking numbers are configured, but dpd.postal_code is empty")
            return []

        parcels = []
        for tracking_number in self.options.dpd_tracking_numbers:
            try:
                response = self.session.post(
                    self.VERIFY_URL,
                    json=[tracking_number, self.options.dpd_postal_code],
                    timeout=30,
                )
                response.raise_for_status()
                data = response.json()
                debug_provider_exchange(
                    self.options,
                    provider="DPD",
                    phase="tracking",
                    request_data={
                        "method": "POST",
                        "url": response.url,
                        "tracking_number": tracking_number,
                        "postal_code": "***",
                    },
                    response=response,
                    response_data=data,
                )
                items = dpd_parcel_items(data)
                if not items:
                    LOG.info("DPD parcel %s is unknown, not scanned yet, or does not match the postal code", tracking_number)
                    continue
                parcels.extend(self.normalize_parcel(tracking_number, item) for item in items)
            except requests.HTTPError as exc:
                LOG.warning("Could not fetch DPD parcel %s: %s", tracking_number, describe_http_error(exc))
            except Exception as exc:
                LOG.warning("Could not fetch DPD parcel %s: %s", tracking_number, exc)
        return parcels

    def fetch_account_parcels(self) -> list[Parcel]:
        if not self.options.dpd_username or not self.options.dpd_password:
            return []
        session = self.ensure_account_session()
        if not session:
            return []
        response = self.get_session_full_state(session)
        if not response:
            return []
        session_token = dpd_xml_text(response, "SessionToken")
        if session_token and session_token != session.get("session_token"):
            self.save_session({**session, "session_token": session_token})
        parcels = []
        for item in dpd_account_parcel_items(response):
            parcels.append(self.normalize_parcel(first_text(item.get("pno")), item))
        LOG.info("DPD account returned %s parcel(s)", len(parcels))
        return parcels

    def ensure_account_session(self) -> dict[str, Any] | None:
        stored = self.load_session()
        if stored and stored.get("session_token") and stored.get("cloud_user_id"):
            return stored
        return self.login_account()

    def login_account(self) -> dict[str, Any] | None:
        anonymous_response = self.soap_call(
            "getSessionFullState",
            self.session_request_body("", 0),
        )
        if not anonymous_response:
            return None
        anonymous_token = dpd_xml_text(anonymous_response, "SessionToken")
        if not anonymous_token:
            LOG.warning("DPD anonymous session did not return a session token")
            return None

        key_phase = self.key_phase(0, "getUserLogin")
        body = (
            f'<getUserLoginRequest xmlns="{self.NAMESPACE}">'
            f"<Version>{self.API_VERSION}</Version><Language>{self.LANGUAGE}</Language>"
            f"{self.partner_credentials(key_phase)}"
            f"<SessionToken>{escape(anonymous_token)}</SessionToken>"
            f"<UserName>{escape(self.options.dpd_username)}</UserName>"
            f"<UserPassword>{escape(self.options.dpd_password)}</UserPassword>"
            "</getUserLoginRequest>"
        )
        login_response = self.soap_call("getUserLogin", body)
        if not login_response:
            return None
        if dpd_xml_text(login_response, "Ack").lower() != "true":
            LOG.warning("DPD login was rejected: %s", first_text(dpd_xml_text(login_response, "ErrorMsg"), dpd_xml_text(login_response, "ErrorCode")))
            return None
        session_token = dpd_xml_text(login_response, "SessionToken")
        cloud_user_id = dpd_xml_text(login_response, "cloudUserID")
        if not session_token or not cloud_user_id:
            LOG.warning("DPD login did not return a complete user session")
            return None
        session = {"session_token": session_token, "cloud_user_id": cloud_user_id}
        self.save_session(session)
        LOG.info("DPD account login successful; the session will be reused on the next start")
        return session

    def get_session_full_state(self, session: dict[str, Any]) -> str:
        response = self.soap_call(
            "getSessionFullState",
            self.session_request_body(
                str(session.get("session_token") or ""),
                int(str(session.get("cloud_user_id") or "0")),
            ),
        )
        if not response:
            return ""
        if dpd_xml_text(response, "Ack").lower() == "true":
            return response

        LOG.info("DPD account session is no longer valid; signing in again")
        self.clear_session()
        renewed = self.login_account()
        if not renewed:
            return ""
        retry = self.soap_call(
            "getSessionFullState",
            self.session_request_body(
                str(renewed.get("session_token") or ""),
                int(str(renewed.get("cloud_user_id") or "0")),
            ),
        )
        return retry if retry and dpd_xml_text(retry, "Ack").lower() == "true" else ""

    def session_request_body(self, session_token: str, cloud_user_id: int) -> str:
        return (
            f'<getSessionFullStateRequest xmlns="{self.NAMESPACE}">'
            f"<Version>{self.API_VERSION}</Version><Language>{self.LANGUAGE}</Language>"
            f"{self.partner_credentials(self.key_phase(cloud_user_id, 'getSessionFullState'))}"
            f"<SessionToken>{escape(session_token)}</SessionToken>"
            "<DeviceData><Version>1</Version><HardwareID>parcel-to-mqtt</HardwareID>"
            "<BootSystemID>Android_Phone</BootSystemID><Name>Parcel to MQTT</Name>"
            "<AppVersion>4.1.2</AppVersion><PushToken></PushToken>"
            "<AllowPushNotifications>false</AllowPushNotifications></DeviceData>"
            "</getSessionFullStateRequest>"
        )

    def partner_credentials(self, key_phase: str) -> str:
        return (
            f'<PartnerCredentials xmlns="{self.NAMESPACE}"><Name>{self.PARTNER_NAME}</Name>'
            f"<Token>{self.PARTNER_TOKEN}</Token><KeyPhase>{escape(key_phase)}</KeyPhase></PartnerCredentials>"
        )

    def key_phase(self, cloud_user_id: int, operation: str) -> str:
        now = datetime.now(timezone.utc)
        time_seed = str(((now.hour * 60 + now.minute + 1000) * 3))
        digest = b64encode(md5(f"{time_seed}{self.PARTNER_NAME}{cloud_user_id}{operation}{self.PARTNER_PASSWORD}".encode()).digest()).decode()
        return f"{time_seed}{digest[:16]}"

    def soap_call(self, operation: str, body: str) -> str:
        envelope = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>'
            f'<{operation} xmlns="{self.NAMESPACE}">{body}</{operation}>'
            "</soap:Body></soap:Envelope>"
        )
        try:
            response = self.session.post(
                self.SERVICE_URL,
                headers={
                    "content-type": "text/xml; charset=utf-8",
                    "soapaction": f"{self.NAMESPACE}{operation}",
                    "accept": "text/xml",
                    "user-agent": "ksoap2-android/2.6.0+",
                },
                data=envelope.encode("utf-8"),
                timeout=60,
            )
            response.raise_for_status()
            debug_provider_exchange(
                self.options,
                provider="DPD",
                phase=operation,
                request_data={"method": "POST", "url": response.url, "operation": operation},
                response=response,
                response_data={"ack": dpd_xml_text(response.text, "Ack")},
            )
            return response.text
        except requests.HTTPError as exc:
            LOG.warning("DPD %s failed: %s", operation, describe_http_error(exc))
        except Exception as exc:
            LOG.warning("DPD %s failed: %s", operation, exc)
        return ""

    @classmethod
    def load_session(cls) -> dict[str, Any] | None:
        try:
            if os.path.exists(cls.SESSION_FILE):
                with open(cls.SESSION_FILE, encoding="utf-8") as handle:
                    data = json.load(handle)
                return data if isinstance(data, dict) else None
        except Exception as exc:
            LOG.warning("Could not read stored DPD session: %s", exc)
        return None

    @classmethod
    def save_session(cls, session: dict[str, Any]) -> None:
        try:
            with open(cls.SESSION_FILE, "w", encoding="utf-8") as handle:
                json.dump(session, handle)
        except Exception as exc:
            LOG.warning("Could not store DPD session: %s", exc)

    @classmethod
    def clear_session(cls) -> None:
        try:
            if os.path.exists(cls.SESSION_FILE):
                os.remove(cls.SESSION_FILE)
        except Exception as exc:
            LOG.warning("Could not remove stored DPD session: %s", exc)

    @staticmethod
    def normalize_parcel(tracking_number: str, item: dict[str, Any]) -> Parcel:
        entries = dpd_lifecycle_entries(item)
        latest = dpd_latest_event(entries)
        last_event = dpd_event_status(latest)
        status_text = first_text(
            last_event,
            value_at(item, ["status", "text"]),
            item.get("status"),
            item.get("state"),
        )
        status_group = normalize_status_group(f"{status_text} {last_event}")
        recipient = first_dict(item.get("recipient"), item.get("receiver"), item.get("consignee"))
        recipient_location = first_text(
            recipient.get("city"),
            recipient.get("place"),
            item.get("destination"),
            value_at(item, ["deliveryAddress", "city"]),
        )
        return Parcel(
            index=0,
            tracking_number=first_text(item.get("pno"), item.get("parcelNumber"), item.get("trackingNumber"), tracking_number),
            carrier="DPD",
            name=first_text(item.get("name"), item.get("senderName"), value_at(item, ["sender", "name"]), value_at(item, ["shipper", "name"])),
            status=status_text or human_status(status_group),
            status_group=status_group,
            delivery_status=delivery_status(0, status_group),
            direction=parcel_direction(item),
            direction_raw=parcel_direction_raw(item),
            last_event=last_event or status_text,
            last_event_time=dpd_event_time(latest),
            destination=first_text(item.get("destinationCountry"), item.get("destination"), recipient.get("country")),
            recipient_name=first_text(recipient.get("name"), recipient.get("fullName")),
            recipient_location=recipient_location,
            events=dpd_events(entries),
            raw=item,
        )


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
        self._network_loop_started = False
        self._connected = False

    def connect(self) -> None:
        LOG.info("Using MQTT broker %s:%s as user '%s'", self.options.mqtt_host, self.options.mqtt_port, self.options.mqtt_username or "<empty>")
        self.client.on_connect = self._on_connect
        self.client.connect(self.options.mqtt_host, self.options.mqtt_port, keepalive=60)
        self.client.loop_start()
        self._network_loop_started = True
        self._connected = True

    def disconnect(self) -> None:
        if not self._network_loop_started:
            return

        try:
            if self._connected:
                self.client.disconnect()
        except (OSError, RuntimeError) as exc:
            LOG.debug("MQTT was already disconnected during shutdown: %s", exc)
        finally:
            self._connected = False
            try:
                self.client.loop_stop()
            except (OSError, RuntimeError) as exc:
                LOG.debug("MQTT loop was already stopped during shutdown: %s", exc)
            self._network_loop_started = False

    def publish_results(self, parcels: list[Parcel]) -> None:
        if not self._published_discovery:
            self.publish_discovery()
            self._published_discovery = True
        self._publish(f"{self.options.base_topic}/status", "online")
        self._publish(f"{self.options.base_topic}/last_update", datetime.now(timezone.utc).isoformat())
        summary = parcel_summary(parcels)
        self._publish_json(f"{self.options.base_topic}/all", [parcel_to_dict(parcel) for parcel in parcels])
        self._publish_json(f"{self.options.base_topic}/list", parcel_list_payload(parcels))
        self._publish_json(f"{self.options.base_topic}/all/json", provider_detail_payload(parcels))
        for slug, _name, carrier, _icon in PROVIDER_DETAIL_SENSORS:
            self._publish_json(
                f"{self.options.base_topic}/{slug}/json",
                provider_detail_payload(parcels, carrier),
            )
        self._publish_json(f"{self.options.base_topic}/allProviderJson", [parcel_to_provider_item(parcel) for parcel in parcels])
        self._publish_json(f"{self.options.base_topic}/allProviderObjects", {
            parcel.tracking_number: parcel_to_provider_item(parcel)
            for parcel in parcels
            if parcel.tracking_number
        })
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
        self._publish_config("sensor", "list", {
            "name": "Parcel Liste JSON",
            "unique_id": "parcel_to_mqtt_list",
            "state_topic": f"{self.options.base_topic}/total",
            "json_attributes_topic": f"{self.options.base_topic}/list",
            "icon": "mdi:format-list-bulleted",
            "device": self._device(),
        })
        self._publish_config("sensor", "all_provider", {
            "name": "Parcel alle Provider JSON",
            "unique_id": "parcel_to_mqtt_all_provider",
            "state_topic": f"{self.options.base_topic}/total",
            "json_attributes_topic": f"{self.options.base_topic}/allProviderObjects",
            "icon": "mdi:package-variant",
            "device": self._device(),
        })
        self._publish_config("sensor", "all_json", {
            "name": "Parcel Alle JSON",
            "unique_id": "parcel_to_mqtt_all_json",
            "state_topic": f"{self.options.base_topic}/total",
            "json_attributes_topic": f"{self.options.base_topic}/all/json",
            "icon": "mdi:package-variant-closed",
            "device": self._device(),
        })
        for slug, name, _carrier, icon in PROVIDER_DETAIL_SENSORS:
            self._publish_config("sensor", f"{slug}_json", {
                "name": f"Parcel {name} JSON",
                "unique_id": f"parcel_to_mqtt_{slug}_json",
                "state_topic": f"{self.options.base_topic}/total",
                "json_attributes_topic": f"{self.options.base_topic}/{slug}/json",
                "icon": icon,
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
        if not self._connected:
            LOG.debug("Skipped MQTT publish during shutdown: %s", topic)
            return
        try:
            self.client.publish(topic, payload, qos=0, retain=self.options.retain if retain is None else retain)
        except (OSError, RuntimeError) as exc:
            LOG.debug("MQTT publish failed during shutdown for %s: %s", topic, exc)

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


def describe_http_error(exc: requests.HTTPError) -> str:
    response = exc.response
    if response is None:
        return str(exc)
    text = response.text.strip().replace("\n", " ")
    if len(text) > 500:
        text = text[:500] + "...<truncated>"
    return f"{response.status_code} {response.reason}: {text or str(exc)}"


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


def dhl_events(item: dict[str, Any]) -> list[dict[str, Any]]:
    history = value_at(item, ["sendungsdetails", "sendungsverlauf"])
    if not isinstance(history, dict):
        return []
    events = history.get("events") or history.get("ereignisse") or history.get("eventsProgressbar")
    return generic_events(events)


def generic_events(events: Any) -> list[dict[str, Any]]:
    if not isinstance(events, list):
        return []
    result = []
    for event in events:
        if not isinstance(event, dict):
            continue
        result.append({
            "date": first_text(event.get("datum"), event.get("date"), event.get("timestamp"), event.get("time")),
            "location": first_text(event.get("ort"), event.get("location"), event.get("place")),
            "status": first_text(event.get("status"), event.get("text"), event.get("description"), event.get("historyText"), event.get("parcelStatus")),
            "return": str(first_text(event.get("ruecksendung"), event.get("rücksendung"), event.get("return"), event.get("isReturn"))).lower() == "true",
        })
    return result


def first_dict(*values: Any) -> dict[str, Any]:
    for value in values:
        if isinstance(value, dict):
            return value
    return {}


def dpd_parcel_items(data: Any) -> list[dict[str, Any]]:
    if not isinstance(data, dict):
        return []
    if str(data.get("state") or "").lower() in {"failure", "error"}:
        return []
    candidates = data.get("data") or data.get("parcels") or data.get("parcel")
    if isinstance(candidates, list):
        return [item for item in candidates if isinstance(item, dict)]
    if isinstance(candidates, dict):
        return [candidates]
    if isinstance(data.get("lifecycle"), dict) or isinstance(data.get("lifeCycle"), dict):
        return [data]
    return []


def dpd_lifecycle_entries(item: dict[str, Any]) -> list[dict[str, Any]]:
    lifecycle = first_dict(item.get("lifecycle"), item.get("lifeCycle"), item.get("parcelLifecycle"))
    entries = lifecycle.get("entries") or lifecycle.get("events") or item.get("events")
    return [entry for entry in entries if isinstance(entry, dict)] if isinstance(entries, list) else []


def dpd_event_time(event: dict[str, Any]) -> str:
    return first_text(event.get("datetime"), event.get("timestamp"), event.get("date"), event.get("time"))


def dpd_event_status(event: dict[str, Any]) -> str:
    state = event.get("state")
    state_text = first_text(state.get("text"), state.get("label"), state.get("description")) if isinstance(state, dict) else state
    return first_text(state_text, event.get("status"), event.get("text"), event.get("description"), event.get("historyText"))


def dpd_event_location(event: dict[str, Any]) -> str:
    depot = event.get("depotData") or event.get("depot")
    if isinstance(depot, list):
        return ", ".join(str(item).strip() for item in depot if str(item).strip())
    if isinstance(depot, dict):
        return first_text(depot.get("city"), depot.get("name"), depot.get("location"))
    return first_text(depot, event.get("location"), event.get("place"), event.get("city"))


def dpd_latest_event(entries: list[dict[str, Any]]) -> dict[str, Any]:
    return max(entries, key=dpd_event_time, default={})


def dpd_events(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "date": dpd_event_time(event),
            "location": dpd_event_location(event),
            "status": dpd_event_status(event),
            "return": False,
        }
        for event in entries
    ]


def dpd_status_group(status_id: Any, text: str) -> str:
    status_map = {
        "NO_TRACKINGDATA": "registered",
        "DATA_TRANSMITTED": "registered",
        "ACCEPTED": "registered",
        "START": "registered",
        "COLLECTED": "in_transit",
        "AT_SENDING_DEPOT": "in_transit",
        "ON_THE_ROAD": "in_transit",
        "AT_DELIVERY_DEPOT": "in_transit",
        "SORTED": "in_transit",
        "SORTED_TO_PICKUP_LOCATION": "in_transit",
        "PARCEL_PROCESSING": "in_transit",
        "OUT_FOR_DELIVERY": "out_for_delivery",
        "IN_DELIVERY": "out_for_delivery",
        "AT_PARCELSHOP": "at_pickup_point",
        "DELIVERED": "delivered",
        "PICKED_UP": "delivered",
        "RETURN_TO_SENDER": "returning",
    }
    return status_map.get(str(status_id or "").upper(), normalize_status_group(text))


def dpd_xml_local_name(element: ElementTree.Element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def dpd_xml_text(xml: str, name: str) -> str:
    if not xml:
        return ""
    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError:
        return ""
    for element in root.iter():
        if dpd_xml_local_name(element) == name:
            return first_text(element.text)
    return ""


def dpd_xml_descendant_text(element: ElementTree.Element, name: str) -> str:
    for child in element.iter():
        if dpd_xml_local_name(child) == name:
            return first_text(child.text)
    return ""


def dpd_account_parcel_items(xml: str) -> list[dict[str, Any]]:
    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError:
        return []

    lists = (
        ("ReceiveTrackingDataList", "ReceiveTrackingData", "receive"),
        ("SendTrackingDataList", "SendTrackingData", "send"),
        ("ReturnTrackingDataList", "ReturnTrackingData", "return"),
    )
    parcels = []
    for list_name, item_name, direction in lists:
        for tracking_list in root.iter():
            if dpd_xml_local_name(tracking_list) != list_name:
                continue
            for item in tracking_list.iter():
                if dpd_xml_local_name(item) != item_name:
                    continue
                parcel_number = dpd_xml_descendant_text(item, "ParcelNo")
                if not parcel_number:
                    continue
                status_container = next((child for child in item.iter() if dpd_xml_local_name(child) == "LastStatusInfo"), item)
                status = first_text(
                    dpd_xml_descendant_text(status_container, "StatusText_Mobile"),
                    dpd_xml_descendant_text(item, "StatusText_Mobile"),
                    dpd_xml_descendant_text(item, "DataViewStatus"),
                )
                status_id = first_text(
                    dpd_xml_descendant_text(status_container, "StatusID"),
                    dpd_xml_descendant_text(item, "StatusID"),
                )
                status_date = first_text(
                    dpd_xml_descendant_text(status_container, "StatusDate"),
                    dpd_xml_descendant_text(item, "StatusDate"),
                )
                parcels.append({
                    "pno": parcel_number,
                    "name": first_text(dpd_xml_descendant_text(item, "ParcelNicName"), parcel_number),
                    "status": status,
                    "status_id": status_id,
                    "delivered": dpd_xml_descendant_text(item, "Delivered").lower() == "true",
                    "direction": direction,
                    "eta": dpd_xml_descendant_text(item, "EstimatedDeliveryDateTimeFrom"),
                    "lifecycle": {
                        "entries": [{
                            "datetime": status_date,
                            "state": {"text": status},
                        }],
                    },
                })
    return parcels


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


def delivery_status(progress: int, status_group: str) -> int:
    if progress > 0:
        return progress * 10
    return {
        "registered": 10,
        "in_transit": 20,
        "out_for_delivery": 40,
        "at_pickup_point": 50,
        "delivered": 100,
        "returning": 70,
        "exception": 90,
        "unknown": 0,
    }.get(status_group, 0)


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
        "id": parcel.tracking_number,
        "tracking_number": parcel.tracking_number,
        "number": parcel.tracking_number,
        "name": parcel.name,
        "source": parcel.carrier,
        "carrier": parcel.carrier,
        "status": parcel.status,
        "status_group": parcel.status_group,
        "delivery_status": parcel.delivery_status,
        "direction": parcel.direction,
        "direction_raw": parcel.direction_raw,
        "last_event": parcel.last_event,
        "last_event_time": parcel.last_event_time,
        "destination": parcel.destination,
        "recipient_name": parcel.recipient_name,
        "recipient_location": parcel.recipient_location,
        "events": parcel.events,
    }


def parcel_to_list_item(parcel: Parcel) -> dict[str, Any]:
    return {
        "id": parcel.tracking_number,
        "name": parcel.name,
        "source": parcel.carrier,
        "number": parcel.tracking_number,
        "status": parcel.status,
        "delivery_status": parcel.delivery_status,
        "direction": parcel.direction,
        "direction_raw": parcel.direction_raw,
        "recipient_name": parcel.recipient_name,
        "recipient_location": parcel.recipient_location,
    }


def parcel_to_provider_item(parcel: Parcel) -> dict[str, Any]:
    return {
        "id": parcel.tracking_number,
        "name": parcel.name,
        "status": parcel.status,
        "source": parcel.carrier,
        "delivery_status": parcel.delivery_status,
        "direction": parcel.direction_raw or parcel.direction,
        "direction_label": parcel.direction,
    }


PROVIDER_DETAIL_SENSORS: tuple[tuple[str, str, str, str], ...] = (
    ("dhl", "DHL", "DHL", "mdi:truck"),
    ("hermes", "Hermes", "Hermes", "mdi:truck"),
    ("gls", "GLS", "GLS", "mdi:truck"),
    ("dpd", "DPD", "DPD", "mdi:truck"),
    ("ups", "UPS", "UPS", "mdi:truck"),
    ("amazon", "Amazon Logistics", "Amazon Logistics", "mdi:truck"),
    ("deutsche_post", "Deutsche Post", "Deutsche Post letters", "mdi:email"),
    ("fedex", "FedEx", "FedEx", "mdi:truck"),
)


def provider_detail_payload(parcels: list[Parcel], carrier: str | None = None) -> dict[str, Any]:
    return {
        "sendungen": [
            parcel_to_iobroker_shipment(parcel)
            for parcel in parcels
            if carrier is None or parcel.carrier == carrier
        ],
        "mergedAnonymousShipmentListIds": [],
        "rateLimited": False,
    }


def parcel_to_iobroker_shipment(parcel: Parcel) -> dict[str, Any]:
    return {
        "id": parcel.tracking_number,
        "source": parcel.carrier,
        "hasCompleteDetails": True,
        "sendungsinfo": {
            "gesuchteSendungsnummer": parcel.tracking_number,
            "sendungsname": parcel.name,
            "sendungsrichtung": parcel.direction_raw or parcel.direction,
            "sendungsliste": "AKTUELL",
        },
        "sendungsdetails": {
            "sendungsnummern": {
                "sendungsnummer": parcel.tracking_number,
            },
            "panEmpfaenger": {
                "name": parcel.recipient_name,
                "ort": parcel.recipient_location,
            },
            "sendungsverlauf": {
                "datumAktuellerStatus": parcel.last_event_time,
                "status": parcel.status,
                "fortschritt": max(0, parcel.delivery_status // 10),
                "maximalFortschritt": 5,
                "farbe": 0,
                "events": parcel.events,
            },
            "zielland": parcel.destination,
        },
        "versandDatumBenoetigt": False,
        "reasonForRejection": "",
        "paeckchen": False,
    }


def parcel_list_payload(parcels: list[Parcel]) -> dict[str, Any]:
    return {
        "count": len(parcels),
        "parcels": [parcel_to_list_item(parcel) for parcel in parcels],
    }


def empty_parcel_attributes(index: int) -> dict[str, Any]:
    return {
        "index": index,
        "id": "",
        "tracking_number": "",
        "number": "",
        "name": "",
        "source": "",
        "carrier": "",
        "status": "",
        "status_group": "",
        "delivery_status": 0,
        "direction": "unbekannt",
        "direction_raw": "",
        "last_event": "",
        "last_event_time": "",
        "destination": "",
        "recipient_name": "",
        "recipient_location": "",
        "events": [],
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
    if not text:
        return ""
    if "code=" in text:
        query = parse_qs(urlparse(text).query)
        return first_text(*(query.get("code") or []))
    if "://" not in text and "&" not in text and "?" not in text:
        return text
    return ""


def dhl_tracking_id(item: dict[str, Any]) -> str:
    return first_text(*dhl_tracking_ids(item))


def parcel_direction(item: dict[str, Any]) -> str:
    explicit = " ".join(filter(None, [parcel_direction_raw(item), direction_text_candidates(item)]))
    direction = direction_from_text(explicit)
    if direction != "unbekannt":
        return direction
    status_text = first_text(
        item.get("status"),
        item.get("state"),
        value_at(item, ["sendungsinfo", "status"]),
        value_at(item, ["sendungsdetails", "sendungsverlauf", "status"]),
        value_at(item, ["sendungsdetails", "sendungsverlauf", "kurzStatus"]),
    )
    return direction_from_text(status_text)


def parcel_direction_raw(item: dict[str, Any]) -> str:
    return first_text(
        item.get("direction"),
        item.get("richtung"),
        item.get("sendungsrichtung"),
        item.get("shipmentDirection"),
        value_at(item, ["sendungsinfo", "richtung"]),
        value_at(item, ["sendungsinfo", "sendungsrichtung"]),
        value_at(item, ["sendungsinfo", "sendungsliste"]),
        value_at(item, ["shipment", "direction"]),
    )


def direction_from_text(value: str) -> str:
    text = str(value or "").lower()
    if text.strip() in {"send", "return"}:
        return "von mir"
    if text.strip() in {"receive", "received"}:
        return "zu mir"
    outbound_markers = (
        "von mir",
        "ausgehend",
        "ausgang",
        "outbound",
        "send",
        "sent",
        "retoure",
        "return",
        "rücksendung",
        "ruecksendung",
        "abgehend",
    )
    inbound_markers = (
        "zu mir",
        "eingehend",
        "eingang",
        "inbound",
        "receive",
        "received",
        "empfangen",
        "ankommend",
    )
    if any(marker in text for marker in outbound_markers):
        return "von mir"
    if any(marker in text for marker in inbound_markers):
        return "zu mir"
    return "unbekannt"


def direction_text_candidates(value: Any) -> str:
    candidates = []
    collect_direction_text_candidates(value, candidates)
    return " ".join(candidates)


def collect_direction_text_candidates(value: Any, candidates: list[str]) -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            key_text = str(key).lower()
            if any(marker in key_text for marker in ("direction", "richtung", "sendungsliste")):
                candidates.append(str(item or ""))
            collect_direction_text_candidates(item, candidates)
    elif isinstance(value, list):
        for item in value:
            collect_direction_text_candidates(item, candidates)


def dhl_tracking_ids(item: dict[str, Any]) -> list[str]:
    explicit = [
        item.get("id"),
        item.get("sendungsnummer"),
        item.get("piececode"),
        item.get("pieceCode"),
        item.get("shipmentNo"),
        item.get("shipmentNumber"),
        value_at(item, ["sendungsinfo", "sendungsnummer"]),
        value_at(item, ["sendungsinfo", "piececode"]),
        value_at(item, ["sendungsdetails", "sendungsnummer"]),
    ]
    result = []
    for value in explicit:
        text = str(value or "").strip()
        if text and text not in result:
            result.append(text)
    collect_dhl_tracking_candidates(item, result)
    return result


def collect_dhl_tracking_candidates(value: Any, result: list[str]) -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            key_text = str(key).lower()
            if any(marker in key_text for marker in ("sendung", "shipment", "tracking", "piece", "barcode")):
                text = str(item or "").strip()
                if DHL_TRACKING_PATTERN.match(text) and text not in result:
                    result.append(text)
            collect_dhl_tracking_candidates(item, result)
    elif isinstance(value, list):
        for item in value:
            collect_dhl_tracking_candidates(item, result)


def option_group(raw: dict[str, Any], name: str) -> dict[str, Any]:
    value = raw.get(name)
    return value if isinstance(value, dict) else {}


def option_value(raw: dict[str, Any], group: str, key: str, legacy_key: str, default: Any = "") -> Any:
    grouped = option_group(raw, group)
    if key in grouped:
        return grouped.get(key)
    return raw.get(legacy_key, default)


def option_value_non_empty(raw: dict[str, Any], group: str, key: str, legacy_key: str, default: Any = "") -> Any:
    value = option_value(raw, group, key, legacy_key, None)
    if value is None or value == "":
        return default
    return value


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
        dpd_postal_code=str(option_value(raw, "dpd", "postal_code", "dpd_postal_code")).strip(),
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
        mqtt_host=str(option_value_non_empty(raw, "mqtt", "host", "mqtt_host", mqtt.get("host") or "core-mosquitto")),
        mqtt_port=int(option_value_non_empty(raw, "mqtt", "port", "mqtt_port", mqtt.get("port") or 1883)),
        mqtt_username=str(option_value_non_empty(raw, "mqtt", "username", "mqtt_username", mqtt.get("username") or "")),
        mqtt_password=str(option_value_non_empty(raw, "mqtt", "password", "mqtt_password", mqtt.get("password") or "")),
        discovery_prefix=str(option_value_non_empty(raw, "mqtt", "discovery_prefix", "discovery_prefix", DEFAULT_DISCOVERY_PREFIX)).strip("/"),
        base_topic=str(option_value_non_empty(raw, "mqtt", "base_topic", "base_topic", DEFAULT_BASE_TOPIC)).strip("/"),
        retain=bool(option_value(raw, "mqtt", "retain", "retain", True)),
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
        try:
            publisher._publish(f"{options.base_topic}/status", "offline")
        finally:
            publisher.disconnect()


if __name__ == "__main__":
    main()
