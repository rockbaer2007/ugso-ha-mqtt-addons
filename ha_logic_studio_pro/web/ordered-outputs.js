export const orderedOutputTypes = ['ha_js_set_state', 'ha_js_toggle', 'ha_js_number', 'ha_js_text',
  'ha_js_action', 'ha_js_action_data', 'ha_js_press_button', 'ha_js_select_option',
  'ha_js_publish_mqtt', 'ha_js_notify', 'ha_js_fire_event', 'ha_js_script_control',
  'ha_js_control_target_action', 'ha_js_awtrix_notify', 'ha_js_awtrix_sound'];
export function registerOrderedOutputs(generator) {
  for (const type of orderedOutputTypes) {
    const generate = generator.forBlock[type];
    if (!generate) continue;
    generator.forBlock[type] = (block, code) => {
      const result = generate(block, code);
      // An explicitly delayed output schedules its own async continuation;
      // it must not turn the containing chain into a blocking delay.
      if (typeof result === 'string' && result.startsWith('ha.timeout(') && result.includes('() => { ha.')) {
        return result.replace('() => { ha.', 'async () => { await ha.');
      }
      // Only whole known output statements, never user text or value expressions.
      if (typeof result !== 'string' || !/^ha\.(setState|setNumber|setText|callAction|publishMqtt|notify|fireEvent)\(/.test(result)) {
        throw Error('Unexpected HA output generator: ' + type);
      }
      return 'await ' + result;
    };
  }
}
