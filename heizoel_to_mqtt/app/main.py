from __future__ import annotations

import json
import logging
import os
import signal
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import paho.mqtt.client as mqtt
import requests


LOG = logging.getLogger("heizoel_to_mqtt")
MAX_OFFERS = 6
LEGACY_MAX_OFFERS = 10


@dataclass(frozen=True)
class Options:
    postal_code: str
    amounts: list[int]
    interval: int
    esyoil: bool
    heizoel24_de: bool
    heizoel24_at: bool
    unloading_points: int
    payment_type: str
    product: str
    delivery_times: str
    hose: str
    short_vehicle: str
    log_response_details: bool
    mqtt_host: str
    mqtt_port: int
    mqtt_username: str
    mqtt_password: str
    discovery_prefix: str
    base_topic: str
    retain: bool


@dataclass(frozen=True)
class OfferResult:
    index: int
    dealer: str
    price_per_100l: float | None
    total_price: float | None
    delivery_days: int | None
    delivery_date: str
    rating: float | None

    def price_per_liter(self, amount: int) -> float | None:
        if self.price_per_100l is not None:
            return round(self.price_per_100l / 100, 2)
        if self.total_price is not None and amount > 0:
            return round(self.total_price / amount, 2)
        return None


@dataclass(frozen=True)
class PriceResult:
    source: str
    source_name: str
    amount: int
    offers_count: int
    price_per_100l: float | None
    total_price: float | None
    dealer: str
    delivery_days: int | None
    delivery_date: str
    rating: float | None
    offers: list[OfferResult]
    currency: str = "EUR"

    @property
    def object_prefix(self) -> str:
        return f"{self.source}_{self.amount}l"


class HeatingOilClient:
    def __init__(self, options: Options) -> None:
        self.options = options
        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json, text/plain, */*",
            "accept-language": "de,en;q=0.9",
            "user-agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
            ),
        })

    def poll(self) -> list[PriceResult]:
        results: list[PriceResult] = []
        for amount in self.options.amounts:
            if self.options.esyoil:
                result = self.fetch_esyoil(amount)
                if result:
                    results.append(result)
            if self.options.heizoel24_de:
                result = self.fetch_heizoel24(amount, country_id=1)
                if result:
                    results.append(result)
            if self.options.heizoel24_at:
                result = self.fetch_heizoel24(amount, country_id=2)
                if result:
                    results.append(result)
        return results

    def fetch_esyoil(self, amount: int) -> PriceResult | None:
        payload = {
            "zipcode": self.options.postal_code,
            "amount": amount,
            "unloading_points": self.options.unloading_points,
            "payment_type": self.options.payment_type,
            "prod": self.options.product,
            "hose": self.options.hose,
            "short_vehicle": self.options.short_vehicle,
            "deliveryTimes": self.options.delivery_times,
        }
        try:
            response = self.session.post(
                "https://backbone.esyoil.com/heating-oil-calculator/v1/calculate",
                headers={
                    "content-type": "application/json",
                    "origin": "https://www.esyoil.com",
                    "referer": "https://www.esyoil.com/",
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            if self.options.log_response_details:
                LOG.info("Esyoil %sl returned: %s", amount, json.dumps(data, ensure_ascii=False, sort_keys=True))
            offers = data.get("data") if isinstance(data, dict) else None
            if not isinstance(offers, list) or not offers:
                return empty_result("esyoil", "Esyoil", amount)
            sorted_offers = sorted(offers, key=lambda item: value_at(item, ["pricing", "_100L", "brutto"]) or float("inf"))
            best = sorted_offers[0]
            return PriceResult(
                source="esyoil",
                source_name="Esyoil",
                amount=amount,
                offers_count=len(offers),
                price_per_100l=round_float(value_at(best, ["pricing", "_100L", "brutto"])),
                total_price=round_float(value_at(best, ["pricing", "total", "brutto"])),
                dealer=str(value_at(best, ["dealer", "name"]) or value_at(best, ["dealer", "shortName"]) or ""),
                delivery_days=int_value(value_at(best, ["delivery", "durationDays"])),
                delivery_date=str(value_at(best, ["delivery", "date"]) or ""),
                rating=round_float(value_at(best, ["dealer", "rating", "averageRating"])),
                offers=[
                    OfferResult(
                        index=index,
                        price_per_100l=round_float(value_at(offer, ["pricing", "_100L", "brutto"])),
                        total_price=round_float(value_at(offer, ["pricing", "total", "brutto"])),
                        dealer=str(value_at(offer, ["dealer", "name"]) or value_at(offer, ["dealer", "shortName"]) or ""),
                        delivery_days=int_value(value_at(offer, ["delivery", "durationDays"])),
                        delivery_date=str(value_at(offer, ["delivery", "date"]) or ""),
                        rating=round_float(value_at(offer, ["dealer", "rating", "averageRating"])),
                    )
                    for index, offer in enumerate(sorted_offers[:MAX_OFFERS], start=1)
                ],
            )
        except Exception as exc:
            LOG.warning("Could not fetch Esyoil price for %sl: %s", amount, exc)
            return empty_result("esyoil", "Esyoil", amount)

    def fetch_heizoel24(self, amount: int, country_id: int) -> PriceResult | None:
        source = "heizoel24_at" if country_id == 2 else "heizoel24_de"
        source_name = "Heizöl24 AT" if country_id == 2 else "Heizöl24 DE"
        url = "https://www.heizoel24.at/api/kalkulation/berechnen" if country_id == 2 else "https://www.heizoel24.de/api/kalkulation/berechnen"
        payload = heizoel24_payload(
            postal_code=self.options.postal_code,
            amount=amount,
            unloading_points=self.options.unloading_points,
            country_id=country_id,
        )
        try:
            response = self.session.post(
                url,
                headers={
                    "content-type": "application/json;charset=UTF-8",
                    "origin": "https://www.heizoel24.de" if country_id == 1 else "https://www.heizoel24.at",
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            if self.options.log_response_details:
                LOG.info("%s %sl returned: %s", source_name, amount, json.dumps(data, ensure_ascii=False, sort_keys=True))
            offers = data.get("Items") if isinstance(data, dict) else None
            if not isinstance(offers, list) or not offers:
                return empty_result(source, source_name, amount)
            sorted_offers = sorted(offers, key=lambda item: item.get("UnitPrice") or float("inf"))
            best = sorted_offers[0]
            return PriceResult(
                source=source,
                source_name=source_name,
                amount=amount,
                offers_count=len(offers),
                price_per_100l=round_float(best.get("UnitPrice")),
                total_price=round_float(best.get("TotalPrice")),
                dealer=str(best.get("Name") or ""),
                delivery_days=int_value(best.get("DeliveryPeriodDays")),
                delivery_date=str(best.get("StartDeliveryPeriodDate") or ""),
                rating=round_float(best.get("Rating")),
                offers=[
                    OfferResult(
                        index=index,
                        price_per_100l=round_float(offer.get("UnitPrice")),
                        total_price=round_float(offer.get("TotalPrice")),
                        dealer=str(offer.get("Name") or ""),
                        delivery_days=int_value(offer.get("DeliveryPeriodDays")),
                        delivery_date=str(offer.get("StartDeliveryPeriodDate") or ""),
                        rating=round_float(offer.get("Rating")),
                    )
                    for index, offer in enumerate(sorted_offers[:MAX_OFFERS], start=1)
                ],
            )
        except Exception as exc:
            LOG.warning("Could not fetch %s price for %sl: %s", source_name, amount, exc)
            return empty_result(source, source_name, amount)


class MqttPublisher:
    def __init__(self, options: Options) -> None:
        self.options = options
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="heizoel-to-mqtt")
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

    def publish_results(self, results: list[PriceResult]) -> None:
        if not self._published_discovery:
            self.publish_discovery()
            self._published_discovery = True
        self._publish(f"{self.options.base_topic}/status", "online")
        self._publish(f"{self.options.base_topic}/last_update", datetime.now(timezone.utc).isoformat())
        for result in results:
            prefix = f"{self.options.base_topic}/{result.source}/{result.amount}"
            self._publish_number(f"{prefix}/price_per_100l", result.price_per_100l, decimals=2)
            self._publish_number(f"{prefix}/total_price", result.total_price, decimals=2)
            self._publish(f"{prefix}/dealer", result.dealer)
            self._publish_number(f"{prefix}/delivery_days", result.delivery_days)
            self._publish(f"{prefix}/offers_count", str(result.offers_count))
            for index in range(1, MAX_OFFERS + 1):
                offer = next((item for item in result.offers if item.index == index), None)
                offer_prefix = f"{prefix}/offers/{index:02d}"
                self._publish(f"{offer_prefix}/dealer", offer.dealer if offer else "")
                self._publish_number(f"{offer_prefix}/total_price", offer.total_price if offer else None, decimals=2)
                self._publish_number(f"{offer_prefix}/price_per_liter", offer.price_per_liter(result.amount) if offer else None, decimals=2)
                self._publish_number(f"{offer_prefix}/price_per_100l", offer.price_per_100l if offer else None, decimals=2)
                self._publish_json(f"{offer_prefix}/attributes", {
                    "source": result.source_name,
                    "amount": result.amount,
                    "postal_code": self.options.postal_code,
                    "rank": index,
                    "price_per_liter": offer.price_per_liter(result.amount) if offer else None,
                    "price_per_100l": offer.price_per_100l if offer else None,
                    "total_price": offer.total_price if offer else None,
                    "dealer": offer.dealer if offer else "",
                    "delivery_days": offer.delivery_days if offer else None,
                    "delivery_date": offer.delivery_date if offer else "",
                    "rating": offer.rating if offer else None,
                    "currency": result.currency,
                })
            self._publish_json(f"{prefix}/attributes", {
                "source": result.source_name,
                "amount": result.amount,
                "postal_code": self.options.postal_code,
                "price_per_100l": result.price_per_100l,
                "total_price": result.total_price,
                "dealer": result.dealer,
                "delivery_days": result.delivery_days,
                "delivery_date": result.delivery_date,
                "rating": result.rating,
                "offers_count": result.offers_count,
                "published_offers": len(result.offers),
                "currency": result.currency,
            })
        LOG.info("Published %s heating oil price result groups", len(results))

    def publish_discovery(self) -> None:
        self._publish_config("binary_sensor", "connection", {
            "name": "Heizöl Verbindung",
            "unique_id": "heizoel_to_mqtt_connection",
            "state_topic": f"{self.options.base_topic}/status",
            "payload_on": "online",
            "payload_off": "offline",
            "device_class": "connectivity",
            "device": self._device(),
        })
        self._publish_config("sensor", "last_update", {
            "name": "Heizöl letzte Aktualisierung",
            "unique_id": "heizoel_to_mqtt_last_update",
            "state_topic": f"{self.options.base_topic}/last_update",
            "device_class": "timestamp",
            "device": self._device(),
        })
        for source, source_name in self.enabled_sources():
            for amount in self.options.amounts:
                object_prefix = f"{source}_{amount}l"
                state_prefix = f"{self.options.base_topic}/{source}/{amount}"
                common = {
                    "json_attributes_topic": f"{state_prefix}/attributes",
                    "device": self._device(),
                }
                self._publish_config("sensor", f"{object_prefix}_price_per_100l", {
                    **common,
                    "name": f"{source_name} {amount}l Preis pro 100l",
                    "unique_id": f"heizoel_to_mqtt_{object_prefix}_price_per_100l",
                    "state_topic": f"{state_prefix}/price_per_100l",
                    "unit_of_measurement": "EUR/100L",
                    "state_class": "measurement",
                    "suggested_display_precision": 2,
                    "icon": "mdi:currency-eur",
                })
                self._publish_config("sensor", f"{object_prefix}_total_price", {
                    **common,
                    "name": f"{source_name} {amount}l Gesamtpreis",
                    "unique_id": f"heizoel_to_mqtt_{object_prefix}_total_price",
                    "state_topic": f"{state_prefix}/total_price",
                    "unit_of_measurement": "EUR",
                    "state_class": "measurement",
                    "suggested_display_precision": 2,
                    "icon": "mdi:cash",
                })
                self._publish_config("sensor", f"{object_prefix}_dealer", {
                    **common,
                    "name": f"{source_name} {amount}l Händler",
                    "unique_id": f"heizoel_to_mqtt_{object_prefix}_dealer",
                    "state_topic": f"{state_prefix}/dealer",
                    "icon": "mdi:store",
                })
                self._publish_config("sensor", f"{object_prefix}_delivery_days", {
                    **common,
                    "name": f"{source_name} {amount}l Lieferdauer",
                    "unique_id": f"heizoel_to_mqtt_{object_prefix}_delivery_days",
                    "state_topic": f"{state_prefix}/delivery_days",
                    "unit_of_measurement": "d",
                    "state_class": "measurement",
                    "icon": "mdi:truck-delivery",
                })
                self._publish_config("sensor", f"{object_prefix}_offers_count", {
                    **common,
                    "name": f"{source_name} {amount}l Angebote",
                    "unique_id": f"heizoel_to_mqtt_{object_prefix}_offers_count",
                    "state_topic": f"{state_prefix}/offers_count",
                    "state_class": "measurement",
                    "icon": "mdi:format-list-numbered",
                })
                for index in range(1, MAX_OFFERS + 1):
                    offer_state_prefix = f"{state_prefix}/offers/{index:02d}"
                    self._publish_config("sensor", f"{object_prefix}_offer_{index:02d}_dealer", {
                        "name": f"{source_name} {amount}l Anbieter {index:02d}",
                        "unique_id": f"heizoel_to_mqtt_{object_prefix}_offer_{index:02d}_dealer",
                        "state_topic": f"{offer_state_prefix}/dealer",
                        "json_attributes_topic": f"{offer_state_prefix}/attributes",
                        "icon": "mdi:store",
                        "device": self._device(),
                    })
                    self._publish_config("sensor", f"{object_prefix}_offer_{index:02d}_total_price", {
                        "name": f"{source_name} {amount}l Anbieter {index:02d} Gesamtpreis",
                        "unique_id": f"heizoel_to_mqtt_{object_prefix}_offer_{index:02d}_total_price",
                        "state_topic": f"{offer_state_prefix}/total_price",
                        "json_attributes_topic": f"{offer_state_prefix}/attributes",
                        "unit_of_measurement": "EUR",
                        "state_class": "measurement",
                        "suggested_display_precision": 2,
                        "icon": "mdi:cash",
                        "device": self._device(),
                    })
                    self._publish_config("sensor", f"{object_prefix}_offer_{index:02d}_price_per_liter", {
                        "name": f"{source_name} {amount}l Anbieter {index:02d} Preis pro Liter",
                        "unique_id": f"heizoel_to_mqtt_{object_prefix}_offer_{index:02d}_price_per_liter",
                        "state_topic": f"{offer_state_prefix}/price_per_liter",
                        "json_attributes_topic": f"{offer_state_prefix}/attributes",
                        "unit_of_measurement": "EUR/L",
                        "state_class": "measurement",
                        "suggested_display_precision": 2,
                        "icon": "mdi:currency-eur",
                        "device": self._device(),
                    })
                    self._publish_config("sensor", f"{object_prefix}_offer_{index:02d}_price_per_100l", {
                        "name": f"{source_name} {amount}l Anbieter {index:02d} Preis pro 100l",
                        "unique_id": f"heizoel_to_mqtt_{object_prefix}_offer_{index:02d}_price_per_100l",
                        "state_topic": f"{offer_state_prefix}/price_per_100l",
                        "json_attributes_topic": f"{offer_state_prefix}/attributes",
                        "unit_of_measurement": "EUR/100L",
                        "state_class": "measurement",
                        "suggested_display_precision": 2,
                        "icon": "mdi:currency-eur",
                        "device": self._device(),
                    })
                for index in range(MAX_OFFERS + 1, LEGACY_MAX_OFFERS + 1):
                    self._delete_offer_configs(object_prefix, index)

    def enabled_sources(self) -> list[tuple[str, str]]:
        result: list[tuple[str, str]] = []
        if self.options.esyoil:
            result.append(("esyoil", "Esyoil"))
        if self.options.heizoel24_de:
            result.append(("heizoel24_de", "Heizöl24 DE"))
        if self.options.heizoel24_at:
            result.append(("heizoel24_at", "Heizöl24 AT"))
        return result

    def _on_connect(self, client: mqtt.Client, userdata: Any, flags: Any, reason_code: Any, properties: Any) -> None:
        LOG.info("Connected to MQTT broker with result %s", reason_code)

    def _publish_config(self, component: str, object_id: str, payload: dict[str, Any]) -> None:
        self._publish_json(f"{self.options.discovery_prefix}/{component}/heizoel_to_mqtt/{object_id}/config", payload, retain=True)

    def _delete_config(self, component: str, object_id: str) -> None:
        self._publish(f"{self.options.discovery_prefix}/{component}/heizoel_to_mqtt/{object_id}/config", "", retain=True)

    def _delete_offer_configs(self, object_prefix: str, index: int) -> None:
        for suffix in ("dealer", "total_price", "price_per_liter", "price_per_100l"):
            self._delete_config("sensor", f"{object_prefix}_offer_{index:02d}_{suffix}")

    def _publish_json(self, topic: str, payload: dict[str, Any], retain: bool | None = None) -> None:
        self._publish(topic, json.dumps(payload, separators=(",", ":"), ensure_ascii=False), retain=retain)

    def _publish_number(self, topic: str, value: float | int | None, decimals: int | None = None) -> None:
        if value is None:
            self._publish(topic, "")
        elif decimals is None:
            self._publish(topic, str(value))
        else:
            self._publish(topic, f"{float(value):.{decimals}f}")

    def _publish(self, topic: str, payload: str, retain: bool | None = None) -> None:
        self.client.publish(topic, payload, qos=0, retain=self.options.retain if retain is None else retain)

    @staticmethod
    def _device() -> dict[str, Any]:
        return {
            "identifiers": ["heizoel_to_mqtt"],
            "name": "Heizöl to MQTT",
            "manufacturer": "UGSo Software",
            "model": "Heating Oil Price App",
        }


def heizoel24_payload(postal_code: str, amount: int, unloading_points: int, country_id: int) -> dict[str, Any]:
    return {
        "ZipCode": postal_code,
        "Amount": amount,
        "Stations": unloading_points,
        "Parameters": [
            {"Key": "MaxDelivery", "Id": 5, "Modifier": -1, "Name": "maximal", "Selected": True},
            {"Key": None, "Id": 24, "Modifier": -1, "Name": "ganztägig möglich (7-18 Uhr)", "Selected": True},
            {"Key": None, "Id": -2, "Modifier": -1, "Name": "alle", "Selected": True},
            {"Key": None, "Id": 11, "Modifier": -1, "Name": "mit Hänger", "ShortName": "groß", "Selected": True},
            {"Key": None, "Id": 9, "Modifier": -1, "Name": "bis 40m", "ShortName": "40m", "Selected": True},
        ],
        "CountryId": country_id,
        "Product": {"Id": 6 if country_id == 2 else 1, "ClimateNeutral": False},
        "Cn": False,
        "Ap": False,
        "AppointmentPlus": False,
        "Ordering": 0,
        "UpsellCount": 0,
    }


def empty_result(source: str, source_name: str, amount: int) -> PriceResult:
    return PriceResult(
        source=source,
        source_name=source_name,
        amount=amount,
        offers_count=0,
        price_per_100l=None,
        total_price=None,
        dealer="",
        delivery_days=None,
        delivery_date="",
        rating=None,
        offers=[],
    )


def load_options() -> Options:
    raw: dict[str, Any]
    options_path = "/data/options.json"
    if os.path.exists(options_path):
        with open(options_path, "r", encoding="utf-8") as file:
            raw = json.load(file)
    else:
        raw = {}
    return Options(
        postal_code=str(raw.get("plz", raw.get("postal_code", os.getenv("POSTAL_CODE", "")))).strip(),
        amounts=parse_amounts(str(raw.get("amount", raw.get("amounts", os.getenv("AMOUNTS", "3000"))))),
        interval=max(30, int(raw.get("interval", os.getenv("INTERVAL", "60")))),
        esyoil=bool(raw.get("esyActive", True)),
        heizoel24_de=bool(raw.get("hoDe", True)),
        heizoel24_at=bool(raw.get("hoAt", False)),
        unloading_points=max(1, min(9, int(raw.get("unloading_points", 1)))),
        payment_type=normalize_payment_type(str(raw.get("payment_type", "EC-Karte"))),
        product=normalize_product(str(raw.get("prod", raw.get("product", "normal")))),
        delivery_times=normalize_delivery_time(str(raw.get("deliveryTimes", raw.get("delivery_times", "normal")))),
        hose=normalize_hose(raw.get("hose", "40m")),
        short_vehicle=normalize_tank_truck(str(raw.get("short_vehicle", "mit Anhänger möglich"))),
        log_response_details=bool(raw.get("log_response_details", False)),
        mqtt_host=str(os.getenv("MQTT_HOST", raw.get("mqtt_host", "core-mosquitto"))),
        mqtt_port=int(os.getenv("MQTT_PORT", raw.get("mqtt_port", 1883))),
        mqtt_username=str(os.getenv("MQTT_USERNAME", raw.get("mqtt_username", ""))),
        mqtt_password=str(os.getenv("MQTT_PASSWORD", raw.get("mqtt_password", ""))),
        discovery_prefix=str(raw.get("discovery_prefix", "homeassistant")).strip("/"),
        base_topic=str(raw.get("base_topic", "heizoel")).strip("/"),
        retain=bool(raw.get("retain", True)),
    )


def parse_amounts(value: str) -> list[int]:
    amounts: list[int] = []
    for part in value.replace(" ", "").split(","):
        if not part:
            continue
        try:
            amount = int(part)
        except ValueError:
            LOG.warning("Ignoring invalid amount '%s'", part)
            continue
        if amount > 0 and amount not in amounts:
            amounts.append(amount)
    return amounts or [3000]


def normalize_delivery_time(value: str) -> str:
    delivery_times = {
        "ohne": "normal",
        "normal": "normal",
        "7:00 - 12:00 Uhr": "weekTimeOne",
        "weekTimeOne": "weekTimeOne",
        "12:00 - 17:00 Uhr": "weekTimeTwo",
        "weekTimeTwo": "weekTimeTwo",
        "2 Wochentage (Express)": "twoWorkingDays",
        "twoWorkingDays": "twoWorkingDays",
        "3 - 5 Wochentage (Mo.-Fr.)": "threeFiveDays",
        "threeFiveDays": "threeFiveDays",
        "6 - 10 Wochentage (Mo.-Fr.)": "fiveTenDays",
        "fiveTenDays": "fiveTenDays",
    }
    return delivery_times.get(value.strip(), "normal")


def normalize_product(value: str) -> str:
    products = {
        "Normal Schwefelarm": "normal",
        "normal": "normal",
        "Premium Schwefelarm": "premium",
        "premium": "premium",
        "Klimaneutral Premium": "climateNeutralPremium",
        "climateNeutralPremium": "climateNeutralPremium",
        "Klimaneutral Normal": "climateNeutralNormal",
        "climateNeutralNormal": "climateNeutralNormal",
        "Bio 10": "bio10",
        "bio10": "bio10",
        "Bio 15": "bio15",
        "bio15": "bio15",
        "Bio 10 Premium": "bio10Premium",
        "bio10Premium": "bio10Premium",
    }
    return products.get(value.strip(), "normal")


def normalize_payment_type(value: str) -> str:
    payment_types = {
        "EC-Karte": "ec",
        "ec": "ec",
        "Barzahlung": "cash",
        "cash": "cash",
        "Ratenkauf": "guaranteedPayment",
        "guaranteedPayment": "guaranteedPayment",
        "Rechnung": "invoice",
        "invoice": "invoice",
        "Lastschrift": "directDebit",
        "directDebit": "directDebit",
        "Vorkasse": "inAdvance",
        "inAdvance": "inAdvance",
    }
    return payment_types.get(value.strip(), "ec")


def normalize_hose(value: Any) -> str:
    text = str(value).strip()
    legacy = {
        "fortyMetre": "fortyMetre",
        "sixtyMetre": "sixtyMetre",
        "eightyMetre": "eightyMetre",
    }
    if text in legacy:
        return legacy[text]
    fixed = {
        "40 m": "fortyMetre",
        "40m": "fortyMetre",
        "60 m": "sixtyMetre",
        "60m": "sixtyMetre",
        "80 m": "eightyMetre",
        "80m": "eightyMetre",
    }
    if text in fixed:
        return fixed[text]
    try:
        metres = int(text)
    except ValueError:
        LOG.warning("Invalid hose length '%s', using 40m", value)
        metres = 40
    if metres <= 40:
        return "fortyMetre"
    if metres <= 60:
        return "sixtyMetre"
    return "eightyMetre"


def normalize_tank_truck(value: str) -> str:
    tank_trucks = {
        "mit Anhänger möglich": "withTrailer",
        "withTrailer": "withTrailer",
        "ohne Anhänger": "withoutTrailer",
        "withoutTrailer": "withoutTrailer",
    }
    return tank_trucks.get(value.strip(), "withTrailer")


def value_at(data: Any, path: list[str]) -> Any:
    current = data
    for part in path:
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def round_float(value: Any) -> float | None:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def int_value(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    options = load_options()
    if not options.postal_code:
        LOG.warning("No postal_code configured. The app will publish unavailable price sensors.")
    client = HeatingOilClient(options)
    publisher = MqttPublisher(options)
    stop_event = threading.Event()

    def stop(signum: int, frame: Any) -> None:
        LOG.info("Stopping on signal %s", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    publisher.connect()
    try:
        while not stop_event.is_set():
            try:
                results = client.poll() if options.postal_code else []
                publisher.publish_results(results)
            except Exception as exc:
                LOG.exception("Polling failed: %s", exc)
                publisher._publish(f"{options.base_topic}/status", "offline")
            stop_event.wait(options.interval * 60)
    finally:
        publisher._publish(f"{options.base_topic}/status", "offline")
        publisher.disconnect()


if __name__ == "__main__":
    main()
