import { translateLabel as t } from './locales.js';
export const automationOptionKeys = ['variables','trigger_variables','initial_state','trace','max_exceeded'];
export function replaceAutomationOptions(metadata, options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw Error('HA-Optionen: JSON-Objekt erwartet.');
  for (const key of Object.keys(options)) if (!automationOptionKeys.includes(key)) throw Error(`HA-Optionen: ${key} wird hier nicht unterstützt.`);
  const next = {...metadata}; for (const key of automationOptionKeys) delete next[key];
  return {...next,...options};
}
export function setupAutomationOptions({getMetadata,apply}) {
  const box=document.createElement('details');box.className='automation-options';
  const summary=document.createElement('summary');summary.textContent=t('HA-Optionen');box.append(summary);
  const label=document.createElement('label');label.textContent=t('Zusätzliche Automationsoptionen (JSON)');
  const input=document.createElement('textarea');input.id='automation-options';input.rows=5;input.spellcheck=false;label.append(input);box.append(label);
  const hint=document.createElement('p');hint.textContent='variables · trigger_variables · initial_state · trace.stored_traces · max_exceeded';box.append(hint);
  const error=document.createElement('p');error.setAttribute('role','alert');box.append(error);
  const button=document.createElement('button');button.id='automation-options-apply';button.textContent=t('Anwenden');box.append(button);
  document.querySelector('.more').append(box);
  box.addEventListener('toggle',()=>{if(box.open){const meta=getMetadata();input.value=JSON.stringify(Object.fromEntries(automationOptionKeys.filter(k=>Object.hasOwn(meta,k)).map(k=>[k,meta[k]])),null,2);error.textContent='';}});
  button.addEventListener('click',()=>{try{apply(replaceAutomationOptions(getMetadata(),JSON.parse(input.value)));error.textContent='';}catch(e){error.textContent=e.message;}});
}
