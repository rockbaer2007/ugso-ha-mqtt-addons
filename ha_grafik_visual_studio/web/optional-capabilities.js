// Declarations are information, never permission grants or arbitrary plugin code.
export const OPTIONAL_CAPABILITIES=new Set(['entity-state','history','light-color','climate']);
export function packageCapabilities(manifest){return (manifest.optionalCapabilities||[]).map(name=>({name,supported:OPTIONAL_CAPABILITIES.has(name)}));}
