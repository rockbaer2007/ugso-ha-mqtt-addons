// Keep the saved Logic Studio schema independent of the canvas library.
export const handleId = (side, pin) => `${side}/${pin}`;

export function endpoint(block, handle) {
  const slash = typeof handle === 'string' ? handle.indexOf('/') : -1;
  const side = slash < 0 ? '' : handle.slice(0, slash);
  if (!block || !['inputs', 'outputs'].includes(side) || !handle.slice(slash + 1)) {
    throw Error('Gültigen Bausteinanschluss wählen.');
  }
  return {block, side, pin: handle.slice(slash + 1)};
}

export function connectionEndpoints(connection) {
  return [endpoint(connection.source, connection.sourceHandle), endpoint(connection.target, connection.targetHandle)];
}

export function graphEdges(links) {
  return links.map((link, index) => ({
    id: JSON.stringify([link.from, link.to]),
    source: link.from[0], sourceHandle: handleId('outputs', link.from[1]),
    target: link.to[0], targetHandle: handleId('inputs', link.to[1]),
    type: 'smoothstep', data: {index}, ariaLabel: `Verbindung ${index + 1}`,
  }));
}

export function boundedPosition(position) {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw Error('Ungültige Bausteinposition.');
  return {x: Math.max(10, Math.min(12000, position.x)), y: Math.max(10, Math.min(60000, position.y))};
}
