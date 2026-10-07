import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {heatingSize,heatingModel,heatingBoolean,heatingBindings,HEATING_ART} from "../web/industrial-heating.js";
import {hasSimpleOutput,dockPointActive} from "../web/dock-points.js";
test("the overlay coordinate system uses the actual PNG source dimensions",()=>{
 const png=readFileSync(new URL("../web/assets/industrial/heating-system-return.png",import.meta.url));
 assert.equal(png.readUInt32BE(16),HEATING_ART.width);assert.equal(png.readUInt32BE(20),HEATING_ART.height);
});
test("heating keeps the 7:4 raster and migrates both prior layouts at the same cell size",()=>{
 assert.deepEqual(heatingSize({height:518,housingSpace:1}),{width:908,height:518});
 assert.deepEqual(heatingSize({width:460,housingSpace:1},"width"),{width:460,height:262});
 assert.deepEqual(heatingSize({height:12,housingSpace:0}),{width:448,height:256});
 assert.deepEqual(heatingSize({width:518,height:778,housingSpace:1}),{width:908,height:518});
 assert.deepEqual(heatingSize({width:778,height:518,housingSpace:1,heatingLayout:"landscape"}),{width:908,height:518});
 assert.deepEqual(heatingSize({width:908,height:1162,housingSpace:1,heatingLayout:"reference"}),{width:2035,height:1162});
 for(const housingSpace of [0,1,32,64]){const size=heatingSize({height:99999,housingSpace});assert.ok(size.width<=4096 && size.height<=4096);assert.equal((size.width-12*housingSpace)/7,(size.height-6*housingSpace)/4);}
});
test("live readings remain unknown without bindings; demo never replaces unavailable entities",()=>{
 assert.equal(heatingModel({}).tank.value,null);assert.equal(heatingModel({}).pump.value,null);
 const data=heatingModel({heatingDemo:true,boilerEntityId:"sensor.boiler",pumpEntityId:"binary_sensor.pump"},{"sensor.boiler":{state:"unavailable"},"binary_sensor.pump":{state:"off"}});
 assert.equal(data.boiler.value,null);assert.equal(data.pump.value,false);assert.equal(data.tank.level,65);
 assert.equal(heatingModel({coldEntityId:"sensor.cold"},{"sensor.cold":{state:"-4.2",attributes:{unit_of_measurement:"°F"}}}).cold.unit,"°F");
 for(const value of ["",null,"unknown","unavailable","Infinity","abc"]){assert.equal(heatingModel({tankEntityId:"sensor.tank"},{"sensor.tank":{state:value}}).tank.value,null);}
});
test("boolean values, tank bounds and independent ten entity bindings",()=>{
 for(const value of [true,1,"on","true","1"])assert.equal(heatingBoolean(value),true);
 for(const value of [false,0,"off","false","0"])assert.equal(heatingBoolean(value),false);
 assert.equal(heatingBoolean("unavailable"),null);
 for(const [state,level] of [["-10",0],["65",65],["130",100]])assert.equal(heatingModel({tankEntityId:"sensor.tank"},{"sensor.tank":{state}}).tank.level,level);
 const widget={type:"ugso.industrial/heating",...Object.fromEntries(["heating","boiler","hot","cold","return","pump","circulation","burner","alert","tank"].map(key=>[`${key}EntityId`,`sensor.${key}`]))};
 assert.equal(heatingBindings(widget).length,10);assert.equal(hasSimpleOutput(widget),false);assert.equal(dockPointActive(widget,"left-center"),false);
 assert.equal(heatingModel({returnEntityId:"sensor.return"},{"sensor.return":{state:"40.2"}}).return.value,40.2);
});
