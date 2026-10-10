import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zipSync, strToU8 } from 'fflate';
import { Blockly, modelWorkspace, workspaceModel } from '../src/blocks.js';
import { examples, toYaml, fromYaml, validateAutomation } from '../src/model.js';
import { customExample } from '../src/custom-example.js';
import { validatePackage, withPackages, customDefinition, installedPackages, blockType, usedPackages, packageZip, readPackageZip } from '../src/custom-packages.js';

test('declarative packages generate HA conditions/actions/values and preserve portable project fields', () => {
  const pkg = validatePackage(customExample); withPackages(Blockly, [pkg]);
  const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light); const root = ws.getBlocksByType('ugso_automation')[0];
    const condition = ws.newBlock(blockType(pkg, pkg.blocks[1])); condition.setFieldValue(22, 'LIMIT'); root.getInput('CONDITIONS').connection.connect(condition.outputConnection);
    const light = ws.newBlock(blockType(pkg, pkg.blocks[2])); light.setFieldValue(75, 'BRIGHTNESS'); ws.getBlocksByType('ugso_switch_action')[0].nextConnection.connect(light.previousConnection);
    const model = validateAutomation(workspaceModel(ws, examples.light));
    assert.match(model.conditions[0].value_template, /> 22/); assert.equal(model.actions[1].data.brightness_pct, 75);
    assert.deepEqual(fromYaml(toYaml(model)), model); assert.deepEqual(usedPackages(ws), [pkg]);
    const restored = new Blockly.Workspace();
    try { Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(ws), restored); assert.deepEqual(workspaceModel(restored, examples.light), model); } finally { restored.dispose(); }
    const value = ws.newBlock(blockType(pkg, pkg.blocks[0])), assignment = ws.newBlock('ugso_variable_set');
    assignment.getInput('VALUE').connection.connect(value.outputConnection);
    light.nextConnection.connect(assignment.previousConnection);
    assert.match(Object.values(workspaceModel(ws, examples.light).actions[2].variables)[0], /states\("sensor.temperatur"\)/);
  } finally { ws.dispose(); }
});

test('value inputs, entity strings and boolean fields substitute as Jinja values rather than source text', () => {
  const pkg = structuredClone(customExample); pkg.id = 'test_inputs'; pkg.blocks = [{ id: 'mix', label: 'Wert 100%', tooltip: '', kind: 'value', output: 'String', fields: [{ name: 'TEXT', label: 'Text', type: 'text', default: "x' + dangerous() + '" }, { name: 'FLAG', label: 'Aktiv', type: 'boolean', default: true }], inputs: [{ name: 'NUMBER', label: 'Zahl', check: 'Number' }], expression: '${TEXT} if ${FLAG} else (${NUMBER} | string)' }];
  withPackages(Blockly, [pkg]); const ws = new Blockly.Workspace();
  try {
    modelWorkspace(ws, examples.light); const log = ws.newBlock('ugso_log_action'), value = ws.newBlock(blockType(pkg, pkg.blocks[0])), n = ws.newBlock('ugso_number'); n.setFieldValue(42, 'NUM'); value.getInput('NUMBER').connection.connect(n.outputConnection); log.getInput('MESSAGE').connection.connect(value.outputConnection); ws.getBlocksByType('ugso_switch_action')[0].nextConnection.connect(log.previousConnection);
    const result = workspaceModel(ws, examples.light).actions[1].data.message;
    assert.match(result, /"x' \+ dangerous\(\) \+ '" if true/); assert.match(result, /42/);
    n.dispose(); assert.throws(() => workspaceModel(ws, examples.light), /fehlt/);
  } finally { ws.dispose(); }
});

test('packages reject scripts, prototype keys, missing placeholders, collisions and roll back failed project validation', () => {
  for (const mutate of [pkg => { pkg.generator = 'eval'; }, pkg => { pkg.blocks[0].expression = '${MISSING}'; }, pkg => { pkg.blocks[2].ha = JSON.parse('{"__proto__":{}}'); }, pkg => { pkg.blocks[1].output = 'Number'; }, pkg => { pkg.blocks[2].ha = { delay: -1 }; }]) { const pkg = structuredClone(customExample); mutate(pkg); assert.throws(() => validatePackage(pkg)); }
  const collision = structuredClone(customExample); collision.version = '1.0.1'; assert.throws(() => withPackages(Blockly, [collision]), /bereits/);
  const pkg = structuredClone(customExample); pkg.id = 'rollback_test';
  assert.throws(() => withPackages(Blockly, [pkg], () => { throw new Error('invalid project'); }), /invalid project/);
  assert.equal(customDefinition(blockType(pkg, pkg.blocks[0])), undefined); assert.equal(Blockly.Blocks[blockType(pkg, pkg.blocks[0])], undefined); assert.ok(!installedPackages().some(p => p.id === pkg.id));
  pkg.dependencies = [{ id: 'missing_pkg', version: '1.0.0' }]; assert.throws(() => withPackages(Blockly, [pkg]), /Abhängigkeit/);
});

test('ZIP and copied JSON use the same schema; malformed, oversized, traversal and duplicate entries are rejected', async () => {
  assert.deepEqual(await readPackageZip(packageZip(customExample)), validatePackage(JSON.stringify(customExample)));
  await assert.rejects(readPackageZip(new Uint8Array([1, 2, 3])));
  for (const entries of [{ '../block-package.json': strToU8('{}') }, { 'block-package.json': strToU8('{}'), 'run.js': strToU8('alert(1)') }, { 'block-package.json': strToU8('x'.repeat(1100000)) }]) await assert.rejects(readPackageZip(zipSync(entries)));
  const zip = packageZip(customExample), doubled = new Uint8Array(zip.length * 2); doubled.set(zip); doubled.set(zip, zip.length); await assert.rejects(readPackageZip(doubled));
});
