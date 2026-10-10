import { analyseJinja } from './jinja.js';
import { parseTemplate, generateTemplate } from './jinja-parser.js';
import { createJinjaBlock } from './jinja-blocks.js';
import { language } from './locales.js';
import { uiText as t } from './ui-locales.js';
export function setupJinjaEditor(Blockly, workspace) {
  const button=document.createElement('button');button.textContent='Jinja einlesen';button.id='jinja-import';document.querySelector('.canvas-actions').append(button);
  const dialog=document.createElement('dialog');dialog.id='jinja-dialog';
  dialog.innerHTML='<h2>Jinja (experimentell)</h2><label>Jinja-Original<textarea id="jinja-source" rows="8" spellcheck="false"></textarea></label><p id="jinja-preview" role="status"></p><label><input id="jinja-boolean" type="checkbox">Als Bedingung</label><p>Die Erkennung verändert den Originaltext nicht. Home Assistant führt das Template aus. Den neuen Block anschließend verbinden.</p><div class="entity-actions"><button id="jinja-cancel">Abbrechen</button><button id="jinja-add" class="primary">Block erstellen</button></div>';
  document.body.append(dialog);
  const texts={de:['Als bearbeitbare Blocks zerlegen','Zerlegbar: Felder, Filter und Template-Teile bearbeiten','Nicht vollständig zerlegbar: Originalblock bleibt erhalten','Unverändert bleibt der Originaltext erhalten. Änderungen an zerlegten Blocks erzeugen Jinja. Home Assistant führt das Template aus. Den neuen Block anschließend verbinden.'],en:['Decompose into editable blocks','Can be decomposed: edit fields, filters and template parts','Cannot be fully decomposed: original block is preserved','Unchanged blocks retain the original text. Editing decomposed blocks generates Jinja. Home Assistant evaluates the template. Connect the new block afterwards.'],fr:['Décomposer en blocs modifiables','Décomposition possible : modifier champs, filtres et parties du modèle','Décomposition incomplète : le bloc original est conservé','Les blocs inchangés conservent le texte original. Modifier les blocs décomposés génère Jinja. Home Assistant évalue le modèle. Relier ensuite le nouveau bloc.']}[language];
  const label=document.createElement('label');label.innerHTML='<input id="jinja-decompose" type="checkbox" checked>';label.append(texts[0]);dialog.querySelector('#jinja-boolean').parentElement.after(label);label.nextElementSibling.textContent=texts[3];
  const el=id=>dialog.querySelector('#'+id);
  function preview(){try{const a=analyseJinja(el('jinja-source').value);let structural=false;try{generateTemplate(parseTemplate(a.source));structural=true;}catch{}el('jinja-preview').textContent=`${t(a.kind)} · ${a.entities.join(', ')||t('Keine festen Entitätsreferenzen')} · ${language==='fr'?'Filtres':'Filter'}: ${a.filters.join(', ')||t('keine')} · ${structural?texts[1]:texts[2]}`;el('jinja-add').disabled=!a.source.trim();}catch(e){el('jinja-preview').textContent=t(e.message);el('jinja-add').disabled=true;}}
  button.addEventListener('click',()=>{preview();dialog.showModal();el('jinja-source').focus();});
  el('jinja-source').addEventListener('input',preview);el('jinja-cancel').addEventListener('click',()=>dialog.close());
  el('jinja-add').addEventListener('click',async()=>{
    Blockly.Events.setGroup(true);
    el('jinja-add').disabled=true;
    try{let block;if(el('jinja-decompose').checked)block=createJinjaBlock(workspace,el('jinja-source').value,el('jinja-boolean').checked);else{block=workspace.newBlock(el('jinja-boolean').checked?'ugso_jinja_condition':'ugso_jinja_value');block.setFieldValue(el('jinja-source').value,'TEXT');block.initSvg();block.render();}await Blockly.renderManagement.finishQueuedRenders();const root=workspace.getTopBlocks(false).find(b=>b.type==='ugso_automation');const p=root?.getRelativeToSurfaceXY()||{x:40,y:40};block.moveBy(p.x+40,p.y+(root?.getHeightWidth().height||60)+20);block.select();}finally{Blockly.Events.setGroup(false);el('jinja-add').disabled=false;}
    dialog.close();
  });
}
