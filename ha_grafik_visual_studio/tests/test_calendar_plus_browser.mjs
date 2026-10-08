import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import '../web/widget-sets/core.js';
import {getWidgetDefinition} from '../web/widget-registry.js';
const url=process.env.STUDIO_TEST_URL;

test('Calendar + discovers all sources, persists visibility/colors, renders events and details in DE/EN', {skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage({viewport:{width:1550,height:1050}}),errors=[],requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','de'));
    await page.clock.install({time:new Date('2026-10-08T10:00:00+02:00')});
    const installed=await page.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':'ugso.calendar-plus.wg'},data:await readFile(new URL('../packages/calendar-plus/ugso.calendar-plus.wg',import.meta.url))});
    assert.ok(installed.ok()||/bereits installiert/.test(await installed.text()));
    const catalog=await(await page.request.get(new URL('api/widget-packages',url).href)).json();
    const def=catalog.packages.find(p=>p.id==='ugso.calendar-plus').widgets[0];
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.pages[0].widgets=[{...def.defaults,type:def.type,id:'calendar-test',x:320,y:120,width:520,height:620,showCalendarName:true,showDate:true,showLocation:true}];
    fixture.pages[0].widgets.push({...getWidgetDefinition('sensor').defaults,id:'live-sensor',type:'sensor',entityId:'sensor.calendar_test',x:900,y:80,width:160,height:100});
    fixture.currentPageId=fixture.pages[0].id;fixture.settings={...fixture.settings,autoSave:false};
    Object.assign(fixture.pages[0].page,{width:1350,height:950});
    let saved,fail=false,empty=false,extra=false,discoverFail=false,sensorValue='1';
    const calendars={
      'calendar.family':[{summary:'Familienausflug',start:'2026-10-09',end:'2026-10-10',location:'Stadtpark',description:'Picknick mit der Familie'},{summary:'<img src=x onerror=alert(1)>',start:'2026-10-10',end:'2026-10-11'}],
      'calendar.garden':[{summary:'Garten bewässern',start:'2026-10-08T18:00:00+02:00',end:'2026-10-08T19:00:00+02:00'}],
      'calendar.waste':[{summary:'Papiertonne',start:'2026-10-09',end:'2026-10-10'}],
      'calendar.new':[{summary:'Neuer Kalender',start:'2026-10-11',end:'2026-10-12'}],
    };
    await page.route('**/api/entities*',route=>route.fulfill(discoverFail?{status:503,json:{error:'discovery failed'}}:{json:{entities:[{entity_id:'calendar.family',name:'Familie'},{entity_id:'calendar.garden',name:'Garten'},...(extra?[{entity_id:'calendar.new',name:'Neu'}]:[])],states:[{entity_id:'calendar.waste',state:'off',attributes:{friendly_name:'Müllabfuhr'}}]}}));
    await page.route('**/api/project*',route=>{if(route.request().method()==='PUT')saved=route.request().postDataJSON();return route.fulfill({json:saved||fixture});});
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[{entity_id:'sensor.calendar_test',state:sensorValue,attributes:{}}]}}));
    await page.route('**/api/calendar-events*',route=>{
      const ids=new URL(route.request().url()).searchParams.getAll('entity_id');requests.push(ids);
      return route.fulfill(fail?{status:503,json:{error:'test unavailable'}}:{json:{calendars:Object.fromEntries(ids.map(id=>[id,empty?[]:calendars[id]||[]]))}});
    });
    await page.goto(url);
    await page.waitForFunction(()=>document.querySelectorAll('#calendar-test .cp-list .cp-event').length===4);
    assert.ok(requests.some(ids=>ids.length===3),'registry and state-only calendars enabled automatically');
    assert.match(await page.locator('#calendar-test .cp-list .cp-event-title').first().textContent(),/Garten/);
    assert.equal(await page.locator('#calendar-test .cp-list img').count(),0,'titles are plain text');
    await page.locator('#calendar-test').click({position:{x:10,y:10}});
    await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
    const family=page.locator('#properties details').filter({has:page.locator('summary .property-section-title').getByText('Familie',{exact:true})});
    const garden=page.locator('#properties details').filter({has:page.locator('summary .property-section-title').getByText('Garten',{exact:true})});
    assert.equal(await family.locator('summary input[type="checkbox"]').isChecked(),true);
    assert.equal(await family.locator('summary input[type="checkbox"]').isVisible(),true);
    assert.equal(await family.locator('summary button').count(),0);
    assert.equal(await page.locator('#properties summary').getByText('Kacheleinstellungen',{exact:true}).count(),1);
    for(const [size,width,height] of [['tiny',36,44],['small',44,52],['medium',58,64],['large',76,82]]){
      await page.locator('#properties [data-property-key="calendarIconSize"]').selectOption(size);
      await page.waitForFunction(([width,height])=>{const tile=document.querySelector('#calendar-test .cp-date');return tile&&tile.offsetWidth===width&&tile.offsetHeight===height;},[width,height]);
      const fonts=await page.locator('#calendar-test .cp-date').first().evaluate(tile=>[parseFloat(getComputedStyle(tile.querySelector('.cp-month')).fontSize),parseFloat(getComputedStyle(tile.querySelector('.cp-day')).fontSize)]);
      assert.ok(fonts[0]>=12&&fonts[1]>=24,'smallest tile remains readable');
    }
    await page.locator('#properties [data-property-key="calendarIconSize"]').selectOption('small');
    await page.locator('#properties [data-property-key="calendarTileTopFontSize"]').fill('72');
    await page.locator('#properties [data-property-key="calendarTileBottomFontSize"]').fill('120');
    for(const size of ['tiny','small','medium','large']){
      await page.locator('#properties [data-property-key="calendarIconSize"]').selectOption(size);
      const geometry=await page.locator('#calendar-test .cp-date').first().evaluate(tile=>{
        const header=tile.querySelector('.cp-month'),day=tile.querySelector('.cp-day');
        return {height:tile.getBoundingClientRect().height,header:header.getBoundingClientRect().height,dayHeight:day.clientHeight,dayScroll:day.scrollHeight,headerFont:parseFloat(getComputedStyle(header).fontSize)};
      });
      assert.ok(geometry.header<=geometry.height/3+.1,'colored header is at most one third');
      assert.ok(geometry.headerFont*1.05+2<=geometry.header+.1,'top font fits header');
      assert.ok(geometry.dayScroll<=geometry.dayHeight+1,`bottom font fits remaining tile: ${size} ${JSON.stringify(geometry)}`);
    }
    await page.locator('#properties [data-property-key="calendarIconSize"]').selectOption('small');
    await page.locator('#properties [data-property-key="calendarTileTopFontSize"]').fill('12');
    await page.locator('#properties [data-property-key="calendarTileBottomFontSize"]').fill('20');
    await page.locator('#properties [data-property-key="calendarAutoRefresh"]').uncheck();
    assert.equal(await page.locator('[data-property-key="calendarCount"]').count(),0,'no manual calendar count');
    assert.equal(await page.locator('#properties [data-property-key="dataOutputEnabled"], #properties [data-property-key="dataInputEnabled"]').count(),0,'calendar has no data-flow settings');
    await family.locator('[data-property-key="cpColor_calendar_family"]').fill('#ffe52b');
    await family.locator('[data-property-key="cpColor_calendar_family"]').dispatchEvent('input');
    await garden.locator('summary input[type="checkbox"]').uncheck();
    await page.waitForFunction(()=>document.querySelectorAll('#calendar-test .cp-list .cp-event').length===3);
    assert.equal(await garden.locator('summary input[type="checkbox"]').isChecked(),false);
    await page.locator('#save').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('gespeichert'));
    assert.equal(saved.pages[0].widgets[0].cpEnabled_calendar_garden,false);
    assert.equal(saved.pages[0].widgets[0].cpColor_calendar_family,'#ffe52b');
    assert.equal(saved.pages[0].widgets[0].calendarIconSize,'small');
    assert.equal(saved.pages[0].widgets[0].calendarTileTopFontSize,12);
    assert.equal(saved.pages[0].widgets[0].calendarTileBottomFontSize,20);
    assert.equal(saved.pages[0].widgets[0].calendarAutoRefresh,false);
    const projectUrl=new URL('api/project?project=calendar-plus-integration-test',url).href;
    assert.ok((await page.request.put(projectUrl,{data:saved})).ok(),'backend accepts dynamic per-calendar settings');
    const persisted=await(await page.request.get(projectUrl)).json();
    assert.equal(persisted.pages[0].widgets[0].cpEnabled_calendar_garden,false);
    assert.equal(persisted.pages[0].widgets[0].cpColor_calendar_family,'#ffe52b');
    await page.goto(new URL('runtime',url).href);
    await page.waitForFunction(()=>document.querySelectorAll('#calendar-test .cp-list .cp-event').length===3);
    await page.evaluate(()=>window.calendarRoot=document.querySelector('#calendar-test .calendar-plus'));
    const beforeDisabled=requests.length;sensorValue='2';
    await page.clock.runFor(125000);
    await page.waitForFunction(()=>document.querySelector('#live-sensor')?.textContent.includes('2'));
    assert.equal(requests.length,beforeDisabled,'disabled automatic refresh performs no further event reads');
    assert.equal(await page.evaluate(()=>window.calendarRoot===document.querySelector('#calendar-test .calendar-plus')),true,'unrelated sensor updates retain calendar DOM');
    assert.equal(await page.locator('#calendar-test').evaluate(node=>parseFloat(node.style.left)),320);
    assert.equal(await page.locator('#calendar-test').evaluate(node=>parseFloat(node.style.top)),120);
    assert.equal(await page.locator('#calendar-test .cp-list .cp-event').first().evaluate(node=>node.style.getPropertyValue('--cp-event-color')),'#ffe52b');
    await page.locator('#calendar-test .cp-footer').click();
    assert.equal(await page.locator('#calendar-test dialog').evaluate(node=>node.open),true);
    assert.equal(await page.locator('#calendar-test .cp-details .cp-date').first().evaluate(node=>node.offsetWidth),44);
    assert.equal(await page.locator('#calendar-test .cp-details .cp-day').first().evaluate(node=>getComputedStyle(node).fontSize),'20px');
    assert.match(await page.locator('#calendar-test .cp-details').textContent(),/Picknick mit der Familie/);
    assert.match(await page.locator('#calendar-test .cp-details').textContent(),/Stadtpark/);
    assert.equal(await page.locator('#calendar-test .cp-details img').count(),0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#calendar-test dialog').evaluate(node=>node.open),false);
    extra=true;
    await page.locator('#calendar-test .calendar-plus > .cp-header button').click();
    await page.waitForFunction(()=>document.querySelectorAll('#calendar-test .cp-list .cp-event').length===4);
    assert.ok(requests.at(-1).includes('calendar.new'),'new calendars enabled automatically');
    assert.ok(!requests.at(-1).includes('calendar.garden'),'saved exclusion remains');
    if(process.env.STUDIO_ARTIFACT_DIR){
      calendars['calendar.family'][1].summary='Geburtstag';
      await page.locator('#calendar-test .calendar-plus > .cp-header button').click();
      await page.waitForFunction(()=>document.querySelector('#calendar-test .cp-list').textContent.includes('Geburtstag'));
      await mkdir(process.env.STUDIO_ARTIFACT_DIR,{recursive:true});await page.locator('#calendar-test').screenshot({path:join(process.env.STUDIO_ARTIFACT_DIR,'calendar-plus.png')});
    }
    fail=true;await page.locator('#calendar-test .calendar-plus > .cp-header button').click();
    await page.waitForFunction(()=>document.querySelector('#calendar-test .cp-notice').textContent.includes('konnten nicht'));
    assert.equal(await page.locator('#calendar-test .cp-list .cp-event').count(),0);
    fail=false;empty=true;await page.locator('#calendar-test .calendar-plus > .cp-header button').click();
    await page.waitForFunction(()=>document.querySelector('#calendar-test .cp-notice').textContent==='Keine kommenden Termine');
    empty=false;discoverFail=true;await page.locator('#calendar-test .calendar-plus > .cp-header button').click();
    await page.waitForFunction(()=>document.querySelector('#calendar-test .cp-notice').textContent.includes('konnten nicht'));
    discoverFail=false;
    saved.pages[0].widgets[0].calendarAutoRefresh=true;
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#calendar-test .cp-list .cp-event').length===4);
    await page.evaluate(()=>window.calendarRoot=document.querySelector('#calendar-test .calendar-plus'));
    await page.locator('#calendar-test .cp-footer').click();
    const beforeEnabled=requests.length;
    await page.clock.runFor(61000);
    await page.waitForFunction(()=>!document.querySelector('#calendar-test .calendar-plus > .cp-header button').disabled);
    assert.ok(requests.length>beforeEnabled,'enabled automatic refresh fetches new events');
    assert.equal(await page.evaluate(()=>window.calendarRoot===document.querySelector('#calendar-test .calendar-plus')),true);
    assert.equal(await page.locator('#calendar-test dialog').evaluate(node=>node.open),true,'refresh keeps popup open');
    await page.keyboard.press('Escape');
    await page.goto(url);await page.waitForFunction(()=>document.querySelectorAll('#calendar-test .cp-list .cp-event').length===4);
    await page.locator('#calendar-test').click({position:{x:10,y:10}});
    await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
    for(const [key,value] of [['width','260'],['height','180']])await page.locator(`#properties [data-property-key="${key}"]`).fill(value);
    assert.ok(await page.locator('#calendar-test .calendar-plus').evaluate(node=>node.scrollWidth<=node.clientWidth+1&&node.scrollHeight<=node.clientHeight+1),'minimum size has a scrollable list without outer overflow');
    await page.locator('#properties [data-property-key="showEmptyDays"]').check();
    await page.waitForFunction(()=>document.querySelectorAll('#calendar-test .cp-empty-day').length>0);
    await page.locator('#properties [data-property-key="unfoldEvents"]').uncheck();
    assert.equal(await page.locator('#calendar-test .cp-list .cp-event').count(),1);
    await page.locator('#properties [data-property-key="showTime"]').uncheck();
    assert.doesNotMatch(await page.locator('#calendar-test .cp-list .cp-time').textContent(),/Ganztägig/);
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','en'));
    await page.goto(new URL('runtime',url).href);
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#calendar-test .cp-list')?.textContent.includes('All day'));
    assert.match(await page.locator('#calendar-test .cp-list').textContent(),/All day/);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});

test('all 43 calendars are queried in supported batches and hidden-all remains distinct from empty', {skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage(),requests=[];
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','de'));
    const packages=await(await page.request.get(new URL('api/widget-packages',url).href)).json();
    const def=packages.packages.find(p=>p.id==='ugso.calendar-plus').widgets[0];
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    const widget={...def.defaults,type:def.type,id:'many-calendars',x:80,y:80};
    const entities=Array.from({length:43},(_,i)=>({entity_id:`calendar.c${String(i).padStart(2,'0')}`,name:`Calendar ${i}`}));
    fixture.pages[0].widgets=[widget];fixture.currentPageId=fixture.pages[0].id;
    await page.route('**/api/project*',route=>route.fulfill({json:fixture}));
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities,states:[]}}));
    await page.route('**/api/calendar-events*',route=>{
      const ids=new URL(route.request().url()).searchParams.getAll('entity_id');requests.push(ids);
      return route.fulfill({json:{calendars:Object.fromEntries(ids.map(id=>[id,[]]))}});
    });
    await page.goto(new URL('runtime',url).href);
    await page.waitForFunction(()=>document.querySelector('#many-calendars .cp-notice')?.textContent==='Keine kommenden Termine');
    assert.deepEqual(requests.map(ids=>ids.length),[20,20,3]);
    assert.equal(new Set(requests.flat()).size,43);
    for(const entity of entities)widget[`cpEnabled_${entity.entity_id.replace('.','_')}`]=false;
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#many-calendars .cp-notice')?.textContent==='Alle Kalender ausgeblendet');
    assert.equal(requests.length,3,'hidden calendars are not queried');
  } finally {await browser.close();}
});
