import test from 'node:test';
import assert from 'node:assert/strict';
import {completeCssGroups} from '../web/card-css.js';
import {cssGroups} from '../web/widget-sets/core.js';
import {getWidgetSets} from '../web/widget-registry.js';

test('Every built-in widget receives complete CSS controls without duplicates or changed existing groups',()=>{
  const templates=cssGroups();
  for(const set of getWidgetSets())for(const widget of set.widgets){
    const original=structuredClone(widget.propertyGroups);
    const groups=completeCssGroups(widget.propertyGroups,templates);
    for(const template of templates)assert.equal(groups.filter(group=>group.css&&group.label===template.label).length,1,widget.type);
    assert.deepEqual(widget.propertyGroups,original);
    for(const group of widget.propertyGroups)assert.ok(groups.includes(group));
    assert.deepEqual(completeCssGroups(groups,templates),groups);
  }
});

test('New external sets get optional CSS controls while Industrial stays unchanged',()=>{
  const groups=[{label:'Daten',fields:[]}];
  const completed=completeCssGroups(groups,cssGroups());
  assert.equal(completed.length,6);
  assert.ok(completed.slice(1).every(group=>group.sharedCss&&group.defaultEnabled===false));
  assert.equal(completeCssGroups(groups,cssGroups(),{industrial:true}),groups);
  const card=completeCssGroups(groups,cssGroups(),{card:true});
  assert.ok(card.slice(1).every(group=>group.cardCss));
});
