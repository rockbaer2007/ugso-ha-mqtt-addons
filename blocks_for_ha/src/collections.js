// Original UGSo HA/Jinja generators. Blockly/ioBroker provide the feature references.
const v = name => ({ type: 'input_value', name, check: 'Value' });
const d = (name, options) => ({ type: 'field_dropdown', name, options });
const variable = { type: 'field_variable', name: 'VAR', variable: 'element' };
const action = { previousStatement: 'Action', nextStatement: 'Action' };
const value = { output: 'Value' }, number = { output: ['RuntimeNumber', 'Value'] }, bool = { output: ['Boolean', 'Value'] };
const position = [['vom Anfang', 'start'], ['vom Ende', 'end'], ['erstes', 'first'], ['letztes', 'last'], ['zufälliges', 'random']];
const define = (type, category, message0, args0, shape, description) => ({ type: `ugso_${type}`, category, message0, args0, inputsInline: type !== 'text_join', ...shape, colour: { Mathematik: '#5e62a1', Text: '#397b68', Listen: '#7658a0', Schleifen: '#3e8054' }[category], tooltip: description, description });
export const collectionDefinitions = [
  define('math_arithmetic', 'Mathematik', '%1 %2 %3', [v('A'), d('OP', [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/'], ['Potenz', '**']]), v('B')], number, 'Rechnet mit Zahlen: Addition, Subtraktion, Multiplikation, Division oder Potenz. Keine automatische Text-/Boolean-Konvertierung.'),
  define('math_single', 'Mathematik', '%1 %2', [d('OP', [['Quadratwurzel', 'sqrt'], ['Betrag', 'abs'], ['negativ', 'neg'], ['ln', 'log'], ['log10', 'log10'], ['e hoch', 'exp'], ['10 hoch', 'pow10']]), v('A')], number, 'Wurzel, Betrag, Negation, Logarithmen und Exponentialfunktionen. Ungültige Werte erzeugen einen Templatefehler.'),
  define('math_trig', 'Mathematik', '%1 %2', [d('OP', ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].map(x => [x, x])), v('A')], number, 'Winkelfunktionen in Grad; inverse Funktionen liefern Grad. HA verwendet intern Radiant.'),
  define('math_constant', 'Mathematik', '%1', [d('OP', [['π', 'pi'], ['e', 'e'], ['Goldener Schnitt', 'golden'], ['√2', 'sqrt2'], ['√½', 'sqrthalf']])], number, 'Endliche mathematische Konstanten. Unendlich wird nicht als exportierbarer Zahlenwert angeboten.'),
  define('math_property', 'Mathematik', '%1 ist %2', [v('A'), d('OP', [['gerade', 'even'], ['ungerade', 'odd'], ['ganzzahlig', 'whole'], ['positiv', 'positive'], ['negativ', 'negative'], ['teilbar durch', 'divisible']])], { ...bool, extensions: ['ugso_divisor_shape'] }, 'Zahleneigenschaften prüfen. Teiler erscheint nur bei teilbar durch; Nullteiler ist ungültig.'),
  define('math_round', 'Mathematik', '%1 %2 auf %3 Nachkommastellen', [d('OP', [['runde', 'common'], ['runde auf', 'ceil'], ['runde ab', 'floor']]), v('A'), { type: 'field_number', name: 'DIGITS', value: 2, min: 0, max: 10, precision: 1 }], number, 'Rundet auf 0–10 Nachkommastellen. HA/Jinja rundet halbe Werte zur geraden Zahl; Auf-/Abrunden folgen ceil/floor.'),
  define('math_list', 'Mathematik', '%1 über Liste %2', [d('OP', [['Summe', 'sum'], ['Minimum', 'min'], ['Maximum', 'max'], ['Mittelwert', 'average'], ['Median', 'median'], ['Zufallseintrag', 'random']]), v('LIST')], value, 'Statistik über eine Zahlenliste; Zufallseintrag akzeptiert beliebige Listenelemente. Leere Summe ist 0, andere leere Ergebnisse sind null.'),
  define('math_modulo', 'Mathematik', 'Rest von %1 ÷ %2', [v('A'), v('B')], number, 'Jinja-Modulo. Bei negativem Dividend folgt das Vorzeichen dem Teiler und kann von JavaScript abweichen.'),
  define('math_clamp', 'Mathematik', 'Begrenze %1 zwischen %2 und %3', [v('A'), v('MIN'), v('MAX')], number, 'Begrenzt einen Zahlenwert. Vertauschte Grenzen werden zuerst sortiert.'),
  define('math_random_int', 'Mathematik', 'Ganzzahlige Zufallszahl zwischen %1 und %2', [v('MIN'), v('MAX')], number, 'Inklusive beider ganzzahliger Grenzen. Höchstens 10000 mögliche Werte, vertauschte Grenzen sind erlaubt.'),
  define('math_random_fraction', 'Mathematik', 'Zufallszahl 0 bis kleiner 1', [], number, 'Zufallswert in Schritten von 0,00001. Kein kryptografischer Zufall; bei jeder Auswertung neu.'),
  define('math_atan2', 'Mathematik', 'Winkel atan2 y %1 x %2 in Grad', [v('Y'), v('X')], number, 'Vierquadranten-Winkelfunktion aus dem Blockly-Standard, zusätzlich zu den gezeigten Bildern.'),
  define('text_newline', 'Text', 'Neue Zeile %1', [d('MODE', [['LF (Unix)', 'lf'], ['CRLF (Windows)', 'crlf'], ['CR', 'cr']])], value, 'Liefert einen echten Zeilenumbruch für Textverknüpfung.'),
  define('text_join', 'Text', 'Erstelle Text aus %1', [{ type: 'input_dummy', name: 'HEADER' }], { ...value, mutator: 'ugso_rows' }, 'Verknüpft 0–100 Werte als Text. Zahnrad und +/− ändern die Anzahl der Eingänge.'),
  define('text_append', 'Text', 'An Variable %1 Text %2 anhängen', [variable, v('TEXT')], action, 'Weist der vorher initialisierten Textvariable einen neuen Text zu. Kein Schreiben einer HA-Entität.'),
  define('text_length', 'Text', 'Länge von Text %1', [v('TEXT')], number, 'Anzahl Unicode-Codepunkte, nicht JavaScript-UTF-16-Codeeinheiten.'),
  define('text_empty', 'Text', 'Text %1 ist leer', [v('TEXT')], bool, 'Prüft einen Text auf Länge 0.'),
  define('text_contains', 'Text', 'Text %1 enthält %2', [v('TEXT'), v('FIND')], bool, 'Prüft Teiltext, mit Groß-/Kleinschreibung.'),
  define('text_index', 'Text', 'In Text %1 suche %2 Auftreten von %3', [v('TEXT'), d('MODE', [['erstes', 'first'], ['letztes', 'last']]), v('FIND')], number, 'Position ab 1, nicht gefunden ergibt 0. Unicode-Codepunkte.'),
  define('text_char', 'Text', 'In Text %1 nimm %2 Zeichen Position %3', [v('TEXT'), d('MODE', position), v('INDEX')], value, 'Zeichen ab 1 vom Anfang/Ende, erstes/letztes oder zufälliges Zeichen. Außerhalb ergibt leeren Text.'),
  define('text_slice', 'Text', 'Teiltext aus %1 von %2 bis einschließlich %3', [v('TEXT'), v('START'), v('END')], value, 'Inklusive Grenzen ab 1 vom Anfang. Ungültige/umgekehrte Grenzen ergeben leeren Text.'),
  define('text_case', 'Text', 'Text %1 in %2', [v('TEXT'), d('MODE', [['GROSSBUCHSTABEN', 'upper'], ['kleinbuchstaben', 'lower'], ['Titelbuchstaben', 'title']])], value, 'Unicode-Text in Groß-, Klein- oder Titelbuchstaben umwandeln.'),
  define('text_trim', 'Text', 'Entferne Leerraum %1 in Text %2', [d('MODE', [['beidseitig', 'strip'], ['am Anfang', 'lstrip'], ['am Ende', 'rstrip']]), v('TEXT')], value, 'Entfernt äußeren Leerraum einschließlich Tabs und Zeilenumbrüchen.'),
  define('text_count', 'Text', 'Zähle %1 in Text %2', [v('FIND'), v('TEXT')], number, 'Zählt nicht überlappende Treffer; leerer Suchtext ergibt 0.'),
  define('text_replace', 'Text', 'Ersetze %1 durch %2 in Text %3', [v('FIND'), v('REPLACE'), v('TEXT')], value, 'Ersetzt alle wörtlichen Treffer, ohne Regex. Leerer Suchtext lässt den Text unverändert.'),
  define('text_reverse', 'Text', 'Kehre Text %1 um', [v('TEXT')], value, 'Zusätzlicher Blockly-Standardblock. Kehrt Unicode-Codepunkte um, nicht zusammengesetzte Grapheme.'),
  define('list_repeat', 'Listen', 'Liste mit %1 mal Element %2', [v('COUNT'), v('ITEM')], value, 'Neue Liste mit 0–10000 Wiederholungen eines Wertes.'),
  define('list_index', 'Listen', 'In Liste %1 suche %2 Auftreten von %3', [v('LIST'), d('MODE', [['erstes', 'first'], ['letztes', 'last']]), v('ITEM')], number, 'Position ab 1, nicht gefunden ergibt 0. HA/Python-Gleichheit statt JavaScript-Referenzgleichheit.'),
  define('list_get', 'Listen', 'In Liste %1 nimm %2 Element Position %3', [v('LIST'), d('MODE', position), v('INDEX')], value, 'Liest ab 1 vom Anfang/Ende, erstes/letztes oder zufälliges Element. Außerhalb/leere Liste ergibt null.'),
  define('list_set', 'Listen', 'In Variable %1 %2 Position %3 Wert %4', [variable, d('MODE', [['ersetze', 'set'], ['füge ein an', 'insert']]), v('INDEX'), v('ITEM')], action, 'Weist eine neue Liste mit ersetzt/eingefügtem Wert zu. Index ab 1; Einfügen erlaubt Länge+1. Ungültiger Index lässt die Liste unverändert.'),
  define('list_remove', 'Listen', 'Aus Listenvariable %1 entferne Position %2', [variable, v('INDEX')], action, 'Weist eine neue Liste ohne dieses Element zu. Index ab 1, ungültiger Index lässt die Liste unverändert.'),
  define('list_slice', 'Listen', 'Teilliste aus %1 von %2 bis einschließlich %3', [v('LIST'), v('START'), v('END')], value, 'Kopie eines Bereichs, inklusive Grenzen ab 1 vom Anfang. Umgekehrte/ungültige Grenzen ergeben eine leere Liste.'),
  define('list_split', 'Listen', '%1 Wert %2 Trennzeichen %3', [d('MODE', [['Liste aus Text', 'split'], ['Text aus Liste', 'join']]), v('VALUE'), v('DELIMITER')], value, 'Text anhand eines wörtlichen Trennzeichens teilen oder Liste verbinden. Leeres Trennzeichen teilt in Unicode-Zeichen.'),
  define('list_sort', 'Listen', 'Liste %1 %2 %3 sortieren', [v('LIST'), d('MODE', [['numerisch', 'number'], ['als Text', 'text'], ['Text ohne Groß-/Kleinschreibung', 'insensitive']]), d('ORDER', [['aufsteigend', 'asc'], ['absteigend', 'desc']])], value, 'Neue sortierte Liste; Original bleibt erhalten. Numerischer Modus verlangt Zahlen, Textmodus wandelt Elemente in Text um.'),
  define('list_reverse', 'Listen', 'Kehre Liste %1 um', [v('LIST')], value, 'Neue Liste in umgekehrter Reihenfolge; Original bleibt erhalten.'),
  define('for_range', 'Schleifen', 'Zähle %1 von %2 bis %3 in Schritten von %4 mache %5', [variable, ...['FROM', 'TO', 'STEP'].map(name => ({ ...v(name), check: 'Number' })), { type: 'input_statement', name: 'DO', check: 'Action' }], action, 'Feste ganze Grenzen, inklusive Ende wenn auf dem Schrittraster. Auf-/absteigend automatisch, Schrittbetrag >0, höchstens 10000 Durchläufe. HA repeat.for_each mit Variable pro Durchlauf.'),
  define('foreach_variable', 'Schleifen', 'Für jeden Wert %1 aus Liste %2 mache %3', [variable, v('LIST'), { type: 'input_statement', name: 'DO', check: 'Action' }], action, 'HA repeat.for_each mit benannter Variable, vor dem Körper aus repeat.item gesetzt. Wiederverwendung derselben Variable in verschachtelten Schleifen vermeiden.')
];

export function installCollectionShape(Blockly) {
  Blockly.Extensions.register('ugso_divisor_shape', function () {
    this.getField('OP').setValidator(mode => {
      if (mode === 'divisible' && !this.getInput('B')) {
        this.appendValueInput('B').setCheck('Value').connection.setShadowState({ type: 'ugso_number', fields: { NUM: 2 } });
      } else if (mode !== 'divisible' && this.getInput('B')) this.removeInput('B');
      return mode;
    });
  });
}

// Typed guards intentionally fail at runtime instead of treating bad states as zero.
const numericValue = x => `((${x}) if (${x}) is number and (${x}) is not boolean else (none + 0))`;
const stringValue = x => `((${x}) if (${x}) is string else (none + 0))`;
const listValue = x => `((${x}) if (${x}) is sequence and (${x}) is not string and (${x}) is not mapping else (none + 0))`;
const integerValue = x => `((${x}) if (${x}) is integer else (none + 0))`;
export function collectionExpression(block, child) {
  const f = n => block.getFieldValue(n), n = name => numericValue(child(name)), t = name => stringValue(child(name)), l = name => listValue(child(name));
  const index = base => f('MODE') === 'end' ? `((${base} | length) - ${integerValue(child('INDEX'))})` : f('MODE') === 'first' ? '0' : f('MODE') === 'last' ? `((${base} | length) - 1)` : `(${integerValue(child('INDEX'))} - 1)`;
  const slice = (base, empty) => `(${base}[${integerValue(child('START'))} - 1:${integerValue(child('END'))}] if ${integerValue(child('START'))} > 0 and ${integerValue(child('END'))} >= ${integerValue(child('START'))} else ${empty})`;
  switch (block.type) {
    case 'ugso_math_arithmetic': return `(${n('A')} ${f('OP')} ${n('B')})`;
    case 'ugso_math_single': { const a = n('A'); return ({ sqrt: `sqrt(${a})`, abs: `(${a} | abs)`, neg: `(-${a})`, log: `log(${a})`, log10: `log(${a}, 10)`, exp: `(e ** ${a})`, pow10: `(10 ** ${a})` })[f('OP')]; }
    case 'ugso_math_trig': return ['asin', 'acos', 'atan'].includes(f('OP')) ? `(${f('OP')}(${n('A')}) * 180 / pi)` : `${f('OP')}(${n('A')} * pi / 180)`;
    case 'ugso_math_constant': return ({ pi: 'pi', e: 'e', golden: '((1 + sqrt(5)) / 2)', sqrt2: 'sqrt(2)', sqrthalf: 'sqrt(0.5)' })[f('OP')];
    case 'ugso_math_property': { const a = n('A'); return ({ even: `(${a} % 2 == 0)`, odd: `(${a} % 2 != 0 and ${a} % 1 == 0)`, whole: `(${a} % 1 == 0)`, positive: `(${a} > 0)`, negative: `(${a} < 0)`, divisible: `(${a} % ${f('OP') === 'divisible' ? n('B') : '1'} == 0)` })[f('OP')]; }
    case 'ugso_math_round': return `(${n('A')} | round(${f('DIGITS')}, ${JSON.stringify(f('OP'))}))`;
    case 'ugso_math_list': { const a = l('LIST'), op = f('OP'); const checked = `(${a} if (${a} | select('number') | reject('boolean') | list | length) == (${a} | length) else none)`; const result = ['average', 'median'].includes(op) ? `${op}(${checked})` : `((${op === 'random' ? a : checked}) | ${op})`; return op === 'sum' ? result : `(${result} if (${a} | length) > 0 else none)`; }
    case 'ugso_math_modulo': return `(${n('A')} % ${n('B')})`;
    case 'ugso_math_clamp': return `([([${n('A')}, ([${n('MIN')}, ${n('MAX')}] | min)] | max), ([${n('MIN')}, ${n('MAX')}] | max)] | min)`;
    case 'ugso_math_random_int': { const a = integerValue(child('MIN')), b = integerValue(child('MAX')), lo = `([${a}, ${b}] | min)`, hi = `([${a}, ${b}] | max)`; return `(range(${lo}, ${hi} + 1) | random if ${hi} - ${lo} < 10000 else (none + 1))`; }
    case 'ugso_math_random_fraction': return `((range(0, 100000) | random) / 100000)`;
    case 'ugso_math_atan2': return `(atan2(${n('Y')}, ${n('X')}) * 180 / pi)`;
    case 'ugso_text_newline': return JSON.stringify(({ lf: '\n', crlf: '\r\n', cr: '\r' })[f('MODE')]);
    case 'ugso_text_join': return `([${Array.from({ length: block.rowCount_ }, (_, i) => child(`V${i}`)).join(', ')}] | join(''))`;
    case 'ugso_text_length': return `(${t('TEXT')} | length)`;
    case 'ugso_text_empty': return `(${t('TEXT')} | length == 0)`;
    case 'ugso_text_contains': return `(${t('FIND')} in ${t('TEXT')})`;
    case 'ugso_text_index': return `(${t('TEXT')}.${f('MODE') === 'first' ? 'find' : 'rfind'}(${t('FIND')}) + 1)`;
    case 'ugso_text_char': case 'ugso_list_get': { const text = block.type === 'ugso_text_char', base = text ? t('TEXT') : l('LIST'), fallback = text ? '""' : 'none'; if (f('MODE') === 'random') return `((${base} | random) if (${base} | length) > 0 else ${fallback})`; const i = index(base); return `(${base}[${i}] if 0 <= ${i} < (${base} | length) else ${fallback})`; }
    case 'ugso_text_slice': return slice(t('TEXT'), '""');
    case 'ugso_text_case': return `(${t('TEXT')} | ${f('MODE')})`;
    case 'ugso_text_trim': return `${t('TEXT')}.${f('MODE')}()`;
    case 'ugso_text_count': return `(${t('TEXT')}.count(${t('FIND')}) if ${t('FIND')} != "" else 0)`;
    case 'ugso_text_replace': return `(${t('TEXT')}.replace(${t('FIND')}, ${t('REPLACE')}) if ${t('FIND')} != "" else ${t('TEXT')})`;
    case 'ugso_text_reverse': return `${t('TEXT')}[::-1]`;
    case 'ugso_list_repeat': { const c = integerValue(child('COUNT')); return `([${child('ITEM')}] * ${c} if 0 <= ${c} <= 10000 else (none + 1))`; }
    case 'ugso_list_index': { const a = l('LIST'), item = child('ITEM'); return f('MODE') === 'first' ? `(${a}.index(${item}) + 1 if ${item} in ${a} else 0)` : `((${a} | length) - ${a}[::-1].index(${item}) if ${item} in ${a} else 0)`; }
    case 'ugso_list_slice': return slice(l('LIST'), '[]');
    case 'ugso_list_split': return f('MODE') === 'split' ? `(${stringValue(child('VALUE'))}.split(${t('DELIMITER')}) if ${t('DELIMITER')} != "" else (${stringValue(child('VALUE'))} | list))` : `(${listValue(child('VALUE'))} | join(${t('DELIMITER')}))`;
    case 'ugso_list_sort': { const a = l('LIST'), mode = f('MODE'); const base = mode === 'number' ? `(${a} if (${a} | select('number') | reject('boolean') | list | length) == (${a} | length) else none)` : `(${a} | map('string') | list)`; return `(${base} | sort(reverse=${f('ORDER') === 'desc' ? 'true' : 'false'}, case_sensitive=${mode === 'insensitive' ? 'false' : 'true'}))`; }
    case 'ugso_list_reverse': return `${l('LIST')}[::-1]`;
    default: throw new Error('Unbekannter Rechen-/Text-/Listenblock.');
  }
}

export function collectionAction(block, { child, variableName, actions, number: readNumber }) {
  const name = () => variableName(), assign = expr => ({ variables: { [name()]: `{{ ${expr} }}` } });
  switch (block.type) {
    case 'ugso_text_append': return assign(`(${stringValue(name())} ~ ${stringValue(child('TEXT'))})`);
    case 'ugso_list_set': case 'ugso_list_remove': { const a = listValue(name()), i = `(${integerValue(child('INDEX'))} - 1)`, insert = block.getFieldValue('MODE') === 'insert'; const expr = block.type === 'ugso_list_remove' ? `(${a}[:${i}] + ${a}[${i} + 1:])` : `(${a}[:${i}] + [${child('ITEM')}] + ${a}[${i}${insert ? '' : ' + 1'}:])`; return assign(`(${expr} if 0 <= ${i} ${insert ? '<=' : '<'} (${a} | length) else ${a})`); }
    case 'ugso_for_range': {
      const [start, end, step] = ['FROM', 'TO', 'STEP'].map(n => readNumber(n));
      if (![start, end, step, end + (start <= end ? 1 : -1)].every(Number.isSafeInteger) || step === 0 || Math.floor(Math.abs(end - start) / Math.abs(step)) + 1 > 10000) throw new Error('Zählschleife: ganze Grenzen, Schritt ungleich 0, höchstens 10000 Durchläufe.');
      const direction = start <= end ? 1 : -1;
      return { repeat: { for_each: `{{ range(${start}, ${end + direction}, ${Math.abs(step) * direction}) | list }}`, sequence: [{ variables: { [name()]: '{{ repeat.item }}' } }, ...actions('DO')] } };
    }
    case 'ugso_foreach_variable': return { repeat: { for_each: `{{ ${listValue(child('LIST'))} | list }}`, sequence: [{ variables: { [name()]: '{{ repeat.item }}' } }, ...actions('DO')] } };
    default: return null;
  }
}

const num = x => ({ shadow: { type: 'ugso_number', fields: { NUM: x } } }), txt = x => ({ shadow: { type: 'ugso_text', fields: { TEXT: x } } });
const list = () => ({ shadow: { type: 'ugso_list_new', extraState: { rows: 3 }, inputs: { V0: num(3), V1: num(1), V2: num(2) } } });
export function collectionToolbox(category) {
  return collectionDefinitions.filter(d => d.category === category).map(def => {
    const inputs = {};
    for (const input of def.args0.filter(a => a.type === 'input_value')) inputs[input.name] = input.name === 'LIST' ? list() : ['TEXT', 'FIND', 'REPLACE', 'DELIMITER'].includes(input.name) ? txt(({ TEXT: 'abc abc', FIND: 'abc', REPLACE: 'xyz', DELIMITER: ',' })[input.name]) : input.name === 'VALUE' ? txt('a,b,c') : num(({ MIN: 1, MAX: 100, A: 9, B: 2, COUNT: 3, INDEX: 1, START: 1, END: 3, FROM: 1, TO: 10, STEP: 1, X: 1, Y: 1, ITEM: 1 })[input.name] ?? 1);
    if (def.type === 'ugso_text_join') inputs.V0 = txt('Hallo');
    return { kind: 'block', type: def.type, inputs };
  });
}
