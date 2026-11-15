import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
import {yaml} from '@codemirror/lang-yaml';
import {HighlightStyle, indentOnInput, syntaxHighlighting} from '@codemirror/language';
import {forceLinting, lintGutter, linter} from '@codemirror/lint';
import {EditorView, highlightActiveLine, keymap, lineNumbers} from '@codemirror/view';
import {tags} from '@lezer/highlight';

const colors = HighlightStyle.define([
  {tag: [tags.propertyName, tags.definition(tags.propertyName)], color: 'var(--code-keyword)'},
  {tag: tags.comment, color: 'var(--code-comment)'},
  {tag: [tags.string, tags.special(tags.string), tags.content], color: 'var(--code-string)'},
  {tag: [tags.number, tags.bool, tags.null], color: 'var(--code-literal)'},
  {tag: [tags.labelName, tags.typeName], color: 'var(--code-type)'},
]);

export function mountYamlEditor(parent, {source, label, onChange, validate}) {
  const view = new EditorView({
    parent,
    doc: source,
    extensions: [
      yaml(), syntaxHighlighting(colors), lineNumbers(), highlightActiveLine(),
      history(), indentOnInput(), keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.contentAttributes.of({'aria-label': label, spellcheck: 'false'}),
      lintGutter(),
      linter(({state}) => {
        try {
          validate(state.doc.toString());
          return [];
        } catch (error) {
          const from = Math.max(0, Math.min(error.pos?.[0] ?? 0, state.doc.length));
          const to = Math.max(from, Math.min(error.pos?.[1] ?? from, state.doc.length));
          return [{from, to, severity: 'error', message: error.message}];
        }
      }, {delay: 400}),
      EditorView.updateListener.of(update => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
    ],
  });
  return {
    check: () => forceLinting(view),
    destroy: () => view.destroy(),
    replace(source) {
      view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: source}});
    },
  };
}
