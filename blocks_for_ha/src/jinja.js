// Conservative source analysis, never execution or rewriting of user templates.
function withoutQuotedText(text) {
  let quote='',escaped=false;
  return [...text].map(c=>{if(escaped){escaped=false;return ' ';}if(quote){if(c==='\\')escaped=true;else if(c===quote)quote='';return ' ';}if(c==='"'||c==="'"){quote=c;return ' ';}return c;}).join('');
}
export function analyseJinja(source) {
  if (typeof source !== 'string' || source.length > 10000) throw Error('Jinja: höchstens 10000 Zeichen.');
  const tokens = [], stack = [], entities = new Set();
  let pos = 0, malformed = false;
  while (pos < source.length) {
    const start = source.slice(pos).search(/\{[{%#]/);
    if (start < 0) break;
    const begin = pos + start, opener = source.slice(begin, begin + 2), closer = { '{{': '}}', '{%': '%}', '{#': '#}' }[opener];
    let quote = '', escaped = false, end = -1;
    for (let i = begin + 2; i < source.length - 1; i++) {
      const c = source[i];
      if (escaped) { escaped = false; continue; }
      if (quote && c === '\\') { escaped = true; continue; }
      if (quote) { if (c === quote) quote = ''; continue; }
      if (opener !== '{#' && (c === '"' || c === "'")) { quote = c; continue; }
      if (source.slice(i, i + 2) === closer) { end = i; break; }
    }
    if (end < 0) { malformed = true; break; }
    const body = source.slice(begin + 2, end).replace(/^-|-$|^\+|\+$/g, '').trim();
    tokens.push({ kind: opener, body });
    if (opener === '{%') {
      const name = body.split(/\s/)[0];
      if (name === 'raw') {
        const close = /\{%[-+]?\s*endraw\s*[-+]?%\}/g;close.lastIndex=end+2;const match=close.exec(source);
        if(!match){malformed=true;break;}tokens.push({kind:'{%',body:'endraw'});pos=match.index+match[0].length;continue;
      }
      if (['if','for','macro','block','filter','with','raw','call'].includes(name)) stack.push(name);
      if (name.startsWith('end')) { if (stack.pop() !== name.slice(3)) malformed = true; }
      if (['else','elif'].includes(name) && !['if','for'].includes(stack.at(-1))) malformed = true;
    }
    pos = end + 2;
  }
  if (stack.length) malformed = true;
  // Extract references only inside Jinja code, not literal display text or comments.
  for (const token of tokens.filter(t => t.kind !== '{#')) {
    const code=withoutQuotedText(token.body);
    for(const call of code.matchAll(/\b(?:states|is_state|state_attr|is_state_attr)\s*\(/g)){const id=/^\s*(['"])([a-z][a-z0-9_]*\.[a-z0-9_]+)\1/.exec(token.body.slice(call.index+call[0].length));if(id)entities.add(id[2]);}
    for (const match of code.matchAll(/\bstates\.([a-z][a-z0-9_]*)\.([a-z0-9_]+)\b/g)) entities.add(`${match[1]}.${match[2]}`);
  }
  const tags = tokens.filter(t => t.kind === '{%').map(t => t.body.split(/\s/)[0]);
  const filters = [...new Set(tokens.filter(t => t.kind !== '{#').flatMap(t => [...withoutQuotedText(t.body).matchAll(/\|\s*([a-zA-Z_]\w*)/g)].map(m => m[1])))];
  const single = tokens.length === 1 && tokens[0].kind === '{{' && /^\s*\{\{[\s\S]*\}\}\s*$/.test(source);
  const recognized = !malformed && (tags.includes('if') || tags.includes('for') || single && /^(states\s*\(|is_state\s*\(|state_attr\s*\(|now\s*\(|[a-zA-Z_]\w*\s*$)/.test(tokens[0].body));
  const kind = malformed ? 'Unvollständig' : tags.includes('for') ? 'Schleife' : tags.includes('if') ? 'Wenn / Sonst' : single && entities.size ? 'Entitätswert' : single && /\bnow\s*\(/.test(tokens[0].body) ? 'Datum / Zeit' : single && /^[A-Za-z_]\w*$/.test(tokens[0].body) ? 'Variable' : 'Original-Jinja';
  return { kind, recognized, malformed, entities: [...entities], filters, tags, source };
}

export function jinjaSummary(source) {
  const a = analyseJinja(source);
  return [a.kind, ...a.entities, ...a.filters].join(' · ');
}
