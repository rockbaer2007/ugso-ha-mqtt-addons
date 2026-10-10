import { analyseJinja } from './jinja.js';
export function setupJinjaEditor(Blockly, workspace) {
  const button=document.createElement('button');button.textContent='Jinja einlesen';button.id='jinja-import';document.querySelector('.canvas-actions').append(button);
  const dialog=document.createElement('dialog');dialog.id='jinja-dialog';
  dialog.innerHTML='<h2>Jinja (experimentell)</h2><label>Jinja-Original<textarea id="jinja-source" rows="8" spellcheck="false"></textarea></label><p id="jinja-preview" role="status"></p><label><input id="jinja-boolean" type="checkbox">Als Bedingung</label><p>Die Erkennung verändert den Originaltext nicht. Home Assistant führt das Template aus. Den neuen Block anschließend verbinden.</p><div class="entity-actions"><button id="jinja-cancel">Abbrechen</button><button id="jinja-add" class="primary">Block erstellen</button></div>';
  document.body.append(dialog);
  const el=id=>dialog.querySelector('#'+id);
  function preview(){try{const a=analyseJinja(el('jinja-source').value);el('jinja-preview').textContent=`${a.kind} · ${a.entities.join(', ')||'Keine festen Entitätsreferenzen'} · Filter: ${a.filters.join(', ')||'keine'} · ${a.malformed?'Unvollständige Struktur; als Original prüfen':a.recognized?'Muster erkannt, Original erhalten':'Original erhalten; keine sichere Mustererkennung'}`;el('jinja-add').disabled=!a.source.trim();}catch(e){el('jinja-preview').textContent=e.message;el('jinja-add').disabled=true;}}
  button.addEventListener('click',()=>{preview();dialog.showModal();el('jinja-source').focus();});
  el('jinja-source').addEventListener('input',preview);el('jinja-cancel').addEventListener('click',()=>dialog.close());
  el('jinja-add').addEventListener('click',()=>{
    Blockly.Events.setGroup(true);
    try{const block=workspace.newBlock(el('jinja-boolean').checked?'ugso_jinja_condition':'ugso_jinja_value');block.setFieldValue(el('jinja-source').value,'TEXT');block.initSvg();block.render();const root=workspace.getTopBlocks(false).find(b=>b.type==='ugso_automation');const p=root?.getRelativeToSurfaceXY()||{x:40,y:40};block.moveBy(p.x+40,p.y+(root?.getHeightWidth().height||60)+20);block.select();}finally{Blockly.Events.setGroup(false);}
    dialog.close();
  });
}
