import unittest
from custom_components.weihnachtssteuerung.engine import DEFAULTS
from custom_components.weihnachtssteuerung.validation import editor_config, folder_parts, image_filename


class ValidationTests(unittest.TestCase):
    def test_effect_settings_preserve_existing_images_and_validate_limits(self):
        images={"DE":{"advent_1":"kerze.png"}}
        effects={"mode":"image_snow","background_file":"winter.gif","decoration_enabled":True,"decoration_file":"baum.gif","decoration_transparency":60,"decoration_size":25}
        config=editor_config(DEFAULTS | {"country_images":images,"effects":effects})
        self.assertEqual(config["country_images"],images)
        self.assertEqual(config["effects"]["folder"],"/local/weihnachtssteuerung/background")
        self.assertEqual(config["effects"]["decoration_transparency"],60)
        self.assertEqual(editor_config(DEFAULTS)["effects"]["mode"],"off")
        self.assertEqual(editor_config(DEFAULTS | {"image_folder":"/local/meins/bilder"})["effects"]["folder"],"/local/meins/background")
        for override in ({"folder":"/local/../secret"},{"background_file":"../x.gif"},{"mode":"invalid"},{"decoration_size":200},{"darkness":float("nan")},{"snow_count":True}):
            with self.subTest(override=override),self.assertRaises(ValueError):
                editor_config(DEFAULTS | {"effects":effects|override})

    def test_status_icon_option_is_boolean_and_preserved(self):
        channel={"entity_id":"light.baum","mode":"period","on_time":"16:00","off_time":"23:00","show_status_icon":True}
        self.assertTrue(editor_config(DEFAULTS | {"channels":[channel]})["channels"][0]["show_status_icon"])
        channel["show_status_icon"]=False
        self.assertFalse(editor_config(DEFAULTS | {"channels":[channel]})["channels"][0]["show_status_icon"])
        channel["show_status_icon"]="on"
        with self.assertRaises(ValueError):
            editor_config(DEFAULTS | {"channels":[channel]})

    def test_region_and_country_must_match(self):
        with self.assertRaises(ValueError):
            editor_config(DEFAULTS | {"region": "north", "country": "DE"})

    def test_five_independent_channels_and_no_duplicate(self):
        channels = [{"entity_id": f"input_boolean.demo_{n}", "mode": "period", "on_time": "16:00", "off_time": "23:00", "holidays": []} for n in range(5)]
        self.assertEqual(len(editor_config(DEFAULTS | {"channels": channels})["channels"]), 5)
        with self.assertRaises(ValueError):
            editor_config(DEFAULTS | {"channels": channels + [{}]})
        with self.assertRaises(ValueError):
            editor_config(DEFAULTS | {"channels": [channels[0], channels[0]]})

    def test_country_specific_image_mapping_and_disabled_default(self):
        config = editor_config(DEFAULTS | {"country_images": {"DE": {"advent_1": "Kerze 1.png"}, "FR": {"christmas": "Noël.gif"}}, "show_images": True})
        self.assertEqual(config["country_images"]["FR"]["christmas"], "Noël.gif")
        self.assertNotIn("FR", editor_config(DEFAULTS)["country_images"])
        self.assertFalse(editor_config(DEFAULTS)["show_images"])

    def test_split_observances_preserve_existing_settings_and_images(self):
        channel={"entity_id":"light.baum","mode":"holidays","on_time":"16:00","off_time":"23:00","holidays":["christmas","christmas_2","epiphany"]}
        images={"DE":{"christmas":"baum.png","christmas_2":"kerzen.png","epiphany":"sterne.png"}}
        config=editor_config(DEFAULTS | {"channels":[channel],"country_images":images})
        self.assertEqual(config["channels"][0],channel)
        self.assertEqual(config["country_images"],images)
        channel["holidays"]=["stephen","epiphanias"]
        self.assertEqual(editor_config(DEFAULTS | {"channels":[channel]})["channels"][0]["holidays"],["stephen","epiphanias"])

    def test_invalid_paths_and_filenames(self):
        for path in ("http://example.org", "/local/../secret", "/local/%2e%2e/secret", "/local/a\\b", "/local/a?x", "/config/a", "/local//bad"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                folder_parts(path)
        for filename in ("../x.png", "a/b.gif", "run.js", "https:a.png", "x.png?x", ""):
            with self.subTest(filename=filename), self.assertRaises(ValueError):
                image_filename(filename)

    def test_unknown_mapping_keys_and_wrong_types(self):
        for override in ({"country_images": {"INVALID": {}}}, {"country_images": {"DE": {"invalid": "x.png"}}}, {"show_images": "true"}, {"channels": "bad"}):
            with self.subTest(override=override), self.assertRaises(ValueError):
                editor_config(DEFAULTS | override)

    def test_holiday_selection_matches_country_and_tradition(self):
        channel={"entity_id":"input_boolean.demo","mode":"holidays","on_time":"16:00","off_time":"23:00","holidays":["orthodox_christmas"]}
        with self.assertRaises(ValueError):
            editor_config(DEFAULTS | {"channels":[channel]})
        self.assertEqual(editor_config(DEFAULTS | {"tradition":"julian","channels":[channel]})["channels"][0]["holidays"],["orthodox_christmas"])
