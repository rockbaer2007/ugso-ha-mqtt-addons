"""Private profile backups, metadata-only history and verified MQTT TLS."""
import base64
import json
import os
import ssl
import time
from pathlib import Path
from tempfile import NamedTemporaryFile
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt


def atomic_json(path, data):
    path = Path(path)
    with NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as file:
        json.dump(data, file, ensure_ascii=False)
        file.flush(); os.fsync(file.fileno()); temporary = Path(file.name)
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def key(password, salt):
    if not isinstance(password, str) or not 12 <= len(password) <= 1024:
        raise ValueError('backup_password')
    return Scrypt(salt=salt, length=32, n=32768, r=8, p=1).derive(password.encode('utf-8'))


def encrypt_profiles(settings, password, app):
    salt, nonce = os.urandom(16), os.urandom(12)
    encrypted = AESGCM(key(password, salt)).encrypt(nonce, json.dumps(settings, ensure_ascii=False).encode(), app.encode())
    return dict(format='callmebot-profiles-aesgcm', version=1, app=app,
                salt=base64.b64encode(salt).decode(), nonce=base64.b64encode(nonce).decode(),
                ciphertext=base64.b64encode(encrypted).decode())


def decrypt_profiles(data, password, app):
    if not isinstance(data, dict) or set(data) != {'format','version','app','salt','nonce','ciphertext'} or data['format'] != 'callmebot-profiles-aesgcm' or data['version'] != 1 or data['app'] != app:
        raise ValueError('backup_invalid')
    if not isinstance(password,str) or not 12 <= len(password) <= 1024:
        raise ValueError('backup_password')
    try:
        fields = [base64.b64decode(data[k], validate=True) for k in ('salt','nonce','ciphertext')]
        salt, nonce, ciphertext = fields
        if len(salt) != 16 or len(nonce) != 12 or not 16 <= len(ciphertext) <= 65536:
            raise ValueError()
        return json.loads(AESGCM(key(password, salt)).decrypt(nonce, ciphertext, app.encode()))
    except Exception:
        raise ValueError('backup_invalid') from None


def record(gateway, profile, status, source):
    # No message, number, API key, provider response or caller-controlled request ID.
    row = dict(profile=profile if isinstance(profile,str) and any(p['id']==profile for p in gateway.settings['profiles']) else '',
               status=status if status in {'queued','accepted','unknown_profile','invalid_message','retained_rejected','duplicate','queue_full','rate_limited','provider_rejected','provider_unavailable'} else 'provider_unavailable',
               source=source if source in ('ui','mqtt') else 'mqtt', time=int(time.time()))
    with gateway.lock:
        gateway.history = [row] + gateway.history[:199]
        try:
            atomic_json(gateway.directory / 'history.json', gateway.history)
            gateway.history_error = False
        except OSError:
            gateway.history_error = True  # Never retry the provider call for a storage error.


def mqtt_config(data):
    defaults = dict(use_supervisor=True, host='core-mosquitto',port=1883,username='',password='',tls=False,ca='',cert='',key='')
    if not isinstance(data, dict) or set(data) - set(defaults):
        raise ValueError('mqtt_invalid')
    result = defaults | data
    if any(not isinstance(result[k], str) or len(result[k]) > 65536 for k in ('host','username','password','ca','cert','key')):
        raise ValueError('mqtt_invalid')
    if not result['host'] or any(c in result['host'] for c in '/\r\n\x00') or isinstance(result['port'],bool) or not isinstance(result['port'],int) or not 1 <= result['port'] <= 65535:
        raise ValueError('mqtt_invalid')
    if not isinstance(result['tls'],bool) or not isinstance(result['use_supervisor'],bool) or bool(result['cert']) != bool(result['key']):
        raise ValueError('mqtt_invalid')
    return result


def tls_context(config):
    context = ssl.create_default_context(cadata=config['ca'] or None)
    if config['cert']:
        paths=[]
        try:
            for value in (config['cert'],config['key']):
                with NamedTemporaryFile('w', encoding='utf-8',delete=False) as file:
                    file.write(value); paths.append(Path(file.name))
            context.load_cert_chain(str(paths[0]),str(paths[1]))
        finally:
            for path in paths: path.unlink(missing_ok=True)
    return context


def public_mqtt(gateway):
    config=mqtt_config(gateway.mqtt_options)
    return {k:v for k,v in config.items() if k not in ('password','ca','cert','key')} | {
        'has_password': bool(config['password']), 'has_ca':bool(config['ca']),
        'has_cert':bool(config['cert']), 'has_key':bool(config['key'])}
