// Arrange existing controls without changing project or simulation actions.
export function arrangeToolbar() {
 const $=s=>document.querySelector(s),actions=$('.actions');
 const group=(name,cls)=>{const node=document.createElement('div');node.className='toolbar-group '+cls;node.setAttribute('role','group');node.setAttribute('aria-label',name);return node;};
 const history=group('Rückgängig und Wiederholen','history-controls');
 history.append($('#undo'),$('#redo'));
 const projects=group('Projektaktionen','project-controls');
 const projectMenu=document.createElement('div');projectMenu.className='project-menu';
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='▾';toggle.title='Projektmenü';toggle.setAttribute('aria-label','Projektmenü');toggle.setAttribute('aria-haspopup','menu');toggle.setAttribute('aria-expanded','false');
 const menu=document.createElement('div');menu.id='project-menu-items';menu.className='project-menu-items';menu.setAttribute('role','menu');menu.hidden=true;toggle.setAttribute('aria-controls',menu.id);
 const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
 const newProject=document.createElement('button');newProject.textContent='Neues Projekt';newProject.setAttribute('role','menuitem');newProject.onclick=()=>{close();$('#new').click();};
 const example=$('#example');example.textContent='Beispiel laden';example.setAttribute('role','menuitem');example.addEventListener('click',close);
 menu.append(newProject,example);
 toggle.onclick=()=>{const opening=menu.hidden;menu.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));if(opening)newProject.focus();};
 projectMenu.append($('#save'),toggle,menu);
 projects.append($('#new'),$('#open'),$('#ha-import-open'),projectMenu,$('#app-project'));
 const output=group('Ausgabe','output-controls');
 output.append($('#target').closest('label'),$('#export'));
 const simulation=$('.simulation-controls');
 actions.replaceChildren(history,projects,simulation,output);
 actions.setAttribute('role','toolbar');actions.setAttribute('aria-label','Hauptaktionen');
 document.addEventListener('click',event=>{if(!projectMenu.contains(event.target))close();});
 projectMenu.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();toggle.focus();}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const items=[newProject,example],index=items.indexOf(document.activeElement),delta=event.key==='ArrowDown'?1:-1;items[(index+delta+items.length)%items.length].focus();}
 });
}
