import math
import sys
import unittest
import json
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from material_actions import material_action
import main

class MaterialActionTests(unittest.TestCase):
    def test_http_endpoint_uses_validated_plan(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),main.Handler)
        thread=Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with patch.object(main,'home_assistant_commands',side_effect=[[ [{'entity_id':'number.x','state':'2','attributes':{'min':0,'max':10}}] ],[{}]]) as commands:
                request=Request(f'http://127.0.0.1:{server.server_port}/api/material-value',data=json.dumps({'entity_id':'number.x','value':7}).encode(),method='POST',headers={'Content-Type':'application/json'})
                with urlopen(request) as response:self.assertTrue(json.load(response)['accepted'])
                self.assertEqual(commands.call_args_list[1].args[0][0]['service_data'],{'value':7})
        finally:server.shutdown();server.server_close();thread.join(timeout=2)
    def plan(self,entity,value,attributes=None,state='0'):
        return material_action({'entity_id':entity,'value':value},[{'entity_id':entity,'state':state,'attributes':attributes or {}}])
    def test_explicit_domains_and_payloads(self):
        cases=[('switch.x','on','turn_on',{}),('input_boolean.x','off','turn_off',{}),('light.x',1,'turn_on',{'brightness_pct':1}),('light.x','off','turn_off',{}),('cover.x',45,'set_cover_position',{'position':45}),('fan.x',75,'set_percentage',{'percentage':75}),('number.x',21,'set_value',{'value':21}),('input_number.x',12,'set_value',{'value':12}),('text.x','Hello','set_value',{'value':'Hello'}),('input_text.x','Bonjour','set_value',{'value':'Bonjour'}),('button.x','PRESS','press',{}),('input_button.x','PRESS','press',{})]
        for entity,value,service,data in cases:
            with self.subTest(entity=entity,value=value):
                command=self.plan(entity,value)
                self.assertEqual(command['service'],service)
                self.assertEqual(command['service_data'],data)
                self.assertEqual(command['target'],{'entity_id':entity})
    def test_selection_and_entity_limits(self):
        self.assertEqual(self.plan('button.x','PRESS',state='unknown')['service'],'press')
        with self.assertRaises(ValueError):self.plan('button.x','PRESS',state='unavailable')
        self.assertEqual(self.plan('select.x','B',{'options':['A','B']})['service_data'],{'option':'B'})
        for entity,value,attributes in [('select.x','C',{'options':['A','B']}),('number.x',30,{'min':0,'max':20}),('input_number.x',-1,{'min':0}),('text.x','abc',{'max':2}),('light.x',101,{}),('cover.x',-1,{}),('fan.x',True,{})]:
            with self.subTest(entity=entity,value=value):
                with self.assertRaises(ValueError):self.plan(entity,value,attributes)
    def test_no_arbitrary_actions_or_unavailable_writes(self):
        for entity,value in [('sensor.x',12),('automation.x','PRESS'),('switch.x','light.turn_on'),('button.x','on'),('number.x',math.inf),('number.x',math.nan),('switch.x/../secret','on')]:
            with self.assertRaises(ValueError):self.plan(entity,value)
        for state in ('unknown','unavailable'):
            with self.assertRaises(ValueError):self.plan('switch.x','on',state=state)
        with self.assertRaises(ValueError):material_action({'entity_id':'switch.x','value':'on','service':'turn_off'},[])

if __name__=='__main__':unittest.main()
