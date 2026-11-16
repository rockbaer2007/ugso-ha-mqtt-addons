export function logBlockDefinitions(body) {
  return [
    ['system_log', [
      'Ereignis: Log-Nachricht %1 %2',
      'Event: Log message %1 %2',
      'Événement : Message du journal %1 %2',
    ], [{
      type: 'field_dropdown', name: 'SEVERITY',
      options: [['WARNING', 'Warnung', 'Warning', 'Avertissement'], ['ERROR', 'Fehler', 'Error', 'Erreur']],
    }, body]],
    ['system_log_data', ['Log %1', 'Log %1', 'Journal %1'], [{
      type: 'field_dropdown', name: 'ATTR',
      options: [['data.message', 'Meldung', 'Message', 'Message'], ['data.severity', 'Loglevel', 'Log level', 'Niveau de journalisation']],
    }], 'String'],
  ];
}

export function importLogBlock(type, fields, block) {
  if (type === 'onLog' && ['warn', 'error'].includes(fields.Severity ?? 'error')) {
    return block('ha_js_system_log', {SEVERITY: (fields.Severity ?? 'error') === 'warn' ? 'WARNING' : 'ERROR'}, {STATEMENT: 'BODY'});
  }
  if (type === 'onLog_data' && ['data.message', 'data.severity'].includes(fields.ATTR ?? 'data.message')) {
    return block('ha_js_system_log_data', {ATTR: fields.ATTR ?? 'data.message'});
  }
  return null;
}

export function systemLogCallback(level, body) {
  return `async (ugsoSystemLog) => {
  if (ugsoSystemLog?.level !== ${JSON.stringify(level)}) return;
${body}}`;
}

export function systemLogExpression(attribute) {
  if (attribute === 'data.severity') {
    return '(ugsoSystemLog.level === "WARNING" ? "warn" : "error")';
  }
  return '(Array.isArray(ugsoSystemLog.message) ? ugsoSystemLog.message[0] : ugsoSystemLog.message) ?? ""';
}
