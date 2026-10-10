import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, fromYaml, toYaml } from '../src/model.js';

test('WhatsApp integration variants match native YAML, without API keys', () => {
  for (const [action,key] of [['whatsapp.send_message','number'],['whatsapp.send_message','target'],['notify.whatsapp','target']]) {
    const ws = new Blockly.Workspace();
    try {
      const model = {...examples.light,actions:[{action,data:{[key]:'40741234567',message:'Hello 🏠\n{{ now() }}',...(action==='whatsapp.send_message'?{account:'40741234567'}:{})}}]};
      modelWorkspace(ws, fromYaml(toYaml(model)));
      assert.equal(ws.getBlocksByType('ugso_whatsapp_action').length,1);
      assert.deepEqual(workspaceModel(ws,model),model);
    } finally { ws.dispose(); }
  }
});

test('CallMeBot exports escaped message templates and preserves project/YAML semantics', () => {
  for (const [type, text, expected] of [
    ['ugso_text', 'Quotes "\nGrüße {{ literal }}', 'Quotes "\nGrüße {{ literal }}'],
    ['ugso_template', 'Water: {{ 21.5 | round(1) }} °C', 'Water: 21.5 °C'],
    ['ugso_template', '{% if true %}A "quoted"\nline{% else %}B{% endif %}', 'A "quoted"\nline']
  ]) {
    const ws = new Blockly.Workspace(), copy = new Blockly.Workspace();
    try {
      modelWorkspace(ws, { ...examples.light, actions: [] });
      const action = ws.newBlock('ugso_callmebot_action'); action.setFieldValue('default', 'PROFILE');
      const message = ws.newBlock(type); message.setFieldValue(text, 'TEXT');
      action.getInput('MESSAGE').connection.connect(message.outputConnection);
      ws.getBlocksByType('ugso_automation')[0].getInput('ACTIONS').connection.connect(action.previousConnection);
      const model = workspaceModel(ws, examples.light), data = model.actions[0].data;
      assert.equal(model.actions[0].action, 'mqtt.publish');
      assert.equal(data.topic, 'ugso/callmebot/send'); assert.equal(data.retain, false); assert.equal(data.qos, 0);
      assert.ok(!JSON.stringify(model).includes('api_key'));
      Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), copy);
      assert.deepEqual(workspaceModel(copy, examples.light), model);
      modelWorkspace(copy, fromYaml(toYaml(model))); assert.deepEqual(workspaceModel(copy, examples.light), model);
      if (process.env.BLOCKS_JINJA_TEST) {
        const result = spawnSync('python', ['-c', 'import sys,json; from jinja2.sandbox import ImmutableSandboxedEnvironment; e=ImmutableSandboxedEnvironment(); e.filters["to_json"]=json.dumps; print(e.from_string(sys.stdin.read()).render())'], { input: data.payload, encoding: 'utf8', env: {...process.env,PYTHONIOENCODING:'utf-8'} });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), {profile:'default',message:expected,loglevel:'errors'});
      }
    } finally { ws.dispose(); copy.dispose(); }
  }
});
