"""Live local MQTT round trip with a mock provider. No real Signal requests."""
import json
import sys
import tempfile
import threading
import time
from pathlib import Path
import paho.mqtt.client as mqtt
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'app'))
from core import Gateway, connect_mqtt

with tempfile.TemporaryDirectory() as directory:
    sent = []
    gateway = Gateway(directory, sender=lambda profile, text: sent.append(text))
    gateway.save({'profiles':[{'id':'default','name':'Test','phone':'+49123456789','api_key':'dummy_secret'}],'default_profile':'default'})
    connection = connect_mqtt(gateway, {'mqtt':{'host':'127.0.0.1','port':18890}})
    observer = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    replies = []
    catalogs, discoveries = [], []
    subscribed = threading.Event()
    observer.on_connect = lambda client, *args: client.subscribe([('ugso/callmebot_signal/result',0),('ugso/callmebot_signal/profiles',0),('homeassistant/sensor/ugso_callmebot_signal/profiles/config',0)])
    observer.on_subscribe = lambda *args: subscribed.set()
    def receive(client, userdata, message):
        target = catalogs if message.topic.endswith('/profiles') else discoveries if message.topic.endswith('/config') else replies
        target.append(json.loads(message.payload))
    observer.on_message = receive
    observer.connect('127.0.0.1',18890); observer.loop_start()
    try:
        assert subscribed.wait(5)
        for _ in range(100):
            if gateway.connected: break
            time.sleep(.05)
        assert gateway.connected
        # A second connection's SUBACK occurs after the gateway's queued subscribe.
        time.sleep(.1)
        observer.publish('ugso/callmebot_signal/send',json.dumps({'message':'Mock only "quotes"\nGrüße','request_id':'check'})).wait_for_publish()
        item = gateway.pending.get(timeout=5)
        gateway.process(item)
        for _ in range(100):
            if replies: break
            time.sleep(.05)
        assert replies[0]['status']=='accepted', replies
        assert sent==['Mock only "quotes"\nGrüße']
        assert 'dummy_secret' not in json.dumps(replies)
        for _ in range(100):
            if catalogs and discoveries: break
            time.sleep(.05)
        assert catalogs[-1]['profiles']==[{'id':'default','name':'Test'}]
        assert discoveries[-1]['json_attributes_topic']=='ugso/callmebot_signal/profiles'
        assert 'dummy_secret' not in json.dumps(catalogs+discoveries)
        assert '+49123456789' not in json.dumps(catalogs+discoveries)
        gateway.save({'profiles':[],'default_profile':''})
        for _ in range(100):
            if catalogs[-1]['count']==0: break
            time.sleep(.05)
        assert catalogs[-1]['profiles']==[]
        print('Retained catalog, discovery, updates and secret redaction: passed')
        print('MQTT send -> queue -> mock provider -> result: passed')
    finally:
        observer.disconnect(); observer.loop_stop(); connection.disconnect(); connection.loop_stop()
