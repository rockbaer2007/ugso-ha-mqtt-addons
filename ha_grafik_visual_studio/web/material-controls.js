import { el, image, number as n, bounded, truth, feedback, formatNumber } from './material-common.js';

const locks = new Map();
const stateLabels = (w, active) => active ? w.labelTrue || w.labelText : w.labelFalse || w.labelText;
function lockButton(root, w, doc, context) {
  if (!w.lockEnabled) return false;
  const key = `${context.surface || ''}/${w.id}`;
  const arm=()=>{const remaining=(locks.get(key) || 0)-Date.now();if(remaining>0)doc.defaultView.setTimeout(()=>{if(root.isConnected){root.querySelectorAll('button,input').forEach(node=>{if(node.dataset.materialWritable==='true')node.disabled=true;});lockButton(root,w,doc,context);}},remaining+5);};
  if ((locks.get(key) || 0) > Date.now()){arm();return false;}
  const unlock = el(doc, 'button', null, 'material-unlock'); unlock.type = 'button'; unlock.setAttribute('aria-label', context.text('Entsperren'));
  unlock.append(image(doc, w.lockIcon || 'mdi:lock', w.lockIconSize || 24, w.lockIconColor || '#d32f2f', context));
  unlock.style.top=`${bounded(w.lockIconTop,0,-100,1000)}px`;unlock.style.left=`${bounded(w.lockIconLeft,0,-100,1000)}px`;
  unlock.addEventListener('click', () => { if (locks.size > 500) locks.clear(); locks.set(key, Date.now() + bounded(w.autoLockAfter, 10, 1, 3600) * 1000); unlock.remove(); root.querySelectorAll('button,input').forEach(node => { if (node.dataset.materialWritable === 'true') node.disabled = false; });arm(); });
  root.append(unlock); return true;
}
function disabled(node, value, locked) { node.dataset.materialWritable = String(!value); node.disabled = value || locked; }

export function renderMaterialControl(root, w, value, doc, context, helpers) {
  if(w.toggleType==='boolean')w={...w,onValue:true,offValue:false};
  const { commit, writable, appearance } = helpers, kind = w.materialKind;
  if (!['button','checkbox','switch','slider','slider-round','progress','progress-circular'].includes(kind)) return false;
  root.classList.add('material-widget');root.dataset.materialKind=kind;
  const locked = lockButton(root, w, doc, context), runtime = context.runtime === true;
  const active = w.toggleType==='boolean'?truth(value):w.stateIfNotTrueValue==='on'?String(value)!==String(w.offValue):String(value)===String(w.onValue);
  if (kind === 'button') {
    const button = el(doc, 'button', null, `material-action-button material-button-${w.buttonStyle || 'raised'}`); button.type = 'button';
    const label = stateLabels(w, active), icon = active ? w.imageTrue || w.icon : w.icon;
    if (icon) button.append(image(doc, icon, w.iconHeight || 24, active ? w.imageTrueColor || w.buttonTextColor : w.imageColor || w.buttonTextColor, context));
    if (w.buttonLayout !== 'icon') button.append(el(doc, 'span', label));
    button.setAttribute('aria-label', label || context.text('Ausführen'));
    if (w.buttonLayout === 'vertical') button.style.flexDirection = 'column'; else if (w.iconPosition === 'right') button.style.flexDirection = 'row-reverse';
    button.style.gap = `${bounded(w.distanceBetweenTextAndImage, 8, 0, 100)}px`; button.style.justifyContent = w.alignment || 'center';
    button.style.color = (active ? w.labelColorTrue : w.labelColorFalse) || w.buttonTextColor || (w.buttonStyle === 'text' || w.buttonStyle === 'outlined' ? appearance.primary : appearance.onPrimary);
    button.style.backgroundColor = ['text','outlined'].includes(w.buttonStyle) ? 'transparent' : (active ? w.colorBgTrue || w.selectedColor : w.colorBgFalse) || w.buttonBackgroundColor || appearance.primary;
    button.classList.toggle('material-outlined', w.buttonStyle === 'outlined'); button.classList.toggle('material-tonal', w.buttonStyle === 'tonal');
    if (w.pressedColor) button.style.setProperty('--material-press', w.pressedColor);
    if (w.actionKind === 'toggle') button.setAttribute('aria-pressed', String(active));
    const destination = w.actionKind === 'navigation' ? context.pageUrl?.(w.targetPage) : helpers.url(w.linkUrl, context.baseUrl);
    const next = () => w.actionKind === 'addition' ? Math.min(n(w.additionMax, Infinity), Math.max(n(w.additionMin, -Infinity), n(value) + n(w.addition, 1))) : w.actionKind === 'toggle' ? active ? w.offValue : w.onValue : w.actionKind === 'multi-state' ? (() => { const values = String(w.stateValues || '').split(';'); return values[(values.indexOf(String(value)) + 1) % values.length]; })() : w.writeValue;
    const multi = w.actionKind === 'multi-state' && w.multiStateMode === 'targets';
    const targets = multi ? Array.from({length:bounded(w.countTargets,1,1,10)}, (_,i) => ({entityId:w[`targetEntityId${i}`], entityAttribute:'', readOnly:w.readOnly, lockEntityId:w.lockEntityId, value:w[`targetValue${i}`], delay:bounded(w[`targetDelay${i}`],0,0,60000)})) : [];
    disabled(button, !runtime || w.readOnly || truth(context.states?.[w.lockEntityId]?.state) || (['link','navigation'].includes(w.actionKind) ? !destination : multi ? !targets.length || targets.some(target => !target.entityId || !writable(target, context.states, target.value)) : w.actionKind === 'slider' ? !writable(w,context.states,n(value)) : !writable(w,context.states,next())), locked);
    const run = async () => {
      feedback(w, doc);
      if (['link','navigation'].includes(w.actionKind)) { if (w.openNewWindow && w.actionKind === 'link') doc.defaultView.open(destination, '_blank', 'noopener,noreferrer'); else context.navigate?.(destination); return; }
      if (multi) { button.disabled = true; try { for (const target of targets) { if (target.delay) await new Promise(resolve => doc.defaultView.setTimeout(resolve,target.delay)); if (context.isActive ? !context.isActive() : !root.isConnected) break; if (!await commit(target.value,target)) break; } } finally { if (button.isConnected) button.disabled = false; } return; }
      if (w.actionKind === 'slider') { const existing = root.querySelector('.material-button-slider'); if (existing) { existing.remove(); return; } const child = el(doc,'div',null,'material-button-slider'); root.append(child); renderMaterialControl(child,{...w,materialKind:w.sliderShape === 'round'?'slider-round':'slider',minValue:n(w.sliderMin,0),maxValue:n(w.sliderMax,100),step:n(w.sliderStep,1),showValue:true},value,doc,context,helpers); return; }
      await commit(next());
    };
    if (w.pushButton && !['link','navigation','slider','multi-state'].includes(w.actionKind)) {
      let pressed = false;
      button.addEventListener('pointerdown', async event => { if (button.disabled) return; event.preventDefault(); pressed=true; button.setPointerCapture(event.pointerId); feedback(w,doc); await commit(w.onValue); });
      const release=()=>{if(pressed){pressed=false;void commit(w.offValue);}};
      button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
      button.addEventListener('keydown',event=>{if(!pressed && ['Enter',' '].includes(event.key)){event.preventDefault();pressed=true;void commit(w.onValue);}});button.addEventListener('keyup',release);button.addEventListener('blur',release);
    } else button.addEventListener('click', event => {event.stopPropagation();void run();});
    root.append(button); return true;
  }
  if (kind === 'switch' || kind === 'checkbox') {
    const label = el(doc,'label',null,`material-toggle material-toggle-${kind}`), input = el(doc,'input'); input.type='checkbox'; input.checked=active;
    input.setAttribute('role',kind==='switch'?'switch':'checkbox');input.setAttribute('aria-label',stateLabels(w,active));disabled(input,!runtime || !writable(w,context.states,active?w.offValue:w.onValue),locked);
    const track=el(doc,'span',null,kind==='switch'?'material-switch-track':'material-checkbox-box');track.setAttribute('aria-hidden','true');
    if(kind==='switch'){const thumb=el(doc,'span',null,'material-switch-thumb');track.append(thumb);if(w.md3SwitchIcon)thumb.textContent=active?'✓':'−';track.style.setProperty('--switch-active',w.colorSwitchTrue || appearance.primary);if(w.colorSwitchTrack)track.style.backgroundColor=w.colorSwitchTrack;if(w.colorSwitchThumb)thumb.style.backgroundColor=w.colorSwitchThumb;}
    else {track.textContent='✓';if(w.colorCheckBox)track.style.setProperty('--material-primary',w.colorCheckBox);if(w.colorCheckBoxBorder)track.style.borderColor=w.colorCheckBoxBorder;}
    const text=el(doc,'span',stateLabels(w,active));text.style.color=(active?w.labelColorTrue:w.labelColorFalse)||'inherit';text.style.fontSize=`${n(w.valueFontSize,16)}px`;
    if(w.labelPosition==='left')label.append(text,input,track);else label.append(input,track,text);
    input.addEventListener('change',async()=>{feedback(w,doc);if(!await commit(input.checked?w.onValue:w.offValue))input.checked=!input.checked;else text.textContent=stateLabels(w,input.checked);});root.append(label);return true;
  }
  const low=n(w.minValue),high=Math.max(low+.001,n(w.maxValue,100)),step=Math.max(.001,n(w.step,1)),v=Math.min(high,Math.max(low,n(value))),percent=(v-low)/(high-low)*100;
  root.style.setProperty('--material-track',`${bounded(w.trackWidth,8,1,40)}px`);root.style.setProperty('--material-thumb',`${bounded(w.thumbSize,18,8,80)}px`);
  if (kind.startsWith('progress')) {
    const circular=kind==='progress-circular', progress=el(doc,'div',null,circular?'material-circular-progress':'material-linear-progress');
    progress.setAttribute('role','progressbar');progress.setAttribute('aria-label',w.labelText);progress.setAttribute('aria-valuemin',String(low));progress.setAttribute('aria-valuemax',String(high));if(!w.indeterminate)progress.setAttribute('aria-valuenow',String(v));
    progress.style.setProperty('--material-progress',`${percent}%`);progress.style.setProperty('--material-track',`${bounded(w.trackWidth,8,1,40)}px`);progress.classList.toggle('is-indeterminate',!!w.indeterminate);progress.classList.toggle('is-striped',!!w.striped);
    if(circular){progress.style.width=progress.style.height=`${bounded(w.progressCircularSize,90,24,500)}px`;progress.style.transform=`rotate(${n(w.progressCircularRotate)}deg)`;}
    const color = v >= n(w.colorTwoCondition,Infinity) ? w.colorTwo : v >= n(w.colorOneCondition,Infinity) ? w.colorOne : w.colorProgress;
    if(color)progress.style.setProperty('--material-primary',color);progress.style.setProperty('--material-inner',w.innerColor || appearance.background);progress.style.setProperty('--material-track-color',w.colorProgressBackground || '#8884');root.append(progress);
    if(w.showValue!==false){const output=el(doc,'output',w.valueLabelStyle==='percent'?`${formatNumber(percent,w,context.language)} %`:w.valueLabelCustom || `${formatNumber(v,w,context.language)} ${w.unit || ''}`);output.style.color=w.valueLabelColor || 'inherit';if(circular){output.className='material-circular-value';output.style.transform=`rotate(${-n(w.progressCircularRotate)}deg)`;progress.append(output);}else root.append(output);}return true;
  }
  const input=el(doc,'input'),output=el(doc,'output');input.type='range';input.min=String(low);input.max=String(high);input.step=String(step);input.value=String(v);input.setAttribute('aria-label',w.labelText);disabled(input,!runtime || !writable(w,context.states,v) || truth(context.states?.[w.workingEntityId]?.state),locked);
  const start=n(w.startAngle,-90),arc=bounded(w.arcLength,360,10,360);
  const update=()=>{const fraction=(Number(input.value)-low)/(high-low);root.style.setProperty('--material-angle',`${fraction*arc}deg`);root.style.setProperty('--material-start',`${start+90}deg`);root.style.setProperty('--material-progress',`${fraction*100}%`);output.textContent=`${w.labelText || ''}: ${formatNumber(w.valueLabelStyle==='percent'?fraction*100:Number(input.value),w,context.language)} ${w.unit || ''}`;};update();
  let inFlight=false,queued=null;const send=async()=>{queued=Number(input.value);if(inFlight)return;inFlight=true;root.dataset.materialWriting='true';try{while(queued!=null){const next=queued;queued=null;if(!await commit(next)){queued=null;break;}}}finally{inFlight=false;delete root.dataset.materialWriting;if(!root.dataset.dragging)context.onSettled?.();}};
  input.addEventListener('pointerdown',()=>{root.dataset.dragging='true';input.dataset.dragging='true';});const settle=()=>{delete root.dataset.dragging;delete input.dataset.dragging;doc.defaultView.setTimeout(()=>context.onSettled?.(),0);};input.addEventListener('pointerup',settle);input.addEventListener('pointercancel',settle);input.addEventListener('blur',settle);
  input.addEventListener('input',()=>{update();if(w.sendValueOnRelease===false)void send();});input.addEventListener('change',()=>{feedback(w,doc);void send();});
  if(w.orientation==='vertical')root.classList.add('material-slider-vertical');if(w.reverseSlider)input.style.direction='rtl';
  if(kind==='slider-round') {
    const dial=el(doc,'div',null,'material-round-dial'),handle=el(doc,'span',null,'material-round-handle');dial.append(handle);dial.style.setProperty('--material-inner',w.colorSliderBg || appearance.background);dial.style.setProperty('--material-track',`${bounded(w.trackWidth,8,1,40)}px`);dial.style.width=dial.style.height=`${bounded(w.roundSize,160,40,600)}px`;dial.setAttribute('aria-hidden','true');
    const move=event=>{if(input.disabled)return;const box=dial.getBoundingClientRect();let angle=(Math.atan2(event.clientY-box.top-box.height/2,event.clientX-box.left-box.width/2)*180/Math.PI-start+360)%360;if(w.rtl)angle=(360-angle)%360;const fraction=Math.min(arc,angle)/arc;input.value=String(Math.min(high,Math.max(low,low+Math.round((high-low)*fraction/step)*step)));update();if(w.sendValueOnRelease===false)void send();};
    dial.addEventListener('pointerdown',event=>{if(input.disabled)return;event.preventDefault();root.dataset.dragging='true';dial.setPointerCapture(event.pointerId);move(event);});dial.addEventListener('pointermove',event=>{if(dial.hasPointerCapture(event.pointerId))move(event);});dial.addEventListener('pointerup',event=>{if(dial.hasPointerCapture(event.pointerId)){dial.releasePointerCapture(event.pointerId);feedback(w,doc);delete root.dataset.dragging;void send();}});dial.addEventListener('pointercancel',settle);root.append(dial);input.className='material-round-keyboard';
  }
  if(w.showTicks){const ticks=el(doc,'div',null,'material-slider-ticks');const labels=String(w.tickLabels || '').split(';');for(let i=0;i<bounded(w.tickCount,5,2,20);i++)ticks.append(el(doc,'span',labels[i] || String(Number((low+i*(high-low)/(bounded(w.tickCount,5,2,20)-1)).toFixed(2)))));root.append(ticks);}
  root.append(input);if(w.showValue!==false)root.append(output);return true;
}
