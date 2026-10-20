const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const vm = require('node:vm');
const app = fs.existsSync(path.resolve(__dirname,'../app')) ? path.resolve(__dirname,'../app') : path.resolve(__dirname,'../dashboard_user_manager/app');
const read = name => fs.readFileSync(path.join(app,name),'utf8');
const settle = async()=>{for(let i=0;i<20;i++) await new Promise(r=>setImmediate(r));};
async function setup(saved, dashboards) {
  const dom = new JSDOM(read('static/index.html'),{url:'https://offline.invalid/',runScripts:'outside-only'}), w=dom.window;
  const calls=[]; let allowDiscard=false;
  if(saved!==undefined) w.localStorage.setItem('dashboard-users-dashboards',JSON.stringify(saved));
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.confirm=()=>allowDiscard;
  w.fetch=async(route,options={})=>{
    calls.push([route,options]);
    const data=route==='locales.json'?JSON.parse(read('locales.json')):route==='api/bootstrap'?{
      version:'0.1.5',csrf:'test',users_hash:'users',users:[{id:'web',name:'Original'}],
      dashboards:dashboards || [{url_path:'one',title:'Küche',mode:'storage'},{url_path:'two',title:'Wohnzimmer',mode:'storage'}],
      empty_dashboards:2,dashboard_errors:[{url_path:'bad',title:'Fehler <b>',load_error:'Dashboard konnte nicht geladen werden. Bitte erneut prüfen.'}],backups:[]
    }:{config_hash:'config',views:[{index:0,title:'Originalansicht',path:'home',users:[]}],generated:false};
    return {ok:true,json:async()=>data,text:async()=>JSON.stringify(data)};
  };
  for(const file of ['i18n.js','matrix.js','app.js']) vm.runInContext(read('static/'+file),dom.getInternalVMContext());
  await settle(); return {dom,w,calls,discard:()=>{allowDiscard=true;}};
}
test('saved dashboard filter survives reload, empty choice stays empty, no writes to HA',async()=>{
  const {dom,w,calls}=await setup(); const d=w.document;
  try {
    assert.equal(d.querySelectorAll('#dashboard option').length,2);
    assert.equal(d.querySelector('#dashboard-errors').hidden,false);
    assert.ok(d.querySelector('#dashboard-errors-list').textContent.includes('Fehler <b>'));
    assert.equal(d.querySelectorAll('#dashboard-errors-list b').length,0);
    d.querySelector('#choose-dashboards').click();
    d.querySelector('#choose-none').click(); d.querySelector('#choose-cancel').click();
    assert.equal(d.querySelectorAll('#dashboard option').length,2);
    d.querySelector('#choose-dashboards').click(); d.querySelector('#choose-none').click();
    d.querySelector('#dashboard-choices input[value="two"]').click(); d.querySelector('#choose-apply').click(); await settle();
    assert.equal(d.querySelector('#dashboard').value,'two');
    const stored=JSON.parse(w.localStorage.getItem('dashboard-users-dashboards'));
    assert.deepEqual(stored,['two']);
    const reload=await setup(stored);
    try {assert.equal(reload.w.document.querySelectorAll('#dashboard option').length,1);assert.equal(reload.w.document.querySelector('#dashboard').value,'two');}finally{reload.w.close();}
    d.querySelector('#choose-dashboards').click(); d.querySelector('#choose-none').click(); d.querySelector('#choose-apply').click(); await settle();
    assert.equal(d.querySelectorAll('#dashboard option').length,0);assert.equal(d.querySelector('#save').disabled,true);
    const empty=await setup([]);try{assert.equal(empty.w.document.querySelectorAll('#dashboard option').length,0);}finally{empty.w.close();}
    assert.equal(calls.filter(([,o])=>o.method==='POST').length,0);
  } finally {w.close();}
});
test('keeping current dashboard preserves draft; removing it requires discard and storage failures stay visible',async()=>{
  const {w,calls}=await setup();const d=w.document;
  try {
    d.querySelector('#views input').click();
    d.querySelector('#choose-dashboards').click();d.querySelector('#dashboard-choices input[value="two"]').click();d.querySelector('#choose-apply').click();await settle();
    assert.equal(d.querySelector('#views input').checked,true);assert.equal(d.querySelector('#save').disabled,false);
    d.querySelector('#choose-dashboards').click();d.querySelector('#choose-none').click();d.querySelector('#choose-apply').click();await settle();
    assert.equal(d.querySelector('#dashboard-dialog').open,true);assert.equal(d.querySelector('#views input').checked,true);
    d.querySelector('#choose-all').click();
    w.Storage.prototype.setItem=()=>{throw new Error('storage blocked');};d.querySelector('#choose-apply').click();await settle();
    assert.ok(d.querySelector('#preference-error').textContent.length);assert.equal(d.querySelector('#dashboard-dialog').open,true);
    assert.equal(calls.filter(([,o])=>o.method==='POST').length,0);
  }finally{w.close();}
});
test('legacy overview preference selects one canonical overview and is retained on apply',async()=>{
  for(const saved of [[''],['','lovelace'],[]]) {
    const {w,calls}=await setup(saved,[{url_path:'lovelace',aliases:[null],title:'Übersicht aktuell',mode:'storage'},
      {url_path:'other-dashboard',title:'Übersicht aktuell',mode:'storage'}]);
    const d=w.document;
    try {
      assert.equal(d.querySelectorAll('#dashboard option').length,saved.length ? 1 : 0);
      if(saved.length) assert.equal(d.querySelector('#dashboard').value,'lovelace');
      d.querySelector('#choose-dashboards').click();
      assert.equal(d.querySelectorAll('#dashboard-choices input').length,2); // distinct equal names kept
      assert.equal(d.querySelector('#dashboard-choices input[value="lovelace"]').checked,Boolean(saved.length));
      d.querySelector('#choose-apply').click();await settle();
      assert.deepEqual(JSON.parse(w.localStorage.getItem('dashboard-users-dashboards')),saved.length ? ['lovelace'] : []);
      assert.equal(calls.filter(([,o])=>o.method==='POST').length,0);
    }finally{w.close();}
  }
});
