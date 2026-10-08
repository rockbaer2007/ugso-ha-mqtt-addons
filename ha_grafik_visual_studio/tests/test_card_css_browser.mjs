import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const url=process.env.STUDIO_TEST_URL;

test('Calendar and Printer offer shared CSS groups and style the actual card surface', {skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try{
    const page=await browser.newPage({viewport:{width:1650,height:1050}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','de'));
    for(const [folder,name] of [['printer','ugso.printer'],['calendar-plus','ugso.calendar-plus']])await page.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':`${name}.wg`},data:await readFile(new URL(`../packages/${folder}/${name}.wg`,import.meta.url))});
    const packages=(await(await page.request.get(new URL('api/widget-packages',url).href)).json()).packages;
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.pages[0].widgets=['ugso.calendar-plus','ugso.printer'].map((id,index)=>{const def=packages.find(p=>p.id===id).widgets[0];return {...def.defaults,id:`card-${index}`,type:def.type,x:60+index*520,y:100,width:460,height:440};});
    fixture.currentPageId=fixture.pages[0].id;fixture.settings={...fixture.settings,autoSave:false};
    Object.assign(fixture.pages[0].page,{width:1400,height:900});let saved;
    await page.route('**/api/project*',route=>{if(route.request().method()==='PUT')saved=route.request().postDataJSON();return route.fulfill({json:saved||fixture});});
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities:[],states:[]}}));
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[]}}));
    await page.goto(url);
    for(let index=0;index<2;index++){
      await page.locator(`#card-${index}`).click({position:{x:10,y:10}});
      await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
      for(const label of ['CSS Allgemein','CSS Font & Text','CSS Hintergrund','CSS Ränder','CSS Schatten und Abstand']){
        const section=page.locator('#properties details').filter({has:page.locator('.property-section-title').getByText(label,{exact:true})});
        assert.equal(await section.count(),1);
        const enabled=section.locator('summary input[type=checkbox]');
        if(label!=='CSS Allgemein'){assert.equal(await enabled.isChecked(),false);await enabled.check();}
      }
      for(const [key,value] of [['textColor','#123456'],['fontFamily','monospace'],['fontSize','18'],['backgroundColor','#bada55'],['borderColor','#ff0000'],['borderWidth','3'],['radius','0'],['padding','12'],['boxShadow','rgb(0, 0, 0) 0px 3px 7px'],['marginLeft','9px']]){
        const input=page.locator(`#properties [data-property-key="${key}"]`);await input.fill(value);await input.dispatchEvent('input');
      }
      await page.locator('#properties [data-property-key="borderStyle"]').selectOption('solid');
      const root=page.locator(`#card-${index} > .widget-content > :first-child`);
      const style=await root.evaluate(node=>{const s=getComputedStyle(node);return {color:s.color,background:s.backgroundColor,font:s.fontFamily,size:s.fontSize,border:s.borderTopWidth,borderStyle:s.borderTopStyle,radius:s.borderRadius,padding:s.paddingTop,shadow:s.boxShadow};});
      assert.equal(style.color,'rgb(18, 52, 86)');assert.equal(style.background,'rgb(186, 218, 85)');
      assert.match(style.font,/monospace/);assert.equal(style.size,'18px');assert.equal(style.border,'3px');assert.equal(style.borderStyle,'solid');assert.equal(style.radius,'0px');assert.equal(style.padding,'12px');assert.notEqual(style.shadow,'none');
      assert.equal(await page.locator(`#card-${index}`).evaluate(node=>node.style.marginLeft),'9px');
      assert.equal(await page.locator(`#card-${index} > .widget-content`).evaluate(node=>getComputedStyle(node).borderTopWidth),'0px','no double border');
      const borderSection=page.locator('#properties details').filter({has:page.locator('.property-section-title').getByText('CSS Ränder',{exact:true})});
      await borderSection.locator('summary input[type=checkbox]').uncheck();
      assert.equal(await root.evaluate(node=>getComputedStyle(node).borderRadius),index===0?'20px':'14px','disabling CSS restores card default');
      await borderSection.locator('summary input[type=checkbox]').check();
    }
    await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('gespeichert'));
    assert.equal(saved.pages[0].widgets[0].radius,0);assert.equal(saved.pages[0].widgets[1].padding,12);
    await page.goto(new URL('runtime',url).href);
    for(let index=0;index<2;index++){
      const root=page.locator(`#card-${index} > .widget-content > :first-child`);
      assert.equal(await root.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(186, 218, 85)');
      assert.equal(await root.evaluate(node=>getComputedStyle(node).borderRadius),'0px');
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
