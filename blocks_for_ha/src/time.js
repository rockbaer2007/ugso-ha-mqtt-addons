// Original HA/Jinja implementation; ioBroker's Time category is the UI reference.
const dropdown = (name, options) => ({ type: 'field_dropdown', name, options });
const input = (name, check) => ({ type: 'input_value', name, check });
const text = (name, value) => ({ type: 'field_input', name, text: value });
const operations = [['kleiner als', '<'], ['kleiner/gleich', '<='], ['größer als', '>'], ['größer/gleich', '>='], ['gleich', '=='], ['zwischen', 'between'], ['nicht zwischen', 'outside']];
const colour = '#8056a1';
export const timeDefinitions = [
  { type: 'ugso_time_compare', message0: 'Aktuelle Uhrzeit ist %1 %2', args0: [dropdown('OP', operations), text('START', '12:00')], output: ['Boolean', 'Value'], colour, extensions: ['ugso_time_shape'] },
  { type: 'ugso_time_compare_input', message0: 'Aktuelle Uhrzeit %1 ist %2 %3', args0: [{ type: 'field_checkbox', name: 'CURRENT', checked: true }, dropdown('OP', operations), input('START', 'String')], output: ['Boolean', 'Value'], colour, extensions: ['ugso_time_shape'] },
  { type: 'ugso_time_now', message0: 'Aktuelle Zeit als Datumswert', output: ['Time', 'Value'], colour, tooltip: 'Zeitzonenbewusster HA-Datumswert. Zum Rechnen oder Formatieren andocken.' },
  { type: 'ugso_time_boundary', message0: 'Berechnete Zeit %1', args0: [dropdown('PART', [['Beginn des Tages', 'day'], ['Beginn des nächsten Tages', 'tomorrow'], ['Beginn der Woche (Montag)', 'week'], ['Beginn des Monats', 'month'], ['Beginn des Jahres', 'year']])], output: ['Time', 'Value'], colour },
  { type: 'ugso_time_sun', message0: 'Nächste Sonnenzeit %1 Offset (Minuten) %2', args0: [dropdown('EVENT', [['Sonnenaufgang', 'next_rising'], ['Sonnenuntergang', 'next_setting'], ['Morgendämmerung', 'next_dawn'], ['Abenddämmerung', 'next_dusk'], ['Sonnenhöchststand', 'next_noon'], ['Sonnenmitternacht', 'next_midnight']]), input('OFFSET', 'Number')], output: ['Time', 'Value'], colour, tooltip: 'Nächstes Ereignis aus sun.sun, in HA-Ortszeit. Kann morgen sein. Fehlender Sonnenwert ergibt einen Template-Fehler.' },
  { type: 'ugso_time_shift', message0: 'Zeit berechnen %1 %2 %3 %4', args0: [input('BASE', 'Time'), dropdown('SIGN', [['+', '+'], ['−', '-']]), input('AMOUNT', 'Number'), dropdown('UNIT', [['Millisekunden', 'milliseconds'], ['Sekunden', 'seconds'], ['Minuten', 'minutes'], ['Stunden', 'hours'], ['Tage', 'days']])], output: ['Time', 'Value'], colour },
  { type: 'ugso_time_format', message0: 'Zeit %1 als %2', args0: [input('BASE', 'Time'), dropdown('FORMAT', [['Uhrzeit HH:mm', '%H:%M'], ['Uhrzeit HH:mm:ss', '%H:%M:%S'], ['Datum JJJJ-MM-TT', '%Y-%m-%d'], ['Datum TT.MM.JJJJ', '%d.%m.%Y'], ['Datum und Uhrzeit', '%d.%m.%Y %H:%M:%S'], ['ISO mit Zeitzone', 'iso'], ['Unix-Zeit (Sekunden)', 'unix']])], output: ['String', 'Value'], colour, tooltip: 'Formatierte Texte oder Unix-Zeit zur Anzeige/Variablenzuweisung. Für Zeitberechnungen den Datumswert verwenden.' }
];
export function installTimeShape(Blockly) {
  Blockly.Extensions.register('ugso_time_shape', function () {
    const dynamic = this.type === 'ugso_time_compare_input';
    const shape = (op = this.getFieldValue('OP'), current = this.getFieldValue('CURRENT')) => {
      const range = ['between', 'outside'].includes(op);
      if (range && !this.getInput('END')) {
        if (dynamic) this.appendValueInput('END').setCheck('String').appendField('und');
        else this.appendDummyInput('END').appendField('und').appendField(new Blockly.FieldTextInput('18:00'), 'END');
        if (dynamic) this.getInput('END').connection.setShadowState({ type: 'ugso_text', fields: { TEXT: '18:00' } });
      }
      if (!range && this.getInput('END')) this.removeInput('END');
      if (dynamic && current === 'FALSE' && !this.getInput('TIME')) {
        this.appendValueInput('TIME').setCheck('Time').appendField('verglichener Datumswert');
        this.getInput('TIME').connection.setShadowState({ type: 'ugso_time_now' });
      }
      if (current !== 'FALSE' && this.getInput('TIME')) this.removeInput('TIME');
    };
    this.getField('OP').setValidator(op => { shape(op); return op; });
    if (dynamic) {
      this.getField('CURRENT').setValidator(current => { shape(undefined, current); return current; });
      this.getInput('START').connection.setShadowState({ type: 'ugso_text', fields: { TEXT: '12:00' } });
    }
    this.setInputsInline(true);
    this.setTooltip('Uhrzeitvergleich in HA-Ortszeit. Zwischen: Start inklusive, Ende exklusiv; auch über Mitternacht. Gleiche Grenzen ergeben einen leeren Zeitraum. Kein Auslöser.');
  });
}
function clock(value) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw new Error('Uhrzeit: HH:mm oder HH:mm:ss erforderlich.');
  return JSON.stringify(value.length === 5 ? `${value}:00` : value);
}
export function timeExpression(block, child, numeric) {
  const field = name => block.getFieldValue(name);
  const base = () => child('BASE');
  switch (block.type) {
    case 'ugso_time_now': return 'now()';
    case 'ugso_time_boundary': {
      const day = "today_at('00:00')";
      return { day, tomorrow: `(${day} + timedelta(days=1))`, week: `(${day} - timedelta(days=now().weekday()))`, month: `${day}.replace(day=1)`, year: `${day}.replace(month=1, day=1)` }[field('PART')];
    }
    case 'ugso_time_sun': return `(as_local(as_datetime(state_attr('sun.sun', '${field('EVENT')}'))) + timedelta(minutes=${numeric('OFFSET')}))`;
    case 'ugso_time_shift': return `(${base()} ${field('SIGN')} timedelta(${field('UNIT')}=${numeric('AMOUNT')}))`;
    case 'ugso_time_format': return field('FORMAT') === 'unix' ? `as_timestamp(${base()})` : field('FORMAT') === 'iso' ? `${base()}.isoformat()` : `${base()}.strftime(${JSON.stringify(field('FORMAT'))})`;
    case 'ugso_time_compare': case 'ugso_time_compare_input': {
      const dynamic = block.type === 'ugso_time_compare_input';
      const time = dynamic && field('CURRENT') === 'FALSE' ? child('TIME') : 'now()';
      // Compare normalized wall-clock times; do not attach yesterday/tomorrow dates.
      const current = `${time}.strftime('%H:%M:%S')`;
      const boundary = name => dynamic ? `today_at(${child(name)}).strftime('%H:%M:%S')` : clock(field(name));
      const start = boundary('START'), op = field('OP');
      if (!['between', 'outside'].includes(op)) return `(${current} ${op} ${start})`;
      const end = boundary('END');
      const inside = `((${start} <= ${current} < ${end}) if ${start} <= ${end} else (${current} >= ${start} or ${current} < ${end}))`;
      return op === 'outside' ? `(not ${inside})` : inside;
    }
    default: return null;
  }
}
