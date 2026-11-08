import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,locales} from '../web/i18n.js';
import {messages} from '../web/locales.js';

test('DE/EN/FR messages are complete and preserve original German',()=>{
 assert.deepEqual(locales,['de','en','fr']);
 for(const [source,values]of Object.entries(messages)){
  assert.equal(values.length,2,source);
  for(const value of values)assert.ok(typeof value==='string'&&value.trim(),source);
  assert.equal(translate(source,'de'),source);
  assert.equal(translate(source,'en'),values[0]);
  assert.equal(translate(source,'fr'),values[1]);
 }
});
test('dynamic descriptions and errors translate without changing IDs or technical values',()=>{
 assert.match(translate('CTU: Zähler. Im Export unterstützt.','en'),/^CTU: Counters\./);
 assert.match(translate('2 Bausteine · 1 Verbindungen','fr'),/^2 blocs/);
 assert.match(translate('Demo_1 → AND_2: REAL passt nicht zu BOOL.','en'),/Demo_1 → AND_2: REAL is incompatible with BOOL/);
 assert.equal(translate('light.mein_licht','fr'),'light.mein_licht');
 assert.equal(translate('Mein eigener Projektname','en'),'Mein eigener Projektname');
 assert.match(translate('Mindestens einen STATE_OUT verbinden.\nAutomation benötigt einen STATE_IN als Zustandsauslöser.','en'),/Connect at least one STATE_OUT.\nAutomation requires/);
});
