export const helperOptions = {
  input_boolean: [['einschalten', 'turn_on'], ['ausschalten', 'turn_off'], ['umschalten', 'toggle']],
  counter: [['erhöhen', 'increment'], ['verringern', 'decrement'], ['zurücksetzen', 'reset']],
  timer: [['starten', 'start'], ['pausieren', 'pause'], ['abbrechen', 'cancel'], ['beenden', 'finish']]
};
function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function dateTemplate(date, op) {
  if (!validDate(date) || !['==', '>=', '<='].includes(op)) throw new Error('Datum: gültiges Kalenderdatum und Vergleich erforderlich.');
  return `{{ now().strftime('%Y-%m-%d') ${op} '${date}' }}`;
}
export function parseDateTemplate(template) {
  const match = typeof template === 'string' && template.match(/^\{\{ now\(\)\.strftime\('%Y-%m-%d'\) (==|>=|<=) '(\d{4}-\d{2}-\d{2})' \}\}$/);
  if (!match || !validDate(match[2])) throw new Error('Nur die unterstützte Datumsvorlage ist als Template-Bedingung importierbar.');
  return { op: match[1], date: match[2] };
}
