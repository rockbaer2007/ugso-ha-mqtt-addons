// UGSo Logic Studio 0.1.3 – HA adapter contract, not a browser runtime.
// Call run() from your server after an input changes. No automatic scheduling.
const cast = function cast(v,type){if(v===null||v===undefined||['unknown','unavailable',''].includes(v))throw Error('Eingangswert nicht verfügbar.');if(type==='BOOL'){if([true,'on','true',1].includes(v))return true;if([false,'off','false',0].includes(v))return false;throw Error('Wert ist kein BOOL.');}if(['REAL','INT','TIME'].includes(type)){const n=Number(v);if(!Number.isFinite(n)||typeof v==='boolean')throw Error('Wert ist keine gültige Zahl.');return type==='INT'?Math.trunc(n):n;}return String(v);};
export async function run({readState,callAction}) {
  const v0 = cast(await readState("input_boolean.demo_freigabe"),"BOOL");
  if (typeof v0 === 'number' && !Number.isFinite(v0)) throw new Error('Invalid numeric result: v0');
  const v1 = cast(await readState("input_boolean.demo_anwesend"),"BOOL");
  if (typeof v1 === 'number' && !Number.isFinite(v1)) throw new Error('Invalid numeric result: v1');
  const v2 = (v0 && v1);
  if (typeof v2 === 'number' && !Number.isFinite(v2)) throw new Error('Invalid numeric result: v2');
  await callAction("input_boolean." + (v2 ? 'turn_on' : 'turn_off'), {entity_id:"input_boolean.demo_licht"});
}
