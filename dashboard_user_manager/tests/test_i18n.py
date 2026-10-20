import ast
from pathlib import Path
import sys
import unittest
APP = Path(__file__).resolve().parents[1] / 'app'
if not APP.is_dir(): APP = Path(__file__).resolve().parents[1] / 'dashboard_user_manager/app'
sys.path.insert(0,str(APP))
from i18n import MESSAGES, language, translate, payload

class LocaleTests(unittest.TestCase):
    def test_all_static_errors_have_translations(self):
        for file in ('server.py','visibility.py'):
            tree=ast.parse((APP/file).read_text(encoding='utf-8'))
            for item in ast.walk(tree):
                if isinstance(item,ast.Raise) and isinstance(item.exc,ast.Call) and item.exc.args:
                    value=item.exc.args[0]
                    if isinstance(value,ast.Constant) and isinstance(value.value,str) and item.exc.func.id in ('Invalid','HAError'):
                        self.assertIn(value.value,MESSAGES)

    def test_dynamic_error_localization_preserves_backup_identifiers(self):
        source='Speicherergebnis nicht bestätigt. Nicht blind wiederholen. Sicherung: 20261020T170000Z-123456789abc.json'
        self.assertIn('20261020T170000Z-123456789abc.json',translate(source,'fr'))
        self.assertTrue(translate(source,'en').startswith('Save result unconfirmed.'))
        self.assertEqual(translate('HA lehnt die Anfrage ab (config_not_found).','en'),'HA rejected the request (config_not_found).')
        self.assertIn('Invalid user selection',translate('Ansicht 2: Ungültige Benutzerauswahl.','en'))

    def test_language_and_payload_do_not_translate_saved_data(self):
        self.assertEqual(language('fr-CA,fr;q=0.8'),'fr')
        self.assertEqual(language('it'),'en')
        data={'message':'Keine Änderung nötig.','name':'Übersicht','config':{'message':'Keine Änderung nötig.'}}
        translated=payload(data,'fr')
        self.assertEqual(translated['name'],'Übersicht')
        self.assertEqual(translated['config']['message'],'Keine Änderung nötig.')
        self.assertEqual(translated['message'],'Aucune modification nécessaire.')
