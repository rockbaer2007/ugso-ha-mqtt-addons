import assert from "node:assert/strict";
import test from "node:test";
class NodeStub {
  constructor(tag=""){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};}
  append(...nodes){for(const node of nodes)node.parent=this;this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(){}
  get activeElement(){return NodeStub.focused;}
  focus(){NodeStub.focused=this;}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(selector.startsWith('.')?(child.className||'').split(' ').includes(selector.slice(1)):child.tagName===selector)?[child]:[],...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  attachShadow(){this.shadowRoot=new NodeStub();}
}
globalThis.HTMLElement=NodeStub;
globalThis.document={createElement:tag=>new NodeStub(tag)};
const definitions=new Map();
globalThis.customElements={get:key=>definitions.get(key),define:(key,value)=>definitions.set(key,value)};
globalThis.window={};
const {imageSources}=await import("../www/weihnachtssteuerung-card.js");
const {calendarEventKeys,filterEntityTargets}=await import("../www/festtags-card-editor.js");

test("entity search finds partial names and IDs without changing target objects",()=>{
  const targets=[{name:"Weihnachtsbaum",entity_id:"switch.baum",device:"Lichterkette"},{name:"Garten",entity_id:"light.weihnacht_garten",area:"Terrasse"},{name:"Küche",entity_id:"light.kueche"}];
  const snapshot=structuredClone(targets);
  assert.deepEqual(filterEntityTargets(targets," WEIHNACHT "),targets.slice(0,2));
  assert.deepEqual(filterEntityTargets(targets,"weihnacht garten"),[targets[1]]);
  assert.deepEqual(filterEntityTargets(targets,"terrasse"),[targets[1]]);
  assert.deepEqual(filterEntityTargets(targets,"lichterkette"),[targets[0]]);
  assert.deepEqual(filterEntityTargets(targets,"unbekannt"),[]);
  assert.deepEqual(filterEntityTargets(targets,""),targets);
  assert.deepEqual(targets,snapshot);
});

test("HA-style picker searches, selects, clears and supports keyboard dismissal",async()=>{
  const Editor=definitions.get('festtags-card-editor'),editor=new Editor();
  editor._hass={locale:{language:'de'}};
  const targets=[{entity_id:'light.baum',name:'Weihnachtsbaum',area:'Wohnzimmer',device:'Lichterkette'},{entity_id:'switch.weihnacht_garten',name:'Gartenlicht',area:'Garten'}];
  let selected='light.baum';
  const picker=editor.entityPicker(editor.shadowRoot,targets,selected,value=>{selected=value;},0);
  const trigger=picker.querySelector('.entity-trigger'),popup=picker.querySelector('.entity-popup'),search=picker.querySelector('input');
  assert.equal(popup.hidden,true);
  trigger.onclick();assert.equal(popup.hidden,false);assert.equal(NodeStub.focused,search);
  assert.equal(picker.querySelectorAll('.entity-result').length,2);
  search.value='garten';search.oninput();
  assert.equal(selected,'light.baum');assert.equal(editor._dirty,false);
  const rows=picker.querySelectorAll('.entity-result');assert.equal(rows.length,1);
  picker.onkeydown({key:'ArrowDown',preventDefault(){}});assert.equal(NodeStub.focused,rows[0]);
  await rows[0].onclick();assert.equal(selected,'switch.weihnacht_garten');
  picker.onkeydown({key:'Escape',preventDefault(){}});assert.equal(popup.hidden,true);assert.equal(NodeStub.focused,trigger);
  trigger.onclick();search.value='unbekannt';search.oninput();assert.equal(picker.querySelectorAll('.entity-result').length,0);
  await picker.querySelector('.entity-clear').onclick();assert.equal(selected,'');
});

test("country observance choices respect the selected calendar tradition",()=>{
  const model={country_events:{DE:["advent_1","christmas","new_year","orthodox_christmas","nativity_fast"]}};
  assert.deepEqual(calendarEventKeys(model,"DE","western"),["advent_1","christmas","new_year"]);
  assert.deepEqual(calendarEventKeys(model,"DE","julian"),["new_year","orthodox_christmas","nativity_fast"]);
});

test("images are opt-in and use active country's supplied mapping",()=>{
  const a={image_folder:"/local/own",event_ids:["christmas"],image_mapping:{christmas:"Noël.gif"}};
  assert.deepEqual(imageSources(a),[]);
  assert.equal(imageSources(a,{show_images:true})[0].src,"/local/own/No%C3%ABl.gif");
});
test("simultaneous observances can have separate pictures",()=>{
  const a={images_enabled:true,event_ids:["advent_2","nicholas"],image_mapping:{advent_2:"two.png",nicholas:"santa.webp"}};
  assert.deepEqual(imageSources(a).map(s=>s.key),["advent_2","nicholas"]);
});
test("advent week fallback without mislabeling the current day",()=>{
  const a={images_enabled:true,event_ids:[],advent_week:3,image_mapping:{advent_3:"three.png"}};
  assert.equal(imageSources(a)[0].key,"advent_3");
  assert.deepEqual(imageSources({...a,advent_week:0}),[]);
});
test("bad folders and filenames cannot escape the local image directory",()=>{
  const a={images_enabled:true,event_ids:["christmas"],image_mapping:{christmas:"../bad.png"}};
  assert.deepEqual(imageSources(a),[]);
  assert.deepEqual(imageSources({...a,image_folder:"https://example.org",image_mapping:{christmas:"ok.png"}}),[]);
});
test("unrelated HA updates do not recreate pictures or restart GIF nodes",()=>{
  const Card=definitions.get("weihnachtssteuerung-card");
  const card=new Card();card.setConfig({type:"custom:weihnachtssteuerung-card"});
  const entity={state:"1. Advent",attributes:{christmas_control:true,images_enabled:true,event_ids:["advent_1"],image_mapping:{advent_1:"one.gif"},channels:[]}};
  const hass={locale:{language:"de"},config:{time_zone:"Europe/Berlin"},states:{"sensor.test":entity}};
  card.hass=hass;
  const image=card._media.children[0], root=card.shadowRoot.children;
  card.hass={...hass,states:{...hass.states,"sensor.unrelated":{state:"changed"}}};
  assert.equal(card._media.children[0],image);
  assert.equal(card.shadowRoot.children,root);
});
