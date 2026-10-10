import test from 'node:test';
import assert from 'node:assert/strict';
import { definitions } from '../src/blocks.js';
import { resolveLanguage, readLanguage, localizedDefinition, labels, blockTranslations } from '../src/locales.js';

test('language resolution handles regional tags, explicit overrides and unsupported languages', () => {
  assert.equal(resolveLanguage('system', ['fr-CA', 'en']), 'fr');
  assert.equal(resolveLanguage('system', ['es-ES', 'de-DE']), 'de');
  assert.equal(resolveLanguage('en', ['fr']), 'en');
  assert.equal(resolveLanguage('system', ['es']), 'en');
  assert.equal(readLanguage({ getItem: () => 'invalid' }), 'system');
  assert.equal(readLanguage({ getItem() { throw new Error('blocked'); } }), 'system');
});

test('all native UGSo messages, help and nontechnical options have EN/FR translations', () => {
  const tokens = message => (message.match(/%\d+/g) || []).sort();
  for (const definition of definitions) {
    if (/[A-Za-zÄÖÜäöüß]/.test(definition.message0)) assert.ok(blockTranslations[definition.type], definition.type);
    if (definition.tooltip) assert.ok(blockTranslations[definition.type]?.[2] && blockTranslations[definition.type]?.[3], definition.type + ' help');
    for (const locale of ['en', 'fr']) {
      const localized = localizedDefinition(definition, locale);
      assert.deepEqual(tokens(localized.message0), tokens(definition.message0), definition.type + ' placeholders');
      assert.equal(localized.type, definition.type);
      for (const [key, args] of Object.entries(definition)) if (/^args\d+$/.test(key)) {
        args.forEach((field, i) => {
          const next = localized[key][i];
          assert.equal(next.name, field.name);
          for (const property of ['text', 'variable', 'date', 'value', 'check']) assert.deepEqual(next[property], field[property]);
          if (field.options) assert.deepEqual(next.options.map(pair => pair[1]), field.options.map(pair => pair[1]));
          if (field.optionMapping) for (const type of Object.keys(field.optionMapping)) assert.deepEqual(next.optionMapping[type].map(pair => pair[1]), field.optionMapping[type].map(pair => pair[1]));
        });
      }
    }
  }
  for (const pair of Object.values(labels)) assert.ok(pair.length === 2 && pair.every(label => typeof label === 'string' && label.length));
});
