import {parseDocument, stringify} from './vendor/pro-yaml.js';
import {mountYamlFlow} from './vendor/yaml-flow.js?v=0.1.87-1';

export function renderYamlPreview(container, source, kind, labels) {
  const node = (tag, text, css) => {
    const value = document.createElement(tag);
    if (text) value.textContent = text;
    if (css) value.className = css;
    return value;
  };
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const unmount = [];
  const summary = (step, role) => {
    const type = step?.[role] ?? (role === 'action' ? step?.service : undefined);
    const target = step?.target?.entity_id ?? step?.entity_id ?? step?.target?.device_id;
    const names = list(target).map(id => String(id).replace(/^[^.]+\./, '').replaceAll('_', ' '));
    return {
      kind: type || (step && Object.keys(step)[0]) || role,
      name: step?.alias || step?.id || names[0],
      detail: [names.join(', '), list(step?.to ?? step?.options?.event_type).join(' / ')].filter(Boolean).join(' · '),
    };
  };
  function drawFlow(entry) {
    const canvas = node('div', '', 'yaml-flow-canvas');
    const edges = [];
    const lanes = [];
    function add(title, value, role, column, row, inputs) {
      if (edges.length + lanes.length > 1000) throw new Error(labels.unavailable);
      const item = String(lanes.length);
      lanes.push({id: item, type: 'step', position: {x: (column - 1) * 265, y: row - 1},
        data: {...(typeof title === 'string' ? {kind: title} : title), yaml: stringify(value), role, incoming: inputs.length > 0}});
      for (const source of inputs) edges.push([source, item]);
      return item;
    }
    function steps(values, role, inputs, column, row, depth = 0) {
      let nextRow = row + 1;
      let output = inputs;
      for (const step of list(values)) {
        const choice = role === 'action' && Array.isArray(step?.choose);
        const item = add(summary(step, role), step, choice ? 'choice' : role, column++, row, output);
        output = [item];
        if (!choice || depth >= 12) {
          continue;
        }
        const branches = step.choose.map((branch, index) =>
          [branch?.alias || labels.option + ' ' + (index + 1), branch]);
        branches.push([labels.default, {sequence: step.default}]);
        lanes[Number(item)].data.ports = branches.map(([title, branch]) => ({
          title, detail: list(branch?.conditions).map(check => {
            const info = summary(check, 'condition');
            return [info.kind, info.name].filter(Boolean).join(' · ');
          }).join(', '),
        }));
        const branchColumn = column;
        let branchRow = row;
        output = [];
        for (const [index, [, branch]] of branches.entries()) {
          const actions = steps(branch?.sequence, 'action', [{id: item, handle: String(index)}], branchColumn, branchRow, depth + 1);
          column = Math.max(column, actions.column);
          branchRow = actions.nextRow;
          output.push(...actions.output);
        }
        nextRow = Math.max(nextRow, branchRow);
      }
      return {output, column, nextRow};
    }
    const triggers = list(entry.triggers ?? entry.trigger);
    const inputs = triggers.map((step, index) =>
      add(summary(step, 'trigger'), step, 'trigger', 1, index + 1, []));
    const conditions = steps(entry.conditions ?? entry.condition, 'condition', inputs, inputs.length ? 2 : 1, 1);
    steps(entry.sequence ?? entry.actions ?? entry.action, 'action', conditions.output, conditions.column, 1);
    if (!lanes.length) add(labels.unavailable, entry, 'action', 1, 1, []);
    const rows = [];
    for (const {position, data} of lanes) {
      rows[position.y] = Math.max(rows[position.y] ?? 0, 124, 108 + (data.ports?.length ?? 0) * 16);
    }
    const offsets = Array.from({length: rows.length});
    let offset = 0;
    for (let row = 0; row < rows.length; row++) {
      offsets[row] = offset;
      offset += rows[row] ?? 124;
    }
    for (const {position} of lanes) position.y = offsets[position.y];
    unmount.push(mountYamlFlow(canvas, lanes, edges, labels));
    return canvas;
  }
  container.replaceChildren();
  try {
    if (source.length > 1_000_000) throw new Error(labels.unavailable);
    const doc = parseDocument(source, {uniqueKeys: true});
    if (doc.errors.length) throw doc.errors[0];
    const value = doc.toJS({maxAliasCount: 30});
    const entries = kind === 'script' && value && !Array.isArray(value) && !Object.hasOwn(value, 'sequence')
      ? Object.entries(value) : list(value).map(entry => ['', entry]);
    if (!entries.length) throw new Error(labels.unavailable);
    for (const [name, entry] of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(labels.unavailable);
      const flow = node('section', '', 'yaml-flow');
      flow.append(node('h3', entry.alias || name || labels.title));
      flow.append(drawFlow(entry));
      container.append(flow);
    }
  } catch (error) {
    unmount.splice(0).forEach(dispose => dispose());
    container.replaceChildren(node('p', error.message));
  }
  return () => unmount.splice(0).forEach(dispose => dispose());
}
