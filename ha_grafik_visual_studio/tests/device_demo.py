"""Generate a non-actuating project fixture; optional loopback-only mock server."""
import copy
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'app'))
import main

def demo_project():
    project=copy.deepcopy(main.DEFAULT_PROJECT)
    project['name']='Geräte und Tablet – lokaler Test 0.1.297'
    project['settings']={'autoSave':False,'widgetLocale':'de','refreshOnReturn':True,'idleHomeSeconds':0,'idleHomePageId':'page-1'}
    page=project['pages'][0]
    page['name']='Geräte-Test'
    page['page'].update(width=1280,height=800,preset='custom',background='#14212e')
    page['widgets']=[]
    for index,(kind,name,entity) in enumerate([('switch','Testschalter','input_boolean.ugso_studio_297_test'),('dimmer','Dimmer','light.ugso_studio_297_demo'),('color','Farbiges Licht','light.ugso_studio_297_demo'),('thermostat','Thermostat','climate.ugso_studio_297_demo'),('value','Messwert','sensor.ugso_studio_297_demo')]):
        for presentation,y,height in [('tile',80,230),('floorplan',340,125)]:
            page['widgets'].append({'id':f'device-{kind}-{presentation}','type':f'device-{kind}-{presentation}','deviceKind':kind,'presentation':presentation,'title':name,'x':25+index*245,'y':y,'width':230,'height':height,'entityId':entity,'visible':True,'showName':True,'showState':True,'readOnly':False,'color':'#38bdf8','backgroundColor':'#202b38','textColor':'#ffffff','fontSize':16,'enabledPropertyGroups':{}})
    page['widgets'].append({'id':'heading-status','type':'border','title':'HA Live-Status','x':25,'y':25,'width':1200,'height':28,'visible':True,'headingStatusEnabled':True,'headingEntityId':'input_boolean.ugso_studio_297_test','headingDecimals':1})
    project['pages'].append({'id':'detail','name':'Detailseite','visible':True,'page':copy.deepcopy(page['page']),'widgets':[{'id':'detail-title','type':'text','title':'Tablet-Rückkehr testen','textContent':'Tablet-Rückkehr testen','x':60,'y':60,'width':500,'height':70,'visible':True}]})
    return project

if __name__=='__main__':
    target=Path(sys.argv[1]);target.write_text(json.dumps(demo_project(),ensure_ascii=False,indent=2),encoding='utf-8');print(target)
