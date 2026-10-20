const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const vm = require('node:vm');
const app = fs.existsSync(path.resolve(__dirname,'../app')) ? path.resolve(__dirname,'../app') : path.resolve(__dirname,'../dashboard_user_manager/app');
const read = name => fs.readFileSync(path.join(app,name),'utf8');

test('real save success uses one current-language template despite an English API reply and follows later language changes', async () => {
  for (const start of ['de','en','fr']) for (const changed of [2,0]) {
    const dom=new JSDOM(read('static/index.html'),{url:'https://offline.invalid/',runScripts:'outside-only'});
    const w=dom.window, calls=[]; let committed=false;
    try {
      const ha=w.document.createElement('home-assistant');ha.hass={language:start};w.document.body.append(ha);
      w.fetch=async(route,options={})=>{
        calls.push([route,options]);
        let data;
        if(route==='locales.json') data=JSON.parse(read('locales.json'));
        else if(route==='api/bootstrap') data={version:'0.1.8',csrf:'test',users_hash:'users',users:[{id:'web',name:'Original User',active:true}],dashboards:[{url_path:'test',title:'Original Dashboard',mode:'storage'}],backups:[]};
        else if(route==='api/matrix') data={token:'prepared'};
        else if(route==='api/commit') {committed=true;data={changed,message:changed?'User visibility saved and verified by reading it back.':'No change needed.',views:[0,1].map(index=>({index,title:'Original '+index,path:'view-'+index,users:['web']})),config_hash:'after',backups:[]};}
        else if(route.startsWith('api/views?')) data={config_hash:committed?'after':'before',views:[0,1].map(index=>({index,title:'Original '+index,path:'view-'+index,users:committed?['web']:[]})),generated:false};
        else throw new Error('Unexpected route '+route);
        return {ok:true,json:async()=>data,text:async()=>JSON.stringify(data)};
      };
      const flush=async()=>{for(let i=0;i<15;i++)await new Promise(resolve=>setImmediate(resolve));};
      for(const script of ['i18n.js','matrix.js','app.js'])vm.runInContext(read('static/'+script),dom.getInternalVMContext());
      await flush();
      w.document.querySelector('#columns input').click();
      w.document.getElementById('save').click();await flush();
      assert.ok(committed);
      const expected={de:changed?'Benutzersichtbarkeit gespeichert und zurückgelesen. 2 Ansichten geändert.':'Keine Änderung nötig.',en:changed?'User visibility saved and verified by reading it back. 2 views changed.':'No change needed.',fr:changed?'Visibilité des utilisateurs enregistrée et vérifiée par relecture. 2 vues modifiées.':'Aucune modification nécessaire.'};
      const check=lang=>{assert.equal(w.document.getElementById('status').textContent,expected[lang]);assert.equal(w.document.getElementById('status').className,'success');assert.equal(w.document.getElementById('save').disabled,true);};
      check(start);
      for(const lang of ['de','en','fr']){const select=w.document.getElementById('language');select.value=lang;select.dispatchEvent(new w.Event('change'));check(lang);}
      assert.equal(calls.filter(([,o])=>o.method==='POST').length,2);
      assert.ok(w.document.getElementById('views').textContent.includes('Original 0'));
    } finally {w.close();}
  }
});
test('real frontend automatically renders DE/EN/FR and preserves unsaved cells during language changes', async () => {
  for (const [lang,saveLabel] of [['de','Änderungen speichern'],['en','Save changes'],['fr','Enregistrer les modifications']]) {
    const dom = new JSDOM(read('static/index.html'), {url:'https://offline.invalid/',runScripts:'outside-only'});
    const w=dom.window; const calls=[];
    try {
      const ha=w.document.createElement('home-assistant');ha.hass={language:lang};w.document.body.append(ha);
      w.fetch=async(route,options={})=>{
        calls.push([route,options]);
        const data=route==='locales.json'?JSON.parse(read('locales.json')):route==='api/bootstrap'?{
          version:'0.1.4',csrf:'test',users_hash:'users',users:[{id:'web',name:'Mein Originalname',active:true}],dashboards:[{url_path:'test',title:'Meine Küche',mode:'storage'}],backups:[]
        }:{config_hash:'config',views:[{index:0,title:'Eigener Name',path:'home',users:[]}],generated:false};
        return {ok:true,json:async()=>data,text:async()=>JSON.stringify(data)};
      };
      for (const script of ['i18n.js','matrix.js','app.js']) vm.runInContext(read('static/'+script),dom.getInternalVMContext());
      for(let i=0;i<15;i++) await new Promise(resolve=>setImmediate(resolve));
      assert.equal(w.document.documentElement.lang,lang);
      assert.equal(w.document.getElementById('save').textContent,saveLabel);
      const cell=w.document.querySelector('#views input');assert.ok(cell&&!cell.disabled);
      cell.click(); assert.equal(w.document.querySelector('#views input').checked,true);
      assert.equal(w.document.getElementById('save').disabled,false);
      const select=w.document.getElementById('language');select.value=lang==='fr'?'en':'fr';select.dispatchEvent(new w.Event('change'));
      assert.equal(w.document.querySelector('#views input').checked,true);
      assert.equal(w.document.getElementById('save').disabled,false);
      assert.ok(w.document.getElementById('columns').textContent.includes('Mein Originalname'));
      assert.ok(w.document.getElementById('views').textContent.includes('Eigener Name'));
      assert.equal(calls.filter(([,options])=>options.method==='POST').length,0);
    } finally {w.close();}
  }
});
