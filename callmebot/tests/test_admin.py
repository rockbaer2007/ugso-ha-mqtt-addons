import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from core import Gateway, Failure, TOPIC, connect_mqtt
from admin import decrypt_profiles, mqtt_config, tls_context

SETTINGS={'profiles':[{'id':'default','name':'Demo','phone':'+49123456789','api_key':'dummy_private_key'}],'default_profile':'default'}

class AdminTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
  self.sender=Mock();self.g=Gateway(self.temp.name,self.sender,lambda:1000)
  self.g.save(SETTINGS)

 def test_old_profiles_are_not_rewritten_or_lost(self):
  path=Path(self.temp.name)/'profiles.json';before=path.read_bytes()
  other=Gateway(self.temp.name,self.sender)
  self.assertEqual(path.read_bytes(),before)
  self.assertEqual(other.settings,SETTINGS)
  self.assertEqual(mqtt_config({'host':'old-broker','port':1883,'username':'old-user','password':'old-pass'})['use_supervisor'],True)

 def test_encrypted_backup_restore_and_tamper_protection(self):
  backup=self.g.backup('a strong test password')
  encoded=json.dumps(backup)
  for value in ('+49123456789','dummy_private_key','Demo'):self.assertNotIn(value,encoded)
  self.g.save({'profiles':[],'default_profile':''})
  self.g.restore(backup,'a strong test password');self.assertEqual(self.g.settings,SETTINGS)
  before=self.g.path.read_bytes()
  for invalid in [dict(backup,app='another-app'),dict(backup,ciphertext=backup['ciphertext'][:-4]+'AAAA')]:
   with self.assertRaises(Failure):self.g.restore(invalid,'a strong test password')
  with self.assertRaisesRegex(Failure,'backup_invalid'):self.g.restore(backup,'wrong test password')
  with self.assertRaisesRegex(Failure,'backup_password'):self.g.backup('short')
  self.assertEqual(self.g.path.read_bytes(),before)
  self.sender.assert_not_called()

 def test_restore_blocks_pending_sends(self):
  backup=self.g.backup('a strong test password');self.g.submit({'message':'sensitive message'})
  with self.assertRaisesRegex(Failure,'busy'):self.g.restore(backup,'a strong test password')

 def test_history_survives_restart_and_contains_only_metadata(self):
  self.g.submit({'message':'secret message','request_id':'private_request'},source='ui')
  self.g.process(self.g.pending.get_nowait())
  history=Gateway(self.temp.name,self.sender).public()['history']
  self.assertEqual([r['status'] for r in history],['accepted','queued'])
  self.assertTrue(all(r['source']=='ui' for r in history))
  for secret in ('secret message','+49123456789','dummy_private_key','private_request'):self.assertNotIn(secret,json.dumps(history))
  self.g.clear_history();self.assertEqual(Gateway(self.temp.name).history,[])

 def test_history_is_bounded_and_storage_failure_does_not_resend(self):
  from admin import record
  for _ in range(205):record(self.g,'default','queued','mqtt')
  self.assertEqual(len(self.g.history),200)
  self.g.submit({'message':'test'})
  with patch('admin.atomic_json',side_effect=OSError()):self.g.process(self.g.pending.get_nowait())
  self.assertTrue(self.g.history_error);self.sender.assert_called_once()

 def test_external_mqtt_ignores_supervisor_credentials_and_uses_tls(self):
  config={'host':'external','port':8883,'username':'external-user','password':'external-pass','use_supervisor':False,'tls':True}
  with patch.dict(os.environ,{'MQTT_HOST':'internal','MQTT_USERNAME':'internal-user','MQTT_PASSWORD':'internal-pass'}),patch('paho.mqtt.client.Client') as client,patch('core.tls_context',return_value='tls-context'):
   connect_mqtt(self.g,{'mqtt':config})
   client.return_value.connect_async.assert_called_with('external',8883)
   client.return_value.username_pw_set.assert_called_with('external-user','external-pass')
   client.return_value.tls_set_context.assert_called_once_with('tls-context')
  self.assertNotIn('external-pass',json.dumps(self.g.public()))

 def test_invalid_tls_keeps_connection_and_configuration(self):
  self.g.mqtt_client=Mock();self.g.mqtt_options={'host':'old-broker','password':'keep'}
  with self.assertRaisesRegex(Failure,'mqtt_invalid'):self.g.configure_mqtt({'tls':True,'ca':'invalid'})
  self.g.mqtt_client.disconnect.assert_not_called()
  self.assertFalse((Path(self.temp.name)/'mqtt.json').exists())
  self.assertEqual(self.g.mqtt_options['password'],'keep')

 def test_system_tls_still_checks_hostname(self):
  import ssl
  context=tls_context(mqtt_config({}))
  self.assertEqual(context.verify_mode,ssl.CERT_REQUIRED);self.assertTrue(context.check_hostname)

 def test_custom_ca_and_matching_client_certificate(self):
  import datetime,ssl
  from cryptography import x509
  from cryptography.hazmat.primitives import hashes,serialization
  from cryptography.hazmat.primitives.asymmetric import rsa
  private=rsa.generate_private_key(public_exponent=65537,key_size=2048)
  name=x509.Name([x509.NameAttribute(x509.oid.NameOID.COMMON_NAME,'localhost')])
  now=datetime.datetime.now(datetime.timezone.utc)
  cert=x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(private.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(minutes=1)).not_valid_after(now+datetime.timedelta(days=1)).add_extension(x509.BasicConstraints(ca=True,path_length=None),critical=True).sign(private,hashes.SHA256()).public_bytes(serialization.Encoding.PEM).decode()
  pem=private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()).decode()
  config=mqtt_config({'tls':True,'ca':cert,'cert':cert,'key':pem})
  context=tls_context(config)
  self.assertEqual(context.verify_mode,ssl.CERT_REQUIRED);self.assertTrue(context.check_hostname)
  with self.assertRaises(ValueError):mqtt_config({'cert':cert})

 def test_mqtt_restart_does_not_hold_profile_lock_and_keeps_password(self):
  import threading
  self.g.mqtt_options={'host':'old','password':'keep'}
  client=Mock();self.g.mqtt_client=client
  def stop():
   worker=threading.Thread(target=self.g.profile_catalog);worker.start();worker.join(timeout=1)
   self.assertFalse(worker.is_alive(),'MQTT callback can read profiles during loop_stop')
  client.loop_stop.side_effect=stop
  with patch('core.connect_mqtt',return_value=Mock()):self.g.configure_mqtt({'host':'new','password':''})
  self.assertEqual(json.loads((Path(self.temp.name)/'mqtt.json').read_text())['password'],'keep')

if __name__=='__main__':unittest.main()
