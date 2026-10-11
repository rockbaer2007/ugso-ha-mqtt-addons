import test from 'node:test';
import assert from 'node:assert/strict';
import { uiText, uiTranslations } from '../src/ui-locales.js';
import { uiErrors } from '../src/ui-errors.js';
import { readdirSync, readFileSync } from 'node:fs';
test('Application and error translations provide both supported non-German locales',()=>{
  for(const [source,translations] of Object.entries({...uiTranslations,...uiErrors})){
    assert.equal(translations.length,2,source);
    assert.ok(translations.every(text=>typeof text==='string'&&text.trim()),source);
  }
});
test('Dynamic UI statuses and nested validation preserve identifiers and counts',()=>{
  assert.equal(uiText('HA verbunden · 3714 Entitäten','en'),'HA connected · 3714 entities');
  assert.equal(uiText('Auslöser 1: Uhrzeit HH:MM oder HH:MM:SS erwartet.','fr'),'Déclencheur 1: Heure HH:MM ou HH:MM:SS attendue.');
  assert.equal(uiText('Funktion: Rekursion wird nicht unterstützt.','en'),'Function: Recursion is unsupported.');
  for(const locale of ['de','en','fr'])for(const text of ['sensor.temperatur','{{ states("sensor.test") }}','User supplied text'])assert.equal(uiText(text,locale),text);
});

test('German literal application notices, confirmations and errors have EN/FR translations',()=>{
  for(const file of readdirSync(new URL('../src/',import.meta.url)).filter(file=>file.endsWith('.js')&&!file.includes('locale')&&!file.includes('ui-errors'))){
    const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
    for(const match of source.matchAll(/(?:Error|notice|ask)\('([^'\n]+)'\)/g)){
      const text=match[1];
      if(!/[äöüß]|erwartet|fehlt|nicht|ungültig|gültig|Speich|wird|enthält|Keine|Höchstens/.test(text))continue;
      for(const locale of ['en','fr'])assert.notEqual(uiText(text,locale),text,file+': '+text+' ('+locale+')');
    }
  }
});
