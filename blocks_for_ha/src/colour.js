// Original HA/Jinja generators, inspired by @blockly/field-colour.
const input = name => ({ type: 'input_value', name, check: 'Value' });
const define = (type, message0, args0, description) => ({ type, message0, args0, output: ['Colour', 'Value'], colour: '#ad6841', tooltip: description, description });
export const colourDefinitions = [
  define('ugso_colour_random', 'Zufällige Farbe', [], 'Erzeugt bei jeder Auswertung eine RGB-Liste mit drei zufälligen Kanälen von 0 bis 255.'),
  define('ugso_colour_rgb', 'Farbe aus Rot %1 %% Grün %2 %% Blau %3 %%', ['R', 'G', 'B'].map(input), 'RGB-Anteile in Prozent. Zahlen werden auf 0–100 begrenzt, in 0–255 umgerechnet und kaufmännisch gerundet.'),
  define('ugso_colour_blend', 'Mische Farbe %1 und Farbe %2 Anteil Farbe 2 %3', ['FIRST', 'SECOND', 'RATIO'].map(input), 'Lineare Mischung der RGB-Kanäle. Anteil 0 = erste Farbe, 1 = zweite Farbe. Keine Gamma-Korrektur; Ergebnis ist eine RGB-Liste.')
];
const numeric = x => `(${x} if (${x}) is number and (${x}) is not boolean and (${x}) > -1e308 and (${x}) < 1e308 else (none + 0))`;
const clamp = (x, max) => `([0, ([${numeric(x)}, ${max}] | min)] | max)`;
export function colourExpression(block, child) {
  if (block.type === 'ugso_colour') {
    const hex = block.getFieldValue('COLOUR');
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Farbe: #rrggbb erwartet.');
    return JSON.stringify([1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  }
  if (block.type === 'ugso_colour_random') return '[range(256) | random, range(256) | random, range(256) | random]';
  if (block.type === 'ugso_colour_rgb') return `[${['R', 'G', 'B'].map(n => `((${clamp(child(n), 100)} * 255 / 100 + 0.5) | round(0, 'floor') | int)`).join(', ')}]`;
  if (block.type === 'ugso_colour_blend') {
    const rgb = name => colourInput(block.getInputTargetBlock(name), child(name));
    const ratio = clamp(child('RATIO'), 1);
    // map consumes each colour once, including nested random colours.
    return `(zip((${rgb('FIRST')}) | map('multiply', (1 - ${ratio})), (${rgb('SECOND')}) | map('multiply', ${ratio})) | map('sum') | map('add', 0.5) | map('round', 0, 'floor') | map('int') | list)`;
  }
  throw new Error('Farbe: unbekannter Farbblock.');
}
export function colourInput(block, value) {
  if (block?.type === 'ugso_colour' || colourDefinitions.some(d => d.type === block?.type)) return value;
  const valid = `(${value}) is sequence and (${value}) is not string and (${value}) is not mapping and (${value}) | length == 3 and (${value}) | select('number') | reject('boolean') | list | length == 3 and (${value}) | min >= 0 and (${value}) | max <= 255`;
  return `((${value}) | map('round', 0, 'floor') | map('int') | list if ${valid} else (none + 0))`;
}
export function colourToolbox() {
  const shadow = (type, fields) => ({ shadow: { type, fields } });
  return [
    { kind: 'block', type: 'ugso_colour' },
    { kind: 'block', type: 'ugso_colour_random' },
    { kind: 'block', type: 'ugso_colour_rgb', inputs: Object.fromEntries([['R', 100], ['G', 50], ['B', 0]].map(([n, x]) => [n, shadow('ugso_number', { NUM: x })])) },
    { kind: 'block', type: 'ugso_colour_blend', inputs: { FIRST: shadow('ugso_colour', { COLOUR: '#ff0000' }), SECOND: shadow('ugso_colour', { COLOUR: '#0000ff' }), RATIO: shadow('ugso_number', { NUM: .5 }) } }
  ];
}
