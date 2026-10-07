"""Build declarative UGSo Energy 0.1.0 for Studio 0.1.255+."""
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / 'app'))
from widget_packages import validate_manifest, read_package_zip

def manifest():
    def f(key, label, kind='text', **opts):
        return dict(key=key, label=label, type=kind, **opts)
    widgets = []
    for kind, label in [('distribution', 'Energiefluss'), ('consumption', 'Energieverbrauch'), ('comparison', 'Verbrauchsvergleich'), ('interval', 'Zeitraumauswahl'), ('sufficiency', 'Autarkie und Eigenverbrauch'), ('battery', 'Batteriespeicher'), ('costs', 'Energiekosten'), ('price', 'Dynamischer Strompreis')]:
        defaults = dict(energyKind=kind, heading=label, noCard=False, width=640, height=360, backgroundColor='#17242d', textColor='#e7edf2', accentColor='#36b7e9', decimals=1, unit='kWh', padding=0, borderWidth=0)
        groups = [dict(label='Darstellung', fields=[f('heading', 'Bezeichnung'), f('noCard', 'Ohne Karte', 'checkbox'), f('backgroundColor', 'Hintergrundfarbe', 'color'), f('textColor', 'Schriftfarbe', 'color'), f('accentColor', 'Akzentfarbe', 'color'), f('decimals', 'Nachkommastellen', 'number', min=0, max=5), f('unit', 'Einheit')])]
        def add(label, fields, values):
            defaults.update(values)
            groups.append(dict(label=label, fields=fields))
        def source(prefix, label, unit=''):
            return [f(prefix+'EntityId', label+': Entität'), f(prefix+'Factor', 'Multiplikator', 'number', step=0.001)], {prefix+'EntityId':'', prefix+'Factor':1}
        def sources(items):
            for prefix, title in items:
                fields, values = source(prefix, title)
                add(title, fields, values)
        if kind == 'distribution':
            defaults.update(unit='W', height=540)
            sources([('house', 'Haus'), ('grid', 'Netzbezug'), ('export', 'Separate Einspeisung (optional)')])
            add('Energiefluss', [f('nodeCount', 'Zusatzknoten', 'number', min=1, max=10), f('animate', 'Fluss animieren', 'checkbox'), f('lineWidth', 'Linienbreite', 'number', min=1, max=8)], dict(nodeCount=3, animate=True, lineWidth=3))
            for i in range(1,11):
                p=f'node{i}'
                fields, values=source(p, 'Leistung')
                values.update({p+'Name': ['PV','Batterie','Wallbox'][i-1] if i<4 else f'Knoten {i}',p+'Color':['#fbc94d','#6fd39a','#ae97ee'][(i-1)%3],p+'Reverse':False,p+'SecondEntityId':'',p+'SecondUnit':'%'})
                add(f'Knoten [{i}]', [f(p+'Name','Name'), *fields, f(p+'Color','Farbe','color'),f(p+'Reverse','Flussrichtung umkehren','checkbox'),f(p+'SecondEntityId','Zweiter Wert: Entität'),f(p+'SecondUnit','Einheit des zweiten Werts')],values)
        if kind in ('comparison','consumption'):
            chart_fields=[f('seriesCount','Datenreihen','number',min=1,max=6),f('chartType','Diagrammtyp','select',options=['bar','line','pie'] if kind=='comparison' else ['bar','line'])]
            if kind=='comparison':chart_fields.append(f('sort','Sortierung','select',options=['none','ascending','descending']))
            add('Diagramm',chart_fields,dict(seriesCount=3,chartType='bar',sort='none'))
            for i in range(1,7):
                p=f'series{i}'
                fields,values=source(p,'Messwert')
                values.update({p+'Name':f'Gerät {i}',p+'Color':['#36b7e9','#fbc94d','#6fd39a','#ae97ee','#f08370','#9bc5d5'][i-1],p+'Unit':'kWh'})
                add(f'Datenreihe [{i}]',[f(p+'Name','Name'),*fields,f(p+'Unit','Einheit'),f(p+'Color','Farbe','color')],values)
        if kind in ('consumption','costs','interval'):
            add('Zeitraum',[f('period','Zeitraum','select',options=['day','week','month','year']),f('startDate','Datum (YYYY-MM-DD, leer = heute)')],dict(period='day',startDate=''))
            if kind != 'interval':
                add('Verlauf',[f('intervalWidgetId','ID der Zeitauswahl (optional)'),f('historyMode','Verlauf berechnen','select',options=['counter','sum'])],dict(intervalWidgetId='',historyMode='counter'))
        if kind == 'interval': defaults.update(width=640,height=96)
        if kind == 'sufficiency':
            sources([('production','Erzeugung'),('grid','Netz (positiv = Bezug, negativ = Einspeisung)'),('export','Separate Einspeisung (optional)'),('house','Hausverbrauch (optional)')])
        if kind == 'battery':
            defaults['unit']='W'
            sources([('soc','Ladezustand (%)'),('power','Leistung'),('energy','Gespeicherte Energie (kWh, optional)')])
            add('Batterie',[f('capacity','Kapazität (kWh)','number',min=0,step=0.1),f('chargingPositive','Positive Leistung bedeutet Laden','checkbox'),f('powerUnit','Leistungseinheit','select',options=['W','kW'])],dict(capacity=10,chargingPositive=True,powerUnit='W'))
        if kind == 'costs':
            sources([('consumption','Verbrauch'),('export','Einspeisung (optional)')])
            add('Tarif',[f('costMode','Datenquelle','select',options=['live','history']),f('price','Bezugspreis je kWh','number',step=0.001),f('feedPrice','Vergütung je kWh','number',step=0.001),f('baseFee','Grundgebühr je Tag','number',step=0.01),f('currency','Währung')],dict(costMode='live',price=0.30,feedPrice=0.08,baseFee=0,currency='EUR'))
        if kind == 'price':
            defaults['unit']='ct/kWh'
            add('Preisdaten',[f('pricesEntityId','Preise: Entität'),f('pricesAttribute','Attribut (leer = Zustand)'),f('timeKey','Zeitfeld (leer = automatisch)'),f('priceKey','Preisfeld (leer = automatisch)'),f('priceFactor','Multiplikator','number',step=0.001),f('futureOnly','Nur ab jetzt','checkbox'),f('hours','Maximale Stunden (0 = alle)','number',min=0,max=168),f('highlightCount','Günstige / teure Stunden','number',min=1,max=24)],dict(pricesEntityId='',pricesAttribute='',timeKey='',priceKey='',priceFactor=100,futureOnly=False,hours=48,highlightCount=3))
            add('Preisfarben',[f('cheapColor','Günstig','color'),f('expensiveColor','Teuer','color'),f('currentColor','Aktuelle Stunde','color')],dict(cheapColor='#6fd39a',expensiveColor='#f08370',currentColor='#36b7e9'))
        groups.append(dict(label='Größe',fields=[f('width','Breite (px)','number',min=240,max=3000),f('height','Höhe (px)','number',min=80,max=2000)]))
        widgets.append(dict(type='ugso.energy/'+kind,label=label,icon='icons/'+kind+'.svg',defaults=defaults,propertyGroups=groups,render=dict(kind='energy-widget',valueKey='heading')))
    return dict(format='ha-grafik-widget-package',apiVersion='0.2',id='ugso.energy',name='UGSo Energy',version='0.1.0',license='MIT',icon='icons/distribution.svg',widgets=widgets)

def build():
    data=validate_manifest(manifest())
    target=ROOT/'ugso.energy.wg'
    symbols={'distribution':'M12 8V3M8 12H3M16 12H21M12 16V21M8 8L16 16M16 8L8 16','consumption':'M3 21H21M6 18V10M12 18V5M18 18V8','comparison':'M4 5H16M4 12H21M4 19H11','interval':'M3 6H21V21H3ZM7 2V9M17 2V9M3 11H21','sufficiency':'M12 2A10 10 0 1 0 22 12M12 7A5 5 0 1 0 17 12','battery':'M7 3H17V22H7ZM10 1H14M10 8H14M12 6V10','costs':'M18 5C7 0 4 24 18 19M3 10H15M3 14H15','price':'M3 21H21M5 17L10 6L15 13L21 3'}
    with ZipFile(target,'w',ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json',json.dumps(data,ensure_ascii=False,indent=2))
        for kind,path in symbols.items():
            archive.writestr(f'icons/{kind}.svg',f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="{path}" fill="none" stroke="#36b7e9" stroke-width="2"/></svg>')
        for name in ['README.md','LICENSE.txt']:
            archive.write(ROOT/name,name)
    read_package_zip(target.read_bytes())
    return target

if __name__=='__main__': print(build())
