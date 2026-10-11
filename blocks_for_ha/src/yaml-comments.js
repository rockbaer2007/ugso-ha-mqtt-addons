// Side metadata never becomes a Home Assistant configuration key.
const comments = new WeakMap();
export const getYamlComments = model => comments.get(model) || [];
export function setYamlComments(model, lines) {
  comments.set(model, lines.filter(text => typeof text === 'string' && text.trim()));
  return model;
}
