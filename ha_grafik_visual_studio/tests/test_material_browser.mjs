import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const url=process.env.STUDIO_TEST_URL;
test('all 49 Material entries, themes, locales, meaningful options and legacy values', {skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER || undefined});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url);await page.locator('#stage').waitFor();
    const manifest=JSON.parse(await readFile(process.env.MATERIAL_MANIFEST || '../ha-grafik-visual-studio-materialdesign/manifest.json','utf8'));
    await page.evaluate(async manifest=>{
      const widgets=await import('./material-widgets.js'),dialog=await import('./material-dialog.js'),colors=await import('./material-color-schemes.js');
      window.materialModules={widgets,dialog,colors};window.materialManifest=manifest;window.materialWrites=[];
      window.makeMaterial=(name,extra={},ctx={})=>{
        const definition=manifest.widgets.find(w=>w.label===name);const w={...structuredClone(definition.defaults),id:'proof-'+name.replaceAll(' ','-'),...extra};
        const context={runtime:true,states:{},language:'en',surface:'proof',packageVersion:manifest.version,baseUrl:location.href,pageUrl:id=>id?location.href+'?mode=runtime&embedded=1&page='+encodeURIComponent(id):null,icon:(node,value)=>{node.dataset.icon=value || '';},navigate:url=>window.materialNavigation=url,write:async(id,value)=>{window.materialWrites.push([id,value]);return true;},history:async()=>({labels:['2026-01-01T10:00:00Z','2026-01-01T10:10:00Z','2026-01-01T11:00:00Z'],datasets:[{label:'History',data:[20,null,25]}]}),localChange:()=>{},...ctx};
        const kind=definition.render.kind;const node=kind==='material-color-schemes'?colors.renderMaterialColorSchemes(w,document,context):kind.includes('dialog')?dialog.renderMaterialDialog(w,document,{...context,locale:w.materialLocale,iframe:kind==='material-iframe-dialog',popupUrl:null}):widgets.renderMaterialWidget(w,document,context);
        return {node,w};
      };
      const style=document.createElement('link');style.rel='stylesheet';style.href='./material-widgets.css';document.head.append(style);
      const proof=document.createElement('div');proof.id='material-proof';proof.style.cssText='position:fixed;inset:0;z-index:100000;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);background:white';document.body.append(proof);
      window.mountMaterial=(name,extra,ctx)=>{const result=window.makeMaterial(name,extra,ctx);const cell=document.createElement('section');cell.style.cssText='height:300px;min-width:0;border:1px solid #aaa';cell.append(result.node);proof.append(cell);return result.node;};
    },manifest);
    for(const locale of ['de','en','fr'])for(const style of ['legacy','material3'])for(const theme of ['light','dark']){
      const count=await page.evaluate(({locale,style,theme})=>{document.querySelector('#material-proof').replaceChildren();for(const definition of window.materialManifest.widgets)window.mountMaterial(definition.label,{materialLocale:locale,designStyle:style,themeMode:theme},{pageTheme:theme,language:locale});return document.querySelector('#material-proof').children.length;},{locale,style,theme});
      assert.equal(count,49);await page.waitForTimeout(80);
    }
    await page.evaluate(()=>{document.querySelector('#material-proof').replaceChildren();window.mountMaterial('Switch',{labelText:'Toggle',state:'off'});window.mountMaterial('Button State',{pressedColor:'#ff0000',writeValue:'7',entityId:'input_number.x'},{states:{'input_number.x':{state:'2',attributes:{min:0,max:10}}}});window.mountMaterial('Slider',{thumbSize:32,trackWidth:14});window.mountMaterial('Material Design Icon',{icon:'mdi:star'});window.mountMaterial('Installed Version');});
    const track=page.locator('.material-switch-track');assert.equal(await track.count(),1);assert.equal(await track.evaluate(el=>Math.round(el.getBoundingClientRect().width)),52);
    await track.click();assert.equal(await page.locator('input[role=switch]').isChecked(),true);
    await page.locator('.material-action-button').click();assert.deepEqual(await page.evaluate(()=>window.materialWrites.at(-1)),['input_number.x',7]);
    assert.equal(await page.locator('.material-action-button').evaluate(el=>el.style.getPropertyValue('--material-press')),'#ff0000');
    assert.equal(await page.locator('[data-material-kind=slider]').evaluate(el=>el.style.getPropertyValue('--material-thumb')),'32px');
    assert.equal(await page.locator('[data-material-kind=slider]').evaluate(el=>el.style.getPropertyValue('--material-track')),'14px');
    assert.equal(await page.locator('[data-material-kind=icon] img').getAttribute('data-icon'),'mdi:star');
    assert.match(await page.locator('.material-version-badge').innerText(),/1\.1\.0/);
    await page.evaluate(()=>{document.querySelector('#material-proof').replaceChildren();window.materialWrites=[];window.mountMaterial('Button State Multi',{multiStateMode:'targets',countTargets:2,targetEntityId0:'switch.a',targetValue0:'on',targetEntityId1:'number.b',targetValue1:'5',targetDelay1:20},{states:{'switch.a':{state:'off'},'number.b':{state:'1'}}});});
    await page.locator('.material-action-button').click();await page.waitForFunction(()=>window.materialWrites.length===2);assert.deepEqual(await page.evaluate(()=>window.materialWrites),[['switch.a','on'],['number.b',5]]);
    await page.evaluate(()=>{document.querySelector('#material-proof').replaceChildren();window.materialWrites=[];const {multiStateMode,countTargets,...old}=window.materialManifest.widgets.find(w=>w.label==='Button State Multi').defaults;window.mountMaterial('Button State Multi',{...old,multiStateMode:undefined,state:'1',stateValues:'0;1;2'});});
    await page.locator('.material-action-button').click();assert.deepEqual(await page.evaluate(()=>window.materialWrites.at(-1)),['','2']);
    await page.evaluate(()=>{document.querySelector('#material-proof').replaceChildren();window.mountMaterial('Top App Bar',{navigationMode:'state',drawerLayout:'modal',countViews:2,viewLabel0:'A',viewLabel1:'B',viewParent0:'',viewParent1:'',viewIcon0:'mdi:home'});});
    await page.locator('.material-drawer-toggle').click();await page.locator('.material-drawer-item').nth(1).click();assert.equal(await page.evaluate(()=>window.materialWrites.at(-1)[1]),1);
    await page.evaluate(()=>{document.querySelector('#material-proof').replaceChildren();window.mountMaterial('Input',{materialLocale:'fr',inputMask:'##:##',appendIcon:'mdi:clock',inputLayout:'filled-shaped'});});
    assert.equal(await page.locator('.material-input-line input').getAttribute('pattern'),'[0-9][0-9]:[0-9][0-9]');assert.equal(await page.locator('.material-input-line img[data-icon="mdi:clock"]').count(),1);
    assert.equal(await page.locator('.material-input-clear').getAttribute('aria-label'),'Effacer le texte');
    const retained=await page.evaluate(()=>{
      document.querySelector('#material-proof').replaceChildren();const extra={id:'persist-proof',viewSelectionMode:'index',persistent:true,countViews:2,targetPage0:'A',targetPage1:'B',state:0};
      const context={surface:'persist-proof',pageUrl:id=>id?'about:blank':null};const first=window.makeMaterial('Advanced View in Widget 8',extra,context).node;document.querySelector('#material-proof').append(first);const frame=first.querySelector('iframe');frame.dataset.customState='keep';
      const second=window.makeMaterial('Advanced View in Widget 8',{...extra,state:1},context).node;return {sameRoot:first===second,sameFrame:second.querySelector('iframe')===frame,marker:frame.dataset.customState,hidden:first.querySelectorAll('section')[0].hidden};
    });assert.deepEqual(retained,{sameRoot:true,sameFrame:true,marker:'keep',hidden:true});
    if(process.env.MATERIAL_SCREENSHOT){await page.evaluate(()=>{const proof=document.querySelector('#material-proof');proof.replaceChildren();proof.style.background='#121214';for(const name of ['Checkbox','Switch','Button Toggle','Input','Slider','Slider Round','Progress','Progress Circular','Value','HTML Card','Bar Chart','Top App Bar'])window.mountMaterial(name,{designStyle:'material3',themeMode:'dark',state:name==='Switch'?'on':50,countViews:2,viewParent0:'',viewParent1:'',labelText:name,drawerLayout:'modal'});});await page.waitForTimeout(200);await page.screenshot({path:process.env.MATERIAL_SCREENSHOT,fullPage:false});}
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});

test('Studio integration preserves a live child frame during Material state updates',{skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER || undefined});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const manifest=JSON.parse(await readFile(process.env.MATERIAL_MANIFEST || '../ha-grafik-visual-studio-materialdesign/manifest.json','utf8'));
    const project=await(await page.request.get(new URL('api/project',url).href)).json();const main=project.pages[0];project.settings={...project.settings,autoSave:false};
    const widget=(name,id,extra={})=>{const definition=manifest.widgets.find(w=>w.label===name);return {...structuredClone(definition.defaults),type:definition.type,id,name,x:10,y:10,width:200,height:60,...extra};};
    main.widgets=[widget('Switch','actual-switch',{state:'off',x:100,y:120}),widget('Installed Version','actual-version',{x:100,y:200}),widget('Advanced View in Widget 8','actual-view',{state:0,persistent:true,countViews:2,targetPage0:'reference-a',targetPage1:'reference-b',viewSelectionMode:'index',x:400,y:100,width:500,height:400})];
    project.currentPageId=main.id;project.pages.push(...['a','b'].map(letter=>({id:'reference-'+letter,name:'Reference '+letter,page:{width:400,height:300,theme:'light',background:'#eee'},widgets:[]})));
    await page.route('**/api/widget-packages',route=>route.fulfill({json:{packages:[manifest]}}));
    await page.route('**/api/project?*',route=>route.fulfill({json:project}));
    await page.goto(new URL('?mode=runtime',url).href);await page.locator('#actual-view iframe').first().waitFor();
    await page.waitForFunction(()=>document.querySelector('#actual-view iframe')?.contentDocument?.readyState==='complete');
    await page.evaluate(()=>{window.retainedMaterialFrame=document.querySelector('#actual-view iframe');window.retainedMaterialFrame.contentWindow.materialMarker='keep';});
    await page.locator('#actual-switch .material-switch-track').click();await page.waitForFunction(()=>document.querySelector('#actual-switch input')?.checked);
    const state=await page.evaluate(()=>({same:window.retainedMaterialFrame===document.querySelector('#actual-view iframe'),marker:document.querySelector('#actual-view iframe').contentWindow.materialMarker,version:document.querySelector('#actual-version').textContent}));
    assert.equal(state.same,true);assert.equal(state.marker,'keep');assert.match(state.version,/1\.1\.0/);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
