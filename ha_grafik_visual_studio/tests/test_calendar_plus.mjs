import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarPlusDiscover,calendarPlusSources,calendarPlusKey,calendarPlusRange,calendarPlusEvents,calendarPlusWhen,calendarPlusTileLayout} from '../web/calendar-plus.js';

test('tile fonts adapt to header third and remaining body without changing tile size',()=>{
  for(const size of ['tiny','small','medium','large']){
    const automatic=calendarPlusTileLayout({calendarIconSize:size});
    const large=calendarPlusTileLayout({calendarIconSize:size,calendarTileTopFontSize:72,calendarTileBottomFontSize:120});
    assert.equal(large.width,automatic.width);assert.equal(large.height,automatic.height);
    assert.ok(large.headerHeight<=large.height/3);
    assert.ok(large.top*1.05+2<=large.headerHeight+.001);
    assert.ok(large.bottom*1.2<=large.height-large.headerHeight+.001);
    assert.ok(large.bottom*1.3+4<=large.width+.001);
    assert.deepEqual(calendarPlusTileLayout({calendarIconSize:size,calendarTileTopFontSize:0,calendarTileBottomFontSize:0}),automatic);
  }
  const small=calendarPlusTileLayout({calendarTileTopFontSize:8,calendarTileBottomFontSize:16});
  assert.equal(small.top,8);assert.equal(small.bottom,16);
  assert.equal(small.headerHeight,10.4);
});

test('discovery includes registry and state-only calendars; all enabled by default, saved IDs stable',()=>{
  const entities=calendarPlusDiscover({entities:[{entity_id:'calendar.b',name:'B'},{entity_id:'calendar.disabled',disabled_by:'user'}],states:[{entity_id:'calendar.a',attributes:{friendly_name:'Familie'}},{entity_id:'calendar.disabled'},{entity_id:'sensor.no'}]});
  assert.deepEqual(entities.map(e=>e.entity_id),['calendar.a','calendar.b']);
  assert.equal(calendarPlusSources({},entities).length,2);
  const widget={[calendarPlusKey('calendar.a','Enabled')]:false,[calendarPlusKey('calendar.b','Color')]:'#123456'};
  assert.deepEqual(calendarPlusSources(widget,entities).map(s=>s.entityId),['calendar.b']);
  assert.equal(calendarPlusSources(widget,entities)[0].color,'#123456');
  const expanded=[{entity_id:'calendar.new'},...entities];
  assert.deepEqual(calendarPlusSources(widget,expanded).map(s=>s.entityId),['calendar.new','calendar.b']);
  assert.equal(calendarPlusSources({},Array.from({length:45},(_,i)=>({entity_id:`calendar.c${i}`}))).length,45);
});
test('range uses local midnight and calendar-day arithmetic across DST',()=>{
  const now=new Date(2026,9,24,10),range=calendarPlusRange({lookaheadDays:3},now);
  assert.equal(new Date(range.start).getHours(),0);assert.equal(new Date(range.end).getDate(),27);
  assert.equal(new Date(calendarPlusRange({lookaheadDays:100},now).end).getTime(),new Date(2027,0,22).getTime());
});
test('events merge chronologically, preserve details and reject bad/expired/exclusive-end records',()=>{
  const now=new Date(2026,9,8,10),sourceA={entityId:'calendar.a'},sourceB={entityId:'calendar.b'};
  const data={'calendar.a':[null,{summary:'All day',start:'2026-10-08',end:'2026-10-09',location:'Ort',description:'<b>Text</b>'},{summary:'Expired',start:'2026-10-07',end:'2026-10-08'},{summary:'Bad',start:'2026-02-30',end:'2026-03-01'}],
    'calendar.b':[{summary:'Later',start:'2026-10-09T10:00:00',end:'2026-10-09T11:00:00'},{summary:'Reverse',start:'2026-10-09',end:'2026-10-08'}]};
  const events=calendarPlusEvents(data,[sourceB,sourceA],now,new Date(2026,9,10));
  assert.deepEqual(events.map(e=>e.title),['All day','Later']);assert.equal(events[0].allDay,true);
  assert.equal(events[0].description,'<b>Text</b>');assert.equal(events[0].location,'Ort');
  assert.equal(calendarPlusEvents(data,[sourceA],new Date(2026,9,9)).length,0);
  assert.equal(calendarPlusWhen(events[0],'de',now),'Läuft');assert.equal(calendarPlusWhen(events[1],'en',now),'Tomorrow');
});
