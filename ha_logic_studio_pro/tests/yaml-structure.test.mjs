import assert from 'node:assert/strict';
import test from 'node:test';
import {validateYaml} from '../web/pro-yaml-model.js';

const source = [
  'alias: Strukturprüfung',
  'triggers: [{trigger: event, event_type: studio_test}]',
  'actions:',
  '  - choose:',
  '      - conditions: []',
  '        sequence:',
  '          - choose:',
  '              - conditions: [{condition: trigger, id: test}]',
  '                sequence:',
  '                  - action: switch.turn_on',
  '            default:',
  '              - delay: 1',
].join('\n');

test('HA-YAML marks the exact nested choose line', () => {
  assert.equal(validateYaml(source, 'automation'), 1);
  for (const [valid, invalid, expected] of [
    ['- action: switch.turn_on', '- ungültig', 10],
    ['conditions: [{condition: trigger, id: test}]', 'conditions: [42]', 8],
    ['- delay: 1', '- false', 12],
    ['sequence:\n                  - action:', 'unknown:\n                  - action:', 8],
  ]) {
    const input = source.replace(valid, invalid);
    assert.throws(() => validateYaml(input, 'automation'), error => {
      assert.equal(input.slice(0, error.pos[0]).split('\n').length, expected);
      return true;
    });
  }
});

test('HA-YAML accepts Blueprint instances with opaque inputs and extension fields', () => {
  const input = 'alias: Blueprint\nuse_blueprint:\n  path: test/example.yaml\n  input:\n    target: !secret example\nx-extension: [1, 2]\n';
  assert.equal(validateYaml(input, 'automation'), 1);
});
