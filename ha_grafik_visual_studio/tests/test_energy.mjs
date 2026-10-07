import test from 'node:test';
import assert from 'node:assert/strict';
import {energyBalance,energyBattery,energyBuckets,energyCosts,energyPeriod,energyPrices,energyBindings} from '../web/energy.js';
const states=values=>Object.fromEntries(Object.entries(values).map(([key,state])=>['sensor.'+key,{state:String(state)}]));
test('balance respects signed grid, separate export, units and unknown/zero denominators',()=>{
 const w={productionEntityId:'sensor.pv',gridEntityId:'sensor.net'};
 let b=energyBalance(w,states({pv:1000,net:-200}));assert.equal(b.house,800);assert.equal(b.autarky,100);assert.equal(b.selfUse,80);
 b=energyBalance({...w,exportEntityId:'sensor.out'},states({pv:1000,net:300,out:100}));assert.equal(b.house,1200);assert.equal(b.autarky,75);assert.equal(b.selfUse,90);
 assert.equal(energyBalance(w,states({pv:0,net:0})).selfUse,null);assert.equal(energyBalance(w,states({pv:1000,net:'unknown'})).house,null);
 assert.equal(energyBalance({...w,productionFactor:0.001},states({pv:1000,net:0})).production,1);
});
test('battery charging, discharge, sign inversion, unknown and W/kW conversion',()=>{
 const w={socEntityId:'sensor.soc',powerEntityId:'sensor.power',capacity:10,chargingPositive:true,powerUnit:'W'};
 assert.equal(energyBattery(w,states({soc:60,power:2000})).remaining,2);
 assert.equal(energyBattery(w,states({soc:60,power:-2000})).remaining,3);
 assert.equal(energyBattery({...w,chargingPositive:false},states({soc:60,power:2000})).charging,false);
 assert.equal(energyBattery({...w,powerUnit:'kW'},states({soc:60,power:2})).remaining,2);
 assert.equal(energyBattery(w,states({soc:'unavailable',power:2000})).stored,null);
 assert.equal(energyBattery(w,states({soc:60,power:0})).remaining,null);
});
test('calendar boundaries include leap years and local week/month edges',()=>{
 assert.equal(energyPeriod('month','2024-02-15').edges.length,30);
 assert.equal(energyPeriod('year','2024-02-15').edges.length,13);
 const week=energyPeriod('week','2026-10-07');assert.equal(week.start.getDay(),1);assert.equal(week.edges.length,8);
});
test('counter history preserves unknown/reset gaps and partial current bucket; sum is separate',()=>{
 const range={start:new Date(0),end:new Date(3000),edges:[0,1000,2000,3000].map(x=>new Date(x))};
 assert.deepEqual(energyBuckets([{x:0,y:10},{x:900,y:13},{x:1800,y:15},{x:2500,y:16}],range).map(p=>p.y),[3,2,1]);
 assert.deepEqual(energyBuckets([{x:0,y:10},{x:900,y:null},{x:1800,y:15},{x:2500,y:16}],range).map(p=>p.y),[null,null,1]);
 assert.deepEqual(energyBuckets([{x:0,y:10},{x:900,y:2},{x:1800,y:5}],range,'counter',1,1500).map(p=>p.y),[null,0,null]);
 assert.deepEqual(energyBuckets([{x:0,y:2},{x:900,y:3},{x:1800,y:5}],range,'sum').map(p=>p.y),[5,5,null]);
 assert.deepEqual(energyBuckets([],range).map(p=>p.y),[null,null,null]);
});
test('price schemas preserve negative and zero prices, timestamps, factors and malformed data',()=>{
 const now=new Date('2026-10-07T12:00:00Z');
 assert.deepEqual(energyPrices({prices:[{startsAt:'2026-10-07T12:00:00Z',total:-.04},{start_timestamp:1791378000,marketprice:0}]},{priceFactor:100},now).map(p=>p.y),[-4,0]);
 assert.equal(energyPrices('not JSON',{},now).length,0);
 assert.equal(energyPrices([{x:'bad',y:1}],{},now).length,0);
 assert.equal(energyPrices([0,-1,2],{priceFactor:1},now).length,3);
 assert.equal(energyPrices([{when:'2026-10-07T12:00:00Z',cost:20}],{timeKey:'when',priceKey:'cost',priceFactor:.1},now)[0].y,2);
});
test('cost calculation never replaces missing required source with zero; sources include secondary node',()=>{
 assert.equal(energyCosts(10,2,{price:.3,feedPrice:.1,baseFee:.5,exportEntityId:'sensor.out'},2),3.8);
 assert.equal(energyCosts(10,null,{price:.3,exportEntityId:'sensor.out'}),null);
 assert.equal(energyCosts(null,0,{price:.3}),null);
 assert.deepEqual(energyBindings({houseEntityId:'sensor.a',node1EntityId:'sensor.b',node1SecondEntityId:'sensor.c',gridEntityId:'sensor.a'}),['sensor.a','sensor.b','sensor.c']);
});
