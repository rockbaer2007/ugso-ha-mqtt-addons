import {isFlow} from './flow.js?v=0.1.8';
import {compile} from './core.js?v=0.1.8';
import {exportOptions,memoryHelpers} from './ha-export.js?v=0.1.8';
import {statefulTypes} from './stateful.js?v=0.1.8';

export function connectExport({getPlan,defs,update,report}) {
 const $=s=>document.querySelector(s),dialog=$('#output'),form=document.createElement('div');
 form.className='export-settings';
 form.innerHTML='<label>YAML verwenden in<select id="export-format"><option value="editor">HA-Editor · einzelner Eintrag</option><option value="file">YAML-Datei · Liste / Skriptschlüssel</option><option value="package">HA-Package · inklusive Speicher-Helfer</option></select></label><label>Ausführungsart<select id="export-mode"><option value="restart">restart · neu starten</option><option value="single">single · ein Durchlauf</option><option value="queued">queued · Warteschlange</option><option value="parallel">parallel · gleichzeitig</option></select></label><label>Export-ID<input id="export-id" maxlength="80" placeholder="z. B. licht_freigabe"></label><label>Maximale Durchläufe<input id="export-max" type="number" min="1" max="100"></label><label class="wide">Beschreibung<input id="export-description" maxlength="2000"></label><label><input type="checkbox" id="export-start"> Bei HA-Start zusätzlich auswerten</label><label><input type="checkbox" id="export-changes"> Nur abweichende Ausgänge schalten</label>';
 dialog.insertBefore(form,$('#output-info'));
 const helperButton=document.createElement('button');helperButton.textContent='Speicher-Helfer herunterladen';dialog.querySelector('footer').prepend(helperButton);helperButton.onclick=()=>{const helpers=memoryHelpers(getPlan());const text='# Texthelfer: max 255, ohne initial; bestehende Definitionen nicht ersetzen.\ninput_text: '+JSON.stringify(helpers,null,2)+'\n';const url=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download=exportOptions(getPlan()).objectId+'.helpers.yaml';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const controls={format:$('#export-format'),mode:$('#export-mode'),objectId:$('#export-id'),max:$('#export-max'),description:$('#export-description'),onStart:$('#export-start'),onlyChanges:$('#export-changes')};
 function refresh(){
  const plan=getPlan(),js=plan.target==='javascript',o=exportOptions(plan);
  form.hidden=js||isFlow(plan);helperButton.hidden=js||isFlow(plan)||!Object.keys(memoryHelpers(plan)).length;
  for(const [key,input]of Object.entries(controls)){if(input.type==='checkbox')input.checked=o[key];else input.value=String(o[key]);}
  const persistent=plan.blocks.some(b=>statefulTypes.has(b.type));
  if(persistent){controls.mode.value='queued';controls.onStart.checked=true;}controls.mode.disabled=persistent;
  controls.max.disabled=!persistent&&!['parallel','queued'].includes(o.mode);controls.onStart.disabled=plan.target!=='automation'||persistent;
  try{$('#code').value=compile(plan,defs);$('#download').disabled=false;$('#copy').disabled=false;}
  catch(error){$('#code').value='Export gesperrt: '+error.message;$('#download').disabled=true;$('#copy').disabled=true;}
  $('#output-info').textContent=isFlow(plan)?'Native HA-Konfiguration: Zweige und Parameter werden aus den Verbindungen erzeugt. Unbekannte Abschnitte bleiben erhalten. Kein automatisches Installieren oder Ausführen; YAML vor Nutzung prüfen.':js?'JavaScript-Hostvertrag readState/callAction; keine automatische Ausführung.':o.format==='package'?'HA-Package mit eigener Helferdefinition. Nur nach Backup passend unter homeassistant.packages einbinden; keine vorhandenen Dateien ersetzen.':o.format==='editor'?'Im YAML-Editor EINER Automation bzw. EINES Skripts einfügen. Zustandsbausteine: vorher Texthelfer aus Helferdefinition anlegen (max. 255, ohne initial). Zeitwerte in ms; HA-Automationen mit Zustand laufen serialisiert jede Sekunde. Skripte: ein Schritt je Aufruf, nach Neustart logic_seed=true übergeben.':plan.target==='automation'?'Liste zum Einordnen in automations.yaml. Vorhandene Datei niemals vollständig ersetzen. Export-ID muss eindeutig bleiben.':'Benannter Eintrag zum Einordnen in scripts.yaml. Vorhandene Datei niemals vollständig ersetzen. Export-ID muss eindeutig bleiben.';
 }
 for(const [key,input]of Object.entries(controls))input.onchange=()=>{
  const o=exportOptions(getPlan());o[key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
  try{exportOptions({...getPlan(),exportOptions:o});update(o);refresh();}catch(error){report(error.message);refresh();}
 };
 $('#export').onclick=()=>{try{refresh();dialog.showModal();}catch(error){report(error.message);}};
 $('#download').onclick=()=>{const plan=getPlan(),text=compile(plan,defs),o=exportOptions(plan);const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=o.objectId+(isFlow(plan)?'.'+plan.target+'.yaml':o.format==='package'?'.package.yaml':plan.target==='javascript'?'.mjs':plan.target==='automation'?'.automation.yaml':'.script.yaml');link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
