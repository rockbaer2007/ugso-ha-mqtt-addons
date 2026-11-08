"""Loopback-only integration fixture. Never connects to Home Assistant."""
import json
import tempfile
from pathlib import Path
from http.server import ThreadingHTTPServer
from device_demo import demo_project, main

states={
 'input_boolean.ugso_studio_297_test':{'entity_id':'input_boolean.ugso_studio_297_test','state':'off','attributes':{'friendly_name':'Testschalter'}},
 'light.ugso_studio_297_demo':{'entity_id':'light.ugso_studio_297_demo','state':'on','attributes':{'friendly_name':'Testlicht','brightness':128,'supported_color_modes':['rgb'],'rgb_color':[55,180,240]}},
 'climate.ugso_studio_297_demo':{'entity_id':'climate.ugso_studio_297_demo','state':'heat','attributes':{'friendly_name':'Testthermostat','temperature':21,'current_temperature':20.4,'supported_features':1,'min_temp':5,'max_temp':30,'target_temp_step':.5}},
 'sensor.ugso_studio_297_demo':{'entity_id':'sensor.ugso_studio_297_demo','state':'21.4','attributes':{'friendly_name':'Testtemperatur','unit_of_measurement':'°C'}},
}
def commands(requests):
    results=[]
    for request in requests:
        if request=='get_states':results.append(list(states.values()))
        elif isinstance(request,str):results.append([])
        elif request.get('type')=='call_service':
            entity=states[request['target']['entity_id']];service=request['service'];data=request.get('service_data',{})
            if service in ('turn_on','turn_off'):entity['state']='on' if service=='turn_on' else 'off'
            if 'brightness_pct' in data:entity['attributes']['brightness']=round(data['brightness_pct']*255/100)
            entity['attributes'].update({k:v for k,v in data.items() if k!='brightness_pct'});results.append({})
        else:raise ValueError('Unsupported fixture request')
    return results

if __name__=='__main__':
    data=Path(tempfile.mkdtemp(prefix='studio-devices-fixture-'));main.DATA_DIR=data;main.PROJECT_FILE=data/'project.json';main.PROJECTS_DIR=data/'projects';main.WIDGET_PACKAGES_DIR=data/'widget_packages';main.TOOL_PACKAGES_DIR=data/'tool_packages';main.PROJECT_FILE.write_text(json.dumps(demo_project()),encoding='utf-8');main.home_assistant_commands=commands
    print('Fixture: http://127.0.0.1:8099/ (no HA access)',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8099),main.Handler).serve_forever()
