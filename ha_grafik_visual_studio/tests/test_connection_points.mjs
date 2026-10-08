import test from 'node:test';
import assert from 'node:assert/strict';
import {connectionPointActive, isValuePointConnection} from '../web/connection-points.js';
import {widgetInputPacket, lineValuePacket} from '../web/dataflow.js';
import {numericConnectionValue} from '../web/linebox.js';

test('value points are output-only while collectors retain both directions',()=>{
  const point={id:'tap',valueOutputEnabled:true};
  assert.equal(connectionPointActive(point,'start'),true);
  assert.equal(connectionPointActive(point,'end'),false);
  assert.equal(connectionPointActive({collectorEnabled:true},'end'),true);
  assert.equal(connectionPointActive({}),false);
  const parent={id:'parent',type:'svg-connection',connectionPoints:[point]};
  const branch={id:'branch',type:'svg-connection',startCollector:'parent:tap'};
  assert.equal(isValuePointConnection(branch,[parent]),true);
  parent.visible=false;
  assert.equal(isValuePointConnection(branch,[parent]),false);
});

test('a runtime-hidden branch receives live numeric line values with units and no invented fallback',()=>{
  const parent={id:'parent',type:'svg-connection',animationSource:'number',animationNumberEntityId:'sensor.flow',connectionPoints:[{id:'tap',valueOutputEnabled:true}]};
  const branch={id:'branch',type:'svg-connection',startCollector:'parent:tap',endWidgetId:'number',endAnchor:'left-center'};
  const target={id:'number',type:'sensor',dataInputEnabled:true};
  const widgets=[parent,branch,target], states={'sensor.flow':{state:'23.5',attributes:{unit_of_measurement:'L/min'}}};
  assert.deepEqual(widgetInputPacket(target,widgets,states),{value:23.5,unit:'L/min',type:'number',error:''});
  assert.equal(numericConnectionValue(branch,widgets,states),23.5);
  states['sensor.flow'].state='unavailable';
  assert.ok(widgetInputPacket(target,widgets,states).error);
  parent.connectionPoints[0].valueOutputEnabled=false;
  assert.ok(lineValuePacket(branch,widgets,states).error);
});

test('value points preserve typed source values and terminate circular branches',()=>{
  const source={id:'text',type:'string',state:'Running',dataOutputEnabled:true};
  const parent={id:'parent',type:'svg-connection',startWidgetId:'text',connectionPoints:[{id:'tap',valueOutputEnabled:true}]};
  const branch={id:'branch',type:'svg-connection',startCollector:'parent:tap',connectionPoints:[{id:'tap2',valueOutputEnabled:true}]};
  const widgets=[source,parent,branch];
  assert.equal(lineValuePacket(branch,widgets,{}).value,'Running');
  parent.startCollector='branch:tap2';
  assert.match(lineValuePacket(branch,widgets,{}).error,/Rückkopplung/);
});
