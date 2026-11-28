import test from 'node:test';
import assert from 'node:assert/strict';
import * as BlocklyModule from 'blockly/core';
import {blockWorkspaceOptions} from '../web/blockly-workspace-options.js';
import {readFile} from 'node:fs/promises';
const Blockly = Reflect.get(BlocklyModule, 'default') ?? BlocklyModule;

test('Blockly accepts dotted grid, wheel panning and modifier/pinch zoom together', () => {
  const options = new Blockly.Options(blockWorkspaceOptions());
  assert.equal(options.gridOptions.length, 1);
  assert.equal(options.gridOptions.snap, false);
  assert.equal(options.moveOptions.wheel, true);
  assert.equal(options.moveOptions.drag, true);
  assert.equal(options.zoomOptions.wheel, true);
  assert.equal(options.zoomOptions.pinch, true);
  assert.equal(options.zoomOptions.controls, true);
});

test('each editor mount gets independent viewport options and the shipped bundle uses them', async () => {
  const first = blockWorkspaceOptions();
  first.zoom.startScale = 0.5;
  assert.equal(blockWorkspaceOptions().zoom.startScale, 1);
  const bundle = await readFile(new URL('../web/vendor/pro-blocks.js', import.meta.url), 'utf8');
  assert.match(bundle, /\.inject\([^,]+,\{\.\.\.blockWorkspaceOptions\(\)/);
});
