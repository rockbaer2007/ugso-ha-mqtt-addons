from __future__ import annotations

import json
import logging
import os
import re
import signal
import socket
import threading
import time
import urllib.parse
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from hashlib import md5, pbkdf2_hmac
from typing import Any

import paho.mqtt.client as mqtt
import requests
from requests.auth import HTTPDigestAuth


LOG = logging.getLogger("fritzbox_to_mqtt")
SOAP_ENV = "http://schemas.xmlsoap.org/soap/envelope/"
TAM_SERVICE = "urn:dslforum-org:service:X_AVM-DE_TAM:1"
ONTEL_SERVICE = "urn:dslforum-org:service:X_AVM-DE_OnTel:1"
VOIP_SERVICE = "urn:dslforum-org:service:X_VoIP:1"
DEVICE_INFO_SERVICE = "urn:dslforum-org:service:DeviceInfo:1"
HOSTS_SERVICE = "urn:dslforum-org:service:Hosts:1"
REMOTE_SERVICE = "urn:dslforum-org:service:X_AVM-DE_RemoteAccess:1"
MYFRITZ_SERVICE = "urn:dslforum-org:service:X_AVM-DE_MyFritz:1"
APP_SETUP_SERVICE = "urn:dslforum-org:service:X_AVM-DE_AppSetup:1"
WAN_COMMON_SERVICE = "urn:dslforum-org:service:WANCommonInterfaceConfig:1"
WAN_IP_SERVICE = "urn:schemas-upnp-org:service:WANIPConnection:1"
WAN_PPP_SERVICE = "urn:schemas-upnp-org:service:WANPPPConnection:1"
DECT_SERVICE = "urn:dslforum-org:service:X_AVM-DE_DECT:1"
WLAN_SERVICE_TEMPLATE = "urn:dslforum-org:service:WLANConfiguration:{index}"
CALL_VIEW_LABELS = {
    "all": "Anrufliste Alle",
    "incoming": "Anrufliste Eingehend",
    "outgoing": "Anrufliste Ausgehend",
    "missed": "Anrufliste Verpasst",
    "rejected": "Anrufliste Abgewiesen",
    "blocked": "Anrufliste Gesperrt",
    "unknown": "Anrufliste Unbekannt",
}
CALL_TYPE_VIEWS = {
    "1": "incoming",
    "2": "missed",
    "3": "outgoing",
    "9": "rejected",
    "10": "blocked",
}
WLAN_ROLES = {
    1: ("wlan2_4", "WLAN 2.4 GHz"),
    2: ("wlan5", "WLAN 5 GHz"),
    3: ("wlanguest", "WLAN Gast"),
}


@dataclass(frozen=True)
class Options:
    fritz_host: str
    fritz_port: int
    fritz_ssl: bool
    fritz_username: str
    fritz_password: str
    mqtt_host: str
    mqtt_port: int
    mqtt_username: str
    mqtt_password: str
    discovery_prefix: str
    base_topic: str
    poll_interval: int
    call_list_poll_interval: int
    tam_poll_interval: int
    dect_poll_interval: int
    phonebook_poll_interval: int
    max_tam: int
    max_wlan: int
    call_lists: str
    phonebooks: str
    phonebook_names: str
    phonebook_name_excludes: str
    call_monitor_enabled: bool
    call_monitor_port: int
    max_calls: int
    max_live_events: int
    include_dect_lines: bool
    max_dect_lines: int
    dns_over_tls_enabled: bool
    log_value_details: bool
    retain: bool


@dataclass
class PollCache:
    tam_infos: list["TamInfo"] = field(default_factory=list)
    wlan_infos: list["WlanInfo"] = field(default_factory=list)
    wan: dict[str, Any] = field(default_factory=dict)
    calls: list["CallEntry"] = field(default_factory=list)
    all_phonebooks: list["PhonebookInfo"] = field(default_factory=list)
    phonebooks: list["PhonebookInfo"] = field(default_factory=list)
    box_status: dict[str, Any] = field(default_factory=dict)
    dect_lines: list["DectLineInfo"] = field(default_factory=list)


@dataclass(frozen=True)
class TamInfo:
    index: int
    present: bool
    enabled: bool
    running: bool
    status: str
    name: str
    new_messages: int
    old_messages: int


@dataclass(frozen=True)
class WlanInfo:
    index: int
    enabled: bool
    status: str
    ssid: str


@dataclass(frozen=True)
class CallEntry:
    type_id: str
    view: str
    date: str
    name: str
    caller: str
    called: str
    number: str
    duration: str


@dataclass(frozen=True)
class PhonebookInfo:
    phonebook_id: str
    name: str
    contacts: list[dict[str, str]]


@dataclass(frozen=True)
class DectLineInfo:
    index: int
    internal_number: str
    device_number: str
    name: str

    @property
    def display_name(self) -> str:
        return self.name or f"DECT{self.index}"


@dataclass(frozen=True)
class CallMonitorEvent:
    event: str
    state: str
    timestamp: str
    connection_id: str
    caller: str
    called: str
    extension: str
    line: str
    duration: str
    raw: str


def wlan_slug(index: int) -> str:
    return WLAN_ROLES.get(index, (f"wlan_service_{index}", f"WLAN{index}"))[0]


def wlan_label(index: int) -> str:
    return WLAN_ROLES.get(index, (f"wlan_service_{index}", f"WLAN{index}"))[1]


def wlan_index_from_slug(value: str) -> int | None:
    if value.isdigit():
        return int(value)
    for index, (slug, _label) in WLAN_ROLES.items():
        if value == slug:
            return index
    return None


def unique_values(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value).strip()
        if text and text not in seen:
            result.append(text)
            seen.add(text)
    return result


class FritzBoxTr064Client:
    def __init__(self, options: Options) -> None:
        scheme = "https" if options.fritz_ssl else "http"
        self.options = options
        self.base_url = f"{scheme}://{options.fritz_host}:{options.fritz_port}"
        self.web_base_url = f"{scheme}://{options.fritz_host}"
        self.session = requests.Session()
        self.session.auth = HTTPDigestAuth(options.fritz_username, options.fritz_password)
        self.session.verify = False
        self._service_control_urls: dict[str, list[str]] | None = None
        self._dect_user_entries: list[dict[str, Any]] | None = None

    def get_tam_info(self, index: int) -> TamInfo:
        info = self._soap("/upnp/control/x_tam", TAM_SERVICE, "GetInfo", {"NewIndex": index})
        name = str(info.get("NewName", "")).strip()
        enabled = as_bool(info.get("NewEnable"))
        running = as_bool(info.get("NewTAMRunning"))
        status = str(info.get("NewStatus", "")).strip().lower()
        try:
            new_messages, old_messages = self._get_message_counts(index)
        except Exception as exc:
            LOG.debug("Could not read AB%s message list: %s", index, exc)
            new_messages, old_messages = 0, 0
        present = bool(name) or status not in {"", "not_found", "unknown"} or new_messages > 0 or old_messages > 0
        return TamInfo(index, present, enabled, running, status, name, new_messages, old_messages)

    def set_tam_enabled(self, index: int, enabled: bool) -> None:
        self._soap(
            "/upnp/control/x_tam",
            TAM_SERVICE,
            "SetEnable",
            {"NewIndex": index, "NewEnable": 1 if enabled else 0},
        )

    def get_wlan_info(self, index: int) -> WlanInfo:
        info = self._soap(
            f"/upnp/control/wlanconfig{index}",
            WLAN_SERVICE_TEMPLATE.format(index=index),
            "GetInfo",
            {},
        )
        return WlanInfo(
            index=index,
            enabled=as_bool(info.get("NewEnable")),
            status=str(info.get("NewStatus", "")).strip() or "unknown",
            ssid=str(info.get("NewSSID", "")).strip(),
        )

    def set_wlan_enabled(self, index: int, enabled: bool) -> None:
        self._soap(
            f"/upnp/control/wlanconfig{index}",
            WLAN_SERVICE_TEMPLATE.format(index=index),
            "SetEnable",
            {"NewEnable": 1 if enabled else 0},
        )

    def get_wan_common(self) -> dict[str, Any]:
        result: dict[str, Any] = {}
        control_urls = self._control_urls_for_service(WAN_COMMON_SERVICE, [
            "/upnp/control/wancommonifconfig1",
            "/wancommonifconfig1",
        ])
        try:
            link = self._soap_any(
                control_urls,
                WAN_COMMON_SERVICE,
                "GetCommonLinkProperties",
                {},
            )
            self._log_values("WAN GetCommonLinkProperties", link)
            result["upstream_max_bps"] = as_int(link.get("NewLayer1UpstreamMaxBitRate"))
            result["downstream_max_bps"] = as_int(link.get("NewLayer1DownstreamMaxBitRate"))
            result["physical_link_status"] = str(link.get("NewPhysicalLinkStatus", "")).strip()
        except Exception as exc:
            self._log_value_error("WAN GetCommonLinkProperties", exc)
            LOG.warning("Could not read WAN link properties: %s", exc)

        try:
            online = self._soap_any(
                control_urls,
                WAN_COMMON_SERVICE,
                "X_AVM-DE_GetOnlineMonitor",
                {"NewSyncGroupIndex": 0},
            )
            self._log_values("WAN X_AVM-DE_GetOnlineMonitor", online)
            upstream_bps = as_int(online.get("Newus_current_bps"))
            downstream_bps = as_int(online.get("Newds_current_bps"))
            if upstream_bps > 0:
                result["byte_send_rate"] = int(upstream_bps / 8)
            if downstream_bps > 0:
                result["byte_receive_rate"] = int(downstream_bps / 8)
            result["upstream_max_bps"] = as_int(online.get("Newmax_us")) or result.get("upstream_max_bps", 0)
            result["downstream_max_bps"] = as_int(online.get("Newmax_ds")) or result.get("downstream_max_bps", 0)
        except Exception as exc:
            self._log_value_error("WAN X_AVM-DE_GetOnlineMonitor", exc)
            LOG.debug("Could not read WAN online monitor: %s", exc)

        try:
            addon = self._soap_any(
                control_urls,
                WAN_COMMON_SERVICE,
                "GetAddonInfos",
                {},
            )
            self._log_values("WAN GetAddonInfos", addon)
            result["byte_send_rate"] = as_int(addon.get("NewByteSendRate")) or result.get("byte_send_rate", 0)
            result["byte_receive_rate"] = as_int(addon.get("NewByteReceiveRate")) or result.get("byte_receive_rate", 0)
        except Exception as exc:
            self._log_value_error("WAN GetAddonInfos", exc)
            LOG.debug("Could not read WAN addon infos: %s", exc)

        try:
            sent = self._soap_any(
                control_urls,
                WAN_COMMON_SERVICE,
                "GetTotalBytesSent",
                {},
            )
            self._log_values("WAN GetTotalBytesSent", sent)
            result["total_bytes_sent"] = as_int(sent.get("NewTotalBytesSent"))
        except Exception as exc:
            self._log_value_error("WAN GetTotalBytesSent", exc)
            LOG.debug("Could not read WAN total bytes sent: %s", exc)

        try:
            received = self._soap_any(
                control_urls,
                WAN_COMMON_SERVICE,
                "GetTotalBytesReceived",
                {},
            )
            self._log_values("WAN GetTotalBytesReceived", received)
            result["total_bytes_received"] = as_int(received.get("NewTotalBytesReceived"))
        except Exception as exc:
            self._log_value_error("WAN GetTotalBytesReceived", exc)
            LOG.debug("Could not read WAN total bytes received: %s", exc)

        return result

    def get_box_status(
        self,
        include_dect_lines: bool,
        max_dect_lines: int,
        include_dect_status: bool = True,
    ) -> tuple[dict[str, Any], list[DectLineInfo]]:
        result: dict[str, Any] = {}
        try:
            info = self._soap("/upnp/control/deviceinfo", DEVICE_INFO_SERVICE, "GetInfo", {})
            self._log_values("Box DeviceInfo GetInfo", info)
            result["box_meshRole"] = first_value(info, [
                "NewX_AVM-DE_MeshRole",
                "NewX_AVM_DE_MeshRole",
                "NewMeshRole",
            ])
        except Exception as exc:
            self._log_value_error("Box DeviceInfo GetInfo", exc)
            LOG.debug("Could not read mesh role: %s", exc)
        self._read_mesh_role(result)
        if not result.get("box_meshRole"):
            result["box_meshRole"] = "master"
        self._read_fritzsmart_query_values(result)

        for control_url in self._control_urls_for_service(WAN_PPP_SERVICE, [
            "/upnp/control/wanpppconn1",
            "/igdupnp/control/WANPPPConn1",
        ]):
            self._read_wan_connection_status(result, WAN_PPP_SERVICE, control_url)
            if result.get("box_ppp_connect") and result.get("ipv4_extern"):
                break
        if not result.get("box_ppp_connect") or not result.get("ipv4_extern"):
            for control_url in self._control_urls_for_service(WAN_IP_SERVICE, [
                "/upnp/control/wanipconn1",
                "/upnp/control/wanipconnection1",
                "/igdupnp/control/WANIPConn1",
            ]):
                self._read_wan_connection_status(result, WAN_IP_SERVICE, control_url)
                if result.get("box_ppp_connect") and result.get("ipv4_extern"):
                    break

        dect_lines: list[DectLineInfo] = []
        if include_dect_status:
            dect_status, dect_lines = self.get_dect_status(include_dect_lines, max_dect_lines)
            result.update(dect_status)

        if "box_dns_over_tls" in result:
            pass
        elif self.options.dns_over_tls_enabled:
            result["box_dns_over_tls"] = True
        else:
            result.setdefault("box_dns_over_tls", None)
        self._log_values("Box normalized status", result)
        return result, dect_lines

    def get_dect_status(self, include_dect_lines: bool, max_dect_lines: int) -> tuple[dict[str, Any], list[DectLineInfo]]:
        result: dict[str, Any] = {}
        dect_lines: list[DectLineInfo] = []
        try:
            dect = self._soap("/upnp/control/x_dect", DECT_SERVICE, "GetNumberOfDectEntries", {})
            self._log_values("DECT GetNumberOfDectEntries", dect)
            count = as_int(first_value(dect, ["NewNumberOfEntries", "NewNumberOfDectEntries"]))
            result["box_dect"] = count > 0
            if include_dect_lines:
                for index in range(min(count, max_dect_lines)):
                    line = self._get_dect_line(index)
                    if line is not None:
                        dect_lines.append(line)
        except Exception as exc:
            self._log_value_error("DECT GetNumberOfDectEntries", exc)
            LOG.debug("Could not read DECT info: %s", exc)
        return result, dect_lines

    def _read_wan_connection_status(self, result: dict[str, Any], service: str, control_url: str) -> None:
        try:
            status = self._soap(control_url, service, "GetStatusInfo", {})
            self._log_values(f"WAN {control_url} GetStatusInfo", status)
            connection_status = str(status.get("NewConnectionStatus", "")).strip()
            if connection_status:
                result["box_ppp_connect"] = connection_status
        except Exception as exc:
            self._log_value_error(f"WAN {control_url} GetStatusInfo", exc)
            LOG.debug("Could not read WAN status %s: %s", control_url, exc)
        try:
            external = self._soap(control_url, service, "GetExternalIPAddress", {})
            self._log_values(f"WAN {control_url} GetExternalIPAddress", external)
            ipv4 = first_value(external, [
                "NewExternalIPAddress",
                "NewX_AVM-DE_ExternalIPAddress",
                "NewX_AVM_DE_ExternalIPAddress",
                "box_ppp_IPv4_Extern",
                "box_IPv4_Extern",
            ])
            if ipv4:
                result["ipv4_extern"] = ipv4
        except Exception as exc:
            self._log_value_error(f"WAN {control_url} GetExternalIPAddress", exc)
            LOG.debug("Could not read external IPv4 %s: %s", control_url, exc)
        try:
            info = self._soap(control_url, service, "GetInfo", {})
            self._log_values(f"WAN {control_url} GetInfo", info)
            ipv6 = first_value(info, [
                "NewX_AVM-DE_ExternalIPv6Address",
                "NewX_AVM_DE_ExternalIPv6Address",
                "NewExternalIPv6Address",
                "NewIPv6Address",
                "box_IPv6_Extern",
                "box_ppp_IPv6_Extern",
            ])
            if ipv6:
                result["ipv6_extern"] = ipv6
        except Exception as exc:
            self._log_value_error(f"WAN {control_url} GetInfo", exc)
            LOG.debug("Could not read external IPv6 %s: %s", control_url, exc)
        if not result.get("ipv6_extern") and service.rsplit(":", 1)[0] == WAN_IP_SERVICE.rsplit(":", 1)[0]:
            try:
                avm_ipv6 = self._soap(control_url, service, "X_AVM_DE_GetExternalIPv6Address", {})
                self._log_values(f"WAN {control_url} X_AVM_DE_GetExternalIPv6Address", avm_ipv6)
                ipv6 = first_ipv6_value(avm_ipv6, ["NewExternalIPv6Address"])
                if ipv6:
                    result["ipv6_extern"] = ipv6
            except Exception as exc:
                self._log_value_error(f"WAN {control_url} X_AVM_DE_GetExternalIPv6Address", exc)
        if not result.get("ipv6_extern"):
            self._read_ipv6_fallbacks(result)

    def _read_mesh_role(self, result: dict[str, Any]) -> None:
        if result.get("box_meshRole"):
            return
        self._read_mesh_role_lua(result)
        if result.get("box_meshRole"):
            return
        try:
            mesh_path = self._soap("/upnp/control/hosts", HOSTS_SERVICE, "X_AVM-DE_GetMeshListPath", {})
            self._log_values("Hosts X_AVM-DE_GetMeshListPath", mesh_path)
            path = first_value(mesh_path, ["NewX_AVM-DE_MeshListPath", "NewX_AVM_DE_MeshListPath"])
            if not path:
                return
            root = self._get_xml_url(path)
        except Exception as exc:
            self._log_value_error("Hosts X_AVM-DE_GetMeshListPath", exc)
            return
        role = mesh_role_from_xml(root, self.options.fritz_host)
        if role:
            result["box_meshRole"] = role
        elif list(root.iter()):
            result["box_meshRole"] = "master"
        if not result.get("box_meshRole"):
            self._read_mesh_role_lua(result)

    def _read_mesh_role_lua(self, result: dict[str, Any]) -> None:
        try:
            data = self._lua_data({"xhr": "1", "lang": "de", "page": "wlanmesh", "xhrId": "all"})
            self._log_values("Lua data wlanmesh", data)
        except Exception as exc:
            self._log_value_error("Lua data wlanmesh", exc)
            return
        role = first_nested_value(data, [
            ["data", "vars", "role", "value"],
            ["vars", "role", "value"],
        ])
        if role:
            result["box_meshRole"] = normalize_mesh_role(role)
            return
        is_repeater = first_nested_value(data, [
            ["data", "rep_data", "is_repeater"],
            ["rep_data", "is_repeater"],
        ])
        if is_repeater != "":
            result["box_meshRole"] = "slave" if as_bool(is_repeater) else "master"

    def _read_ipv6_fallbacks(self, result: dict[str, Any]) -> None:
        self._read_fritzsmart_query_values(result)
        if result.get("ipv6_extern"):
            return
        try:
            remote = self._soap("/upnp/control/x_remote", REMOTE_SERVICE, "GetDDNSInfo", {})
            self._log_values("RemoteAccess GetDDNSInfo", remote)
            ipv6 = first_ipv6_value(remote, [
                "NewServerIPv6",
                "NewStatusIPv6",
            ])
            if ipv6:
                result["ipv6_extern"] = ipv6
                return
        except Exception as exc:
            self._log_value_error("RemoteAccess GetDDNSInfo", exc)
        try:
            app = self._soap("/upnp/control/x_appsetup", APP_SETUP_SERVICE, "GetAppRemoteInfo", {})
            self._log_values("AppSetup GetAppRemoteInfo", app)
            ipv6 = first_ipv6_value(app, ["NewExternalIPv6Address"])
            if ipv6:
                result["ipv6_extern"] = ipv6
                return
        except Exception as exc:
            self._log_value_error("AppSetup GetAppRemoteInfo", exc)
        try:
            count_result = self._soap("/upnp/control/x_myfritz", MYFRITZ_SERVICE, "GetNumberOfServices", {})
            self._log_values("MyFritz GetNumberOfServices", count_result)
            count = as_int(first_value(count_result, ["NewNumberOfServices"]))
            for index in range(count):
                service = self._soap("/upnp/control/x_myfritz", MYFRITZ_SERVICE, "GetServiceByIndex", {"NewIndex": index})
                self._log_values(f"MyFritz GetServiceByIndex index={index}", service)
                ipv6 = first_ipv6_value(service, ["NewIPv6Addresses", "NewIPv6Address", "NewIPv6InterfaceIDs"])
                if ipv6:
                    result["ipv6_extern"] = ipv6
                    return
        except Exception as exc:
            self._log_value_error("MyFritz IPv6 fallback", exc)

    def _read_fritzsmart_query_values(self, result: dict[str, Any]) -> None:
        needs_ipv6 = not result.get("ipv6_extern")
        needs_dns = "box_dns_over_tls" not in result
        if not needs_ipv6 and not needs_dns:
            return
        query: dict[str, str] = {}
        if needs_dns:
            query["box_DNS_over_TLS"] = "dnscfg:settings/dns_over_tls_enabled"
        if needs_ipv6:
            query["box_IPv6_Extern"] = "ipv6:settings/ip"
        try:
            values = self._lua_query(query)
            self._log_values("Lua query FritzSmart box values", values)
        except Exception as exc:
            self._log_value_error("Lua query FritzSmart box values", exc)
            return
        dns_value = values.get("box_DNS_over_TLS")
        if needs_dns and dns_value is not None and str(dns_value).strip() != "":
            result["box_dns_over_tls"] = as_bool(dns_value)
        ipv6 = first_ipv6_value(values, ["box_IPv6_Extern"])
        if needs_ipv6 and ipv6:
            result["ipv6_extern"] = ipv6

    def _get_dect_line(self, index: int) -> DectLineInfo | None:
        values: dict[str, Any] = {}
        try:
            generic = self._soap("/upnp/control/x_dect", DECT_SERVICE, "GetGenericDectEntry", {"NewIndex": index})
            self._log_values(f"DECT{index} GetGenericDectEntry", generic)
            values.update(generic)
        except Exception as exc:
            self._log_value_error(f"DECT{index} GetGenericDectEntry", exc)
            LOG.debug("Could not read DECT line %s with GetGenericDectEntry: %s", index, exc)

        device = number_value(values, ["NewDevice", "NewDeviceNumber", "NewNumber", "NewID"]) or str(index)
        try:
            specific = self._soap("/upnp/control/x_dect", DECT_SERVICE, "GetSpecificDectEntry", {"NewID": device})
            self._log_values(f"DECT{index} GetSpecificDectEntry id={device}", specific)
            values.update({key: value for key, value in specific.items() if str(value).strip()})
        except Exception as exc:
            self._log_value_error(f"DECT{index} GetSpecificDectEntry id={device}", exc)
            LOG.debug("Could not read DECT line %s with GetSpecificDectEntry id=%s: %s", index, device, exc)

        for dect_id in unique_values([device, str(index)]):
            try:
                handset = self._soap("/upnp/control/x_contact", ONTEL_SERVICE, "GetDECTHandsetInfo", {"NewDectID": dect_id})
                self._log_values(f"DECT{index} GetDECTHandsetInfo id={dect_id}", handset)
                values.update({key: value for key, value in handset.items() if str(value).strip()})
                break
            except Exception as exc:
                self._log_value_error(f"DECT{index} GetDECTHandsetInfo id={dect_id}", exc)
                LOG.debug("Could not read DECT line %s with GetDECTHandsetInfo id=%s: %s", index, dect_id, exc)

        values.update(self._dect_list_values(index, device, values))
        values.update(self._voip_client_values(index, device, values))
        values.update(self._dect_user_values(index, device, values))

        if not values:
            return None
        internal = number_value(values, [
            "NewIntern",
            "NewInternalNumber",
            "NewHandsetNumber",
            "Intern",
            "InternalNumber",
            "HandsetNumber",
            "NewX_AVM-DE_InternalNumber",
            "NewX_AVM_DE_InternalNumber",
        ])
        device = number_value(values, ["NewDevice", "NewDeviceNumber", "NewNumber", "NewID"])
        if not internal:
            internal = dect_internal_from_device(device)
        name = first_value(values, ["NewName", "NewHandsetName", "NewModel"])
        return DectLineInfo(
            index=index,
            internal_number=internal,
            device_number=device,
            name=name,
        )

    def _log_values(self, label: str, values: dict[str, Any]) -> None:
        if self.options.log_value_details:
            LOG.info("%s returned: %s", label, json.dumps(values, ensure_ascii=False, sort_keys=True))

    def _log_value_error(self, label: str, exc: Exception) -> None:
        if self.options.log_value_details:
            LOG.info("%s failed: %s", label, exc)

    def _soap_any(
        self,
        control_urls: list[str],
        service_type: str,
        action: str,
        arguments: dict[str, Any],
    ) -> dict[str, str]:
        last_exc: Exception | None = None
        for control_url in control_urls:
            try:
                return self._soap(control_url, service_type, action, arguments)
            except Exception as exc:
                last_exc = exc
        if last_exc is not None:
            raise last_exc
        raise RuntimeError(f"No control URL available for {service_type}#{action}")

    def _request_urls(self, control_url: str) -> list[str]:
        if control_url.startswith("http://") or control_url.startswith("https://"):
            return [control_url]
        text = control_url.strip()
        candidates = [text]
        if text.startswith("/upnp/control/"):
            candidates.append("/" + text.rsplit("/", 1)[-1])
        elif text.startswith("/"):
            candidates.append("/upnp/control/" + text.rsplit("/", 1)[-1])
        else:
            candidates = ["/upnp/control/" + text, "/" + text]
        return [urllib.parse.urljoin(self.base_url + "/", candidate.lstrip("/")) for candidate in unique_values(candidates)]

    def _lua_data(self, params: dict[str, str]) -> dict[str, Any]:
        sid = self._fritz_sid()
        query = dict(params)
        response = self.session.post(
            urllib.parse.urljoin(self.web_base_url + "/", f"data.lua?sid={urllib.parse.quote(sid)}"),
            data=query,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()

    def _lua_query(self, query: dict[str, str]) -> dict[str, Any]:
        sid = self._fritz_sid()
        params = {"sid": sid, **query}
        response = self.session.get(urllib.parse.urljoin(self.web_base_url + "/", "query.lua"), params=params, timeout=15)
        response.raise_for_status()
        return response.json()

    def _fritz_sid(self) -> str:
        response = self.session.get(urllib.parse.urljoin(self.web_base_url + "/", "login_sid.lua?version=2"), timeout=15)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        sid = find_text(root, "SID").strip()
        if sid and sid != "0000000000000000":
            return sid
        challenge = find_text(root, "Challenge").strip()
        if not challenge:
            raise RuntimeError("FRITZ!Box login challenge missing")
        password = self.options.fritz_password
        challenge_response = fritz_login_response(challenge, password)
        login = self.session.get(
            urllib.parse.urljoin(self.web_base_url + "/", "login_sid.lua"),
            params={
                "version": "2",
                "username": self.options.fritz_username,
                "response": challenge_response,
            },
            timeout=15,
        )
        login.raise_for_status()
        login_root = ET.fromstring(login.content)
        sid = find_text(login_root, "SID").strip()
        if not sid or sid == "0000000000000000":
            raise RuntimeError("FRITZ!Box SID login failed")
        return sid

    def _dect_list_values(self, index: int, device: str, values: dict[str, Any]) -> dict[str, str]:
        try:
            result = self._soap("/upnp/control/x_dect", DECT_SERVICE, "GetDectListPath", {})
            self._log_values("DECT GetDectListPath", result)
            path = first_value(result, ["NewDectListPath"])
            if not path:
                return {}
            root = self._get_xml_url(path)
        except Exception as exc:
            self._log_value_error("DECT GetDectListPath", exc)
            return {}
        name = first_value(values, ["NewName", "NewHandsetName", "NewModel"])
        for element in root.iter():
            children = {child.tag.split("}")[-1]: child.text or "" for child in element}
            text = ET.tostring(element, encoding="unicode")
            if not self._dect_element_matches(children, text, index, device, name):
                continue
            extracted = {
                "NewIntern": first_value(children, ["Intern", "InternalNumber", "HandsetNumber", "Number"]),
                "NewDevice": first_value(children, ["ID", "Id", "Device", "DeviceNumber"]),
                "NewName": first_value(children, ["Name", "HandsetName", "Model"]),
            }
            extracted = {key: value for key, value in extracted.items() if value}
            self._log_values(f"DECT{index} DectListPath match", extracted)
            return extracted
        return {}

    def _dect_element_matches(self, children: dict[str, str], text: str, index: int, device: str, name: str) -> bool:
        ids = unique_values([device, str(index), str(index + 1)])
        child_id = first_value(children, ["ID", "Id", "Device", "DeviceNumber"])
        child_name = first_value(children, ["Name", "HandsetName", "Model"])
        return (
            bool(child_id and child_id in ids)
            or bool(name and child_name and child_name == name)
            or bool(device and f">{device}<" in text)
        )

    def _voip_client_values(self, index: int, device: str, values: dict[str, Any]) -> dict[str, str]:
        try:
            count_result = self._soap("/upnp/control/x_voip", VOIP_SERVICE, "X_AVM-DE_GetNumberOfClients", {})
            self._log_values("VoIP X_AVM-DE_GetNumberOfClients", count_result)
            count = as_int(first_value(count_result, ["NewX_AVM-DE_NumberOfClients", "NewX_AVM_DE_NumberOfClients"]))
        except Exception as exc:
            self._log_value_error("VoIP X_AVM-DE_GetNumberOfClients", exc)
            return {}
        name = first_value(values, ["NewName", "NewHandsetName", "NewModel"])
        for client_index in range(count):
            try:
                client = self._soap(
                    "/upnp/control/x_voip",
                    VOIP_SERVICE,
                    "X_AVM-DE_GetClient3",
                    {"NewX_AVM-DE_ClientIndex": client_index},
                )
                self._log_values(f"VoIP X_AVM-DE_GetClient3 index={client_index}", client)
            except Exception as exc:
                self._log_value_error(f"VoIP X_AVM-DE_GetClient3 index={client_index}", exc)
                continue
            client_name = first_value(client, ["NewX_AVM-DE_PhoneName", "NewX_AVM_DE_PhoneName"])
            client_id = number_value(client, ["NewX_AVM-DE_ClientId", "NewX_AVM_DE_ClientId"])
            if (name and client_name == name) or (device and client_id == device):
                internal = first_value(client, ["NewX_AVM-DE_InternalNumber", "NewX_AVM_DE_InternalNumber"])
                return {"NewIntern": internal} if internal else {}
        return {}

    def _dect_user_values(self, index: int, device: str, values: dict[str, Any]) -> dict[str, str]:
        entry = self._matching_dect_user_entry(index, device, values)
        if not entry:
            return {}
        extracted = {
            "NewIntern": number_value(entry, ["Intern", "InternalNumber", "HandsetNumber"]),
            "NewDevice": number_value(entry, ["Id", "ID", "Device", "DeviceNumber"]),
            "NewName": first_value(entry, ["Name", "HandsetName", "Model"]),
        }
        extracted = {key: value for key, value in extracted.items() if value}
        self._log_values(f"DECT{index} Lua dectUser match", extracted)
        return extracted

    def _matching_dect_user_entry(self, index: int, device: str, values: dict[str, Any]) -> dict[str, Any] | None:
        entries = self._get_dect_user_entries()
        name = first_value(values, ["NewName", "NewHandsetName", "NewModel"])
        ids = unique_values([device, str(index), str(index + 1)])
        for entry in entries:
            entry_id = number_value(entry, ["Id", "ID", "Device", "DeviceNumber"])
            entry_name = first_value(entry, ["Name", "HandsetName", "Model"])
            if (entry_id and entry_id in ids) or (name and entry_name and entry_name == name):
                return entry
        return entries[index] if 0 <= index < len(entries) else None

    def _get_dect_user_entries(self) -> list[dict[str, Any]]:
        if self._dect_user_entries is not None:
            return self._dect_user_entries
        try:
            values = self._lua_query({
                "dectUser": (
                    "telcfg:settings/Foncontrol/User/list("
                    "Id,Name,Intern,IntRingTone,AlarmRingTone0,RadioRingID,ImagePath,"
                    "G722RingTone,G722RingToneName)"
                ),
            })
            self._log_values("Lua query dectUser", values)
            self._dect_user_entries = dect_user_entries_from_lua(values.get("dectUser") or values)
        except Exception as exc:
            self._log_value_error("Lua query dectUser", exc)
            self._dect_user_entries = []
        return self._dect_user_entries

    def _control_urls_for_service(self, service_type: str, fallbacks: list[str]) -> list[str]:
        all_urls = self._discover_control_urls()
        discovered = list(all_urls.get(service_type, []))
        service_family = service_type.rsplit(":", 1)[0]
        for discovered_type, control_urls in all_urls.items():
            if discovered_type != service_type and discovered_type.rsplit(":", 1)[0] == service_family:
                discovered.extend(control_urls)
        return unique_values(discovered + fallbacks)

    def _discover_control_urls(self) -> dict[str, list[str]]:
        if self._service_control_urls is not None:
            return self._service_control_urls
        urls: dict[str, list[str]] = {}
        for description_url in ["/igddesc.xml", "/tr64desc.xml"]:
            try:
                root = self._get_xml_url(description_url)
            except Exception as exc:
                self._log_value_error(f"Service description {description_url}", exc)
                continue
            for service in root.iter():
                if service.tag.split("}")[-1] != "service":
                    continue
                service_type = find_text(service, "serviceType").strip()
                control_url = find_text(service, "controlURL").strip()
                if service_type and control_url:
                    urls.setdefault(service_type, []).append(control_url)
        self._service_control_urls = {key: unique_values(value) for key, value in urls.items()}
        if self.options.log_value_details:
            LOG.info(
                "Discovered control URLs: %s",
                json.dumps(self._service_control_urls, ensure_ascii=False, sort_keys=True),
            )
        return self._service_control_urls

    def get_call_entries(self) -> list[CallEntry]:
        result = self._soap("/upnp/control/x_contact", ONTEL_SERVICE, "GetCallList", {})
        url = str(result.get("NewCallListURL", "")).strip()
        if not url:
            return []
        root = self._get_xml_url(url)
        entries: list[CallEntry] = []
        for call in root.findall(".//Call"):
            type_id = find_text(call, "Type").strip()
            caller = first_text(call, ["Caller", "Number"])
            called = first_text(call, ["Called", "CalledNumber"])
            name = find_text(call, "Name").strip()
            entries.append(CallEntry(
                type_id=type_id,
                view=CALL_TYPE_VIEWS.get(type_id, "other"),
                date=find_text(call, "Date").strip(),
                name=name,
                caller=caller,
                called=called,
                number=caller or called,
                duration=find_text(call, "Duration").strip(),
            ))
        return entries

    def get_phonebook_ids(self) -> list[str]:
        result = self._soap("/upnp/control/x_contact", ONTEL_SERVICE, "GetPhonebookList", {})
        value = str(result.get("NewPhonebookList", "")).strip()
        return [item.strip() for item in value.split(",") if item.strip()]

    def get_phonebook_info(self, phonebook_id: str) -> PhonebookInfo:
        result = self._soap(
            "/upnp/control/x_contact",
            ONTEL_SERVICE,
            "GetPhonebook",
            {"NewPhonebookID": phonebook_id},
        )
        url = str(result.get("NewPhonebookURL", "")).strip()
        if not url:
            return PhonebookInfo(phonebook_id, f"Telefonbuch {phonebook_id}", [])
        root = self._get_xml_url(url)
        name = phonebook_xml_name(root) or f"Telefonbuch {phonebook_id}"
        contacts: list[dict[str, str]] = []
        for contact in root.findall(".//contact"):
            person = contact.find("person")
            display_name = find_text(person, "realName") if person is not None else ""
            numbers = []
            for number in contact.findall(".//number"):
                value = (number.text or "").strip()
                if value:
                    numbers.append(value)
            contacts.append({
                "name": display_name.strip(),
                "numbers": ", ".join(numbers),
            })
        return PhonebookInfo(phonebook_id, name.strip(), contacts)

    def _get_message_counts(self, index: int) -> tuple[int, int]:
        result = self._soap(
            "/upnp/control/x_tam",
            TAM_SERVICE,
            "GetMessageList",
            {"NewIndex": index},
        )
        url = str(result.get("NewURL", "")).strip()
        if not url:
            return 0, 0
        url = urllib.parse.urljoin(self.base_url, url)
        response = self.session.get(url, timeout=15)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        new_count = 0
        old_count = 0
        for message in root.findall(".//Message"):
            is_new = find_text(message, "New")
            if as_bool(is_new):
                new_count += 1
            else:
                old_count += 1
        return new_count, old_count

    def _get_xml_url(self, url: str) -> ET.Element:
        response = self.session.get(urllib.parse.urljoin(self.base_url, url), timeout=15)
        response.raise_for_status()
        return ET.fromstring(response.content)

    def _soap(
        self,
        control_url: str,
        service_type: str,
        action: str,
        arguments: dict[str, Any],
    ) -> dict[str, str]:
        body_args = "".join(f"<{key}>{escape_xml(value)}</{key}>" for key, value in arguments.items())
        envelope = (
            '<?xml version="1.0" encoding="utf-8"?>'
            f'<s:Envelope xmlns:s="{SOAP_ENV}" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">'
            "<s:Body>"
            f'<u:{action} xmlns:u="{service_type}">{body_args}</u:{action}>'
            "</s:Body>"
            "</s:Envelope>"
        )
        response: requests.Response | None = None
        last_exc: Exception | None = None
        for url in self._request_urls(control_url):
            try:
                response = self.session.post(
                    url,
                    data=envelope.encode("utf-8"),
                    headers={
                        "Content-Type": 'text/xml; charset="utf-8"',
                        "SOAPACTION": f'"{service_type}#{action}"',
                    },
                    timeout=15,
                )
                response.raise_for_status()
                break
            except Exception as exc:
                last_exc = exc
                response = None
        if response is None:
            if last_exc is not None:
                raise last_exc
            raise RuntimeError(f"No request URL available for {control_url}")
        root = ET.fromstring(response.content)
        values: dict[str, str] = {}
        for element in root.iter():
            if element.text is not None and element.tag.split("}")[-1].startswith("New"):
                values[element.tag.split("}")[-1]] = element.text
        return values


class HomeAssistantMqttPublisher:
    def __init__(self, options: Options, fritz: FritzBoxTr064Client) -> None:
        self.options = options
        self.fritz = fritz
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="fritzbox-to-mqtt")
        if options.mqtt_username:
            self.client.username_pw_set(options.mqtt_username, options.mqtt_password)
        self.known_tam_indices: set[int] = set()
        self.known_wlan_indices: set[int] = set()
        self.known_call_views: set[str] = set()
        self.known_phonebook_ids: set[str] = set()
        self.selected_phonebooks = self.options.phonebooks.strip() or "all"
        self.live_call_events: list[dict[str, str]] = []

    def start(self) -> None:
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.connect(self.options.mqtt_host, self.options.mqtt_port, keepalive=60)
        self.client.loop_start()

    def stop(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()

    def publish_discovery(
        self,
        present_tam_indices: set[int],
        present_wlan_indices: set[int],
        call_views: set[str],
        phonebook_ids: set[str],
        all_phonebooks: list[PhonebookInfo],
        dect_lines: list[DectLineInfo],
    ) -> None:
        for index in range(self.options.max_tam):
            if index in present_tam_indices:
                self._publish_tam_discovery(index)
            else:
                self._remove_tam_discovery(index)
        for index in range(1, self.options.max_wlan + 1):
            if index in present_wlan_indices:
                self._publish_wlan_discovery(index)
            else:
                self._remove_wlan_discovery(index)
        for view in call_views:
            self._publish_call_discovery(view)
        for view in self.known_call_views - call_views:
            self._remove_call_discovery(view)
        phonebooks_by_id = {phonebook.phonebook_id: phonebook for phonebook in all_phonebooks}
        for phonebook_id in phonebook_ids:
            fallback = PhonebookInfo(phonebook_id, f"Telefonbuch {phonebook_id}", [])
            self._publish_phonebook_discovery(phonebooks_by_id.get(phonebook_id, fallback))
        for phonebook_id in self.known_phonebook_ids - phonebook_ids:
            self._remove_phonebook_discovery(phonebook_id)
        self._publish_phonebook_overview_discovery()
        self._publish_phonebook_select_discovery(all_phonebooks)
        self._publish_call_monitor_discovery()
        self._publish_box_status_discovery()
        if self.options.include_dect_lines:
            self._publish_dect_line_discovery(dect_lines)
        self._publish_wan_discovery()
        self.known_tam_indices = set(present_tam_indices)
        self.known_wlan_indices = set(present_wlan_indices)
        self.known_call_views = set(call_views)
        self.known_phonebook_ids = set(phonebook_ids)

    def publish_states(
        self,
        tam_infos: list[TamInfo],
        wlan_infos: list[WlanInfo],
        wan: dict[str, Any],
        calls: list[CallEntry],
        call_views: set[str],
        phonebooks: list[PhonebookInfo],
        all_phonebooks: list[PhonebookInfo],
        box_status: dict[str, Any],
        dect_lines: list[DectLineInfo],
    ) -> None:
        for info in tam_infos:
            prefix = f"{self.options.base_topic}/ab/{info.index}"
            self._publish(f"{prefix}/new_messages", str(info.new_messages))
            self._publish(f"{prefix}/old_messages", str(info.old_messages))
            self._publish(f"{prefix}/enabled", "ON" if info.enabled else "OFF")
            self._publish(f"{prefix}/status", "ON" if info.enabled else "OFF")
            self._publish_json(f"{prefix}/attributes", {
                "ab_index": info.index,
                "ab_name": info.name,
                "tam_enabled": info.enabled,
                "tam_running": info.running,
                "tam_status": info.status,
            })

        for info in wlan_infos:
            slug = wlan_slug(info.index)
            prefix = f"{self.options.base_topic}/wlan/{slug}"
            self._publish(f"{prefix}/enabled", "ON" if info.enabled else "OFF")
            self._publish(f"{prefix}/status", display_on_off_status(info.status))
            self._publish_json(
                f"{prefix}/attributes",
                {"wlan_index": info.index, "wlan_slug": slug, "ssid": info.ssid, "raw_status": info.status},
            )

        for view in sorted(call_views):
            filtered = calls if view == "all" else [call for call in calls if call.view == view]
            visible = filtered[:self.options.max_calls]
            prefix = f"{self.options.base_topic}/calls/{view}"
            self._publish(f"{prefix}/count", str(len(filtered)))
            self._publish_json(f"{prefix}/attributes", {
                "view": view,
                "max_calls": self.options.max_calls,
                "entries": [call_to_dict(call) for call in visible],
                "lines": [call_to_line(call) for call in visible],
            })

        for phonebook in phonebooks:
            prefix = f"{self.options.base_topic}/phonebook/{safe_object_part(phonebook.phonebook_id)}"
            self._publish(f"{prefix}/count", str(len(phonebook.contacts)))
            self._publish_json(f"{prefix}/attributes", {
                "phonebook_id": phonebook.phonebook_id,
                "phonebook_name": phonebook.name,
                "contacts": phonebook.contacts[:50],
            })

        self._publish(f"{self.options.base_topic}/phonebooks/count", str(len(all_phonebooks)))
        self._publish(f"{self.options.base_topic}/phonebooks/selection", phonebook_selection_label(self.selected_phonebooks, all_phonebooks))
        self._publish(f"{self.options.base_topic}/phonebooks/selection_text", self.selected_phonebooks)
        self._publish_json(f"{self.options.base_topic}/phonebooks/attributes", {
            "selected": self.selected_phonebooks,
            "phonebooks": [phonebook_summary(phonebook) for phonebook in all_phonebooks],
        })

        if "upstream_max_bps" in wan:
            self._publish(f"{self.options.base_topic}/wan/upstream_max_mbit", format_mbit(wan["upstream_max_bps"]))
        if "downstream_max_bps" in wan:
            self._publish(f"{self.options.base_topic}/wan/downstream_max_mbit", format_mbit(wan["downstream_max_bps"]))
        if "byte_send_rate" in wan:
            self._publish(f"{self.options.base_topic}/wan/upload_kbit_s", format_kbit_per_second(wan["byte_send_rate"]))
        if "byte_receive_rate" in wan:
            self._publish(f"{self.options.base_topic}/wan/download_kbit_s", format_kbit_per_second(wan["byte_receive_rate"]))
        if "physical_link_status" in wan:
            self._publish(f"{self.options.base_topic}/wan/link_status", display_on_off_status(wan["physical_link_status"]))

        if self.options.log_value_details:
            LOG.info(
                "Publishing box values: meshRole=%s ppp_connect=%s ipv4_extern=%s ipv6_extern=%s dect=%s dns_over_tls=%s",
                box_status.get("box_meshRole") or "unknown",
                box_status.get("box_ppp_connect") or "unknown",
                box_status.get("ipv4_extern") or "unknown",
                box_status.get("ipv6_extern") or "unknown",
                box_status.get("box_dect", "unknown"),
                box_status.get("box_dns_over_tls", "unknown"),
            )
            for line in dect_lines:
                LOG.info(
                    "Publishing DECT%s values: name=%s intern=%s device=%s",
                    line.index,
                    line.display_name,
                    line.internal_number or "unknown",
                    line.device_number or "unknown",
                )
        self._publish_box_status_states(box_status)
        if self.options.include_dect_lines:
            for line in dect_lines:
                prefix = f"{self.options.base_topic}/dect/{line.index}"
                self._publish(f"{prefix}/intern", line.internal_number)
                self._publish(f"{prefix}/device", line.device_number)
                self._publish_json(f"{prefix}/attributes", {
                    "dect_index": line.index,
                    "name": line.name,
                    "display_name": line.display_name,
                    "internal_number": line.internal_number,
                    "device_number": line.device_number,
                })

    def publish_call_monitor_state(self, event: CallMonitorEvent | None = None) -> None:
        prefix = f"{self.options.base_topic}/call_monitor"
        if event is None:
            self._publish(f"{prefix}/status", "idle")
            self._publish(f"{prefix}/ringing", "OFF")
            self._publish(f"{prefix}/last_event", "")
            self._publish(f"{prefix}/events_count", str(len(self.live_call_events)))
            self._publish_json(f"{prefix}/events_attributes", {"events": self.live_call_events})
            self._publish_json(f"{prefix}/attributes", {"event": "idle"})
            return
        event_dict = call_monitor_event_to_dict(event)
        self.live_call_events.insert(0, event_dict)
        self.live_call_events = self.live_call_events[:self.options.max_live_events]
        self._publish(f"{prefix}/status", event.state)
        self._publish(f"{prefix}/ringing", "ON" if event.event == "RING" else "OFF")
        self._publish(f"{prefix}/last_event", event.event)
        self._publish(f"{prefix}/events_count", str(len(self.live_call_events)))
        self._publish_json(f"{prefix}/events_attributes", {"events": self.live_call_events})
        self._publish_json(f"{prefix}/attributes", event_dict)

    def _on_connect(self, client: mqtt.Client, _userdata: Any, _flags: Any, reason_code: Any, _properties: Any) -> None:
        LOG.info("Connected to MQTT broker with result %s", reason_code)
        client.subscribe(f"{self.options.base_topic}/ab/+/enabled/set")
        client.subscribe(f"{self.options.base_topic}/wlan/+/enabled/set")
        client.subscribe(f"{self.options.base_topic}/phonebooks/selection/set")
        client.subscribe(f"{self.options.base_topic}/phonebooks/selection_text/set")

    def _on_message(self, _client: mqtt.Client, _userdata: Any, message: mqtt.MQTTMessage) -> None:
        topic = message.topic
        raw_payload = message.payload.decode("utf-8", errors="replace").strip()
        payload = raw_payload.upper()
        if topic.startswith(f"{self.options.base_topic}/ab/") and topic.endswith("/enabled/set"):
            self._handle_tam_command(topic, payload)
            return
        if topic.startswith(f"{self.options.base_topic}/wlan/") and topic.endswith("/enabled/set"):
            self._handle_wlan_command(topic, payload)
            return
        if topic == f"{self.options.base_topic}/phonebooks/selection/set":
            self._handle_phonebook_selection(raw_payload)
            return
        if topic == f"{self.options.base_topic}/phonebooks/selection_text/set":
            self._handle_phonebook_selection(raw_payload)

    def _handle_tam_command(self, topic: str, payload: str) -> None:
        marker = f"{self.options.base_topic}/ab/"
        if not topic.startswith(marker) or not topic.endswith("/enabled/set"):
            return
        try:
            index = int(topic[len(marker):].split("/", 1)[0])
        except ValueError:
            LOG.warning("Ignoring invalid TAM command topic: %s", topic)
            return
        if index < 0 or index >= self.options.max_tam:
            LOG.warning("Ignoring TAM command for unsupported index %s", index)
            return
        enabled = payload in {"ON", "1", "TRUE"}
        LOG.info("Setting AB%s enabled=%s", index, enabled)
        try:
            self.fritz.set_tam_enabled(index, enabled)
            self._publish(f"{self.options.base_topic}/ab/{index}/enabled", "ON" if enabled else "OFF")
        except Exception as exc:
            LOG.error("Could not set AB%s enabled state: %s", index, exc)

    def _handle_wlan_command(self, topic: str, payload: str) -> None:
        marker = f"{self.options.base_topic}/wlan/"
        slug = topic[len(marker):].split("/", 1)[0]
        index = wlan_index_from_slug(slug)
        if index is None:
            LOG.warning("Ignoring invalid WLAN command topic: %s", topic)
            return
        if index < 1 or index > self.options.max_wlan:
            LOG.warning("Ignoring WLAN command for unsupported index %s", index)
            return
        enabled = payload in {"ON", "1", "TRUE"}
        LOG.info("Setting %s enabled=%s", wlan_label(index), enabled)
        try:
            self.fritz.set_wlan_enabled(index, enabled)
            self._publish(f"{self.options.base_topic}/wlan/{wlan_slug(index)}/enabled", "ON" if enabled else "OFF")
        except Exception as exc:
            LOG.error("Could not set %s enabled state: %s", wlan_label(index), exc)

    def _handle_phonebook_selection(self, payload: str) -> None:
        selection = phonebook_selection_value(payload)
        self.selected_phonebooks = selection
        self._publish(f"{self.options.base_topic}/phonebooks/selection", payload)
        self._publish(f"{self.options.base_topic}/phonebooks/selection_text", selection)
        LOG.info("Selected phonebook display: %s", selection)

    def _publish_tam_discovery(self, index: int) -> None:
        prefix = f"{self.options.base_topic}/ab/{index}"
        self._publish_config("sensor", f"ab{index}_new_messages", {
            "name": f"AB{index} Neue Nachrichten",
            "unique_id": f"fritzbox_tr064_ab{index}_new_messages",
            "state_topic": f"{prefix}/new_messages",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:voicemail",
            "state_class": "measurement",
            "device": self._device(),
        })
        self._publish_config("sensor", f"ab{index}_old_messages", {
            "name": f"AB{index} Alte Nachrichten",
            "unique_id": f"fritzbox_tr064_ab{index}_old_messages",
            "state_topic": f"{prefix}/old_messages",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:voicemail",
            "state_class": "measurement",
            "device": self._device(),
        })
        self._publish_config("switch", f"ab{index}_enabled", {
            "name": f"AB{index} Ein/Aus",
            "unique_id": f"fritzbox_tr064_ab{index}_enabled",
            "state_topic": f"{prefix}/enabled",
            "command_topic": f"{prefix}/enabled/set",
            "json_attributes_topic": f"{prefix}/attributes",
            "payload_on": "ON",
            "payload_off": "OFF",
            "icon": "mdi:answering-machine",
            "device": self._device(),
        })
        self._remove_legacy_tam_running_discovery(index)
        self._publish_config("binary_sensor", f"ab{index}_status", {
            "name": f"AB{index} Status",
            "unique_id": f"fritzbox_tr064_ab{index}_status",
            "state_topic": f"{prefix}/status",
            "json_attributes_topic": f"{prefix}/attributes",
            "payload_on": "ON",
            "payload_off": "OFF",
            "icon": "mdi:phone-in-talk",
            "device": self._device(),
        })

    def _remove_tam_discovery(self, index: int) -> None:
        for component, suffix in [
            ("sensor", "new_messages"),
            ("sensor", "old_messages"),
            ("switch", "enabled"),
            ("binary_sensor", "status"),
        ]:
            self._publish(
                f"{self.options.discovery_prefix}/{component}/fritzbox_tr064/ab{index}_{suffix}/config",
                "",
                retain=True,
            )
        self._remove_legacy_tam_running_discovery(index)

    def _remove_legacy_tam_running_discovery(self, index: int) -> None:
        self._publish(
            f"{self.options.discovery_prefix}/binary_sensor/fritzbox_tr064/ab{index}_running/config",
            "",
            retain=True,
        )

    def _publish_wlan_discovery(self, index: int) -> None:
        slug = wlan_slug(index)
        label = wlan_label(index)
        prefix = f"{self.options.base_topic}/wlan/{slug}"
        self._remove_legacy_wlan_discovery(index)
        self._publish_config("switch", f"{slug}_enabled", {
            "name": f"{label} Ein/Aus",
            "unique_id": f"fritzbox_tr064_{slug}_enabled",
            "state_topic": f"{prefix}/enabled",
            "command_topic": f"{prefix}/enabled/set",
            "json_attributes_topic": f"{prefix}/attributes",
            "payload_on": "ON",
            "payload_off": "OFF",
            "icon": "mdi:wifi",
            "device": self._device(),
        })
        self._publish_config("sensor", f"{slug}_status", {
            "name": f"{label} Status",
            "unique_id": f"fritzbox_tr064_{slug}_status",
            "state_topic": f"{prefix}/status",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:wifi-settings",
            "device": self._device(),
        })

    def _remove_wlan_discovery(self, index: int) -> None:
        self._remove_legacy_wlan_discovery(index)
        for component, suffix in [
            ("switch", "enabled"),
            ("sensor", "status"),
        ]:
            self._publish(
                f"{self.options.discovery_prefix}/{component}/fritzbox_tr064/{wlan_slug(index)}_{suffix}/config",
                "",
                retain=True,
            )

    def _remove_legacy_wlan_discovery(self, index: int) -> None:
        for component, suffix in [
            ("switch", "enabled"),
            ("sensor", "status"),
        ]:
            self._publish(
                f"{self.options.discovery_prefix}/{component}/fritzbox_tr064/wlan{index}_{suffix}/config",
                "",
                retain=True,
            )

    def _publish_call_discovery(self, view: str) -> None:
        label = CALL_VIEW_LABELS.get(view, f"Anrufe {view}")
        prefix = f"{self.options.base_topic}/calls/{view}"
        self._publish_config("sensor", f"calls_{view}", {
            "name": label,
            "unique_id": f"fritzbox_tr064_calls_{view}",
            "state_topic": f"{prefix}/count",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:phone-log",
            "state_class": "measurement",
            "device": self._device(),
        })

    def _remove_call_discovery(self, view: str) -> None:
        self._publish(
            f"{self.options.discovery_prefix}/sensor/fritzbox_tr064/calls_{view}/config",
            "",
            retain=True,
        )

    def _publish_phonebook_discovery(self, phonebook: PhonebookInfo) -> None:
        object_part = safe_object_part(phonebook.phonebook_id)
        prefix = f"{self.options.base_topic}/phonebook/{object_part}"
        self._publish_config("sensor", f"phonebook_{object_part}", {
            "name": phonebook_entity_name(phonebook),
            "unique_id": f"fritzbox_tr064_phonebook_{object_part}",
            "state_topic": f"{prefix}/count",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:book-account",
            "state_class": "measurement",
            "device": self._device(),
        })

    def _remove_phonebook_discovery(self, phonebook_id: str) -> None:
        self._publish(
            f"{self.options.discovery_prefix}/sensor/fritzbox_tr064/phonebook_{safe_object_part(phonebook_id)}/config",
            "",
            retain=True,
        )

    def _publish_phonebook_overview_discovery(self) -> None:
        prefix = f"{self.options.base_topic}/phonebooks"
        self._publish_config("sensor", "phonebooks", {
            "name": "Telefonbücher",
            "unique_id": "fritzbox_tr064_phonebooks",
            "state_topic": f"{prefix}/count",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:book-multiple",
            "state_class": "measurement",
            "device": self._device(),
        })

    def _publish_phonebook_select_discovery(self, phonebooks: list[PhonebookInfo]) -> None:
        prefix = f"{self.options.base_topic}/phonebooks"
        self._publish_config("select", "phonebook_selection", {
            "name": "Telefonbuch Anzeige",
            "unique_id": "fritzbox_tr064_phonebook_selection",
            "state_topic": f"{prefix}/selection",
            "command_topic": f"{prefix}/selection/set",
            "options": phonebook_select_options(phonebooks),
            "icon": "mdi:book-cog",
            "device": self._device(),
        })
        self._publish_config("text", "phonebook_selection_text", {
            "name": "Telefonbücher Auswahl",
            "unique_id": "fritzbox_tr064_phonebook_selection_text",
            "state_topic": f"{prefix}/selection_text",
            "command_topic": f"{prefix}/selection_text/set",
            "icon": "mdi:book-edit",
            "device": self._device(),
        })

    def _publish_call_monitor_discovery(self) -> None:
        prefix = f"{self.options.base_topic}/call_monitor"
        self._publish_config("sensor", "call_monitor_status", {
            "name": "Anrufmonitor Status",
            "unique_id": "fritzbox_tr064_call_monitor_status",
            "state_topic": f"{prefix}/status",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:phone",
            "device": self._device(),
        })
        self._publish_config("binary_sensor", "call_monitor_ringing", {
            "name": "Telefon klingelt",
            "unique_id": "fritzbox_tr064_call_monitor_ringing",
            "state_topic": f"{prefix}/ringing",
            "json_attributes_topic": f"{prefix}/attributes",
            "payload_on": "ON",
            "payload_off": "OFF",
            "icon": "mdi:phone-ring",
            "device": self._device(),
        })
        self._publish_config("sensor", "call_monitor_last_event", {
            "name": "Anrufmonitor Ereignis",
            "unique_id": "fritzbox_tr064_call_monitor_last_event",
            "state_topic": f"{prefix}/last_event",
            "json_attributes_topic": f"{prefix}/attributes",
            "icon": "mdi:phone-log",
            "device": self._device(),
        })
        self._publish_config("sensor", "call_monitor_events", {
            "name": "Anrufmonitor Verlauf",
            "unique_id": "fritzbox_tr064_call_monitor_events",
            "state_topic": f"{prefix}/events_count",
            "json_attributes_topic": f"{prefix}/events_attributes",
            "icon": "mdi:format-list-bulleted",
            "state_class": "measurement",
            "device": self._device(),
        })

    def _publish_box_status_discovery(self) -> None:
        sensors = [
            ("box_meshRole", "Box Mesh Rolle", "box/meshRole", "mdi:hubspot"),
            ("box_ppp_connect", "Box PPP Verbindung", "box/ppp_connect", "mdi:wan"),
            ("ipv4_extern", "Box PPP IPv4 Extern", "box/ipv4_extern", "mdi:ip-network"),
            ("ipv6_extern", "Box IPv6 Extern", "box/ipv6_extern", "mdi:ip-network-outline"),
        ]
        for object_id, name, state_path, icon in sensors:
            self._publish_config("sensor", object_id, {
                "name": name,
                "unique_id": f"fritzbox_tr064_{object_id}",
                "state_topic": f"{self.options.base_topic}/{state_path}",
                "icon": icon,
                "device": self._device(),
            })
        self._publish(
            f"{self.options.discovery_prefix}/sensor/fritzbox_tr064/box_dns_over_tls/config",
            "",
            retain=True,
        )
        self._publish_config("binary_sensor", "box_dns_over_tls", {
            "name": "Box DNS over TLS",
            "unique_id": "fritzbox_tr064_box_dns_over_tls",
            "state_topic": f"{self.options.base_topic}/box/dns_over_tls",
            "payload_on": "ON",
            "payload_off": "OFF",
            "icon": "mdi:dns",
            "device": self._device(),
        })
        self._publish_config("binary_sensor", "box_dect", {
            "name": "Box DECT",
            "unique_id": "fritzbox_tr064_box_dect",
            "state_topic": f"{self.options.base_topic}/box/dect",
            "payload_on": "ON",
            "payload_off": "OFF",
            "icon": "mdi:phone-classic",
            "device": self._device(),
        })

    def _publish_dect_line_discovery(self, dect_lines: list[DectLineInfo]) -> None:
        present = {line.index for line in dect_lines}
        lines_by_index = {line.index: line for line in dect_lines}
        for index in range(self.options.max_dect_lines):
            if index not in present:
                for object_id in [
                    f"dect{index}_intern",
                    f"dect{index}_device",
                    f"dect{index}_NoRingTime",
                ]:
                    self._publish(
                        f"{self.options.discovery_prefix}/sensor/fritzbox_tr064/{object_id}/config",
                        "",
                        retain=True,
                    )
                continue
            self._publish(
                f"{self.options.discovery_prefix}/sensor/fritzbox_tr064/dect{index}_NoRingTime/config",
                "",
                retain=True,
            )
            line = lines_by_index[index]
            name = line.display_name
            prefix = f"{self.options.base_topic}/dect/{index}"
            self._publish_config("sensor", f"dect{index}_intern", {
                "name": f"{name} intern",
                "unique_id": f"fritzbox_tr064_dect{index}_intern",
                "state_topic": f"{prefix}/intern",
                "json_attributes_topic": f"{prefix}/attributes",
                "icon": "mdi:numeric",
                "device": self._device(),
            })
            self._publish_config("sensor", f"dect{index}_device", {
                "name": f"{name} device",
                "unique_id": f"fritzbox_tr064_dect{index}_device",
                "state_topic": f"{prefix}/device",
                "json_attributes_topic": f"{prefix}/attributes",
                "icon": "mdi:numeric",
                "device": self._device(),
            })

    def _publish_box_status_states(self, status: dict[str, Any]) -> None:
        for key, path in [
            ("box_meshRole", "box/meshRole"),
            ("box_ppp_connect", "box/ppp_connect"),
            ("ipv4_extern", "box/ipv4_extern"),
            ("ipv6_extern", "box/ipv6_extern"),
        ]:
            value = status.get(key) or "unknown"
            self._publish(f"{self.options.base_topic}/{path}", str(value))
        if "box_dect" in status:
            self._publish(f"{self.options.base_topic}/box/dect", "ON" if status.get("box_dect") else "OFF")
        dns_over_tls = status.get("box_dns_over_tls")
        if isinstance(dns_over_tls, bool):
            self._publish(f"{self.options.base_topic}/box/dns_over_tls", "ON" if dns_over_tls else "OFF")
        else:
            self._publish(f"{self.options.base_topic}/box/dns_over_tls", "")

    def _publish_wan_discovery(self) -> None:
        sensors = [
            ("wan_downstream_max_mbit", "Verbindung Download", "wan/downstream_max_mbit", "Mbit/s", "mdi:download-network"),
            ("wan_upstream_max_mbit", "Verbindung Upload", "wan/upstream_max_mbit", "Mbit/s", "mdi:upload-network"),
            ("wan_download_kbit_s", "Downloadrate", "wan/download_kbit_s", "kbit/s", "mdi:download"),
            ("wan_upload_kbit_s", "Uploadrate", "wan/upload_kbit_s", "kbit/s", "mdi:upload"),
        ]
        for object_id, name, state_path, unit, icon in sensors:
            self._publish_config("sensor", object_id, {
                "name": name,
                "unique_id": f"fritzbox_tr064_{object_id}",
                "state_topic": f"{self.options.base_topic}/{state_path}",
                "unit_of_measurement": unit,
                "state_class": "measurement",
                "icon": icon,
                "device": self._device(),
            })
        self._publish_config("sensor", "wan_link_status", {
            "name": "WAN Link Status",
            "unique_id": "fritzbox_tr064_wan_link_status",
            "state_topic": f"{self.options.base_topic}/wan/link_status",
            "icon": "mdi:wan",
            "device": self._device(),
        })

    def _publish_config(self, component: str, object_id: str, payload: dict[str, Any]) -> None:
        topic = f"{self.options.discovery_prefix}/{component}/fritzbox_tr064/{object_id}/config"
        self._publish_json(topic, payload, retain=True)

    def _publish_json(self, topic: str, payload: dict[str, Any], retain: bool | None = None) -> None:
        self._publish(topic, json.dumps(payload, separators=(",", ":")), retain=retain)

    def _publish(self, topic: str, payload: str, retain: bool | None = None) -> None:
        self.client.publish(topic, payload, qos=0, retain=self.options.retain if retain is None else retain)

    @staticmethod
    def _device() -> dict[str, Any]:
        return {
            "identifiers": ["fritzbox_tr064"],
            "name": "FRITZ!Box to MQTT",
            "manufacturer": "AVM",
            "model": "FRITZ!Box",
        }


class FritzBoxCallMonitor(threading.Thread):
    def __init__(
        self,
        options: Options,
        publisher: HomeAssistantMqttPublisher,
        stop_event: threading.Event,
    ) -> None:
        super().__init__(name="fritzbox-call-monitor", daemon=True)
        self.options = options
        self.publisher = publisher
        self.stop_event = stop_event

    def run(self) -> None:
        if not self.options.call_monitor_enabled:
            return
        self.publisher.publish_call_monitor_state()
        while not self.stop_event.is_set():
            try:
                self._read_events()
            except Exception as exc:
                LOG.debug("Call monitor not available or disconnected: %s", exc)
                self.publisher.publish_call_monitor_state()
                self.stop_event.wait(30)

    def _read_events(self) -> None:
        LOG.info("Connecting FRITZ!Box call monitor at %s:%s", self.options.fritz_host, self.options.call_monitor_port)
        with socket.create_connection((self.options.fritz_host, self.options.call_monitor_port), timeout=10) as sock:
            sock.settimeout(1)
            with sock.makefile("r", encoding="utf-8", errors="replace") as stream:
                while not self.stop_event.is_set():
                    try:
                        line = stream.readline()
                    except TimeoutError:
                        continue
                    except socket.timeout:
                        continue
                    if not line:
                        raise ConnectionError("call monitor connection closed")
                    event = parse_call_monitor_line(line.strip())
                    if event is None:
                        continue
                    LOG.info("Call monitor event %s state=%s", event.event, event.state)
                    self.publisher.publish_call_monitor_state(event)


def run() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
    options = load_options()
    LOG.info(
        "Using MQTT broker %s:%s as user '%s'",
        options.mqtt_host,
        options.mqtt_port,
        options.mqtt_username or "<none>",
    )
    stop_event = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_args: stop_event.set())
    signal.signal(signal.SIGINT, lambda *_args: stop_event.set())

    fritz = FritzBoxTr064Client(options)
    publisher = HomeAssistantMqttPublisher(options, fritz)
    publisher.start()
    call_monitor = FritzBoxCallMonitor(options, publisher, stop_event)
    call_monitor.start()
    cache = PollCache()
    last_wan_totals: dict[str, float] | None = None
    next_tam_poll = 0.0
    next_wlan_wan_box_poll = 0.0
    next_call_list_poll = 0.0
    next_phonebook_poll = 0.0
    next_dect_poll = 0.0

    try:
        while not stop_event.is_set():
            now = time.monotonic()
            did_poll = False
            poll_started = now

            if now >= next_tam_poll:
                tam_infos: list[TamInfo] = []
                for index in range(options.max_tam):
                    try:
                        info = fritz.get_tam_info(index)
                        if info.present:
                            tam_infos.append(info)
                    except Exception as exc:
                        LOG.debug("AB%s not available or not readable: %s", index, exc)
                cache.tam_infos = tam_infos
                next_tam_poll = now + options.tam_poll_interval
                did_poll = True

            if now >= next_wlan_wan_box_poll:
                wlan_infos: list[WlanInfo] = []
                for index in range(1, options.max_wlan + 1):
                    try:
                        wlan_infos.append(fritz.get_wlan_info(index))
                    except Exception as exc:
                        LOG.debug("WLAN%s not available or not readable: %s", index, exc)
                cache.wlan_infos = wlan_infos
                try:
                    wan = fritz.get_wan_common()
                    last_wan_totals = apply_wan_rate_fallback(wan, last_wan_totals, poll_started)
                    cache.wan = wan
                except Exception as exc:
                    LOG.debug("WAN state not available or not readable: %s", exc)
                try:
                    box_status, _dect_lines = fritz.get_box_status(
                        options.include_dect_lines,
                        options.max_dect_lines,
                        include_dect_status=False,
                    )
                    cache.box_status.update(box_status)
                except Exception as exc:
                    LOG.debug("Box status not available or not readable: %s", exc)
                next_wlan_wan_box_poll = now + options.poll_interval
                did_poll = True

            if now >= next_call_list_poll:
                try:
                    cache.calls = fritz.get_call_entries()
                except Exception as exc:
                    LOG.debug("Call list not available or not readable: %s", exc)
                    cache.calls = []
                next_call_list_poll = now + options.call_list_poll_interval
                did_poll = True

            if now >= next_phonebook_poll:
                try:
                    all_phonebook_ids = fritz.get_phonebook_ids()
                except Exception as exc:
                    LOG.debug("Phonebooks not available or not readable: %s", exc)
                    all_phonebook_ids = []
                all_phonebooks = []
                for phonebook_id in all_phonebook_ids:
                    try:
                        all_phonebooks.append(fritz.get_phonebook_info(phonebook_id))
                    except Exception as exc:
                        LOG.debug("Phonebook %s not available or not readable: %s", phonebook_id, exc)
                all_phonebooks = apply_phonebook_name_overrides(all_phonebooks, options.phonebook_names)
                cache.all_phonebooks = visible_phonebooks(all_phonebooks, options.phonebook_name_excludes)
                next_phonebook_poll = now + options.phonebook_poll_interval
                did_poll = True

            if now >= next_dect_poll:
                try:
                    dect_status, dect_lines = fritz.get_dect_status(options.include_dect_lines, options.max_dect_lines)
                    cache.box_status.update(dect_status)
                    cache.dect_lines = dect_lines
                except Exception as exc:
                    LOG.debug("DECT status not available or not readable: %s", exc)
                next_dect_poll = now + options.dect_poll_interval
                did_poll = True

            selected_phonebook_ids = selected_phonebooks(
                publisher.selected_phonebooks,
                cache.all_phonebooks,
            )
            cache.phonebooks = [
                phonebook for phonebook in cache.all_phonebooks if phonebook.phonebook_id in selected_phonebook_ids
            ]
            call_views = selected_call_views(options.call_lists)
            present_tam = {info.index for info in cache.tam_infos}
            present_wlan = {info.index for info in cache.wlan_infos}
            present_phonebooks = {phonebook.phonebook_id for phonebook in cache.phonebooks}
            if did_poll:
                publisher.publish_discovery(
                    present_tam,
                    present_wlan,
                    call_views,
                    present_phonebooks,
                    cache.all_phonebooks,
                    cache.dect_lines,
                )
                publisher.publish_states(
                    cache.tam_infos,
                    cache.wlan_infos,
                    cache.wan,
                    cache.calls,
                    call_views,
                    cache.phonebooks,
                    cache.all_phonebooks,
                    cache.box_status,
                    cache.dect_lines,
                )
                LOG.info(
                    "Published cached state: %s answering machines, %s WLAN services, %s call views, %s selected phonebooks, %s listed phonebooks, %s DECT lines and WAN state",
                    len(cache.tam_infos),
                    len(cache.wlan_infos),
                    len(call_views),
                    len(cache.phonebooks),
                    len(cache.all_phonebooks),
                    len(cache.dect_lines),
                )
            next_due = min(next_tam_poll, next_wlan_wan_box_poll, next_call_list_poll, next_phonebook_poll, next_dect_poll)
            stop_event.wait(max(1.0, min(30.0, next_due - time.monotonic())))
    finally:
        call_monitor.join(timeout=2)
        publisher.stop()


def load_options() -> Options:
    raw: dict[str, Any] = {}
    options_path = os.getenv("OPTIONS_PATH", "/data/options.json")
    if os.path.exists(options_path):
        with open(options_path, "r", encoding="utf-8") as file:
            raw = json.load(file)
    else:
        raw = {
            "fritz_host": os.getenv("FRITZ_HOST", "192.168.178.1"),
            "fritz_port": int(os.getenv("FRITZ_PORT", "49000")),
            "fritz_ssl": os.getenv("FRITZ_SSL", "false").lower() == "true",
            "fritz_username": os.getenv("FRITZ_USERNAME", ""),
            "fritz_password": os.getenv("FRITZ_PASSWORD", ""),
            "mqtt_host": os.getenv("MQTT_HOST", "127.0.0.1"),
            "mqtt_port": int(os.getenv("MQTT_PORT", "1883")),
            "mqtt_username": os.getenv("MQTT_USERNAME", ""),
            "mqtt_password": os.getenv("MQTT_PASSWORD", ""),
        }
    return Options(
        fritz_host=str(raw.get("ip", raw.get("fritz_host", "192.168.178.1"))),
        fritz_port=int(raw.get("port", raw.get("fritz_port", 49000))),
        fritz_ssl=bool(raw.get("fritz_ssl", False)),
        fritz_username=str(raw.get("user", raw.get("fritz_username", ""))),
        fritz_password=str(raw.get("password", raw.get("fritz_password", ""))),
        mqtt_host=str(os.getenv("MQTT_HOST", raw.get("mqtt_host", "core-mosquitto"))),
        mqtt_port=int(os.getenv("MQTT_PORT", raw.get("mqtt_port", 1883))),
        mqtt_username=str(os.getenv("MQTT_USERNAME", raw.get("mqtt_username", ""))),
        mqtt_password=str(os.getenv("MQTT_PASSWORD", raw.get("mqtt_password", ""))),
        discovery_prefix=str(raw.get("discovery_prefix", "homeassistant")).strip("/"),
        base_topic=str(raw.get("base_topic", "fritzbox")).strip("/"),
        poll_interval=interval_seconds(raw.get("poll_interval", 120), 120),
        call_list_poll_interval=interval_seconds(raw.get("call_list_poll_interval", 600), 600),
        tam_poll_interval=interval_seconds(raw.get("tam_poll_interval", 600), 600),
        dect_poll_interval=interval_seconds(raw.get("dect_poll_interval", 600), 600),
        phonebook_poll_interval=interval_seconds(raw.get("phonebook_poll_interval", 3600), 3600),
        max_tam=max(1, min(5, int(raw.get("max_tam", 5)))),
        max_wlan=max(1, min(5, int(raw.get("max_wlan", 4)))),
        call_lists=str(raw.get("call_lists", "all,incoming,outgoing,missed")),
        phonebooks=str(raw.get("phonebooks", "all")),
        phonebook_names=str(raw.get("phonebook_names", "")),
        phonebook_name_excludes=str(raw.get("phonebook_name_excludes", "tellows")),
        call_monitor_enabled=bool(raw.get("call_monitor_enabled", True)),
        call_monitor_port=int(raw.get("call_monitor_port", 1012)),
        max_calls=max(1, min(100, int(raw.get("max_calls", 20)))),
        max_live_events=max(1, min(100, int(raw.get("max_live_events", 20)))),
        include_dect_lines=bool(raw.get("include_dect_lines", False)),
        max_dect_lines=max(1, min(10, int(raw.get("max_dect_lines", 6)))),
        dns_over_tls_enabled=bool(raw.get("dns_over_tls_enabled", True)),
        log_value_details=bool(raw.get("log_value_details", True)),
        retain=bool(raw.get("retain", True)),
    )


def interval_seconds(value: Any, fallback: int, minimum: int = 30) -> int:
    try:
        seconds = int(value)
    except (TypeError, ValueError):
        seconds = fallback
    return max(minimum, seconds)


def apply_wan_rate_fallback(
    wan: dict[str, Any],
    previous: dict[str, float] | None,
    timestamp: float,
) -> dict[str, float] | None:
    sent = wan.get("total_bytes_sent")
    received = wan.get("total_bytes_received")
    current: dict[str, float] = {"timestamp": timestamp}
    if isinstance(sent, int):
        current["sent"] = float(sent)
    if isinstance(received, int):
        current["received"] = float(received)
    if "sent" not in current and "received" not in current:
        return previous
    if previous is not None:
        seconds = max(0.001, timestamp - previous.get("timestamp", timestamp))
        if as_int(wan.get("byte_send_rate")) <= 0 and "sent" in current and "sent" in previous:
            delta = current["sent"] - previous["sent"]
            if delta >= 0:
                wan["byte_send_rate"] = int(delta / seconds)
        if as_int(wan.get("byte_receive_rate")) <= 0 and "received" in current and "received" in previous:
            delta = current["received"] - previous["received"]
            if delta >= 0:
                wan["byte_receive_rate"] = int(delta / seconds)
    return current


def selected_call_views(value: str) -> set[str]:
    requested = {item.strip().lower() for item in value.split(",") if item.strip()}
    selected = requested & set(CALL_VIEW_LABELS)
    return selected or {"all"}


def selected_phonebooks(value: str, available_phonebooks: list[PhonebookInfo]) -> list[str]:
    requested = [phonebook_selection_value(item) for item in value.split(",") if item.strip()]
    available_ids = [phonebook.phonebook_id for phonebook in available_phonebooks]
    if not requested or any(item.lower() == "all" for item in requested):
        return available_ids
    selected: list[str] = []
    for item in requested:
        matched = phonebook_id_for_selection(item, available_phonebooks)
        if matched and matched not in selected:
            selected.append(matched)
    return selected


def visible_phonebooks(phonebooks: list[PhonebookInfo], excludes: str) -> list[PhonebookInfo]:
    blocked = [item.strip().lower() for item in excludes.split(",") if item.strip()]
    if not blocked:
        return phonebooks
    return [
        phonebook
        for phonebook in phonebooks
        if not any(pattern in phonebook.name.lower() for pattern in blocked)
    ]


def apply_phonebook_name_overrides(phonebooks: list[PhonebookInfo], value: str) -> list[PhonebookInfo]:
    overrides = parse_phonebook_name_overrides(value)
    if not overrides:
        return phonebooks
    return [
        PhonebookInfo(
            phonebook.phonebook_id,
            overrides.get(phonebook.phonebook_id, phonebook.name),
            phonebook.contacts,
        )
        for phonebook in phonebooks
    ]


def parse_phonebook_name_overrides(value: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for item in value.split(","):
        if ":" not in item:
            continue
        phonebook_id, name = item.split(":", 1)
        phonebook_id = phonebook_id.strip()
        name = name.strip()
        if phonebook_id and name:
            result[phonebook_id] = name
    return result


def phonebook_select_options(phonebooks: list[PhonebookInfo]) -> list[str]:
    return ["Alle Telefonbücher", "Mehrere Telefonbücher"] + [phonebook_option_label(phonebook) for phonebook in phonebooks]


def phonebook_option_label(phonebook: PhonebookInfo) -> str:
    return f"{phonebook_entity_name(phonebook)} ({phonebook.phonebook_id})"


def phonebook_entity_name(phonebook: PhonebookInfo) -> str:
    name = (phonebook.name or "").strip()
    if not name:
        return f"Telefonbuch {phonebook.phonebook_id}"
    if name.lower() == "telefonbuch":
        return f"Telefonbuch {phonebook.phonebook_id}"
    return name


def phonebook_selection_label(value: str, phonebooks: list[PhonebookInfo]) -> str:
    selection = phonebook_selection_value(value)
    if selection == "all":
        return "Alle Telefonbücher"
    if "," in selection:
        return "Mehrere Telefonbücher"
    for phonebook in phonebooks:
        if phonebook.phonebook_id == selection or phonebook_entity_name(phonebook).lower() == selection.lower():
            return phonebook_option_label(phonebook)
    return value


def phonebook_selection_value(value: str) -> str:
    normalized = value.strip()
    if not normalized or normalized.lower() in {"all", "alle", "alle telefonbücher", "alle telefonbuecher"}:
        return "all"
    if "," in normalized:
        return ",".join(phonebook_selection_value(item) for item in normalized.split(",") if item.strip())
    if ":" in normalized:
        return normalized.split(":", 1)[0].strip()
    if normalized.lower() == "mehrere telefonbücher":
        return "all"
    match = re.match(r"^(.*?)\s+\(([^)]+)\)$", normalized)
    if match:
        name_part = match.group(1).strip()
        id_part = match.group(2).strip()
        if id_part:
            return id_part
        return name_part
    return normalized


def phonebook_id_for_selection(value: str, phonebooks: list[PhonebookInfo]) -> str | None:
    normalized = phonebook_selection_value(value)
    for phonebook in phonebooks:
        if phonebook.phonebook_id == normalized:
            return phonebook.phonebook_id
        if phonebook.name.lower() == normalized.lower():
            return phonebook.phonebook_id
        if phonebook_entity_name(phonebook).lower() == normalized.lower():
            return phonebook.phonebook_id
    return None


def phonebook_xml_name(root: ET.Element) -> str:
    for element in root.iter():
        if element.tag.split("}")[-1].lower() == "phonebook":
            name = element.attrib.get("name", "").strip()
            if name:
                return name
    return (root.attrib.get("name") or find_text(root, "Name")).strip()


def phonebook_summary(phonebook: PhonebookInfo) -> dict[str, Any]:
    return {
        "id": phonebook.phonebook_id,
        "name": phonebook.name,
        "contacts": len(phonebook.contacts),
    }


def mesh_role_from_xml(root: ET.Element, fritz_host: str) -> str:
    candidates: list[tuple[bool, str]] = []
    for element in root.iter():
        children = {child.tag.split("}")[-1].lower(): child.text or "" for child in element}
        role = first_role_value(children)
        if not role:
            continue
        text = ET.tostring(element, encoding="unicode")
        is_self = bool(fritz_host and fritz_host in text) or any(
            as_bool(children.get(name, ""))
            for name in ["self", "this", "local", "islocal", "isthisdevice"]
        )
        candidates.append((is_self, role))
    for is_self, role in candidates:
        if is_self:
            return role
    return candidates[0][1] if candidates else ""


def first_role_value(values: dict[str, str]) -> str:
    for name, value in values.items():
        lower_name = name.lower()
        if "role" not in lower_name and "master" not in lower_name and "mesh" not in lower_name:
            continue
        role = normalize_mesh_role(value)
        if role:
            return role
    return ""


def normalize_mesh_role(value: Any) -> str:
    text = str(value).strip().lower()
    if not text:
        return ""
    if text in {"1", "true", "yes", "master", "mesh_master", "controller"}:
        return "master"
    if text in {"0", "false", "no", "slave", "repeater", "mesh_slave", "agent"}:
        return "slave"
    if "master" in text or "controller" in text:
        return "master"
    if "slave" in text or "repeater" in text or "agent" in text:
        return "slave"
    return text


def first_ipv6_value(values: dict[str, Any], names: list[str]) -> str:
    for name in names:
        value = ipv6_from_text(str(values.get(name, "")))
        if value:
            return value
    for value in values.values():
        ipv6 = ipv6_from_text(str(value))
        if ipv6:
            return ipv6
    return ""


def first_nested_value(values: dict[str, Any], paths: list[list[str]]) -> str:
    for path in paths:
        current: Any = values
        for part in path:
            if not isinstance(current, dict) or part not in current:
                current = None
                break
            current = current[part]
        if current is not None:
            text = str(current).strip()
            if text:
                return text
    return ""


def fritz_login_response(challenge: str, password: str) -> str:
    normalized = challenge[1:] if challenge.startswith("$2$") else challenge
    if normalized.startswith("2$"):
        parts = normalized.split("$")
        if len(parts) >= 5:
            iter1 = int(parts[1])
            salt1 = bytes.fromhex(parts[2])
            iter2 = int(parts[3])
            salt2 = bytes.fromhex(parts[4])
            hash1 = pbkdf2_hmac("sha256", password.encode("utf-8"), salt1, iter1)
            hash2 = pbkdf2_hmac("sha256", hash1, salt2, iter2)
            return f"2${parts[4]}${hash2.hex()}"
    digest = md5(f"{challenge}-{password}".encode("utf-16le")).hexdigest()
    return f"{challenge}-{digest}"


def ipv6_from_text(value: str) -> str:
    for candidate in re.split(r"[\s,;]+", value.strip()):
        text = candidate.strip("[](){}<>\"'")
        if ":" in text and re.fullmatch(r"[0-9A-Fa-f:.%]+", text):
            return text
    return ""


def call_to_dict(call: CallEntry) -> dict[str, str]:
    return {
        "type": call.view,
        "type_id": call.type_id,
        "type_label": CALL_VIEW_LABELS.get(call.view, call.view),
        "date": call.date,
        "name": call.name,
        "caller": call.caller,
        "called": call.called,
        "number": call.number,
        "duration": call.duration,
    }


def call_to_line(call: CallEntry) -> str:
    label = CALL_VIEW_LABELS.get(call.view, call.view).replace("Anrufliste ", "")
    person = call.name or call.number or "Unbekannt"
    direction = call.caller or call.called or call.number
    duration = f", {call.duration}" if call.duration else ""
    return f"{call.date} | {label} | {person} | {direction}{duration}"


def parse_call_monitor_line(line: str) -> CallMonitorEvent | None:
    parts = line.split(";")
    if len(parts) < 2:
        return None
    timestamp = parts[0]
    event = parts[1].upper()
    if event == "RING" and len(parts) >= 6:
        return CallMonitorEvent(event, "ringing", timestamp, parts[2], parts[3], parts[4], "", parts[5], "", line)
    if event == "CALL" and len(parts) >= 7:
        return CallMonitorEvent(event, "dialing", timestamp, parts[2], parts[4], parts[5], parts[3], parts[6], "", line)
    if event == "CONNECT" and len(parts) >= 5:
        return CallMonitorEvent(event, "connected", timestamp, parts[2], parts[4], "", parts[3], "", "", line)
    if event == "DISCONNECT" and len(parts) >= 4:
        return CallMonitorEvent(event, "idle", timestamp, parts[2], "", "", "", "", parts[3], line)
    return CallMonitorEvent(event, event.lower(), timestamp, parts[2] if len(parts) > 2 else "", "", "", "", "", "", line)


def call_monitor_event_to_dict(event: CallMonitorEvent) -> dict[str, str]:
    return {
        "event": event.event,
        "state": event.state,
        "timestamp": event.timestamp,
        "connection_id": event.connection_id,
        "caller": event.caller,
        "called": event.called,
        "extension": event.extension,
        "line": event.line,
        "duration": event.duration,
        "raw": event.raw,
    }


def safe_object_part(value: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_]+", "_", value.strip().lower())
    return safe.strip("_") or "unknown"


def first_text(element: ET.Element, names: list[str]) -> str:
    for name in names:
        value = find_text(element, name).strip()
        if value:
            return value
    return ""


def first_value(values: dict[str, Any], names: list[str]) -> str:
    for name in names:
        value = str(values.get(name, "")).strip()
        if value:
            return value
    lower_values = {str(key).lower(): value for key, value in values.items()}
    for name in names:
        value = str(lower_values.get(name.lower(), "")).strip()
        if value:
            return value
    return ""


def number_value(values: dict[str, Any], names: list[str]) -> str:
    value = first_value(values, names)
    if value.isdigit():
        return value
    match = re.search(r"\d+", value)
    return match.group(0) if match else ""


def dect_internal_from_device(device: str) -> str:
    value = as_int(device)
    if 600 <= value <= 699:
        return str(value)
    if 1 <= value <= 99:
        return str(599 + value)
    return ""


def dect_user_entries_from_lua(value: Any) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    collect_dect_user_entries(value, entries)
    LOG.info("Lua dectUser normalized entries: %s", len(entries))
    return entries


def collect_dect_user_entries(value: Any, entries: list[dict[str, Any]]) -> None:
    if isinstance(value, str):
        text = value.strip()
        if not text or text in {"[]", "{}"}:
            return
        try:
            collect_dect_user_entries(json.loads(text), entries)
        except json.JSONDecodeError:
            return
        return
    if isinstance(value, list):
        for entry in value:
            collect_dect_user_entries(entry, entries)
        return
    if isinstance(value, dict):
        lower_keys = {str(key).lower() for key in value}
        if any(key.lower() in lower_keys for key in ["Intern", "InternalNumber", "HandsetNumber"]):
            entries.append(value)
            return
        for entry in value.values():
            collect_dect_user_entries(entry, entries)


def find_text(element: ET.Element, local_name: str) -> str:
    for child in element:
        if child.tag.split("}")[-1] == local_name:
            return child.text or ""
    return ""


def as_bool(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on", "enabled"}


def as_int(value: Any) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return 0


def format_mbit(bits_per_second: Any) -> str:
    return f"{as_int(bits_per_second) / 1_000_000:.2f}"


def format_kbit_per_second(bytes_per_second: Any) -> str:
    return f"{as_int(bytes_per_second) * 8 / 1_000:.2f}"


def display_on_off_status(value: Any) -> str:
    text = str(value or "").strip()
    normalized = text.lower()
    on_values = {"1", "true", "yes", "on", "up", "enabled", "connected"}
    off_values = {"0", "false", "no", "off", "down", "disabled", "disconnected", "error"}
    if normalized in on_values:
        return "Ein"
    if normalized in off_values:
        return "Aus"
    return text or "Unbekannt"


def escape_xml(value: Any) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


if __name__ == "__main__":
    run()
