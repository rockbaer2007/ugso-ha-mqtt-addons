import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, knownTypes } from '../src/blocks.js';
import { fieldChoice, matchingChoices, validChoice, choiceForPath } from '../src/entities.js';

test('All native blocks expose recognized HA text fields as selectors without changing stored values', () => {
  const ws = new Blockly.Workspace();
  try {
    let count = 0;
    for (const type of knownTypes) {
      if (['ugso_colour','ugso_colour_action'].includes(type)) continue; // Colour plugin needs a browser; covered by browser audit.
      const block = ws.newBlock(type);
      for (const input of block.inputList) for (const field of input.fieldRow) {
        if (!fieldChoice(field)) continue;
        count++;
        assert.equal(typeof field.showEditor_, 'function', type + ':' + field.name);
        assert.ok(field.getText().endsWith(' ▾'), type + ':' + field.name);
        assert.ok(!String(field.getValue()).endsWith(' ▾'));
      }
    }
    assert.ok(count > 30, String(count));
  } finally { ws.dispose(); }
});

test('Action metadata filters entities, target kinds follow their dropdown, manual templates remain valid', () => {
  const ws = new Blockly.Workspace();
  try {
    const b = ws.newBlock('ugso_target_action'); b.setFieldValue('light.turn_on', 'SERVICE');
    const catalog = { actions:[{id:'light.turn_on', name:'On', domains:['light']}], entities:[{entity_id:'light.one',domain:'light',name:'One'},{entity_id:'switch.two',domain:'switch',name:'Two'}], targets:{area_id:[{id:'living_room',name:'Living room'}]} };
    assert.deepEqual(matchingChoices(catalog,b.getField('TARGET'),'').map(r=>r.id),['light.one']);
    b.setFieldValue('area_id','KIND');
    assert.equal(fieldChoice(b.getField('TARGET')).kind,'area_id');
    assert.deepEqual(matchingChoices(catalog,b.getField('TARGET'),'living').map(r=>r.id),['living_room']);
    for(const kind of ['entity_id','device_id','area_id','floor_id','label_id']) {
      assert.equal(validChoice('{{ target }}',{kind,structured:true}),true);
    }
    assert.equal(validChoice('["light.one","light.two"]',{kind:'entity_id',structured:true}),true);
    assert.equal(validChoice('["invalid"]',{kind:'entity_id',structured:true}),false);
    assert.equal(validChoice('light.turn_on',{kind:'action'}),true);
    assert.equal(validChoice('invalid',{kind:'action'}),false);
    assert.equal(choiceForPath('entity_id',[],'VARIABLES'),null);
    assert.equal(choiceForPath('above',[],'JSON').allowNumber,true);
  } finally { ws.dispose(); }
});
