import test from 'node:test';
import assert from 'node:assert/strict';
import { uiText, uiTranslations } from '../src/ui-locales.js';
import { uiErrors } from '../src/ui-errors.js';
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
