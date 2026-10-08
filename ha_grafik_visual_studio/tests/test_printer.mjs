import test from 'node:test';
import assert from 'node:assert/strict';
import {cartridgeCount, printerSupplyStyle, printerBindings, printerNumber, printerStatus, printerCartridges, printerWebUrl} from '../web/printer.js';

test('legacy toner choice becomes bars and unset style retains cartridges',()=>{
  assert.equal(printerSupplyStyle({supplyStyle:'toner'}),'bars');
  assert.equal(printerSupplyStyle({supplyStyle:'bars'}),'bars');
  assert.equal(printerSupplyStyle({}),'ink');
});

test('web interface uses explicit URL, optional auto attributes, or stays hidden', () => {
  const states = {'sensor.printer':{attributes:{configuration_url:'http://printer.local/',printer_uri:'ipp://printer.local/ipp'}}};
  assert.equal(printerWebUrl({entityId:'sensor.printer'},states),'http://printer.local/');
  assert.equal(printerWebUrl({entityId:'sensor.printer',printerWebUrl:'https://example.org/'} ,states),'https://example.org/');
  assert.equal(printerWebUrl({entityId:'sensor.printer',printerWebUrl:''},states),'');
  assert.equal(printerWebUrl({entityId:'sensor.other'},states),'');
  assert.equal(printerWebUrl({entityId:'sensor.printer'}, {'sensor.printer':{attributes:{printer_uri:'ipp://printer.local/ipp'}}}),'');
});

test('supplies clamp percentages, preserve unknowns and warn at the configured threshold', () => {
  const widget = {cartridgeCount:6, lowThreshold:20};
  const states = {};
  for (const [i, value] of [0,20,72,150,'unavailable',''].entries()) {
    widget[`cartridge${i+1}EntityId`] = 'sensor.ink'+i;
    states['sensor.ink'+i] = {state:value};
  }
  const rows = printerCartridges(widget, states);
  assert.deepEqual(rows.map(r=>r.level), [0,20,72,100,null,null]);
  assert.deepEqual(rows.map(r=>r.low), [true,true,false,false,false,false]);
  assert.equal(printerNumber(null), null);
  assert.equal(printerNumber(false), null);
  assert.equal(printerNumber('NaN'), null);
  assert.equal(printerNumber(' 12.5 '), 12.5);
  assert.equal(cartridgeCount({cartridgeCount:99}), 6);
  assert.equal(cartridgeCount({cartridgeCount:-1}), 1);
});

test('polls active supplies only, plus status and optional sensors without duplicates', () => {
  const widget={entityId:'sensor.printer',cartridgeCount:1,cartridge1EntityId:'sensor.black',cartridge2EntityId:'sensor.cyan',messageEntityId:'sensor.printer',powerEntityId:'sensor.power'};
  assert.deepEqual(printerBindings(widget), ['sensor.printer','sensor.power','sensor.black']);
  widget.cartridgeCount=2;
  assert.ok(printerBindings(widget).includes('sensor.cyan'));
});

test('state priorities preserve printing during supply warnings but stop for a jam', () => {
  for (const [value, expected] of [['idle','ready'],['Druckt','printing'],['impression','printing'],['sleep','sleep'],['toner low','warning'],['error','stopped'],['unavailable','offline'],['unknown','unknown'],['invented','unknown']]) assert.equal(printerStatus(value),expected,value);
  assert.equal(printerStatus('printing','marker-supply-low-warning'),'printing');
  assert.equal(printerStatus('printing','media-jam'),'stopped');
});
