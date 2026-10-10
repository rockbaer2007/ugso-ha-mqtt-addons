import test from 'node:test';
import assert from 'node:assert/strict';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { advancedJSON } from '../src/advanced.js';
import { nativeObject } from '../src/native-fields.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

test('Old JSON-only numeric projects gain fields; editing and reloading preserves all other values', () => {
  const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
  try {
    const trigger = { trigger:'numeric_state',entity_id:['sensor.a','sensor.b'],above:0,below:'input_number.maximum',attribute:'temperature',for:{minutes:1,seconds:0},enabled:false,id:'fan',variables:{exact:'001'} };
    const model = {...examples.light,triggers:[trigger]}; modelWorkspace(ws, model);
    const saved = Blockly.serialization.workspaces.save(ws);
    const root = saved.blocks.blocks[0], fields = root.inputs.TRIGGERS.block.fields;
    for (const key of Object.keys(fields)) if (key.startsWith('HA_')) delete fields[key];
    Blockly.serialization.workspaces.load(saved, copy);
    const block = copy.getBlocksByType('ugso_ha_numeric_state_trigger')[0];
    assert(block.getField('HA_JSON_ABOVE')); assert.equal(block.getField('JSON').isVisible(), false);
    assert.deepEqual(workspaceModel(copy, model), model);
    block.setFieldValue('-2.5','HA_JSON_ABOVE'); block.setFieldValue('','HA_JSON_BELOW');
    const edited = {...model,triggers:[{...trigger,above:-2.5}]}; delete edited.triggers[0].below;
    assert.deepEqual(fromYaml(toYaml(workspaceModel(copy, model))), edited);
    ws.clear(); Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(copy),ws);
    assert.deepEqual(workspaceModel(ws, model), edited);
  } finally { ws.dispose();copy.dispose(); }
});
test('Action fields retain multiple target kinds, omitted data and exact Jinja while editing one target', () => {
  const ws = new Blockly.Workspace();
  try {
    const block = ws.newBlock('ugso_ha_action');
    const original = {action:'light.turn_on',target:{entity_id:['light.a'],area_id:'room'},enabled:'{{ ready }}',continue_on_error:false,metadata:{exact:0},alias:'test'};
    block.setFieldValue(JSON.stringify(original),'JSON'); assert.deepEqual(advancedJSON(block),original);
    block.setFieldValue('bedroom','HA_JSON_TARGET_AREA_ID');
    assert.deepEqual(advancedJSON(block),{...original,target:{...original.target,area_id:'bedroom'}});
    block.setFieldValue('{{ other }}','HA_JSON_ENABLED'); assert.equal(advancedJSON(block).enabled,'{{ other }}');
    block.setFieldValue('[]','HA_EXTRA_JSON'); assert.throws(()=>advancedJSON(block),/JSON-Objekt/);
  } finally { ws.dispose(); }
});
test('Integration thresholds, wait timeouts, time patterns and case-sensitive variable fields export edits', () => {
  const ws = new Blockly.Workspace();
  try {
    const temperature = ws.newBlock('ugso_temperature_trigger');
    temperature.setFieldValue('{"type":"above","value":{"number":20,"unit_of_measurement":"°C"}}','THRESHOLD');
    temperature.setFieldValue('25','HA_THRESHOLD_VALUE_NUMBER');
    assert.equal(nativeObject(temperature,'THRESHOLD').value.number,25);
    const wait = ws.newBlock('ugso_wait_trigger'); wait.setFieldValue('0','HA_OPTIONS_TIMEOUT'); wait.setFieldValue('false','HA_OPTIONS_CONTINUE_ON_TIMEOUT');
    assert.deepEqual(advancedJSON(wait,'OPTIONS'),{timeout:0,continue_on_timeout:false});
    const pattern = ws.newBlock('ugso_time_pattern_trigger'); pattern.setFieldValue('/15','HA_PATTERN_SECONDS'); assert.deepEqual(nativeObject(pattern,'PATTERN'),{seconds:'/15'});
    const variables = ws.newBlock('ugso_variables_action'); variables.setFieldValue('{"x":0,"X":false}','VARIABLES');
    variables.setFieldValue('42','HA_VARIABLES_x'); assert.deepEqual(nativeObject(variables,'VARIABLES'),{x:42,X:false});
    variables.setFieldValue('{"state":"ready","enabled":false}','VARIABLES');
    variables.setFieldValue('custom','HA_VARIABLES_state'); variables.setFieldValue('42','HA_VARIABLES_enabled');
    assert.deepEqual(nativeObject(variables,'VARIABLES'),{state:'custom',enabled:42});
  } finally { ws.dispose(); }
});
test('Replacing legacy JSON by shorthand or malformed input never reuses stale structured values', () => {
  const ws = new Blockly.Workspace();
  try {
    const block = ws.newBlock('ugso_ha_condition'); block.setFieldValue(JSON.stringify('{{ ready }}'),'JSON');
    assert.equal(advancedJSON(block),'{{ ready }}'); assert.equal(block.getField('JSON').isVisible(),true);
    block.setFieldValue('{','JSON'); assert.throws(()=>advancedJSON(block),/JSON/);
  } finally { ws.dispose(); }
});
