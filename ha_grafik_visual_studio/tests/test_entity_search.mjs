import assert from 'node:assert/strict';
import { entitySearchMatches } from '../web/entity-search.js';

const entity = { entity_id:'light.kitchen', name:'Lampe', original_name:'Licht', name_by_user:'Fernsehleuchte' };
const stateEntry = { attributes:{ friendly_name:'Wohnzimmerbeleuchtung' } };
const device = { name_by_user:'TV1', name:'Fernseher', manufacturer:'Demo', model:'Modell 1' };
for (const query of ['Licht Tv1','tv1 licht','WOHNZIMMERBELEUCHTUNG','Fernsehleuchte','light.kitchen','Modell 1']) {
  assert.equal(entitySearchMatches(query, entity, stateEntry, device),true,query);
}
assert.equal(entitySearchMatches('TV2 Licht',entity,stateEntry,device),false);
assert.equal(entitySearchMatches('licht tv1',{entity_id:'light.tv1',name:'Licht'}),true);
assert.equal(entitySearchMatches('licht tv1',{name:'Licht_TV1'}),true);
assert.equal(entitySearchMatches('',{},{},{}),true);
assert.equal(entitySearchMatches('TV1',{},undefined,device),true);
assert.equal(entitySearchMatches('Küche',{name:'KÜCHE'}),true);
console.log('Entity name aliases, device/name combinations, IDs and case-insensitive search passed.');
