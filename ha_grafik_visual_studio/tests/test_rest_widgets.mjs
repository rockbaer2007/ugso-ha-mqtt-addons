import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceKey,sourceUnitConversion,resolveSource,mapDisplaySources,sourceGroups} from '../web/source-bindings.js';
import {climateCapabilities,climateOptionsGroup} from '../web/climate-controls.js';
import {restText,restGroups,restLocale} from '../web/rest-locales.js';
import {energyValue,energyHistoryFactor} from '../web/energy.js';
const states={'sensor.power':{entity_id:'sensor.power',state:'2000',attributes:{unit_of_measurement:'W',alternative:3000}},'climate.room':{entity_id:'climate.room',state:'heat',attributes:{supported_features:2|8|128,hvac_modes:['heat'],fan_modes:['auto'],temperature_unit:'°C'}}};
test('source options leave old references and units untouched until explicitly enabled',()=>{
  const widget={id:'a',type:'ugso.energy/power',powerEntityId:'sensor.power',gridEntityId:'sensor.power',gridFactor:.001};
  assert.equal(mapDisplaySources(widget,states).widget,widget);assert.equal(mapDisplaySources(widget,states).states,states);
  assert.equal(energyValue(widget,states,'grid'),2);assert.equal(energyHistoryFactor(widget,states,'grid'),.001);
  const enabled={...widget,sourceOptionsEnabled:true,[sourceKey('AutoUnit','gridEntityId')]:true,[sourceKey('Unit','gridEntityId')]:'kW',[sourceKey('Attribute','gridEntityId')]:'alternative'};
  assert.equal(energyValue(enabled,states,'grid'),3);assert.equal(energyHistoryFactor(enabled,states,'grid'),.001);
  assert.equal(enabled.gridFactor,.001);
});
test('different attributes use distinct display sources while write targets stay native',()=>{
  const widget={id:'a',type:'ugso.technic/temperature',targetEntityId:'climate.room',actualEntityId:'sensor.power',humidityEntityId:'sensor.power',sourceOptionsEnabled:true,[sourceKey('Attribute','actualEntityId')]:'alternative',[sourceKey('Attribute','humidityEntityId')]:'missing',[sourceKey('Attribute','targetEntityId')]:'alternative'};
  const mapped=mapDisplaySources(widget,states);assert.equal(mapped.widget.targetEntityId,'climate.room');assert.notEqual(mapped.widget.actualEntityId,mapped.widget.humidityEntityId);
  assert.equal(mapped.states[mapped.widget.actualEntityId].state,'3000');assert.equal(mapped.states[mapped.widget.humidityEntityId].state,'unavailable');assert.equal(widget.actualEntityId,'sensor.power');
  assert.equal(sourceGroups(widget,states).defaultEnabled,false);
});
test('unit conversion rejects incompatible data and preserves unavailable states',()=>{
  assert.equal(sourceUnitConversion(2000,'W','kW').value,2);assert.equal(sourceUnitConversion(0,'°C','°F').value,32);assert.equal(sourceUnitConversion(36,'km/h','m/s').value,10);
  assert.equal(sourceUnitConversion(1,'Wh','W').valid,false);
  const widget={entityId:'sensor.power',sourceOptionsEnabled:true,[sourceKey('AutoUnit','entityId')]:true,[sourceKey('Unit','entityId')]:'Wh'};
  assert.equal(resolveSource(widget,states,'entityId').valid,false);assert.equal(resolveSource(widget,{'sensor.power':{state:'unavailable',attributes:{alternative:1}}},'entityId').valid,false);
  const row={id:'room',type:'ugso.technic/room-overlay',rowEntityId1:'sensor.power',rowUnit1:'kW',sourceOptionsEnabled:true,[sourceKey('AutoUnit','rowEntityId1')]:true};assert.equal(resolveSource(row,states,'rowEntityId1').value,2);assert.equal(resolveSource(row,states,'rowEntityId1').unit,'kW');
});
test('DE EN FR labels preserve option values, group identity and user properties',()=>{
  const original=[{label:'Betriebsart',fields:[{key:'mode',label:'Heiz-/Kühlbereich',type:'select',options:[{value:'heat',label:'Heizen'}]}]}];
  for(const locale of ['de','en','fr']){const result=restGroups(original,{widgetLocale:locale},()=> 'stable-old-group','de');assert.equal(result[0].id,'stable-old-group');assert.equal(result[0].fields[0].options[0].value,'heat');}
  assert.equal(restText('Unterer Sollwert','fr'),'Consigne basse');assert.equal(restText('Benutzername','fr'),'Benutzername');assert.equal(restLocale({widgetLocale:'auto'},'fr-FR'),'fr');
});
test('climate controls advertise only available capabilities and default to disabled',()=>{
  const caps=climateCapabilities(states['climate.room']);assert.equal(caps.range,true);assert.equal(caps.on,false);assert.equal(caps.off,true);assert.equal(caps.humidity,false);
  assert.deepEqual(caps.choices.map(row=>row[0]),['hvac','fan']);assert.equal(climateCapabilities({attributes:{}}).available,false);assert.equal(climateOptionsGroup.defaultEnabled,false);
});
