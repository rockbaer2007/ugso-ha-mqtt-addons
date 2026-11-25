"""Curated Christmas observances, not a statutory public-holiday calendar."""
from datetime import date, timedelta
from functools import lru_cache

REGIONS = {
    "central": ("Mitteleuropa", "Central Europe"),
    "west": ("Westeuropa", "Western Europe"),
    "north": ("Nordeuropa", "Northern Europe"),
    "baltic": ("Baltikum", "Baltic states"),
    "south": ("Südeuropa", "Southern Europe"),
    "southeast": ("Südosteuropa", "Southeastern Europe"),
    "east": ("Osteuropa", "Eastern Europe"),
    "america": ("Nordamerika", "North America"),
    "custom": ("Benutzerdefiniert", "Custom"),
}
COUNTRIES = {
    "DE": ("central", "Deutschland", "Germany"),
    "AT": ("central", "Österreich", "Austria"),
    "CH": ("central", "Schweiz", "Switzerland"),
    "LI": ("central", "Liechtenstein", "Liechtenstein"),
    "PL": ("central", "Polen", "Poland"),
    "CZ": ("central", "Tschechien", "Czechia"),
    "SK": ("central", "Slowakei", "Slovakia"),
    "HU": ("central", "Ungarn", "Hungary"),
    "FR": ("west", "Frankreich", "France"),
    "BE": ("west", "Belgien", "Belgium"),
    "NL": ("west", "Niederlande", "Netherlands"),
    "LU": ("west", "Luxemburg", "Luxembourg"),
    "GB": ("west", "Vereinigtes Königreich", "United Kingdom"),
    "IE": ("west", "Irland", "Ireland"),
    "MC": ("west", "Monaco", "Monaco"),
    "DK": ("north", "Dänemark", "Denmark"),
    "SE": ("north", "Schweden", "Sweden"),
    "NO": ("north", "Norwegen", "Norway"),
    "FI": ("north", "Finnland", "Finland"),
    "IS": ("north", "Island", "Iceland"),
    "EE": ("baltic", "Estland", "Estonia"),
    "LV": ("baltic", "Lettland", "Latvia"),
    "LT": ("baltic", "Litauen", "Lithuania"),
    "ES": ("south", "Spanien", "Spain"),
    "PT": ("south", "Portugal", "Portugal"),
    "IT": ("south", "Italien", "Italy"),
    "MT": ("south", "Malta", "Malta"),
    "GR": ("south", "Griechenland", "Greece"),
    "CY": ("south", "Zypern", "Cyprus"),
    "AD": ("south", "Andorra", "Andorra"),
    "SM": ("south", "San Marino", "San Marino"),
    "VA": ("south", "Vatikanstadt", "Vatican City"),
    "SI": ("southeast", "Slowenien", "Slovenia"),
    "HR": ("southeast", "Kroatien", "Croatia"),
    "BA": ("southeast", "Bosnien und Herzegowina", "Bosnia and Herzegovina"),
    "RS": ("southeast", "Serbien", "Serbia"),
    "ME": ("southeast", "Montenegro", "Montenegro"),
    "XK": ("southeast", "Kosovo", "Kosovo"),
    "AL": ("southeast", "Albanien", "Albania"),
    "MK": ("southeast", "Nordmazedonien", "North Macedonia"),
    "BG": ("southeast", "Bulgarien", "Bulgaria"),
    "RO": ("southeast", "Rumänien", "Romania"),
    "UA": ("east", "Ukraine", "Ukraine"),
    "BY": ("east", "Belarus", "Belarus"),
    "MD": ("east", "Moldau", "Moldova"),
    "RU": ("east", "Russland", "Russia"),
    "US": ("america", "Vereinigte Staaten", "United States"),
    "CUSTOM": ("custom", "Eigene Termine", "Custom dates"),
}
# ID: German label, English label, category, month, day. Advent is calculated.
EVENTS = {
    "advent_1": ("1. Advent", "First Advent Sunday", "religious", 0, 1),
    "advent_2": ("2. Advent", "Second Advent Sunday", "religious", 0, 2),
    "advent_3": ("3. Advent", "Third Advent Sunday", "religious", 0, 3),
    "advent_4": ("4. Advent", "Fourth Advent Sunday", "religious", 0, 4),
    "barbara": ("Barbaratag", "Saint Barbara's Day", "tradition", 12, 4),
    "sinterklaas": ("Sinterklaas", "Sinterklaas", "tradition", 12, 5),
    "pakjesavond": ("Pakjesavond", "Pakjesavond", "tradition", 12, 5),
    "krampus": ("Krampusnacht", "Krampus Night", "tradition", 12, 5),
    "nicholas": ("Nikolaus", "Saint Nicholas' Day", "religious", 12, 6),
    "immaculate": ("Mariä Empfängnis", "Immaculate Conception", "religious", 12, 8),
    "lucia": ("Luciafest", "Saint Lucia's Day", "tradition", 12, 13),
    "lottery": ("Weihnachtslotterie El Gordo", "El Gordo Christmas lottery", "tradition", 12, 22),
    "christmas_eve": ("Heiligabend", "Christmas Eve", "religious", 12, 24),
    "christmas": ("1. Weihnachtstag", "First Christmas Day", "religious", 12, 25),
    "christmas_2": ("2. Weihnachtstag", "Second Christmas Day", "religious", 12, 26),
    "stephen": ("Stephanstag", "Saint Stephen's Day", "religious", 12, 26),
    "boxing": ("Boxing Day", "Boxing Day", "tradition", 12, 26),
    "new_years_eve": ("Silvester", "New Year's Eve", "tradition", 12, 31),
    "new_year": ("Neujahr", "New Year's Day", "tradition", 1, 1),
    "kings_eve": ("Dreikönigsumzüge", "Three Kings' parades", "tradition", 1, 5),
    "epiphany": ("Heilige Drei Könige", "Three Kings", "religious", 1, 6),
    "epiphanias": ("Epiphanias", "Epiphany", "religious", 1, 6),
    "befana": ("Befana", "Befana", "tradition", 1, 6),
    "orthodox_eve": ("Heiligabend (julianischer Kalender)", "Christmas Eve (Julian calendar)", "religious", 1, 6),
    "orthodox_christmas": ("1. Weihnachtstag (julianischer Kalender)", "First Christmas Day (Julian calendar)", "religious", 1, 7),
    "nativity_fast": ("Beginn der Weihnachtsfastenzeit (julianisch)", "Nativity Fast begins (Julian)", "religious", 11, 28),
    "thanksgiving": ("Thanksgiving", "Thanksgiving", "tradition", 0, 0),
    "black_friday": ("Black Friday", "Black Friday", "commercial", 0, 0),
    "advent_calendar": ("Beginn Adventskalender", "Advent calendar begins", "tradition", 12, 1),
}

WESTERN = ("advent_1", "advent_2", "advent_3", "advent_4", "christmas_eve", "christmas")
ORTHODOX = ("nativity_fast", "orthodox_eve", "orthodox_christmas")
EXTRAS = {
    "barbara": {"DE", "AT", "CH", "CZ", "PL"},
    "sinterklaas": {"NL"}, "krampus": {"AT", "DE", "IT"},
    "nicholas": {"DE", "AT", "CH", "LI", "BE", "LU", "NL", "FR", "PL", "CZ", "SK", "HU", "SI", "HR", "RO"},
    "immaculate": {"AT", "IT", "ES", "PT", "MT", "AD", "SM", "VA", "LI", "MC"},
    "lucia": {"SE", "NO", "DK", "FI", "IT"},
    "lottery": {"ES"}, "kings_eve": {"ES"}, "befana": {"IT", "SM", "VA"},
    "boxing": {"GB"}, "thanksgiving": {"US"}, "black_friday": {"US"},
    "christmas_2": {"DE", "AT", "CH", "LI", "PL", "CZ", "SK", "HU", "DK", "SE", "NO", "FI", "IS", "EE", "LV", "LT", "IT", "HR", "RO", "BG", "IE"},
    "epiphany": {"DE", "AT", "CH", "LI", "PL", "ES", "IT", "GR", "CY", "HR", "FI", "SE", "SM", "VA", "RO", "BG"},
}


# Separate selectable names for the same date. Existing IDs keep their meaning,
# schedules and picture mappings; new entries start without assigned pictures.
EXTRAS["pakjesavond"] = EXTRAS["sinterklaas"].copy()
EXTRAS["stephen"] = EXTRAS["christmas_2"].copy()
EXTRAS["epiphanias"] = EXTRAS["epiphany"].copy()


def label(event, language="de"):
    return EVENTS[event][0 if language.startswith("de") else 1]


def country_events(country, tradition="western"):
    """Regional suggestions; individual channels explicitly select their dates."""
    result = {"new_years_eve", "new_year"}
    if tradition != "julian":
        result.update(WESTERN)
        result.add("advent_calendar")
        result.update(key for key, countries in EXTRAS.items() if country in countries)
    if tradition != "western":
        result.update(ORTHODOX)
    return tuple(key for key in EVENTS if key in result)


@lru_cache(maxsize=256)
def event_dates(year):
    christmas = date(year, 12, 25)
    last_advent = christmas - timedelta(days=christmas.isoweekday() % 7 or 7)
    dates = {key: date(year, value[3], value[4]) for key, value in EVENTS.items() if value[3]}
    dates.update({f"advent_{n}": last_advent - timedelta(weeks=4-n) for n in range(1, 5)})
    november = date(year, 11, 1)
    dates["thanksgiving"] = november + timedelta(days=(3-november.weekday()) % 7 + 21)
    dates["black_friday"] = dates["thanksgiving"] + timedelta(days=1)
    return dates


def observances(day, country, tradition="western"):
    return [key for key in country_events(country, tradition) if event_dates(day.year)[key] == day]
