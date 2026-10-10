import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const [locale,title,copy,custom,placeholder] of [['de','Deine Idee. Deine Blocks.','Kopieren','Block-/Template-Editor','Paket wählen …'],['en','Your idea. Your blocks.','Copy','Block/template editor','Choose package …'],['fr','Votre idée. Vos blocs.','Copier','Éditeur de blocs/modèles','Choisir un paquet …']]){
    const page=await browser.newPage({locale,viewport:{width:1700,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.addInitScript(locale=>localStorage.setItem('ugso-blocks-for-ha-language',locale),locale);
    await page.route('**/api/ha/*',route=>{
      const kind=new URL(route.request().url()).pathname.split('/').pop();
      return route.fulfill({json:{entities:{entities:[{entity_id:'light.flur',name:'Öffnen',domain:'light',state:'on',unit:''}]},actions:{actions:[{id:'light.turn_on',name:'Einschalten',domain:'light',domains:['light']}]},targets:{targets:{},unavailable:[]}}[kind]});
    });
    await page.goto('http://127.0.0.1:4180/');await page.waitForSelector('.blocklySvg');
    assert.equal(await page.locator('html').getAttribute('lang'),locale);
    assert.equal(await page.locator('h1').textContent(),title);assert.equal(await page.locator('#copy').textContent(),copy);
    await page.locator('#name').fill('Öffnen / Eigener Name');await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('Öffnen / Eigener Name'));
    const before=await page.locator('#yaml').textContent();
    await page.locator('#about').click();assert.ok(!(await page.locator('#about-dialog').textContent()).includes('Eigener Code')||locale==='de');await page.locator('#about-dialog button').click();
    await page.locator('[aria-controls="output-content"]').click();assert.equal(await page.locator('#output-toggle').getAttribute('aria-expanded'),'false');await page.locator('#output-toggle').click();
    await page.locator('#yaml-mode').selectOption('import');assert.equal(await page.locator('#yaml-input').getAttribute('aria-label'),{de:'YAML-Code zum Importieren',en:'YAML code to import',fr:'Code YAML à importer'}[locale]);
    await page.locator('#yaml-input').fill("alias: User data\ntriggers:\n  - trigger: time\n    at: '25:00:00'\nactions:\n  - delay: 1\n");await page.locator('#save').click();
    assert.match(await page.locator('#yaml-import-error').textContent(),{de:/Uhrzeit/,en:/Expected time/,fr:/Heure/}[locale]);
    await page.locator('#yaml-clear').click();await page.locator('#yaml-mode').selectOption('output');assert.equal(await page.locator('#yaml').textContent(),before);
    await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;const {Blockly}=await import(url);Blockly.getMainWorkspace().getAllBlocks(false).find(b=>b.type==='ugso_switch_action').getField('ENTITY').showEditor_();});
    assert.equal(await page.locator('.entity-result strong').textContent(),'Öffnen');await page.locator('#entity-cancel').click();
    assert.equal(await page.locator('#custom-editor-open').textContent(),custom);await page.locator('#custom-editor-open').click();
    assert.equal(await page.locator('#custom-installed option').first().textContent(),placeholder);
    await page.locator('#custom-field-add').click();await page.waitForTimeout(250);
    const controls=await page.locator('#custom-editor').evaluate(root=>[...root.querySelectorAll('button,label,h2,h3,summary,p')].map(el=>el.childNodes.length===1?el.textContent:'').join(' '));
    if(locale!=='de')assert.ok(!/Vorschau|herunterladen|Höchstens|Beschreibung|Abbrechen|Zuordnung|entfernen/.test(controls),controls);
    await page.locator('#custom-cancel').click();
    await page.locator('#jinja-import').click();await page.locator('#jinja-source').fill("{{ states('sensor.temperatur') }}");
    if(locale!=='de')assert.ok(!(await page.locator('#jinja-preview').textContent()).includes('Entitätswert'));
    await page.locator('#jinja-cancel').click();
    assert.equal(await page.locator('#yaml').textContent(),before);
    if(process.env.BLOCKS_UI_IMAGES){await mkdir(process.env.BLOCKS_UI_IMAGES,{recursive:true});await page.screenshot({path:resolve(process.env.BLOCKS_UI_IMAGES,locale+'.png'),fullPage:true});}
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);await page.close();console.log(locale+': full UI, dialogs, dynamic validation, protected names/YAML and mobile width passed.');
  }
}finally{await browser.close();}
