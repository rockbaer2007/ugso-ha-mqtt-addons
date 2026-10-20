const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const vm = require('node:vm');
const app = fs.existsSync(path.resolve(__dirname,'../app')) ? path.resolve(__dirname,'../app') : path.resolve(__dirname,'../dashboard_user_manager/app');
const read = name => fs.readFileSync(path.join(app,name),'utf8');
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
