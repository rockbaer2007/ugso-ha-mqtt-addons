import {parseDocument, stringify} from './vendor/pro-yaml.js';

export function renderYamlPreview(container, source, kind, labels) {
  const node = (tag, text, css) => {
    const value = document.createElement(tag);
    if (text) value.textContent = text;
    if (css) value.className = css;
    return value;
  };
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const card = (title, value, role) => {
    const details = node('details', '', 'yaml-flow-card');
    details.dataset.role = role;
    details.append(node('summary', title), node('pre', stringify(value)));
    return details;
  };
  const summary = (step, role) => {
    const type = step?.[role] ?? (role === 'action' ? step?.service : undefined);
    const target = step?.target?.entity_id ?? step?.entity_id ?? step?.target?.device_id;
    return [(step?.alias || type || (step && Object.keys(step)[0]) || role),
      step?.id, ...list(target)].filter(Boolean).join(' · ');
  };
  function steps(values, role, depth = 0) {
    const sequence = node('div', '', 'yaml-flow-sequence');
    for (const step of list(values)) {
      if (role !== 'action' || !Array.isArray(step?.choose) || depth >= 12) {
        sequence.append(card(summary(step, role), step, role));
        continue;
      }
      const choice = node('section', '', 'yaml-flow-choice');
      choice.append(card(step.alias || 'choose', step, 'choice'));
      const branches = node('div', '', 'yaml-flow-branches');
      for (const [index, branch] of step.choose.entries()) {
        const lane = node('section', '', 'yaml-flow-branch');
        lane.append(node('strong', branch?.alias || labels.option + ' ' + (index + 1)),
          steps(branch?.conditions, 'condition', depth + 1),
          steps(branch?.sequence, 'action', depth + 1));
        branches.append(lane);
      }
      if (Object.hasOwn(step, 'default')) {
        const lane = node('section', '', 'yaml-flow-branch');
        lane.append(node('strong', labels.default), steps(step.default, 'action', depth + 1));
        branches.append(lane);
      }
      choice.append(branches);
      sequence.append(choice);
    }
    return sequence;
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
      const columns = node('div', '', 'yaml-flow-columns');
      const groups = [
        ['trigger', entry.triggers ?? entry.trigger],
        ['condition', entry.conditions ?? entry.condition],
        ['action', entry.sequence ?? entry.actions ?? entry.action],
      ];
      for (const [role, values] of groups) {
        if (!list(values).length) continue;
        const column = node('section', '', 'yaml-flow-column');
        column.append(node('h4', labels[role]), steps(values, role));
        columns.append(column);
      }
      if (!columns.childElementCount) columns.append(card(labels.unavailable, entry, 'action'));
      flow.append(columns);
      container.append(flow);
    }
  } catch (error) {
    container.replaceChildren(node('p', error.message));
  }
}
