from datetime import date, datetime, timezone
import unittest
from zoneinfo import ZoneInfo

from custom_components.weihnachtssteuerung.catalog import COUNTRIES, EVENTS, REGIONS, country_events, event_dates, observances
from custom_components.weihnachtssteuerung.engine import DEFAULTS, bounds, channel_status, season, validate_channel

UTC = timezone.utc


class CalendarTests(unittest.TestCase):
    def setUp(self):
        self.config = dict(DEFAULTS)
        self.channel = {"entity_id": "input_boolean.christmas_test", "mode": "period", "on_time": "16:00:00", "off_time": "23:00:00", "holidays": ["advent_2", "nicholas"]}

    def test_catalog_region_membership_and_ids(self):
        self.assertEqual(len(COUNTRIES), 48)
        for country, values in COUNTRIES.items():
            self.assertIn(values[0], REGIONS)
            for tradition in ("western", "julian", "both"):
                self.assertTrue(set(country_events(country, tradition)) <= set(EVENTS))

    def test_advent_over_fifty_years(self):
        for year in range(2000, 2051):
            dates = event_dates(year)
            self.assertEqual(dates["advent_1"].weekday(), 6)
            self.assertTrue(date(year, 11, 27) <= dates["advent_1"] <= date(year, 12, 3))
            for n in range(1, 4):
                self.assertEqual((dates[f"advent_{n+1}"] - dates[f"advent_{n}"]).days, 7)
        self.assertEqual(event_dates(2026)["advent_1"], date(2026, 11, 29))
        self.assertEqual(event_dates(2027)["advent_1"], date(2027, 11, 28))

    def test_separate_names_keep_dates_and_country_availability(self):
        self.assertEqual(EVENTS["christmas"][0], "1. Weihnachtstag")
        self.assertEqual(EVENTS["christmas_2"][0], "2. Weihnachtstag")
        self.assertFalse(any(" / " in names[0] or " / " in names[1] for names in EVENTS.values()))
        for original, new, country in (("sinterklaas", "pakjesavond", "NL"), ("christmas_2", "stephen", "DE"), ("epiphany", "epiphanias", "DE")):
            self.assertIn(original, country_events(country))
            self.assertIn(new, country_events(country))
            self.assertEqual(event_dates(2026)[original], event_dates(2026)[new])
        self.assertNotIn("pakjesavond", country_events("DE"))

    def test_thanksgiving_is_fourth_thursday(self):
        for year in range(2000, 2051):
            day = event_dates(year)["thanksgiving"]
            self.assertEqual(day.weekday(), 3)
            self.assertTrue(22 <= day.day <= 28)

    def test_coincident_observances_and_regions(self):
        self.assertEqual(set(observances(date(2026, 12, 6), "DE")), {"advent_2", "nicholas"})
        self.assertIn("sinterklaas", observances(date(2026, 12, 5), "NL"))
        self.assertNotIn("sinterklaas", observances(date(2026, 12, 5), "DE"))
        self.assertIn("befana", observances(date(2027, 1, 6), "IT"))
        self.assertIn("thanksgiving", observances(date(2026, 11, 26), "US"))
        self.assertIn("orthodox_christmas", observances(date(2027, 1, 7), "RS", "julian"))
        self.assertNotIn("christmas", country_events("RS", "julian"))

    def test_season_new_year_and_inclusive_end(self):
        self.assertEqual(bounds(self.config, 2026), (date(2026, 11, 29), date(2027, 1, 10)))
        self.assertTrue(season(self.config, date(2027, 1, 10))[2])
        self.assertFalse(season(self.config, date(2027, 1, 11))[2])
        self.assertEqual(season(self.config, date(2027, 1, 11))[0], date(2027, 11, 28))

    def test_exact_on_off_and_idle_dates(self):
        for hour, minute, expected in [(15, 59, False), (16, 0, True), (22, 59, True), (23, 0, False)]:
            value, _ = channel_status(self.config, self.channel, datetime(2026, 12, 1, hour, minute, tzinfo=UTC))
            self.assertEqual(value, expected)
        self.assertFalse(channel_status(self.config, self.channel, datetime(2027, 1, 11, 17, tzinfo=UTC))[0])

    def test_holiday_only_with_two_simultaneous_names(self):
        channel = self.channel | {"mode": "holidays"}
        self.assertTrue(channel_status(self.config, channel, datetime(2026, 12, 6, 17, tzinfo=UTC))[0])
        self.assertFalse(channel_status(self.config, channel, datetime(2026, 12, 7, 17, tzinfo=UTC))[0])
        self.assertEqual(channel_status(self.config, channel, datetime(2026, 12, 7, 17, tzinfo=UTC))[1].date(), date(2027, 12, 5))

    def test_overnight_and_final_night(self):
        channel = self.channel | {"on_time": "20:00", "off_time": "02:00"}
        self.assertTrue(channel_status(self.config, channel, datetime(2027, 1, 11, 1, tzinfo=UTC))[0])
        self.assertFalse(channel_status(self.config, channel, datetime(2027, 1, 11, 2, tzinfo=UTC))[0])

    def test_holiday_mode_is_independent_of_period_bounds(self):
        config = self.config | {"country": "US"}
        channel = self.channel | {"mode": "holidays", "holidays": ["thanksgiving"]}
        self.assertTrue(channel_status(config, channel, datetime(2026, 11, 26, 17, tzinfo=UTC))[0])

    def test_independent_channel_period_and_single_day(self):
        channel = self.channel | {"start_rule": "custom", "start_date": "24.12.", "end_rule": "custom", "end_date": "24.12."}
        self.assertFalse(channel_status(self.config, channel, datetime(2026, 12, 23, 17, tzinfo=UTC))[0])
        self.assertTrue(channel_status(self.config, channel, datetime(2026, 12, 24, 17, tzinfo=UTC))[0])
        self.assertFalse(channel_status(self.config, channel, datetime(2026, 12, 25, 17, tzinfo=UTC))[0])

    def test_custom_period_and_leap_year(self):
        config = self.config | {"start_rule": "custom", "start_date": "01.12.", "end_date": "10.01."}
        self.assertEqual(bounds(config, 2028), (date(2028, 12, 1), date(2029, 1, 10)))

    def test_invalid_channels(self):
        for override in ({"entity_id": "lock.door"}, {"off_time": "16:00"}, {"on_time": "25:00"}, {"on_time": "16:00:01"}, {"mode": "holidays", "holidays": []}):
            with self.subTest(override=override), self.assertRaises(ValueError):
                validate_channel(self.channel | override)
        validate_channel({})

    def test_dst_gap_and_fold(self):
        tz = ZoneInfo("Europe/Berlin")
        config = self.config | {"start_rule": "custom", "start_date": "01.01.", "end_date": "31.12."}
        channel = self.channel | {"on_time": "02:30", "off_time": "04:00"}
        now = datetime(2027, 3, 28, 1, 59, tzinfo=tz)
        self.assertEqual(channel_status(config, channel, now)[1].hour, 3)
        self.assertTrue(channel_status(config, channel, datetime(2027, 3, 28, 3, 0, tzinfo=tz))[0])
        channel = self.channel | {"on_time": "01:00", "off_time": "02:30"}
        for fold in (0, 1):
            self.assertTrue(channel_status(config, channel, datetime(2027, 10, 31, 2, 15, tzinfo=tz, fold=fold))[0])
        self.assertFalse(channel_status(config, channel, datetime(2027, 10, 31, 2, 30, tzinfo=tz, fold=1))[0])


if __name__ == "__main__":
    unittest.main()
