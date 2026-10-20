const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.existsSync(path.resolve(__dirname,'../app')) ? path.resolve(__dirname,'../app') : path.resolve(__dirname,'../dashboard_user_manager/app');
const I18n = require(path.join(app,'static/i18n.js'));
const Matrix = require(path.join(app,'static/matrix.js'));
I18n.messages = JSON.parse(fs.readFileSync(path.join(app,'locales.json'),'utf8'));
test('all DE/EN/FR messages retain their placeholders', () => {
  const tokens = text => [...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  for (const [de, translations] of Object.entries(I18n.messages)) {
    assert.equal(translations.length,2,de);
    for (const text of translations) {assert.ok(text.trim(),de); assert.deepEqual(tokens(text),tokens(de),de);}
  }
});
test('HA language has priority; regions, unsupported languages and manual override', () => {
  global.window = {parent:{document:{querySelector:()=>({hass:{language:'fr-FR'}})}}};
  I18n.preference='auto'; assert.equal(I18n.detect(),'fr');
  window.parent.document.querySelector=()=>({hass:{language:'it'}}); assert.equal(I18n.detect(),'en');
  I18n.preference='de'; assert.equal(I18n.detect(),'de');
  window.parent.document.querySelector=()=>{throw new Error('cross origin');};
  I18n.preference='auto'; assert.equal(I18n.detect(),I18n.normalize(navigator.languages?.[0]||navigator.language));
  delete global.window;
});
test('all three locales translate placeholders without changing user names or selections', () => {
  const users=[{id:'web'}], views=[{index:0,users:[]}], draft=Matrix.initial(views,users);
  Matrix.setCell(draft,0,'web',true);
  for (const language of ['de','en','fr']) {
    I18n.language=language;
    assert.ok(I18n.t('Alle Ansichten für {name} auswählen oder abwählen',{name:'Küche <>&'}).includes('Küche <>&'));
    assert.deepEqual(Matrix.changes(views,users,draft),[{index:0,users:['web']}]);
  }
  I18n.language='fr'; assert.equal(I18n.t('Änderungen speichern'),'Enregistrer les modifications');
  I18n.language='en'; assert.equal(I18n.t('Änderungen speichern'),'Save changes');
  assert.equal(I18n.t('Sélection d’utilisateurs invalide.'),'Invalid user selection.');
});
test('every annotated HTML label exists in the shared locale catalog', () => {
  const html=fs.readFileSync(path.join(app,'static/index.html'),'utf8');
  for (const m of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) assert.ok(m[1] in I18n.messages,m[1]);
});
