import test from "node:test";
import assert from "node:assert/strict";
import {weatherSize,weatherModel,weatherPixels,weatherPortActive} from "../web/industrial-weather.js";
import {hasSimpleOutput} from "../web/dock-points.js";
test("weather housing matches a two-row four-column bank including gaps",()=>{
 assert.deepEqual(weatherSize({height:130}),{width:262,height:130});assert.deepEqual(weatherSize({height:130,housingSpace:3}),{width:274,height:134});
 assert.deepEqual(weatherSize({width:326},"width"),{width:326,height:162});
});
test("weather uses today's forecast, sensor precedence, real units and explicit missing values",()=>{
 const now=new Date("2026-10-07T12:00:00"),states={"weather.home":{state:"rainy",attributes:{temperature:0,temperature_unit:"°F",humidity:80,wind_speed:2,wind_speed_unit:"m/s"},weatherForecasts:{daily:[{datetime:"2026-10-08T12:00:00",temperature:99},{datetime:"2026-10-07T12:00:00",temperature:12,templow:-3,precipitation_probability:0}]}},"sensor.temp":{state:"-20",attributes:{unit_of_measurement:"°C"}}};
 const model=weatherModel({entityId:"weather.home",temperatureEntityId:"sensor.temp"},states,now);
 assert.equal(model.icon,"rain");assert.deepEqual(model.temperature,{value:-20,unit:"°C"});assert.equal(model.rain.value,0);assert.equal(model.low.value,-3);assert.equal(model.high.value,12);assert.equal(model.wind.unit,"m/s");
 assert.equal(weatherModel({entityId:"weather.home",temperatureEntityId:"sensor.no"},states,now).temperature.value,null);
 delete states["weather.home"].weatherForecasts;assert.equal(weatherModel({entityId:"weather.home"},states,now).low.value,null);
 assert.equal(weatherModel({}).temperature.value,null);assert.equal(weatherModel({weatherDemo:true}).demo,true);
 assert.equal(weatherModel({entityId:"weather.home",weatherDemo:true},{},now).demo,false);
});
test("pixel conditions stay bounded and display exposes power input only",()=>{
 for(const icon of ["sun","moon","cloud","partly","rain","snow","storm","fog","wind","alert","unknown"]){const pixels=weatherPixels(icon);assert.ok(pixels.length>0);assert.ok(pixels.every(([x,y])=>x>=0 && x<16 && y>=0 && y<16));}
 const widget={type:"ugso.industrial/weather",displayInputEnabled:true};assert.equal(weatherPortActive(widget,"display-power","end"),true);assert.equal(weatherPortActive(widget,"display-power","start"),false);assert.equal(hasSimpleOutput(widget),false);
});
