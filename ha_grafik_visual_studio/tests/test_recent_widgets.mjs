import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecentWidgets,RECENT_WIDGETS_KEY,recentWidgetText} from '../web/recent-widgets.js';
const sets=types=>[{id:'test',widgets:types.map(type=>({type}))}];
test('recent palette deduplicates, bounds history and survives reload without touching other preferences',()=>{
  const values=new Map([['gvs-widget-set-colors','{"test":"red"}']]);const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const recent=createRecentWidgets(storage);for(let n=0;n<15;n++)recent.record('widget-'+n);recent.record('widget-12');recent.setCollapsed(true);
  const restored=createRecentWidgets(storage),entries=restored.entries(sets(Array.from({length:15},(_,n)=>'widget-'+n)));
  assert.equal(entries.length,12);assert.equal(entries[0].definition.type,'widget-12');assert.equal(restored.collapsed,true);assert.equal(values.get('gvs-widget-set-colors'),'{"test":"red"}');
});
test('removed packages are not offered; reinstalled definitions regain their previous recent position',()=>{
  const recent=createRecentWidgets({getItem:()=>null,setItem:()=>{}});recent.record('package/a');recent.record('core/b');
  assert.deepEqual(recent.entries(sets(['core/b'])).map(e=>e.definition.type),['core/b']);
  assert.deepEqual(recent.entries(sets(['package/a','core/b'])).map(e=>e.definition.type),['core/b','package/a']);
});
test('malformed or blocked storage retains a usable in-memory list and DE EN FR labels',()=>{
  const recent=createRecentWidgets({getItem:()=>'{invalid',setItem:()=>{throw Error('blocked');}});recent.record('core/a');recent.setCollapsed(true);
  assert.equal(recent.entries(sets(['core/a'])).length,1);assert.equal(recent.collapsed,true);
  for(const locale of ['de','en','fr'])assert.ok(recentWidgetText('title',locale));
  const invalid=createRecentWidgets({getItem:k=>k===RECENT_WIDGETS_KEY?JSON.stringify({types:[null,{},'',42,'core/a','core/a'],collapsed:'yes'}):null,setItem:()=>{}});
  assert.equal(invalid.entries(sets(['core/a'])).length,1);assert.equal(invalid.collapsed,false);
});
