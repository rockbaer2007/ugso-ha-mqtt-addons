import assert from 'node:assert/strict';
import test from 'node:test';
import {helperSpec, provisionHelper} from '../web/iobroker-create-state.js';

test('a numeric createState value is initialized once through the helper service', async () => {
  const spec = helperSpec({
    extraState: {valueType: 'number'},
    inputs: {VALUE: {block: {type: 'math_number', fields: {NUM: 42}}}},
  }, 'Import test');
  const calls = [];
  const mapped = await provisionHelper(async command => {
    calls.push(command);
    if (command.type === 'input_number/create') return {id: 'import_test'};
  }, spec);
  assert.deepEqual(mapped, {entity: 'input_number.import_test', initialized: true});
  assert.equal(calls[0].initial, undefined);
  assert.deepEqual(calls[1], {
    type: 'call_service', domain: 'input_number', service: 'set_value',
    target: {entity_id: mapped.entity}, service_data: {value: 42},
  });
});

test('an initialization failure returns the created helper for reuse', async () => {
  const spec = helperSpec({
    inputs: {VALUE: {block: {type: 'logic_boolean', fields: {BOOL: 'FALSE'}}}},
  }, 'Import test');
  const result = await provisionHelper(async command => {
    if (command.type === 'input_boolean/create') return {id: 'import_test'};
    assert.equal(command.service, 'turn_off');
    throw new Error('Service unavailable');
  }, spec);
  assert.deepEqual(result, {entity: 'input_boolean.import_test', initialized: false});
});

test('computed or incompatible values require manual helper mapping', () => {
  assert.equal(helperSpec({inputs: {VALUE: {block: {type: 'math_arithmetic'}}}}, 'Test'), undefined);
  assert.equal(helperSpec({
    extraState: {valueType: 'number'},
    inputs: {VALUE: {block: {type: 'text', fields: {TEXT: '42'}}}},
  }, 'Test'), undefined);
});
