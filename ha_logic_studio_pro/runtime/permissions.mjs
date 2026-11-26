const patterns = {
  entity: /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/,
  event: /^[a-z][a-z0-9_]*$/,
  topic: /^[^+#\x00-\x1f\x7f]+$/,
};

// 'All' changes the allow-list only; identifier and operation validation remain.
export function permissionSet(values = [], all = false, kind = 'entity') {
  const entries = new Set(values);
  const pattern = patterns[kind];
  return {
    all: all === true,
    size: entries.size,
    has(value) {
      return typeof value === 'string' && value.length > 0 && value.length <= 128 &&
        pattern.test(value) && (all === true || entries.has(value));
    },
  };
}

export function runtimePermissions(config) {
  return {
    readable: permissionSet([...(config.readable ?? []), ...(config.writable ?? [])], config.readAll),
    writable: permissionSet(config.writable, config.writeAll),
    events: permissionSet(config.events, config.eventsAll, 'event'),
    mqttTopics: permissionSet(config.mqttTopics, config.mqttAll, 'topic'),
  };
}
