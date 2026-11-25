import assert from "node:assert/strict";
import test from "node:test";
class NodeStub {
  constructor(tag=""){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.style={};}
  append(...nodes){for(const node of nodes)node.parent=this;this.children.push(...nodes);}
  prepend(node){node.parent=this;this.children.unshift(node);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
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
const {imageSources,effectSettings}=await import("../www/weihnachtssteuerung-card.js");
const {calendarEventKeys,filterEntityTargets}=await import("../www/festtags-card-editor.js");

test("effects default off and accept only safe local image sources",()=>{
  assert.equal(effectSettings().snow,false);assert.equal(effectSettings().background,null);
  const options={mode:'image_snow',folder:'/local/weihnachtssteuerung/background',background_file:'Winter.gif',decoration_enabled:true,decoration_file:'Baum.png',decoration_transparency:70,decoration_size:25};
  const effects=effectSettings(options);assert.equal(effects.snow,true);assert.ok(Math.abs(effects.decorationOpacity-0.3)<1e-9);
  assert.equal(effects.decorationSize,25);assert.match(effects.background,/background\/Winter.gif$/);
  assert.equal(effectSettings({...options,folder:'https://external.example'}).background,undefined);
  assert.equal(effectSettings({...options,decoration_file:'../secret.png'}).decoration,undefined);
});

test("live status changes retain GIF layers and snow remains bounded",()=>{
  const Card=definitions.get('weihnachtssteuerung-card'),card=new Card();card.setConfig({});
  const channel={configured:true,number:1,name:'Baum',entity_id:'light.baum',show_status_icon:true,mode:'period',on_time:'16:00',off_time:'23:00',enabled:true};
  const overview={state:'Kein Festtag',attributes:{christmas_control:true,effects:{mode:'image_snow',background_file:'winter.gif',decoration_enabled:true,decoration_file:'baum.gif',snow_count:500},channels:[channel]}};
  const hass={locale:{language:'de'},config:{time_zone:'Europe/Berlin'},states:{'sensor.festtag':overview,'light.baum':{state:'on'}}};
  card.hass=hass;const layer=card._effectsNode,images=layer.querySelectorAll('img');
  const cardRoot=card._cardRoot;
  assert.equal(layer.querySelectorAll('.snowflake').length,40);assert.equal(images.length,2);
  card.hass={...hass,states:{...hass.states,'light.baum':{state:'off'}}};
  assert.equal(card._effectsNode,layer);assert.equal(card._effectsNode.querySelectorAll('img')[0],images[0]);
  assert.equal(card._cardRoot,cardRoot);assert.equal(layer.parent,cardRoot);
});

test("optional status icon follows the live target without sending services",()=>{
  const Card=definitions.get('weihnachtssteuerung-card'),card=new Card();card.setConfig({});
  const channel={configured:true,number:1,name:'Baum',entity_id:'light.baum',show_status_icon:true,mode:'period',on_time:'16:00',off_time:'23:00',enabled:true};
  const overview={state:'Kein Festtag',attributes:{christmas_control:true,channels:[channel]}};
  const states={'sensor.festtag':overview,'light.baum':{state:'on'}};
  const hass={locale:{language:'de'},config:{time_zone:'Europe/Berlin'},states,callService(){throw new Error('display must not switch');}};
  card.hass=hass;
  assert.equal(card.shadowRoot.querySelector('ha-icon').attributes.icon,'mdi:lightbulb');
  card.hass={...hass,states:{...states,'light.baum':{state:'off'}}};
  assert.equal(card.shadowRoot.querySelector('ha-icon').attributes.icon,'mdi:lightbulb-outline');
  card.hass={...hass,states:{...states,'light.baum':{state:'unavailable'}}};
  assert.equal(card.shadowRoot.querySelector('ha-icon').attributes.icon,'mdi:alert-circle-outline');
  overview.attributes.channels=[{...channel,show_status_icon:false}];card.hass=hass;
  assert.equal(card.shadowRoot.querySelector('ha-icon'),null);
});

test("save after app restart refreshes CSRF once without losing edited mappings",async()=>{
  const Editor=definitions.get('festtags-card-editor'),editor=new Editor();editor._csrf='old';
  const draft={country_images:{DE:{advent_1:'kerze1.png',nicholas:'nikolaus.png'}},show_images:true};
  const calls=[],original=globalThis.fetch;
  globalThis.fetch=async(path,options)=>{
    calls.push({path,options});
    if(path==='api/bootstrap')return new Response(JSON.stringify({csrf:'new'}));
    return options.headers['X-Festtags-CSRF']==='old'?new Response('App neu laden und erneut versuchen.',{status:403}):new Response(JSON.stringify({saved:true}));
  };
  try{
    const result=await editor.request('editor',{method:'POST',body:JSON.stringify({config:draft})});
    assert.equal(result.saved,true);assert.equal(calls.length,3);
    assert.equal(calls[2].options.body,calls[0].options.body);assert.equal(editor._csrf,'new');
  }finally{globalThis.fetch=original;}
});

test("rejected saves retain the draft and do not reload",async()=>{
  const Editor=definitions.get('festtags-card-editor'),editor=new Editor();
  editor._hass={locale:{language:'de'}};editor._entry={entry_id:'existing'};
  const draft={country_images:{DE:{nicholas:'nikolaus.png'}}};editor.config=draft;editor._dirty=true;
  editor.status=message=>{editor.message=message;};editor.request=async()=>{throw new Error('Entität mehrfach verwendet');};
  editor.load=async()=>{throw new Error('should not reload');};
  assert.equal(await editor.save(),false);assert.equal(editor.config,draft);assert.equal(editor._dirty,true);
  assert.match(editor.message,/Nicht gespeichert: Entität mehrfach/);assert.equal(editor._saving,false);
});

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
