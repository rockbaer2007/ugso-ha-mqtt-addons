"""Persistent per-entity MQTT paths; preferences apply only to unseen entities."""
import copy
import json
import re
import threading
from pathlib import Path
from tempfile import NamedTemporaryFile

def route_broker(config):
    return [config.host, config.port]


class TopicRoutes:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.RLock()
        self.data = self.validate(json.loads(self.path.read_text(encoding="utf-8"))) if self.path.exists() else {"format": "ugso-mqtt-routes", "version": 1, "scopes": []}

    @staticmethod
    def validate(data):
        if not isinstance(data, dict) or data.get("format") != "ugso-mqtt-routes" or data.get("version") != 1 or not isinstance(data.get("scopes"), list):
            raise ValueError("Invalid MQTT route registry")
        keys = set()
        for scope in data["scopes"]:
            if not isinstance(scope, dict) or not isinstance(scope.get("broker"), list) or len(scope["broker"]) != 2 or not isinstance(scope["broker"][0], str) or not isinstance(scope["broker"][1], int) or not isinstance(scope.get("prefix"), str) or not scope["prefix"] or any(c in scope["prefix"] for c in "+#\x00\r\n") or not isinstance(scope.get("entities"), dict) or not isinstance(scope.get("legacy_labels", []), list):
                raise ValueError("Invalid MQTT route scope")
            key = json.dumps([scope["broker"], scope["prefix"]])
            if key in keys:
                raise ValueError("Duplicate MQTT route scope")
            keys.add(key)
            occupied = []
            if any(not isinstance(label, str) or not re.fullmatch(r"[a-z0-9_]{1,128}", label) for label in scope.get("legacy_labels", [])):
                raise ValueError("Invalid legacy label")
            for entity, route in scope["entities"].items():
                if not re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity) or not isinstance(route, dict) or route.get("layout") not in {"nested", "flat"}:
                    raise ValueError("Invalid MQTT entity route")
                base = route.get("base")
                if base is not None and (not isinstance(base, str) or not base.startswith(scope["prefix"] + "/") or not re.fullmatch(r"[a-z0-9_.-]+(?:/[a-z0-9_.-]+)*", base[len(scope["prefix"]) + 1:])):
                    raise ValueError("Invalid MQTT route path")
                if base:
                    family = TopicRoutes.family(base, route["layout"])
                    if any(family & previous and (route["layout"] == "flat" or kind == "flat") for previous, kind in occupied):
                        raise ValueError("Conflicting MQTT route paths")
                    occupied.append((family, route["layout"]))
        return data

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp = None
        try:
            with NamedTemporaryFile("w", encoding="utf-8", dir=self.path.parent, delete=False) as handle:
                temp = Path(handle.name)
                json.dump(self.data, handle, ensure_ascii=False)
            temp.replace(self.path)
        except Exception:
            self.data = self.validate(json.loads(self.path.read_text(encoding="utf-8"))) if self.path.exists() else {"format": "ugso-mqtt-routes", "version": 1, "scopes": []}
            if temp:
                temp.unlink(missing_ok=True)
            raise

    def scope(self, config):
        return next((s for s in self.data["scopes"] if s["broker"] == route_broker(config) and s["prefix"] == config.prefix), None)

    def bootstrap(self, config, inventory):
        with self.lock:
            if self.scope(config) is not None:
                return
            entities = {e: {"layout": "nested", "base": None} for e in set(config.entities) | {v.split(":", 1)[0] for v in config.entity_attributes}}
            with inventory.lock:
                records = [r for r in inventory.records if r.get("broker", [])[:2] == route_broker(config) and r.get("prefix") == config.prefix and r.get("entity") and r.get("attribute") is None]
            # Prefer active paths; retain old assignments even for removed labels.
            for record in sorted(records, key=lambda r: bool(r.get("active"))):
                layout = record.get("topic_layout", "nested")
                topic = record["topic"]
                if layout == "nested" and not topic.endswith("/state"):
                    continue
                entities[record["entity"]] = {"layout": layout, "base": topic[:-6] if layout == "nested" else topic}
            scope = {"broker": route_broker(config), "prefix": config.prefix, "entities": entities, "legacy_labels": [config.forward_label] if config.forward_label else []}
            self.validate({"format": "ugso-mqtt-routes", "version": 1, "scopes": [scope]})
            self.data["scopes"].append(scope)
            self.save()

    def seed_labels(self, config, entities):
        with self.lock:
            scope = self.scope(config)
            if scope and config.forward_label in scope["legacy_labels"]:
                for entity in entities:
                    scope["entities"].setdefault(entity, {"layout": "nested", "base": None})
                scope["legacy_labels"].remove(config.forward_label)
                self.save()

    @staticmethod
    def family(base, layout):
        # Compare adapter object paths as well as MQTT paths (dots also form ID levels).
        if layout == "nested":
            return {base.replace("/", ".")}
        names = [base, base + "_set", base + "_attribute"]
        for feature in ["brightness", "rgb_color", "effect", "color_temp_kelvin"]:
            names += [base + "_" + feature, base + "_" + feature + "_set"]
        return {name.replace("/", ".") for name in names}

    def assign(self, config, entity, legacy_base, short_name):
        with self.lock:
            scope = self.scope(config)
            if scope is None:
                raise ValueError("MQTT routes not initialized")
            existing = scope["entities"].get(entity)
            if existing and existing.get("base"):
                return
            layout = existing["layout"] if existing else config.topic_layout_new
            base = legacy_base
            if layout == "nested" and not existing:
                occupied_flat = set()
                for route in scope["entities"].values():
                    if route.get("base") and route["layout"] == "flat":
                        occupied_flat.update(self.family(route["base"], "flat"))
                index = 1
                while self.family(base, "nested") & occupied_flat:
                    index += 1
                    base = f"{legacy_base}_{index}"
            if layout == "flat":
                device = legacy_base[len(config.prefix) + 1:].split("/")[0].replace('.', '_')
                if device in {"availability", "selected_entities"}:
                    device += "_device"
                occupied = set()
                for route in scope["entities"].values():
                    if route.get("base"):
                        occupied.update(self.family(route["base"], route["layout"]))
                for index in range(1, 10001):
                    candidate = f"{config.prefix}/{device}/{short_name}" + (f"_{index}" if index > 1 else "")
                    if not self.family(candidate, "flat") & occupied:
                        base = candidate
                        break
                else:
                    raise ValueError("No free MQTT route")
            scope["entities"][entity] = {"layout": layout, "base": base}
            self.save()  # Persist BEFORE publishing or subscribing.

    def route(self, config, entity):
        with self.lock:
            scope = self.scope(config)
            return dict(scope["entities"].get(entity, {})) if scope else {}

    def topic(self, config, entity, suffix):
        route = self.route(config, entity)
        base = route.get("base")
        if not base:
            return None
        if route["layout"] == "nested":
            return base + "/" + suffix
        if suffix == "state":
            return base
        if suffix == "set":
            return base + "_set"
        if suffix == "attribute" or suffix.startswith("attribute/"):
            return base + "_" + suffix
        feature, action = suffix.split("/", 1)
        return base + "_" + feature + ("_set" if action == "set" else "")

    def export(self, config):
        with self.lock:
            scope = self.scope(config)
            return {"format": "ugso-mqtt-routes", "version": 1, "scopes": [copy.deepcopy(scope)] if scope else []}

    def merge(self, config, incoming):
        data = self.validate(copy.deepcopy(incoming))
        with self.lock:
            merged = copy.deepcopy(self.data)
            for scope in data["scopes"]:
                if scope["broker"] != route_broker(config) or scope["prefix"] != config.prefix:
                    raise ValueError("Route backup belongs to another broker/prefix")
                target = next((s for s in merged["scopes"] if s["broker"] == scope["broker"] and s["prefix"] == scope["prefix"]), None)
                if target is None:
                    merged["scopes"].append(scope)
                    continue
                for entity, route in scope["entities"].items():
                    old = target["entities"].get(entity)
                    if old and old.get("base") and route != old:
                        raise ValueError("Route backup conflicts with an existing path")
                    target["entities"][entity] = route
                target["legacy_labels"] = list(dict.fromkeys(target["legacy_labels"] + scope["legacy_labels"]))
            self.data = self.validate(merged)
            self.save()
