"""Pure date/scheduling engine. No HA instance or external service required."""
from datetime import date, datetime, time, timedelta, timezone

from .catalog import EVENTS, event_dates, observances

DEFAULTS = {"region": "central", "country": "DE", "tradition": "western",
            "start_rule": "advent_1", "start_date": "01.12.",
            "end_rule": "custom", "end_date": "10.01.", "channels": []}


def custom_date(value, year):
    parts = str(value).strip().rstrip(".").split(".")
    if len(parts) != 2:
        raise ValueError("Use DD.MM.")
    return date(year, int(parts[1]), int(parts[0]))


def rule_date(rule, custom, year):
    return custom_date(custom, year) if rule == "custom" else event_dates(year)[rule]


def bounds(config, year):
    start = rule_date(config["start_rule"], config["start_date"], year)
    end = rule_date(config["end_rule"], config["end_date"], year)
    if end < start:
        end = rule_date(config["end_rule"], config["end_date"], year + 1)
    return start, end


def season(config, today):
    """Return current season or next future season (inclusive end date)."""
    for year in range(today.year - 1, today.year + 2):
        start, end = bounds(config, year)
        if start <= today <= end or start > today:
            return start, end, start <= today <= end
    raise ValueError("No season")


def parse_time(value):
    parsed = time.fromisoformat(value)
    if parsed.second or parsed.microsecond or parsed.tzinfo:
        raise ValueError("Minute precision only")
    return parsed


def validate_channel(channel):
    if not channel.get("entity_id"):
        return
    if channel["entity_id"].split(".")[0] not in {"light", "switch", "input_boolean"}:
        raise ValueError("Unsupported target")
    if parse_time(channel["on_time"]) == parse_time(channel["off_time"]):
        raise ValueError("Equal times")
    if channel.get("mode") not in {"period", "holidays"}:
        raise ValueError("Invalid mode")
    if channel["mode"] == "holidays" and not channel.get("holidays"):
        raise ValueError("Select at least one observance")
    if not set(channel.get("holidays", [])).issubset(EVENTS):
        raise ValueError("Invalid observance")


def local_time(day, value, tz, *, end=False):
    """First valid minute in a DST gap; first on / last off in a fold."""
    naive = datetime.combine(day, parse_time(value))
    for _ in range(181):
        candidate = naive.replace(tzinfo=tz, fold=int(end))
        roundtrip = candidate.astimezone(timezone.utc).astimezone(tz)
        if roundtrip.replace(tzinfo=None) == naive:
            return candidate
        naive += timedelta(minutes=1)
    raise ValueError("Unsupported timezone transition")


def eligible(config, channel, day):
    if channel["mode"] == "holidays":
        return bool(set(observances(day, config["country"], config["tradition"])) & set(channel.get("holidays", [])))
    _, _, active = season(config | {k: channel[k] for k in ("start_rule", "start_date", "end_rule", "end_date") if k in channel}, day)
    return active


def window(config, channel, day, tz):
    if not eligible(config, channel, day):
        return None
    start = local_time(day, channel["on_time"], tz)
    end_day = day + timedelta(days=parse_time(channel["off_time"]) < parse_time(channel["on_time"]))
    end = local_time(end_day, channel["off_time"], tz, end=True)
    return start, end


def channel_status(config, channel, now):
    """Desired state and next transition; only the anchor day must be eligible."""
    if not channel.get("entity_id"):
        return False, None
    stamp = now.timestamp()
    # Include yesterday's overnight window; search through the next full season.
    for offset in range(-1, 401):
        interval = window(config, channel, now.date() + timedelta(days=offset), now.tzinfo)
        if not interval:
            continue
        start, end = interval
        if start.timestamp() <= stamp < end.timestamp():
            return True, end
        if start.timestamp() > stamp:
            return False, start
    return False, None
