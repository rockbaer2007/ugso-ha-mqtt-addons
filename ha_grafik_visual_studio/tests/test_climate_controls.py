import sys
import unittest
from pathlib import Path
from datetime import datetime, timedelta, timezone
import json
from http.server import ThreadingHTTPServer
from threading import Thread
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'app'))
from climate_controls import climate_command
from energy_history import energy_history_plan, energy_history_data
import main

class ClimateControlsTests(unittest.TestCase):
    def setUp(self):
        self.entry = {'entity_id': 'climate.room', 'state': 'heat', 'attributes': {
            'supported_features': 2|4|8|16|32|128|256|512, 'hvac_modes': ['off','heat','heat_cool'],
            'preset_modes': ['eco'], 'fan_modes': ['auto'], 'swing_modes': ['both'],
            'swing_horizontal_modes': ['on'], 'min_temp': 5, 'max_temp': 30, 'target_temp_step': .5}}
    def command(self, action, value, entry=None):
        return climate_command({'entity_id': 'climate.room', 'action': action, 'value': value}, [entry or self.entry])
    def test_native_services_and_targets(self):
        for action,value,service,key in [('hvac','heat','set_hvac_mode','hvac_mode'),('preset','eco','set_preset_mode','preset_mode'),('fan','auto','set_fan_mode','fan_mode'),('swing','both','set_swing_mode','swing_mode'),('swing_horizontal','on','set_swing_horizontal_mode','swing_horizontal_mode')]:
            command=self.command(action,value)
            self.assertEqual(command['service'],service)
            self.assertEqual(command['service_data'],{key:value})
            self.assertEqual(command['target'],{'entity_id':'climate.room'})
        self.assertEqual(self.command('range',{'low':18,'high':24.5})['service_data'],{'target_temp_low':18,'target_temp_high':24.5})
        self.assertEqual(self.command('humidity',55)['service_data'],{'humidity':55})
        self.assertEqual(self.command('power',True)['service'],'turn_on')
        self.assertEqual(self.command('power',False)['service'],'turn_off')
    def test_rejects_invalid_or_unsupported_commands(self):
        for action,value in [('range',{'low':22,'high':20}),('range',{'low':18.1,'high':22}),('range',{'low':4,'high':22}),('humidity',101),('humidity',55.5),('power',1),('fan','arbitrary'),('restart',True)]:
            with self.subTest(action=action,value=value),self.assertRaises(ValueError):self.command(action,value)
        for state in ['unknown','unavailable',None]:
            with self.assertRaises(ValueError):self.command('power',True,{**self.entry,'state':state})
        for action,value in [('range',{'low':18,'high':22}),('fan','auto'),('power',True),('humidity',55)]:
            with self.assertRaises(ValueError):self.command(action,value,{**self.entry,'attributes':{**self.entry['attributes'],'supported_features':0}})
        with self.assertRaises(ValueError):climate_command({'entity_id':'sensor.room','action':'power','value':True},[self.entry])
        with self.assertRaises(ValueError):climate_command({'entity_id':'climate.room','action':'power','value':True,'service':'restart'},[self.entry])
    def test_attribute_history_preserves_missing_gaps_and_legacy_state(self):
        start=datetime(2026,10,10,tzinfo=timezone.utc);end=start+timedelta(days=1)
        request={'entity_ids':['sensor.energy'],'start':start.isoformat(),'end':end.isoformat(),'attributes':{'sensor.energy':'total'}}
        command,_,_=energy_history_plan(request,end)
        self.assertFalse(command['no_attributes']);self.assertFalse(command['minimal_response'])
        raw={'sensor.energy':[{'lu':start.timestamp(),'s':'99','a':{'total':10}},{'lu':start.timestamp()+10,'s':'99'},{'lu':start.timestamp()+20,'s':'unknown','attributes':{'total':12}}]}
        self.assertEqual([p['y'] for p in energy_history_data(['sensor.energy'],raw,start,end,request['attributes'])['series']['sensor.energy']],[10,None,12])
        self.assertEqual([p['y'] for p in energy_history_data(['sensor.energy'],raw,start,end)['series']['sensor.energy']],[99,99,None])
        with self.assertRaises(ValueError):energy_history_plan({**request,'attributes':{'sensor.other':'total'}},end)
    def test_http_capability_checks_and_read_only_attribute_discovery(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),main.Handler);thread=Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}/api/'
        def send(value):return urlopen(Request(base+'climate-control',data=json.dumps(value).encode(),headers={'Content-Type':'application/json'}),timeout=3)
        request={'entity_id':'climate.room','action':'range','value':{'low':18,'high':24}}
        try:
            with patch.object(main,'home_assistant_commands',side_effect=[[[self.entry]],[None]]) as commands:
                with send(request) as response:self.assertEqual(json.load(response),{'accepted':True})
                self.assertEqual(commands.call_count,2);self.assertEqual(commands.call_args.args[0],[climate_command(request,[self.entry])])
            with patch.object(main,'home_assistant_commands',return_value=[[{**self.entry,'state':'unavailable'}]]) as commands:
                with self.assertRaises(HTTPError) as error:send(request)
                self.assertEqual(error.exception.code,400);self.assertEqual(commands.call_count,1)
            with patch.object(main,'home_assistant_commands',return_value=[[self.entry]]) as commands:
                with urlopen(base+'source-attributes?entity_id=climate.room') as response:result=json.load(response)
                self.assertIn('hvac_modes',result['attributes']['climate.room']);self.assertNotIn('heat',result['attributes']['climate.room']);self.assertEqual(commands.call_args.args[0],['get_states'])
            with patch.object(main,'home_assistant_commands') as commands:
                with self.assertRaises(HTTPError) as error:urlopen(base+'source-attributes?entity_id=bad/url')
                self.assertEqual(error.exception.code,400);commands.assert_not_called()
        finally:server.shutdown();server.server_close();thread.join(timeout=3)

if __name__=='__main__':unittest.main()
