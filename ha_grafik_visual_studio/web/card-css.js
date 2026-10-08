// Optional shared CSS controls for self-contained calendar and printer cards.
export const CARD_CSS_IDS={'CSS Font & Text':'card-css-font','CSS Hintergrund':'card-css-background','CSS Ränder':'card-css-border','CSS Schatten und Abstand':'card-css-spacing'};
export const cardCssEnabled=(widget,id)=>widget.enabledPropertyGroups?.[id]===true;
/** Standard controls for every set except Industrial; keep existing group IDs. */
export function completeCssGroups(groups,templates,{industrial=false,card=false}={}) {
  if(industrial)return groups;
  return [...groups,...templates.filter(group=>!groups.some(existing=>existing.css&&existing.label===group.label)).map(group=>({...structuredClone(group),id:CARD_CSS_IDS[group.label]||'css-general-required',sharedCss:true,cardCss:card,defaultEnabled:false}))];
}
export function applyCardCss(widget,content,root,outer) {
  // One visual frame: draw CSS on the actual card, not behind its opaque surface.
  Object.assign(content.style,{padding:'0',paddingLeft:'',paddingTop:'',paddingRight:'',paddingBottom:'',border:'0',borderRadius:'0',background:'transparent',boxShadow:'none'});
  for(const key of ['color','fontFamily','fontStyle','fontVariant','fontWeight','fontSize','textAlign','lineHeight','letterSpacing','wordSpacing','textShadow'])content.style[key]='';
  if(outer&&!cardCssEnabled(widget,'card-css-spacing'))for(const key of ['marginLeft','marginTop','marginRight','marginBottom'])outer.style[key]='';
  if(cardCssEnabled(widget,'card-css-font')) {
    root.classList.add('card-css-font');
    for(const key of ['fontFamily','fontStyle','fontVariant','fontWeight','textAlign','lineHeight','letterSpacing','wordSpacing','textShadow'])if(widget[key]!==undefined&&widget[key]!=='')root.style[key]=String(widget[key]);
    if(widget.textColor)root.style.color=widget.textColor;
    if(Number.isFinite(Number(widget.fontSize))&&Number(widget.fontSize)>0){root.style.fontSize=`${widget.fontSize}px`;root.style.setProperty('--card-font-size',`${widget.fontSize}px`);}
    if(widget.textAlign)root.style.setProperty('--card-text-align',widget.textAlign);
  }
  if(cardCssEnabled(widget,'card-css-background')) {
    if(widget.backgroundColor)root.style.backgroundColor=widget.backgroundColor;
    // The host has already validated the image URL.
    const image=content.dataset.cardBackgroundImage||'';root.style.backgroundImage=image;
    for(const key of ['backgroundRepeat','backgroundAttachment','backgroundPosition','backgroundSize','backgroundClip','backgroundOrigin'])if(widget[key])root.style[key]=widget[key];
  }
  if(cardCssEnabled(widget,'card-css-border')) {
    if(widget.borderColor)root.style.borderColor=widget.borderColor;
    if(widget.borderWidth!==undefined)root.style.borderWidth=`${Math.max(0,Number(widget.borderWidth)||0)}px`;
    if(widget.borderStyle)root.style.borderStyle=widget.borderStyle;
    if(widget.radius!==undefined)root.style.borderRadius=`${Math.max(0,Number(widget.radius)||0)}px`;
  }
  if(cardCssEnabled(widget,'card-css-spacing')) {
    if(widget.padding!==undefined)root.style.padding=`${Math.max(0,Number(widget.padding)||0)}px`;
    for(const key of ['paddingLeft','paddingTop','paddingRight','paddingBottom'])if(widget[key])root.style[key]=widget[key];
    if(widget.boxShadow)root.style.boxShadow=widget.boxShadow;
    else if(widget.shadow)root.style.boxShadow='0 2px 8px #0006';
  }
}
