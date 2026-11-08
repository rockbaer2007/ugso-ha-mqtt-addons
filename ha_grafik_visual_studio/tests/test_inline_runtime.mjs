import test from 'node:test';
import assert from 'node:assert/strict';
import {createInlineRuntime,previewUrl} from '../web/inline-runtime.js';
import {nameOnlyPalette,paletteDescription} from '../web/palette-preview.js';
test('runtime saves before entering, rejects concurrent starts and restores after stopping',async()=>{
  let resolve,entered=0,left=0;const save=new Promise(r=>resolve=r);
  const controller=createInlineRuntime({save:()=>save,enter:()=>entered++,leave:()=>left++});
  const start=controller.start();assert.equal(controller.busy,true);assert.equal(await controller.start(),false);assert.equal(controller.stop(),false);assert.equal(entered,0);
  resolve(true);assert.equal(await start,true);assert.equal(controller.active,true);controller.stop();assert.equal(left,1);assert.equal(controller.busy,false);controller.stop();assert.equal(left,1);
});
test('failed saves never start runtime and always release editor locks',async()=>{
  let entered=0,left=0;const controller=createInlineRuntime({save:async()=>false,enter:()=>entered++,leave:()=>left++});
  assert.equal(await controller.start(),false);assert.equal(entered,0);assert.equal(left,1);assert.equal(controller.busy,false);
  const failure=createInlineRuntime({save:async()=>{throw Error('network');},enter:()=>entered++,leave:()=>left++});
  await assert.rejects(failure.start(),/network/);assert.equal(left,2);assert.equal(failure.busy,false);
});
test('runtime URL keeps ingress base, encodes IDs and preserves nested tab context',()=>{
  const url=new URL(previewUrl('http://ha/api/hassio_ingress/abc/','main','page & 2',{ownerId:'tabs/1',index:2}));
  assert.equal(url.pathname,'/api/hassio_ingress/abc/runtime');assert.equal(url.searchParams.get('page'),'page & 2');assert.equal(url.searchParams.get('tabsWidget'),'tabs/1');assert.equal(url.searchParams.get('inlinePreview'),'1');
});
test('UGSo stays name-only and known device descriptions are multilingual',()=>{
  assert.equal(nameOnlyPalette({label:'UGSo Special'},{type:'test'}),true);assert.equal(nameOnlyPalette({label:'Basis'},{type:'text'}),false);
  const definition={defaults:{deviceKind:'switch'}};assert.match(paletteDescription(definition,'en'),/Turn an HA entity/);assert.match(paletteDescription(definition,'fr'),/marche/);
});
