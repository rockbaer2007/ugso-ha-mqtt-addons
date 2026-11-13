import {mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';

const keys = new Map([['CTU', 'cv'], ['CTD', 'cv'], ['CTUD', 'cv'], ['RS', 'q'], ['SR', 'q']]);

export function retainedMemory(file, plan) {
  if (!file) return {load: () => ({}), save: () => {}};
  const persistent = plan.blocks.filter(block => keys.has(block.type));
  const fingerprint = createHash('sha256').update(JSON.stringify({
    blocks: plan.blocks.map(({id, type, params}) => [id, type, Object.entries(params).sort()]),
    links: plan.links.map(link => JSON.stringify(link)).sort(),
  })).digest('hex');
  let lastSaved;
  return {
    load() {
      try {
        const saved = JSON.parse(readFileSync(file, 'utf8'));
        if (saved.fingerprint !== fingerprint) return {};
        const entries = [];
        for (const {id, type} of persistent) {
          const key = keys.get(type);
          const value = saved.values?.[id]?.[key];
          const valid = key === 'q' ? typeof value === 'boolean' :
            Number.isInteger(value) && value >= 0 && value <= 2147483647;
          if (valid) entries.push([id, {version: 1, kind: type, [key]: value}]);
        }
        return Object.fromEntries(entries);
      } catch (error) {
        if (error.code === 'ENOENT' || error instanceof SyntaxError) return {};
        throw error;
      }
    },
    save(memory) {
      if (!persistent.length) return;
      const values = Object.fromEntries(persistent.map(({id, type}) => {
        const key = keys.get(type);
        return [id, {[key]: memory[id]?.[key]}];
      }));
      const body = JSON.stringify({fingerprint, values});
      if (body === lastSaved) return;
      mkdirSync(dirname(file), {recursive: true, mode: 0o700});
      writeFileSync(file + '.tmp', body, {mode: 0o600});
      renameSync(file + '.tmp', file);
      lastSaved = body;
    },
  };
}
