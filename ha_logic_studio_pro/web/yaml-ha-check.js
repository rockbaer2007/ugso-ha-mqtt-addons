import {parseDocument} from './vendor/pro-yaml.js';

const targets = new Set(['entity_id', 'device_id', 'area_id', 'floor_id', 'label_id']);
const branches = ['triggers', 'trigger', 'conditions', 'condition', 'actions', 'action',
  'sequence', 'choose', 'default', 'if', 'then', 'else', 'parallel', 'repeat', 'while',
  'until', 'wait_for_trigger'];
const dynamic = value => /\{[{%#]|^!input\b/.test(value);
const idPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;

export function checkHaYaml(source, kind, catalog, labels) {
  const doc = parseDocument(source, {uniqueKeys: true});
  const issues = [];
  const entities = new Set(catalog.entities);
  const add = (node, message) => {
    if (node?.range) issues.push({pos: node.range.slice(0, 2), message});
  };
  const entity = node => {
    if (Array.isArray(node?.items)) {
      node.items.forEach(entity);
      return;
    }
    if (typeof node?.value !== 'string' || dynamic(node.value)) return;
    for (const value of node.value.split(',').map(id => id.trim())) {
      if (idPattern.test(value) && !entities.has(value)) add(node, labels.entity(value));
    }
  };
  function visit(node) {
    if (!Array.isArray(node?.items)) return;
    if (typeof node.get !== 'function') return;
    if (!node.items.some(item => item && 'key' in item)) {
      node.items.forEach(visit);
      return;
    }
    entity(node.get('entity_id', true));
    for (const key of ['target', 'data', 'data_template']) {
      entity(node.getIn([key, 'entity_id'], true));
    }
    const action = node.get('action', true) ?? node.get('service', true) ?? node.get('service_template', true);
    if (typeof action?.value === 'string' && !dynamic(action.value)) {
      const target = node.get('target', true);
      for (const pair of target?.items ?? []) {
        const field = pair.key?.value;
        if (typeof field === 'string' && !targets.has(field)) add(pair.key, labels.target(field));
      }
      const fields = Object.hasOwn(catalog.actions, action.value) ? catalog.actions[action.value] : null;
      if (Array.isArray(fields) && !action.value.startsWith('script.')) {
        for (const key of ['data', 'data_template']) {
          for (const pair of node.get(key, true)?.items ?? []) {
            const field = pair.key?.value;
            if (typeof field === 'string' && !dynamic(field) && field !== 'entity_id' &&
                !fields.includes(field)) add(pair.key, labels.field(field, action.value));
          }
        }
      }
    }
    for (const key of branches) visit(node.get(key, true));
  }
  if (kind === 'script' && doc.contents?.has && !doc.contents.has('sequence')) {
    for (const pair of doc.contents.items) visit(pair.value);
  } else {
    visit(doc.contents);
  }
  return issues;
}
