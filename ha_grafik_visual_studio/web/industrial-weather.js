import { finite } from "./gauges.js";
import { housingSpace } from "./housing-snap.js";
import { lcdPower } from "./industrial-lcd.js";
import { lcdGlyph } from "./lcd-font.js";

export const isIndustrialWeather=widget=>widget?.type==="ugso.industrial/weather";
export const weatherAnchors=[["display-power","Ein/Aus",.5,0]];
export const weatherPortActive=(widget,anchor,side="")=>widget.displayInputEnabled===true && anchor==="display-power" && side!=="start";
export const weatherBindings=widget=>[widget.entityId,widget.displayEntityId,...["temperature","humidity","wind","rain","low","high"].map(key=>widget[`${key}EntityId`])].filter(Boolean);
export function weatherSize(widget,changed="height") {
  const space=housingSpace(widget),height=changed==="width"?(Number(widget.width)-2*space)/2:Number(widget.height)||130;
  const cell=Math.max(64,Math.min(Math.floor((4096-6*space)/4),Math.round((height-2*space)/2)));
  return {width:cell*4+6*space,height:cell*2+2*space};
}
const CONDITIONS={sunny:["SONNIG","SUNNY","sun"],"clear-night":["KLARE NACHT","CLEAR NIGHT","moon"],cloudy:["BEWÖLKT","CLOUDY","cloud"],partlycloudy:["TEILS WOLKIG","PARTLY CLOUDY","partly"],rainy:["REGEN","RAIN","rain"],pouring:["STARKREGEN","HEAVY RAIN","rain"],snowy:["SCHNEE","SNOW","snow"],"snowy-rainy":["SCHNEEREGEN","SLEET","snow"],hail:["HAGEL","HAIL","snow"],lightning:["GEWITTER","THUNDER","storm"],"lightning-rainy":["GEWITTER","THUNDERSTORM","storm"],fog:["NEBEL","FOG","fog"],windy:["WINDIG","WINDY","wind"],"windy-variant":["WINDIG","WINDY","wind"],exceptional:["EXTREMWETTER","EXCEPTIONAL","alert"]};
export function weatherModel(widget,states={},now=new Date(),locale="de") {
  const demo=!widget.entityId && widget.weatherDemo===true,record=demo?{state:"partlycloudy",attributes:{temperature:18.6,temperature_unit:"°C",humidity:64,wind_speed:12,wind_speed_unit:"km/h"}}:states[widget.entityId];
  const valid=record?.state && !/^(unknown|unavailable)$/i.test(record.state),attrs=valid?record.attributes||{}:{};
  const forecasts=record?.weatherForecasts?.daily ?? attrs.forecast;
  const today=(Array.isArray(forecasts)?forecasts:[]).find(row=>{const date=new Date(row.datetime);return Number.isFinite(date.getTime()) && date.toDateString()===now.toDateString();}) || {};
  const value=(key,raw,unit="")=>{const id=widget[`${key}EntityId`],sensor=states[id];return {value:finite(id?sensor?.state:raw),unit:String(id?sensor?.attributes?.unit_of_measurement||unit:unit)};};
  const temperature=value("temperature",attrs.temperature,attrs.temperature_unit||""),humidity=value("humidity",attrs.humidity,"%"),wind=value("wind",attrs.wind_speed,attrs.wind_speed_unit||"");
  const rain=value("rain",demo?35:today.precipitation_probability,"%"),low=value("low",demo?12:today.templow,attrs.temperature_unit||""),high=value("high",demo?22:today.temperature,attrs.temperature_unit||"");
  const condition=valid?CONDITIONS[record.state]:null,english=locale.startsWith("en");
  return {temperature,humidity,wind,rain,low,high,condition:condition?.[english?1:0] || (english?"NO WEATHER":"KEIN WETTER"),icon:condition?.[2]||"unknown",demo};
}
// Original 16x16 pixel artwork. Coordinates are compiled into a tiny bitmap.
export function weatherPixels(kind) {
  const pixels=new Set(),dot=(x,y)=>{if(x>=0 && x<16 && y>=0 && y<16)pixels.add(`${x},${y}`);};
  const line=(x1,y1,x2,y2)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i++)dot(Math.round(x1+(x2-x1)*i/(n||1)),Math.round(y1+(y2-y1)*i/(n||1)));};
  const sun=()=>{for(let y=3;y<=9;y++)for(let x=3;x<=9;x++)if(Math.hypot(x-6,y-6)<=3.3)dot(x,y);for(const [a,b,c,d] of [[6,0,6,1],[6,11,6,12],[0,6,1,6],[11,6,12,6],[1,1,2,2],[10,10,11,11],[1,11,2,10],[10,2,11,1]])line(a,b,c,d);};
  const cloud=()=>{for(let y=5;y<=10;y++)for(let x=1;x<=14;x++)if(y>=8 || (x>=4 && x<=8 && y>=5) || (x>=9 && x<=12 && y>=6))dot(x,y);};
  if(["sun","partly"].includes(kind))sun();
  if(["cloud","partly","rain","snow","storm"].includes(kind))cloud();
  if(kind==="rain")for(const x of [3,7,11])line(x,12,x-1,14);
  if(kind==="snow")for(const x of [3,8,13]){line(x,12,x,15);line(x-1,13,x+1,13);}
  if(kind==="storm"){line(8,10,5,13);line(5,13,9,13);line(9,13,6,15);}
  if(kind==="moon")for(let y=1;y<14;y++)for(let x=2;x<14;x++)if(Math.hypot(x-7,y-7)<6 && Math.hypot(x-10,y-4)>5)dot(x,y);
  if(kind==="fog")for(const y of [4,8,12])line(1,y,14,y);
  if(kind==="wind")for(const y of [4,8,12]){line(1,y,12,y);line(12,y,14,y-1);}
  if(kind==="alert"){line(7,1,1,13);line(1,13,14,13);line(14,13,7,1);line(7,5,7,8);dot(7,11);}
  if(kind==="unknown"){line(4,2,11,2);line(11,2,11,6);line(11,6,7,9);dot(7,12);}
  return [...pixels].map(point=>point.split(",").map(Number));
}
const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||"")?value:fallback;
export function renderIndustrialWeather(widget,doc,{states={},powerInput,locale="de",now=new Date()}={}) {
  const model=weatherModel(widget,states,now,locale),power=lcdPower(widget,states,powerInput),lcd=widget.weatherMode!=="led",style=widget.industrialStyle!==false;
  const root=doc.createElement("div");root.className="industrial-weather";root.dataset.mode=lcd?"lcd":"led";root.dataset.power=power===null?"unknown":power?"on":"off";root.dataset.condition=model.icon;root.classList.toggle("industrial-housing",style);
  root.style.borderRadius=`${Math.max(0,Math.min(200,Number(widget.radius??4)||0))}px`;root.style.borderColor=color(widget.industrialFrameColor,"#879097");root.style.borderWidth=`${style?widget.industrialFrameWidthEnabled===true?Math.max(1,Math.min(16,Number(widget.industrialFrameWidth)||2)):2:0}px`;
  root.style.setProperty("--weather-color",color(widget[lcd?"weatherLcdColor":"weatherLedColor"],lcd?"#182a15":"#42a5f5"));root.style.setProperty("--weather-background",lcd?color(widget.weatherLcdBackground,"#8a9b61"):"#080b0d");
  if(style && widget.industrialScrewsEnabled!==false)for(const corner of ["tl","tr","bl","br"]){const screw=doc.createElement("span");screw.className=`industrial-screw ${corner}`;screw.textContent="×";root.append(screw);}
  const screen=doc.createElement("div");screen.className="industrial-weather-screen";const svg=doc.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 160 76");svg.setAttribute("preserveAspectRatio","xMidYMid meet");svg.setAttribute("role","img");
  const rect=(x,y,size)=>{const el=doc.createElementNS(svg.namespaceURI,"rect");for(const [key,value] of Object.entries({x,y,width:size,height:size}))el.setAttribute(key,String(value));return el;};
  const labels=[],text=(value,x,y,scale=1,max=26)=>{labels.push(value);const group=doc.createElementNS(svg.namespaceURI,"g");group.dataset.text=value;Array.from(value).slice(0,max).forEach((char,i)=>lcdGlyph(char).forEach((bits,row)=>{for(let col=0;col<5;col++)if(bits & (1<<(4-col)))group.append(rect(x+(i*6+col)*scale,y+row*scale,.86*scale));}));svg.append(group);};
  const reading=(entry,decimals=0)=>entry.value==null?"--":`${entry.value.toFixed(decimals)}${entry.unit?` ${entry.unit}`:""}`;
  if(power===true){
    const icon=doc.createElementNS(svg.namespaceURI,"g");icon.dataset.icon=model.icon;for(const [x,y] of weatherPixels(model.icon))icon.append(rect(3+x*1.6,3+y*1.6,1.4));svg.append(icon);
    text(reading(model.temperature,1),34,7,2,10);text(model.demo?"DEMO":model.condition,3,32,1,25);
    text(`${locale.startsWith("en")?"HUM":"FEUCHTE"} ${reading(model.humidity)}`,3,45,1,25);text(`WIND ${reading(model.wind,1)}`,3,56,1,25);
    if(widget.weatherRain!==false)text(`${locale.startsWith("en")?"RAIN":"REGEN"} ${reading(model.rain)}`,3,67,.8,18);
    if(widget.weatherMinMax!==false)text(`${reading(model.low)} / ${reading(model.high)}`,92,67,.8,13);
  }
  svg.setAttribute("aria-label",power===true?labels.join("; "):"OFF");root.title=labels.join("\n");screen.append(svg);root.append(screen);return root;
}
