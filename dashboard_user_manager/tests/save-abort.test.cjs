const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const app=fs.existsSync(path.resolve(__dirname,'../app'))?path.resolve(__dirname,'../app'):path.resolve(__dirname,'../dashboard_user_manager/app');
const read=n=>fs.readFileSync(path.join(app,n),'utf8');
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));};
async function setup(stage='matrix',outcome='before'){
  const dom=new JSDOM(read('static/index.html'),{url:'https://offline.invalid/',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[],timers=new Map();let late,blob;
  const originalTimer=w.setTimeout.bind(w);let id=1000;
  w.setTimeout=(fn,ms,...args)=>ms===30000?(timers.set(++id,fn),id):originalTimer(fn,ms,...args);
  const clear=w.clearTimeout.bind(w);w.clearTimeout=n=>{timers.delete(n);clear(n);};
  w.URL.createObjectURL=b=>{blob=b;return 'blob:offline';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
  const ha=d.createElement('home-assistant');ha.hass={language:'de'};d.body.append(ha);
  const views=selected=>[0,1].map(index=>({index,title:'Original '+index,path:'view-'+index,users:selected?['web']:[]}));
  const reply=data=>({ok:true,json:async()=>data,text:async()=>JSON.stringify(data)});
  const plan={token:'t'.repeat(43),before_hash:'a'.repeat(64),after_hash:'b'.repeat(64)};
  w.fetch=async(route,options={})=>{
    calls.push([route,options]);
    if(route==='locales.json')return reply(JSON.parse(read('locales.json')));
    if(route==='api/bootstrap')return reply({version:'0.1.9',csrf:'csrf-secret',users_hash:'c'.repeat(64),users:[{id:'web',name:'Original User',active:true}],dashboards:[{url_path:'test',title:'Original Dashboard',mode:'storage'}],backups:[]});
    if(route.startsWith('api/views?'))return reply({config_hash:'a'.repeat(64),views:views(false),generated:false});
    if(route==='api/matrix')return stage==='matrix'?new Promise(resolve=>{late=()=>resolve(reply(plan));}):reply(plan);
    if(route==='api/commit')return stage==='body'?{ok:true,text:()=>new Promise(()=>{})}:new Promise(resolve=>{late=()=>resolve(reply({changed:2,views:views(true),config_hash:'b'.repeat(64),backups:[]}));});
    if(route==='api/resolve')return stage==='resolve'?new Promise(()=>{}):reply({outcome,views:views(outcome==='after'),config_hash:(outcome==='after'?'b':'a').repeat(64),backups:[]});
    throw new Error('Unexpected route '+route);
  };
  for(const f of ['i18n.js','matrix.js','app.js'])vm.runInContext(read('static/'+f),dom.getInternalVMContext());
  await settle();d.querySelector('#columns input').click();d.getElementById('save').click();await settle();
  return{dom,w,d,calls,late:()=>late(),timeout:()=>{const fn=[...timers.values()][0];assert.ok(fn);fn();},setStage:x=>{stage=x;},draft:async()=>{d.getElementById('export-draft').click();return new Promise(resolve=>{const r=new w.FileReader();r.onload=()=>resolve(JSON.parse(r.result));r.readAsText(blob);});}};
}
for(const stop of ['cancel','timeout'])test(`${stop} during preparation preserves draft and suppresses late commit`,async()=>{
  const s=await setup();try{
    assert.equal(s.d.getElementById('cancel-save').hidden,false);
    if(stop==='cancel')s.d.getElementById('cancel-save').click();else s.timeout();await settle();
    assert.equal(s.d.querySelector('#views input').checked,true);assert.equal(s.d.getElementById('save').disabled,false);
    assert.match(s.d.getElementById('status').textContent,/kein Schreibauftrag/);
    s.late();await settle();assert.equal(s.calls.filter(([r])=>r==='api/commit').length,0);
    const draft=await s.draft();assert.equal(draft.rows.length,2);assert.deepEqual(draft.rows[0].users,['web']);assert.ok(!JSON.stringify(draft).includes('csrf-secret'));assert.ok(!JSON.stringify(draft).includes('token'));
  }finally{s.w.close();}
});
for(const outcome of ['before','after','conflict'])test(`cancelled commit requires a fenced server check: ${outcome}`,async()=>{
  const s=await setup('commit',outcome);try{
    s.d.getElementById('cancel-save').click();await settle();
    assert.equal(s.d.getElementById('save').disabled,true);assert.equal(s.d.getElementById('reload').disabled,true);assert.equal(s.d.getElementById('verify-save').hidden,false);
    assert.equal(s.d.querySelector('#views input').checked,true);
    s.late();await settle();assert.match(s.d.getElementById('status').textContent,/Speicherergebnis unklar/);
    s.d.getElementById('verify-save').click();await settle();
    assert.equal(s.calls.filter(([r])=>r==='api/commit').length,1);assert.equal(s.calls.filter(([r])=>r==='api/resolve').length,1);
    assert.equal(s.d.querySelector('#views input').checked,true);
    assert.equal(s.d.getElementById('save').disabled,outcome!=='before');
    if(outcome==='after')assert.equal(s.d.getElementById('changes').textContent,'Keine Änderungen');
    if(outcome==='conflict'){assert.equal(s.d.getElementById('reload').disabled,false);assert.equal(s.d.getElementById('export-draft').disabled,false);}
  }finally{s.w.close();}
});
for(const stage of ['commit','body'])test(`timeout during ${stage} and failed server check preserve draft and never unlock blind retries`,async()=>{
  const s=await setup(stage);try{
    s.timeout();await settle();assert.equal(s.d.getElementById('save').disabled,true);
    s.setStage('resolve');s.d.getElementById('verify-save').click();await settle();s.timeout();await settle();
    assert.equal(s.d.getElementById('save').disabled,true);assert.equal(s.d.getElementById('verify-save').disabled,false);
    assert.equal(s.d.querySelector('#views input').checked,true);assert.match(s.d.getElementById('status').textContent,/noch nicht bestätigt/);
    assert.equal(s.calls.filter(([r])=>r==='api/commit').length,1);
  }finally{s.w.close();}
});
