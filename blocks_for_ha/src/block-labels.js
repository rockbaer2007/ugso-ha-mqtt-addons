import * as De from 'blockly/msg/de';
import * as En from 'blockly/msg/en';
import * as Fr from 'blockly/msg/fr';

// Standard Blockly wording, shared with ioBroker. Keep HA-specific inputs explicit.
export function alignBlockLabels(definition, locale) {
  const msg = { de: De, en: En, fr: Fr }[locale];
  const key = {
    ugso_not: 'LOGIC_NEGATE_TITLE', ugso_null: 'LOGIC_NULL',
    ugso_text_length: 'TEXT_LENGTH_TITLE', ugso_text_empty: 'TEXT_ISEMPTY_TITLE',
    ugso_text_append: 'TEXT_APPEND_TITLE', ugso_text_count: 'TEXT_COUNT_MESSAGE0',
    ugso_text_replace: 'TEXT_REPLACE_MESSAGE0', ugso_text_reverse: 'TEXT_REVERSE_MESSAGE0',
    ugso_text_join: 'TEXT_JOIN_TITLE_CREATEWITH', ugso_list_new: 'LISTS_CREATE_WITH_INPUT_WITH',
    ugso_list_length: 'LISTS_LENGTH_TITLE', ugso_list_empty: 'LISTS_ISEMPTY_TITLE',
    ugso_list_repeat: 'LISTS_REPEAT_TITLE', ugso_list_reverse: 'LISTS_REVERSE_MESSAGE0',
    ugso_math_clamp: 'MATH_CONSTRAIN_TITLE', ugso_math_random_int: 'MATH_RANDOM_INT_TITLE',
    ugso_math_random_fraction: 'MATH_RANDOM_FLOAT_TITLE_RANDOM', ugso_variable_change: 'MATH_CHANGE_TITLE',
    ugso_variable_set: 'VARIABLES_SET'
  }[definition.type];
  if (key) {
    definition.message0 = msg[key];
    if (['ugso_text_join', 'ugso_list_new'].includes(definition.type)) definition.message0 += ' %1';
    if (definition.type === 'ugso_list_repeat') definition.message0 = definition.message0.replace(/%1|%2/g, token => token === '%1' ? '%2' : '%1');
  }
  const custom = {
    ugso_text: ['“ %1 ”', '“ %1 ”', '« %1 »'],
    ugso_repeat: [`${msg.CONTROLS_REPEAT_TITLE} ${msg.CONTROLS_REPEAT_INPUT_DO} %2`],
    ugso_if_action: [`${msg.CONTROLS_IF_MSG_IF} %1 ${msg.CONTROLS_IF_MSG_THEN} %2`],
    ugso_foreach_variable: [`${msg.CONTROLS_FOREACH_TITLE} ${msg.CONTROLS_FOREACH_INPUT_DO} %3`],
    ugso_for_range: [`${msg.CONTROLS_FOR_TITLE} ${msg.CONTROLS_FOR_INPUT_DO} %5`],
    ugso_logic_default: ['wenn %1 %2 dann %3', 'if %1 %2 then %3', 'si %1 %2 alors %3'],
    ugso_list_set: ['in Variable %1 %2 Element %3 auf Wert %4', 'in variable %1 %2 item %3 to value %4', 'dans la variable %1 %2 l’élément %3 avec la valeur %4'],
    ugso_list_remove: ['in Listenvariable %1 entferne Element %2', 'in list variable %1 remove item %2', 'dans la variable liste %1 supprimer l’élément %2'],
    ugso_list_split: ['%1 erstellen %2 mit Trennzeichen %3', 'create %1 %2 with delimiter %3', 'créer %1 %2 avec le séparateur %3'],
    ugso_case: ['der Fall ist %1 %2', 'switch %1 %2', 'selon %1 %2'],
    ugso_ternary: [`${msg.LOGIC_TERNARY_CONDITION} %1 ${msg.LOGIC_TERNARY_IF_TRUE} %2 ${msg.LOGIC_TERNARY_IF_FALSE} %3`],
    ugso_text_contains: ['der Text %1 enthält den Wert %2', 'text %1 contains value %2', 'le texte %1 contient la valeur %2'],
    ugso_text_index: ['im Text %1 suche %2 Auftreten des Begriffs %3', 'in text %1 find %2 occurrence of %3', 'dans le texte %1 chercher la %2 occurrence de %3'],
    ugso_text_char: ['im Text %1 nimm %2 Buchstaben Position %3', 'in text %1 get %2 letter position %3', 'dans le texte %1 prendre la lettre %2 position %3'],
    ugso_text_slice: ['im Text %1 nimm Teil ab %2 bis %3 Buchstabe', 'in text %1 get substring from %2 to %3', 'dans le texte %1 extraire de %2 à %3'],
    ugso_text_case: ['%2 %1', '%2 %1', '%2 %1'],
    ugso_text_trim: ['%1 %2', '%1 %2', '%1 %2'],
    ugso_math_list: ['%1 %2', '%1 %2', '%1 %2'],
    ugso_colour_rgb: [`${msg.COLOUR_RGB_TITLE} ${msg.COLOUR_RGB_RED} %1 %% ${msg.COLOUR_RGB_GREEN} %2 %% ${msg.COLOUR_RGB_BLUE} %3 %%`],
    ugso_list_index: ['in der Liste %1 suche %2 Auftreten von %3', 'in list %1 find %2 occurrence of %3', 'dans la liste %1 chercher la %2 occurrence de %3'],
    ugso_list_get: ['in der Liste %1 nimm %2 Element Position %3', 'in list %1 get %2 item position %3', 'dans la liste %1 prendre l’élément %2 position %3'],
    ugso_list_slice: ['in der Liste %1 nimm Teilliste ab %2 bis %3 Element', 'in list %1 get sublist from %2 to %3', 'dans la liste %1 extraire de %2 à %3'],
    ugso_colour_blend: ['mische Farbe 1 %1 und Farbe 2 %2 im Verhältnis %3', 'blend colour 1 %1 and colour 2 %2 with ratio %3', 'mélanger la couleur 1 %1 et la couleur 2 %2 avec le rapport %3'],
    ugso_math_atan2: ['atan2 von X:%2 Y:%1', 'atan2 of X:%2 Y:%1', 'atan2 de X:%2 Y:%1'],
    ugso_time_compare: ['Aktuelle Zeit ist %1 %2', 'Current time is %1 %2', 'L’heure actuelle est %1 %2'],
    ugso_time_compare_input: ['Zeit %1 ist %2 %3', 'Time %1 is %2 %3', 'L’heure %1 est %2 %3'],
    ugso_convert_duration: ['Zeitdifferenz formatieren %1 Eingabe %2 nach %3', 'Format time difference %1 input %2 as %3', 'Formater la durée %1 entrée %2 en %3']
  }[definition.type];
  if (custom) definition.message0 = custom.length === 1 ? custom[0] : custom[['de', 'en', 'fr'].indexOf(locale)];
  for (const arg of definition.args0 || []) if (arg.options) {
    arg.options = arg.options.map(([label, value]) => {
      if (definition.type === 'ugso_math_arithmetic' && value === '**') label = msg.MATH_POWER_SYMBOL;
      if (definition.type === 'ugso_math_single' && value === 'abs') label = msg.MATH_SINGLE_OP_ABSOLUTE;
      if (definition.type === 'ugso_math_property' && value === 'whole') label = ({ de: 'eine ganze Zahl', en: 'a whole number', fr: 'un nombre entier' })[locale];
      if (definition.type === 'ugso_list_set' && arg.name === 'MODE') label = ({ set: msg.LISTS_SET_INDEX_SET, insert: msg.LISTS_SET_INDEX_INSERT })[value];
      if (definition.type === 'ugso_text_case') label = ({ upper: msg.TEXT_CHANGECASE_OPERATOR_UPPERCASE, lower: msg.TEXT_CHANGECASE_OPERATOR_LOWERCASE, title: msg.TEXT_CHANGECASE_OPERATOR_TITLECASE })[value];
      if (definition.type === 'ugso_text_trim') label = ({ strip: msg.TEXT_TRIM_OPERATOR_BOTH, lstrip: msg.TEXT_TRIM_OPERATOR_LEFT, rstrip: msg.TEXT_TRIM_OPERATOR_RIGHT })[value];
      if (definition.type === 'ugso_math_list') label = ({ sum: msg.MATH_ONLIST_OPERATOR_SUM, min: msg.MATH_ONLIST_OPERATOR_MIN, max: msg.MATH_ONLIST_OPERATOR_MAX, average: msg.MATH_ONLIST_OPERATOR_AVERAGE, median: msg.MATH_ONLIST_OPERATOR_MEDIAN, random: msg.MATH_ONLIST_OPERATOR_RANDOM })[value];
      if (definition.type === 'ugso_list_sort' && arg.name === 'MODE') label = ({ number: msg.LISTS_SORT_TYPE_NUMERIC, text: msg.LISTS_SORT_TYPE_TEXT, insensitive: msg.LISTS_SORT_TYPE_IGNORECASE })[value];
      return [label, value];
    });
  }
  return definition;
}
