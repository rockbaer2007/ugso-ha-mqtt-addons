// Upgrade serialized v1 projects without dropping condition chains or literals.
export function upgradeWorkspace(source) {
  const result = structuredClone(source);
  function conditionList(first) {
    if (!first) return null;
    const nodes = [];
    for (let node = first; node;) { const next = node.next?.block; delete node.next; visit(node); nodes.push(node); node = next; }
    if (nodes.length === 1) return nodes[0];
    return { type: 'ugso_logic_condition', fields: { LOGIC: 'and' }, extraState: { items: nodes.length, list: true }, inputs: Object.fromEntries(nodes.map((node, i) => [`COND${i}`, { block: node }])) };
  }
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    node.inputs ||= {};
    if (node.type === 'ugso_logic_condition' && node.inputs.CONDITIONS) {
      const children = []; let child = node.inputs.CONDITIONS.block;
      while (child) { const next = child.next?.block; delete child.next; visit(child); children.push(child); child = next; }
      delete node.inputs.CONDITIONS;
      node.extraState = { items: Math.max(1, children.length) };
      children.forEach((item, i) => { node.inputs[`COND${i}`] = { block: item }; });
    } else if (['ugso_automation', 'ugso_if_action'].includes(node.type)) {
      for (const [name, input] of Object.entries(node.inputs)) if (name === 'CONDITIONS' || /^C\d+$/.test(name)) { const child = conditionList(input.block); if (child) input.block = child; }
    }
    if (node.type === 'ugso_if_action' && !node.extraState) node.extraState = { branches: 0, hasElse: !!node.inputs.ELSE };
    for (const name of ['LIMIT', 'SECONDS']) if (Object.hasOwn(node.fields || {}, name)) {
      node.inputs[name] = { shadow: { type: 'ugso_number', fields: { NUM: node.fields[name] } } }; delete node.fields[name];
    }
    Object.values(node.inputs).forEach(input => { if (input.block) visit(input.block); });
    if (node.next?.block) visit(node.next.block);
  }
  result.blocks?.blocks?.forEach(visit);
  return result;
}
