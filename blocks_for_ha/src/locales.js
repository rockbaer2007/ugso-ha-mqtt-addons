// Presentation only: never translate IDs, field values, variables or user content.
export const languageKey = 'ugso-blocks-for-ha-language';
export const languages = ['de', 'en', 'fr'];
export function resolveLanguage(preference = 'system', browserLanguages = ['de']) {
  if (languages.includes(preference)) return preference;
  for (const tag of browserLanguages) {
    const language = String(tag).toLowerCase().split(/[-_]/)[0];
    if (languages.includes(language)) return language;
  }
  return 'en';
}
export function readLanguage(storage) {
  try { const value = storage.getItem(languageKey); return [...languages, 'system'].includes(value) ? value : 'system'; }
  catch { return 'system'; }
}
function browserPreference() { try { return readLanguage(window.localStorage); } catch { return 'system'; } }
export const languagePreference = typeof window === 'undefined' ? 'de' : browserPreference();
export const language = resolveLanguage(languagePreference, typeof navigator === 'undefined' ? ['de'] : navigator.languages);
export const documentationPath = page => `https://opensource.ugso-software.de/${language === 'de' ? '' : `${language}/`}projects/blocks-for-ha/${page}`;

// [English label, French label, English help, French help]. Placeholders stay ordered.
export const blockTranslations = {
  ugso_time_compare: ['Current time is %1 %2', "L’heure actuelle est %1 %2"],
  ugso_time_compare_input: ['Current time %1 is %2 %3', "L’heure actuelle %1 est %2 %3"],
  ugso_time_now: ['Current time as date value', 'Heure actuelle comme date', 'Timezone-aware HA date value for calculations or formatting.', 'Date HA avec fuseau horaire, pour les calculs ou le formatage.'],
  ugso_time_boundary: ['Calculated time %1', 'Date calculée %1'],
  ugso_time_sun: ['Next solar event %1 offset (minutes) %2', 'Prochain événement solaire %1 décalage (minutes) %2', 'Next sun.sun event in HA local time; it may be tomorrow. A missing value causes a template error.', 'Prochain événement de sun.sun en heure locale HA, éventuellement demain. Une valeur absente provoque une erreur de modèle.'],
  ugso_time_shift: ['Calculate time %1 %2 %3 %4', 'Calculer la date %1 %2 %3 %4'],
  ugso_time_format: ['Time %1 as %2', 'Date %1 au format %2', 'Formatted text or Unix time for display or variables. Use the date value for calculations.', 'Texte formaté ou temps Unix pour l’affichage ou les variables. Utiliser la date pour les calculs.'],
  ugso_convert_number: ['To number %1', 'Convertir en nombre %1', 'HA float(): complete decimal number, no parseFloat prefix or silent fallback. Runtime number for comparisons, variables and date arithmetic; not a fixed trigger threshold.', 'HA float() : nombre décimal complet, sans préfixe parseFloat ni valeur de secours implicite. Pour comparaisons, variables et calculs de dates, pas pour un seuil fixe de déclencheur.'],
  ugso_convert_boolean: ['To Boolean %1', 'Convertir en booléen %1', 'HA bool(): true/false, on/off, yes/no, 1/0. Unrecognized values cause a template error.', 'HA bool() : true/false, on/off, yes/no, 1/0. Une valeur non reconnue provoque une erreur de modèle.'],
  ugso_convert_string: ['To string %1', 'Convertir en texte %1', 'Jinja text representation, not JSON serialization. Booleans become True/False.', 'Représentation textuelle Jinja, sans sérialisation JSON. Les booléens deviennent True/False.'],
  ugso_convert_type: ['Type of %1', 'Type de %1', 'HA typeof(): Python type names such as str, int, float, bool, dict, list or NoneType. Requires HA 2023.4 or later.', 'HA typeof() : noms de types Python, str, int, float, bool, dict, list ou NoneType. HA 2023.4 ou ultérieur.'],
  ugso_convert_datetime: ['To date/time %1 input %2', 'Convertir en date/heure %1 entrée %2', 'Prefer ISO text with Z or an explicit timezone offset. Select Unix units explicitly. Result in HA local time; invalid input causes a template error.', 'Préférer un texte ISO avec Z ou décalage de fuseau explicite. Choisir l’unité Unix. Résultat en heure locale HA ; une entrée invalide provoque une erreur de modèle.'],
  ugso_convert_date_format: ['Date/time %1 to %2', 'Date/heure %1 vers %2'],
  ugso_convert_duration: ['Time difference %1 input %2 to %3', 'Durée %1 entrée %2 vers %3', 'Numeric duration, default milliseconds as in ioBroker. Fractions of seconds are truncated. Hours/minutes may exceed 24/60; the sign is preserved.', 'Durée numérique, en millisecondes par défaut comme dans ioBroker. Fractions de seconde tronquées. Heures/minutes peuvent dépasser 24/60 ; signe conservé.'],
  ugso_convert_from_json: ['JSON to value %1', 'JSON vers valeur %1', 'HA from_json: object, list or scalar. Invalid JSON causes an error, not an empty fallback object.', 'HA from_json : objet, liste ou valeur simple. JSON invalide : erreur, sans objet vide de secours.'],
  ugso_convert_to_json: ['Value to JSON %1 pretty print %2', 'Valeur vers JSON %1 indenter %2', 'HA to_json with optional indentation. Convert dates to ISO text or Unix numbers first.', 'HA to_json avec indentation facultative. Convertir les dates en texte ISO ou nombre Unix auparavant.'],
  ugso_pause: ['Pause %1 %2', 'Pause %1 %2', 'Native HA delay. Input must return a number; HA validates runtime values when executing. Milliseconds do not guarantee real-time precision.', 'Délai natif HA. L’entrée doit fournir un nombre, vérifié à l’exécution. Les millisecondes ne garantissent pas une précision temps réel.'],
  ugso_wait: ['Wait until %1 at most %2 %3 continue on timeout %4', 'Attendre que %1 pendant au plus %2 %3 continuer après expiration %4', 'HA wait_template with timeout. Unchecked: timeout stops this run. Use entity-dependent conditions; time alone does not continuously refresh the template.', 'HA wait_template avec expiration. Sans coche : arrêt de cette exécution à l’expiration. Utiliser des conditions liées aux entités ; l’heure seule ne rafraîchit pas continuellement le modèle.'],
  ugso_stop: ['Stop this run %1 as error %2', 'Arrêter cette exécution %1 comme erreur %2', 'Stops the current HA run including outer loops. Does not cancel a named ioBroker timer.', 'Arrête l’exécution HA actuelle, y compris les boucles englobantes. Ne supprime pas un temporisateur nommé ioBroker.'],
  ugso_repeat: ['Repeat %1 times do %2', 'Répéter %1 fois faire %2', 'Native HA repeat.count. repeat.index is 1-based. Runtime count must be a positive integer.', 'HA repeat.count natif. repeat.index commence à 1. Le nombre de répétitions doit être un entier positif.'],
  ugso_repeat_while: ['Repeat %1 %2 do %3', 'Répéter %1 %2 faire %3', 'While checks before each iteration; until checks afterwards and runs at least once. Add a pause to avoid a tight infinite loop. No background interval.', 'Tant que vérifie avant chaque tour ; jusqu’à vérifie après et exécute au moins un tour. Ajouter une pause pour éviter une boucle infinie intensive. Aucun intervalle en arrière-plan.'],
  ugso_foreach: ['For each item in %1 do %2', 'Pour chaque élément de %1 faire %2', 'HA repeat.for_each. Current item: {{ repeat.item }}, index: {{ repeat.index }}. Input must be a list.', 'HA repeat.for_each. Élément : {{ repeat.item }}, indice : {{ repeat.index }}. L’entrée doit être une liste.'],
  ugso_object_new: ['New object %1', 'Nouvel objet %1', 'Local dictionary with named attributes. Add entries using the cog or +/−. Neither an HA entity nor an ioBroker data point.', 'Dictionnaire local à attributs nommés. Ajouter des entrées avec l’engrenage ou +/−. Ce n’est ni une entité HA ni un point de données ioBroker.'],
  ugso_object_get: ['Attribute %1 of object %2', 'Attribut %1 de l’objet %2', 'Reads a dictionary key, including keys/items. Missing key returns null; invalid object type causes an HA template error.', 'Lit une clé du dictionnaire, y compris keys/items. Clé absente : null ; type d’objet invalide : erreur de modèle HA.'],
  ugso_object_has: ['Object %1 has attribute %2', 'L’objet %1 possède l’attribut %2'],
  ugso_object_keys: ['Attributes of object %1', 'Attributs de l’objet %1', 'List of dictionary keys, for iteration or JSON output.', 'Liste des clés du dictionnaire, pour parcourir les éléments ou produire du JSON.'],
  ugso_object_set: ['Set attribute %1 in variable %2 to %3', 'Définir l’attribut %1 de la variable %2 à %3', 'Assigns a new dictionary with the changed key to this HA variable. Initialize it as an object first. Other variables and HA attributes are not mutated.', 'Affecte à cette variable HA un nouveau dictionnaire avec la clé modifiée. Initialiser la variable comme objet. Les autres variables et attributs HA restent inchangés.'],
  ugso_object_remove: ['Remove attribute %1 from variable %2', 'Supprimer l’attribut %1 de la variable %2', 'Assigns a new dictionary without this key. A missing key leaves content unchanged. The variable must already contain an object.', 'Affecte un nouveau dictionnaire sans cette clé. Une clé absente laisse le contenu inchangé. La variable doit déjà contenir un objet.'],
  ugso_logic_default: ['If %1 is %2 use fallback %3', 'Si %1 est %2 utiliser %3', 'Null mode preserves 0, false and empty text. Empty mode also replaces falsy values, including empty lists/objects. Python/Jinja rules differ from JavaScript.', 'Le mode null conserve 0, false et le texte vide. Le mode vide remplace aussi les valeurs fausses, listes/objets vides inclus. Règles Python/Jinja différentes de JavaScript.'],
  ugso_case: ['Switch on %1 %2', 'Selon la valeur %1 %2', 'Executes only the first matching action chain, otherwise the default branch. Native HA choose, no JavaScript fallthrough.', 'Exécute uniquement la première branche correspondante, sinon la branche par défaut. HA choose natif, sans passage aux cas suivants de JavaScript.'],
  ugso_list_new: ['List %1', 'Liste %1'],
  ugso_list_length: ['Length of list %1', 'Longueur de la liste %1', 'Number of list items, usable as a runtime number. Input must be a list.', 'Nombre d’éléments, utilisable comme nombre à l’exécution. L’entrée doit être une liste.'],
  ugso_list_empty: ['List %1 is empty', 'La liste %1 est vide', 'Tests list length, not a general JavaScript falsy check.', 'Vérifie la longueur d’une liste, pas une valeur fausse générale de JavaScript.'],
  ugso_math_arithmetic: [null, null, 'Numeric addition, subtraction, multiplication, division or exponentiation. No automatic text/Boolean conversion.', 'Addition, soustraction, multiplication, division ou puissance de nombres. Aucune conversion automatique des textes/booléens.'],
  ugso_math_single: [null, null, 'Square root, absolute value, negation, logarithms and exponentials. Invalid values cause a template error.', 'Racine carrée, valeur absolue, négation, logarithmes et exponentielles. Valeurs invalides : erreur de modèle.'],
  ugso_math_trig: [null, null, 'Angles in degrees; inverse functions return degrees. HA internally uses radians.', 'Angles en degrés ; fonctions inverses en degrés. HA utilise des radians en interne.'],
  ugso_math_constant: [null, null, 'Finite mathematical constants. Infinity is not offered as an exportable numeric value.', 'Constantes mathématiques finies. L’infini n’est pas proposé comme valeur numérique exportable.'],
  ugso_math_property: ['%1 is %2', '%1 est %2', 'Checks number properties. Divisor appears only for divisibility; zero divisor is invalid.', 'Vérifie les propriétés d’un nombre. Diviseur visible uniquement pour la divisibilité ; zéro est invalide.'],
  ugso_math_round: ['%1 %2 to %3 decimal places', '%1 %2 à %3 décimales', 'Rounds to 0–10 decimal places. HA/Jinja uses ties-to-even rounding; round up/down follows ceil/floor.', 'Arrondit à 0–10 décimales. HA/Jinja arrondit les égalités vers le pair ; supérieur/inférieur suit ceil/floor.'],
  ugso_math_list: ['%1 of list %2', '%1 de la liste %2', 'Numeric list statistics; random item accepts any element. Empty sum is 0, other empty results are null.', 'Statistiques d’une liste numérique ; élément aléatoire de tout type. Somme vide : 0 ; autres résultats vides : null.'],
  ugso_math_modulo: ['Remainder of %1 ÷ %2', 'Reste de %1 ÷ %2', 'Jinja modulo. For negative dividends the sign follows the divisor and may differ from JavaScript.', 'Modulo Jinja. Avec un dividende négatif, le signe suit le diviseur et peut différer de JavaScript.'],
  ugso_math_clamp: ['Constrain %1 between %2 and %3', 'Limiter %1 entre %2 et %3', 'Clamps a number. Reversed bounds are sorted first.', 'Limite un nombre. Les bornes inversées sont d’abord triées.'],
  ugso_math_random_int: ['Random integer between %1 and %2', 'Entier aléatoire entre %1 et %2', 'Inclusive integer bounds, at most 10000 choices. Reversed bounds are allowed.', 'Bornes entières inclusives, au plus 10000 valeurs possibles. Bornes inversées autorisées.'],
  ugso_math_random_fraction: ['Random fraction from 0 to less than 1', 'Nombre aléatoire de 0 à moins de 1', 'Steps of 0.00001, generated anew per evaluation. Not cryptographic randomness.', 'Pas de 0,00001, nouvelle valeur à chaque évaluation. Aléatoire non cryptographique.'],
  ugso_math_atan2: ['Angle atan2 y %1 x %2 in degrees', 'Angle atan2 y %1 x %2 en degrés', 'Four-quadrant angle from the Blockly standard, in addition to the ioBroker screenshots.', 'Angle sur quatre quadrants du standard Blockly, en complément des captures ioBroker.'],
  ugso_text_newline: ['Newline %1', 'Saut de ligne %1', 'An actual newline value for joining text.', 'Un véritable saut de ligne pour assembler du texte.'],
  ugso_text_join: ['Create text from %1', 'Créer du texte avec %1', 'Joins 0–100 values as text. Cog and +/− change the input count.', 'Assemble 0–100 valeurs en texte. Engrenage et +/− modifient le nombre d’entrées.'],
  ugso_text_append: ['Append text %2 to variable %1', 'Ajouter le texte %2 à la variable %1', 'Assigns new text to a previously initialized text variable. Does not write an HA entity.', 'Affecte un nouveau texte à une variable textuelle déjà initialisée. N’écrit pas dans une entité HA.'],
  ugso_text_length: ['Length of text %1', 'Longueur du texte %1', 'Unicode code point count, not JavaScript UTF-16 code units.', 'Nombre de points de code Unicode, pas d’unités UTF-16 JavaScript.'],
  ugso_text_empty: ['Text %1 is empty', 'Le texte %1 est vide', 'Checks whether text length is zero.', 'Vérifie si la longueur du texte est zéro.'],
  ugso_text_contains: ['Text %1 contains %2', 'Le texte %1 contient %2', 'Case-sensitive substring check.', 'Recherche un sous-texte en respectant la casse.'],
  ugso_text_index: ['In text %1 find %2 occurrence of %3', 'Dans le texte %1 trouver la %2 occurrence de %3', '1-based position in Unicode code points; not found returns 0.', 'Position à partir de 1 en points de code Unicode ; résultat absent : 0.'],
  ugso_text_char: ['In text %1 get %2 character at %3', 'Dans le texte %1 prendre le caractère %2 à %3', '1-based position from start/end, first/last/random character. Out of range returns empty text.', 'Position à partir de 1 depuis début/fin, premier/dernier/aléatoire. Hors limites : texte vide.'],
  ugso_text_slice: ['Substring of %1 from %2 through %3', 'Sous-texte de %1 de %2 à %3 inclus', 'Inclusive 1-based bounds from the start. Invalid/reversed bounds return empty text.', 'Bornes inclusives à partir de 1 depuis le début. Bornes invalides/inversées : texte vide.'],
  ugso_text_case: ['Text %1 to %2', 'Texte %1 en %2', 'Converts Unicode text to upper, lower or title case.', 'Convertit le texte Unicode en majuscules, minuscules ou casse de titre.'],
  ugso_text_trim: ['Trim whitespace %1 in text %2', 'Retirer les espaces %1 du texte %2', 'Removes outer whitespace, including tabs and newlines.', 'Retire les espaces extérieurs, tabulations et sauts de ligne compris.'],
  ugso_text_count: ['Count %1 in text %2', 'Compter %1 dans le texte %2', 'Counts non-overlapping matches; empty search text returns 0.', 'Compte les occurrences sans chevauchement ; recherche vide : 0.'],
  ugso_text_replace: ['Replace %1 with %2 in text %3', 'Remplacer %1 par %2 dans le texte %3', 'Replaces all literal matches without regex. Empty search leaves text unchanged.', 'Remplace toutes les occurrences littérales, sans regex. Recherche vide : texte inchangé.'],
  ugso_text_reverse: ['Reverse text %1', 'Inverser le texte %1', 'Additional Blockly standard operation. Reverses Unicode code points, not combined graphemes.', 'Opération standard Blockly supplémentaire. Inverse les points de code Unicode, pas les graphèmes composés.'],
  ugso_list_repeat: ['List with %1 copies of %2', 'Liste avec %1 copies de %2', 'New list with 0–10000 repetitions of a value.', 'Nouvelle liste avec 0–10000 répétitions d’une valeur.'],
  ugso_list_index: ['In list %1 find %2 occurrence of %3', 'Dans la liste %1 trouver la %2 occurrence de %3', '1-based position, not found returns 0. HA/Python equality rather than JavaScript reference equality.', 'Position à partir de 1, absent : 0. Égalité HA/Python, pas égalité de référence JavaScript.'],
  ugso_list_get: ['In list %1 get %2 item at %3', 'Dans la liste %1 prendre l’élément %2 à %3', '1-based position from start/end, first/last/random item. Out of range or empty list returns null.', 'Position à partir de 1 depuis début/fin, premier/dernier/aléatoire. Hors limites ou liste vide : null.'],
  ugso_list_set: ['In variable %1 %2 at %3 value %4', 'Dans la variable %1 %2 à %3 la valeur %4', 'Assigns a new list with a replaced/inserted value. 1-based index; insertion permits length+1. Invalid index leaves the list unchanged.', 'Affecte une nouvelle liste avec valeur remplacée/insérée. Indice à partir de 1 ; insertion autorisée à longueur+1. Indice invalide : liste inchangée.'],
  ugso_list_remove: ['From list variable %1 remove position %2', 'Retirer la position %2 de la variable liste %1', 'Assigns a new list without the item. 1-based index; invalid index leaves the list unchanged.', 'Affecte une nouvelle liste sans cet élément. Indice à partir de 1 ; indice invalide : liste inchangée.'],
  ugso_list_slice: ['Sublist of %1 from %2 through %3', 'Sous-liste de %1 de %2 à %3 inclus', 'Copies an inclusive 1-based range from the start. Invalid/reversed bounds return an empty list.', 'Copie une plage inclusive à partir de 1 depuis le début. Bornes invalides/inversées : liste vide.'],
  ugso_list_split: ['%1 value %2 delimiter %3', '%1 valeur %2 séparateur %3', 'Splits text on a literal delimiter or joins a list. Empty delimiter splits into Unicode characters.', 'Découpe le texte selon un séparateur littéral ou assemble une liste. Séparateur vide : caractères Unicode.'],
  ugso_list_sort: ['Sort list %1 %2 %3', 'Trier la liste %1 %2 %3', 'New sorted list; original unchanged. Numeric mode requires numbers, text mode converts elements to text.', 'Nouvelle liste triée ; original inchangé. Mode numérique : nombres requis ; mode texte : éléments convertis en texte.'],
  ugso_list_reverse: ['Reverse list %1', 'Inverser la liste %1', 'New list in reverse order; original unchanged.', 'Nouvelle liste dans l’ordre inverse ; original inchangé.'],
  ugso_for_range: ['Count %1 from %2 to %3 by %4 do %5', 'Compter %1 de %2 à %3 par pas de %4 faire %5', 'Fixed integer bounds, end inclusive when on step grid. Ascending/descending automatically, step magnitude >0, at most 10000 iterations. HA repeat.for_each sets a variable each iteration.', 'Bornes entières fixes, fin inclusive si atteinte par les pas. Sens automatique, pas absolu >0, au plus 10000 tours. HA repeat.for_each affecte une variable à chaque tour.'],
  ugso_foreach_variable: ['For each value %1 in list %2 do %3', 'Pour chaque valeur %1 de la liste %2 faire %3', 'HA repeat.for_each assigns repeat.item to the named variable before the body. Avoid reusing the same variable in nested loops.', 'HA repeat.for_each affecte repeat.item à la variable avant le corps. Éviter de réutiliser la même variable dans des boucles imbriquées.'],
  ugso_colour_random: ['Random colour', 'Couleur aléatoire', 'A new RGB list with three random channels from 0 to 255 per evaluation.', 'Nouvelle liste RGB de trois canaux aléatoires de 0 à 255 à chaque évaluation.'],
  ugso_colour_rgb: ['Colour from red %1 %% green %2 %% blue %3 %%', 'Couleur rouge %1 %% vert %2 %% bleu %3 %%', 'RGB percentages clamped to 0–100, converted to 0–255 and rounded half up.', 'Pourcentages RGB limités à 0–100, convertis en 0–255 et arrondis à la moitié supérieure.'],
  ugso_colour_blend: ['Blend colour %1 with %2 share of colour 2 %3', 'Mélanger la couleur %1 avec %2 part de la couleur 2 %3', 'Linear RGB blend. Share 0 = first colour, 1 = second. No gamma correction; result is an RGB list.', 'Mélange RGB linéaire. Part 0 = première couleur, 1 = seconde. Sans correction gamma ; résultat : liste RGB.'],
  ugso_variable_change: ['Increase %1 by %2', 'Augmenter %1 de %2', 'Adds to a previously initialized numeric variable. Negative steps decrease. Unset values, text, Booleans and null are not automatically converted to numbers.', 'Ajoute à une variable numérique déjà initialisée. Pas négatif : diminution. Valeurs non définies, textes, booléens et null ne sont pas automatiquement convertis.'],
  ugso_compare: [null, null, 'Compares two HA values. Numbers and text have different types; convert sensor values explicitly in templates.', 'Compare deux valeurs HA. Nombres et textes ont des types différents ; convertir explicitement les valeurs de capteurs dans les modèles.'],
  ugso_not: ['NOT %1', 'NON %1'],
  ugso_null: ['no value (null)', 'aucune valeur (null)', 'YAML null or Jinja none, neither zero nor false.', 'YAML null ou Jinja none, ni zéro ni faux.'],
  ugso_ternary: ['If %1 then value %2 else value %3', 'Si %1 alors valeur %2 sinon valeur %3', 'Returns a value, not an action chain. HA evaluates the Jinja expression for variables, log messages or comparisons.', 'Renvoie une valeur, pas une suite d’actions. HA évalue l’expression Jinja pour variables, messages de journal ou comparaisons.'],
  ugso_variable_set: ['Set %1 to %2', 'Définir %1 à %2', 'Defines or changes an HA variable for this automation run. Set before reading.', 'Définit ou modifie une variable HA pour cette exécution. Affecter avant de lire.'],
  ugso_variable_get: ['Variable %1', 'Variable %1', 'Produces {{ variable_name }} for an HA template. Not a permanently stored helper.', 'Produit {{ nom_variable }} pour un modèle HA. Ce n’est pas un assistant enregistré durablement.'],
  ugso_template: ['Template %1', 'Modèle %1', 'Jinja template including {{ ... }} or {% ... %}. Evaluated only in Home Assistant.', 'Modèle Jinja comprenant {{ ... }} ou {% ... %}. Évalué uniquement dans Home Assistant.'],
  ugso_template_condition: ['Template is true %1', 'Le modèle est vrai %1', 'HA evaluates this Jinja template as a condition. Does not trigger an automation itself.', 'HA évalue ce modèle Jinja comme condition. Ne déclenche pas une automatisation.'],
  ugso_text: ['Text %1', 'Texte %1'],
  ugso_colour: ['Colour %1', 'Couleur %1'],
  ugso_colour_action: ['Light %1 colour %2 brightness %3 %%', 'Lampe %1 couleur %2 luminosité %3 %%'],
  ugso_date_condition: ['Today’s date %1 %2', 'Date du jour %1 %2', 'Compares today’s date including the year in the HA timezone. Does not trigger an automation.', 'Compare la date du jour, année comprise, dans le fuseau HA. Ne déclenche pas une automatisation.'],
  ugso_helper_action: ['Helper %1 %2 %3', 'Assistant %1 %2 %3', 'Action choices follow the helper type. Search for an entity or enter its ID.', 'Actions adaptées au type d’assistant. Rechercher une entité ou saisir son ID.'],
  ugso_log_action: ['Log %1 message %2', 'Journal %1 message %2', 'Writes to the HA system log during execution. HA logging configuration may filter info/debug.', 'Écrit dans le journal système HA à l’exécution. La configuration HA peut filtrer info/debug.'],
  ugso_script_action: ['HA script %1 %2', 'Script HA %1 %2', 'Call and wait continues after the script finishes. Pass script parameters via the generic HA action.', 'Appeler et attendre reprend après la fin du script. Transmettre les paramètres via l’action HA générique.'],
  ugso_update_action: ['Update entity %1', 'Actualiser l’entité %1', 'Requests an entity update in HA. The integration determines support; does not set a state.', 'Demande l’actualisation de l’entité dans HA. Prise en charge selon l’intégration ; ne définit pas un état.'],
  ugso_automation: ['Automation %1 When %2 Only if %3 Then %4', 'Automatisation %1 Quand %2 Seulement si %3 Alors %4', 'Native Home Assistant automation. Name and mode are above the workspace.', 'Automatisation native Home Assistant. Nom et mode au-dessus de l’espace de travail.'],
  ugso_state_trigger: ['When %1 reaches state %2', 'Quand %1 atteint l’état %2', 'Responds to a state change.', 'Réagit à un changement d’état.'],
  ugso_numeric_trigger: ['When %1 crosses %2 %3', 'Quand %1 franchit %2 %3', 'Starts when crossing a threshold, not continuously while the condition remains true.', 'Démarre au franchissement d’un seuil, pas continuellement tant que la condition reste vraie.'],
  ugso_time_trigger: ['When the time is %1', 'Quand il est %1'],
  ugso_sun_trigger: ['At %1', 'Au %1'],
  ugso_start_trigger: ['When Home Assistant starts', 'Quand Home Assistant démarre'],
  ugso_state_condition: ['%1 is %2', '%1 est %2'],
  ugso_numeric_condition: ['%1 is %2 %3', '%1 est %2 %3'],
  ugso_switch_action: [null, null, 'Action for the selected entity’s domain. Check availability in HA.', 'Action du domaine de l’entité choisie. Vérifier sa disponibilité dans HA.'],
  ugso_service_action: ['HA action %1 target %2 data (JSON) %3', 'Action HA %1 cible %2 données (JSON) %3', 'Target may be empty. Data must be a JSON object; the integration must exist in HA.', 'Cible facultative. Données sous forme d’objet JSON ; l’intégration doit être présente dans HA.'],
  ugso_delay_action: ['Wait %1 seconds', 'Attendre %1 secondes'],
  ugso_if_action: ['If %1 do %2', 'Si %1 faire %2']
};

export const labels = {
  'System': ['System', 'Système'], 'Werte': ['Values', 'Valeurs'], 'Datum und Zeit': ['Date and time', 'Date et heure'],
  'Konvertierung': ['Conversion', 'Conversion'], 'Auslöser': ['Triggers', 'Déclencheurs'], 'Bedingungen': ['Conditions', 'Conditions'],
  'Aktionen': ['Actions', 'Actions'], 'Logik': ['Logic', 'Logique'], 'Variablen': ['Variables', 'Variables'], 'Funktionen': ['Functions', 'Fonctions'],
  'Templates': ['Templates', 'Modèles'], 'Timeouts': ['Timeouts', 'Délais'], 'Objekt': ['Object', 'Objet'], 'Schleifen': ['Loops', 'Boucles'],
  'Listen': ['Lists', 'Listes'], 'Mathematik': ['Math', 'Mathématiques'], 'Text': ['Text', 'Texte'], 'Farbe': ['Colour', 'Couleur'],
  'Benutzerdefiniert': ['Custom', 'Personnalisés'], 'Suche': ['Search', 'Recherche'], 'Variable erstellen …': ['Create variable …', 'Créer une variable …'],
  'Blocks suchen': ['Search blocks', 'Rechercher des blocs'], 'Keine passenden Blocks': ['No matching blocks', 'Aucun bloc correspondant'], 'Suchbegriff eingeben': ['Enter search term', 'Saisir une recherche'],
  'unter': ['below', 'sous'], 'über': ['above', 'au-dessus de'], 'wahr': ['true', 'vrai'], 'falsch': ['false', 'faux'],
  'UND': ['AND', 'ET'], 'ODER': ['OR', 'OU'], 'UND · alle': ['AND · all', 'ET · toutes'], 'ODER · mindestens eine': ['OR · at least one', 'OU · au moins une'], 'NICHT · keine': ['NOT · none', 'NON · aucune'],
  'ist': ['is', 'est'], 'ab einschließlich': ['on or after', 'à partir du'], 'bis einschließlich': ['on or before', 'jusqu’au'],
  'Schalter': ['Switch', 'Interrupteur'], 'Zähler': ['Counter', 'Compteur'], 'Timer': ['Timer', 'Minuteur'],
  'einschalten': ['turn on', 'allumer'], 'ausschalten': ['turn off', 'éteindre'], 'umschalten': ['toggle', 'basculer'],
  'erhöhen': ['increase', 'augmenter'], 'verringern': ['decrease', 'diminuer'], 'zurücksetzen': ['reset', 'réinitialiser'],
  'starten': ['start', 'démarrer'], 'pausieren': ['pause', 'mettre en pause'], 'abbrechen': ['cancel', 'annuler'], 'beenden': ['finish', 'terminer'],
  'Warnung': ['Warning', 'Avertissement'], 'Fehler': ['Error', 'Erreur'], 'Kritisch': ['Critical', 'Critique'],
  'starten (ohne Warten)': ['start (without waiting)', 'démarrer (sans attendre)'], 'stoppen': ['stop', 'arrêter'], 'aufrufen und warten': ['call and wait', 'appeler et attendre'],
  'Sonnenuntergang': ['Sunset', 'Coucher du soleil'], 'Sonnenaufgang': ['Sunrise', 'Lever du soleil'], 'Morgendämmerung': ['Dawn', 'Aube'],
  'Abenddämmerung': ['Dusk', 'Crépuscule'], 'Sonnenhöchststand': ['Solar noon', 'Midi solaire'], 'Sonnenmitternacht': ['Solar midnight', 'Minuit solaire'],
  'kleiner als': ['less than', 'avant'], 'kleiner/gleich': ['less or equal', 'avant ou égal'], 'größer als': ['greater than', 'après'],
  'größer/gleich': ['greater or equal', 'après ou égal'], 'gleich': ['equal', 'égal'], 'zwischen': ['between', 'entre'], 'nicht zwischen': ['outside', 'hors de'],
  'Beginn des Tages': ['Start of day', 'Début du jour'], 'Beginn des nächsten Tages': ['Start of next day', 'Début du jour suivant'],
  'Beginn der Woche (Montag)': ['Start of week (Monday)', 'Début de semaine (lundi)'], 'Beginn des Monats': ['Start of month', 'Début du mois'], 'Beginn des Jahres': ['Start of year', 'Début de l’année'],
  'Millisekunden': ['Milliseconds', 'Millisecondes'], 'Sekunden': ['Seconds', 'Secondes'], 'Minuten': ['Minutes', 'Minutes'], 'Stunden': ['Hours', 'Heures'], 'Tage': ['Days', 'Jours'],
  'Uhrzeit HH:mm': ['Time HH:mm', 'Heure HH:mm'], 'Uhrzeit HH:mm:ss': ['Time HH:mm:ss', 'Heure HH:mm:ss'],
  'Datum JJJJ-MM-TT': ['Date YYYY-MM-DD', 'Date AAAA-MM-JJ'], 'Datum TT.MM.JJJJ': ['Date DD.MM.YYYY', 'Date JJ.MM.AAAA'], 'Datum und Uhrzeit': ['Date and time', 'Date et heure'],
  'ISO mit Zeitzone': ['ISO with timezone', 'ISO avec fuseau'], 'Unix-Zeit (Sekunden)': ['Unix time (seconds)', 'Temps Unix (secondes)'],
  'Datumswert': ['Date value', 'Date'], 'Unix-Sekunden': ['Unix seconds', 'Secondes Unix'], 'Unix-Millisekunden': ['Unix milliseconds', 'Millisecondes Unix'],
  'ISO-Text': ['ISO text', 'Texte ISO'], 'Jahr': ['Year', 'Année'], 'Monat': ['Month', 'Mois'], 'Tag': ['Day', 'Jour'],
  'Stunde': ['Hour', 'Heure'], 'Minute': ['Minute', 'Minute'], 'Sekunde': ['Second', 'Seconde'], 'Millisekunde': ['Millisecond', 'Milliseconde'],
  'Wochentag (Mo=1)': ['Weekday (Mon=1)', 'Jour de semaine (lun=1)'], 'ISO-Kalenderwoche': ['ISO week', 'Semaine ISO'],
  'Sekunden seit Mitternacht': ['Seconds since midnight', 'Secondes depuis minuit'], 'Minuten seit Mitternacht': ['Minutes since midnight', 'Minutes depuis minuit'], 'Eigenes Format': ['Custom format', 'Format personnalisé'],
  'solange': ['while', 'tant que'], 'bis': ['until', 'jusqu’à'], 'null / nicht gesetzt': ['null / unset', 'null / non défini'], 'leer / falsch / 0': ['empty / false / 0', 'vide / faux / 0'],
  'Potenz': ['power', 'puissance'], 'Quadratwurzel': ['square root', 'racine carrée'], 'Betrag': ['absolute', 'valeur absolue'], 'negativ': ['negative', 'négatif'],
  'e hoch': ['e to the power', 'e puissance'], '10 hoch': ['10 to the power', '10 puissance'], 'Goldener Schnitt': ['golden ratio', 'nombre d’or'],
  'gerade': ['even', 'pair'], 'ungerade': ['odd', 'impair'], 'ganzzahlig': ['whole', 'entier'], 'positiv': ['positive', 'positif'], 'teilbar durch': ['divisible by', 'divisible par'],
  'runde': ['round', 'arrondir'], 'runde auf': ['round up', 'arrondir au supérieur'], 'runde ab': ['round down', 'arrondir à l’inférieur'],
  'Summe': ['Sum', 'Somme'], 'Mittelwert': ['Average', 'Moyenne'], 'Zufallseintrag': ['Random item', 'Élément aléatoire'],
  'vom Anfang': ['from start', 'depuis le début'], 'vom Ende': ['from end', 'depuis la fin'], 'erstes': ['first', 'première'], 'letztes': ['last', 'dernière'], 'zufälliges': ['random', 'aléatoire'],
  'GROSSBUCHSTABEN': ['UPPER CASE', 'MAJUSCULES'], 'kleinbuchstaben': ['lower case', 'minuscules'], 'Titelbuchstaben': ['Title Case', 'Casse de titre'],
  'beidseitig': ['both sides', 'des deux côtés'], 'links': ['left', 'à gauche'], 'rechts': ['right', 'à droite'],
  'ersetze': ['replace', 'remplacer'], 'füge ein': ['insert', 'insérer'], 'Liste aus Text': ['List from text', 'Liste depuis le texte'], 'Text aus Liste': ['Text from list', 'Texte depuis la liste'],
  'numerisch': ['numeric', 'numérique'], 'Text (mit Groß/Klein)': ['text (case sensitive)', 'texte (sensible à la casse)'], 'Text (ohne Groß/Klein)': ['text (ignore case)', 'texte (ignorer la casse)'],
  'aufsteigend': ['ascending', 'croissant'], 'absteigend': ['descending', 'décroissant'],
  'Bedingung': ['Condition', 'Condition'], 'Einträge %1': ['Entries %1', 'Entrées %1'], 'Eintrag': ['Item', 'Élément'], 'Attribut': ['Attribute', 'Attribut'],
  'im Falle von': ['in case of', 'dans le cas de'], 'mache': ['do', 'faire'], 'sonst': ['else', 'sinon'], 'sonst falls': ['else if', 'sinon si'],
  'und': ['and', 'et'], 'verglichener Datumswert': ['compared date value', 'date comparée'],
  'Blocks-Sprache': ['Block language', 'Langue des blocs'], 'Systemsprache': ['System language', 'Langue du système'],
  'am Anfang': ['at start', 'au début'], 'am Ende': ['at end', 'à la fin'], 'als Text': ['as text', 'en texte'],
  'Text ohne Groß-/Kleinschreibung': ['text ignoring case', 'texte sans distinction de casse'], 'füge ein an': ['insert at', 'insérer à'],
  'Bedingungen %1': ['Conditions %1', 'Conditions %1'],
  'Uhrzeitvergleich in HA-Ortszeit. Zwischen: Start inklusive, Ende exklusiv; auch über Mitternacht. Gleiche Grenzen ergeben einen leeren Zeitraum. Kein Auslöser.': ['Time comparison in HA local time. Between includes the start and excludes the end, including across midnight. Equal bounds give an empty interval. Not a trigger.', 'Comparaison en heure locale HA. Entre inclut le début et exclut la fin, même à travers minuit. Bornes identiques : intervalle vide. Ce n’est pas un déclencheur.'],
  'Die Auswahl bestimmt den Anschluss: Datumswert, Laufzeitzahl oder Text. Eigenes Format nutzt Python strftime (%Y, %m, %d, %H, %M, %S), keine ioBroker-Formatcodes.': ['Selection determines the connection: date, runtime number or text. Custom format uses Python strftime (%Y, %m, %d, %H, %M, %S), not ioBroker format codes.', 'Le choix détermine le raccord : date, nombre à l’exécution ou texte. Le format personnalisé utilise Python strftime (%Y, %m, %d, %H, %M, %S), pas les codes ioBroker.'],
  'Eigene Wertfunktion. Parameter über das Zahnrad bearbeiten. Beim Export in Jinja aufgelöst; keine Aktionen oder Rekursion.': ['Custom value function. Edit parameters with the cog. Expanded to Jinja during export; no actions or recursion.', 'Fonction de valeur personnalisée. Paramètres via l’engrenage. Développée en Jinja à l’export ; sans actions ni récursion.']
};
Object.assign(blockTranslations, {
  ugso_event_trigger: ['When event %1 data filter (JSON) %2 enabled %3', 'Quand événement %1 filtre (JSON) %2 activé %3', 'HA event with an optional data filter, such as timer.finished. Filter values as a JSON object.', 'Événement HA avec filtre facultatif, par exemple timer.finished. Valeurs du filtre en objet JSON.'],
  ugso_native_time_condition: ['HA time after %1 before %2', 'Heure HA après %1 avant %2', 'Native HA time condition: after inclusive, before exclusive. One bound may be empty; both can span midnight. Fixed HH:MM or HH:MM:SS.', 'Condition horaire HA native : après inclusif, avant exclusif. Une borne peut être vide ; les deux peuvent traverser minuit. Heures fixes HH:MM ou HH:MM:SS.'],
  ugso_trigger_condition: ['Triggered by ID %1 list %2', 'Déclenché par ID %1 liste %2', 'Checks the trigger ID. Enable list to enter IDs as a JSON list.', 'Vérifie l’ID du déclencheur. Activer liste pour saisir les IDs en liste JSON.']
});
Object.assign(labels, {
  'Uhrzeiten als JSON-Liste': ['Times as JSON list', 'Heures en liste JSON'],
  'Jede Änderung': ['Any change', 'Tout changement'],
  'Entitäten als JSON-Liste': ['Entities as JSON list', 'Entités en liste JSON'],
  'Auslöser-ID (optional)': ['Trigger ID (optional)', 'ID du déclencheur (facultatif)'],
  'Zustände als JSON-Liste': ['States as JSON list', 'États en liste JSON'],
  'Ziele als JSON-Liste': ['Targets as JSON list', 'Cibles en liste JSON'],
  'Leere Daten ausgeben': ['Include empty data', 'Inclure les données vides'],
  'Metadaten ausgeben': ['Include metadata', 'Inclure les métadonnées']
});
export function translateLabel(text, locale = language) {
  if (locale === 'de' || typeof text !== 'string') return text;
  const numbered = text.match(/^(Bedingung|Eintrag) (\d+)$/);
  if (numbered) return `${translateLabel(numbered[1], locale)} ${numbered[2]}`;
  return labels[text]?.[locale === 'fr' ? 1 : 0] ?? text;
}
export function localizedDefinition(definition, locale = language) {
  const result = structuredClone(definition), index = locale === 'fr' ? 1 : 0;
  if (locale === 'de') return result;
  const entry = blockTranslations[result.type];
  result.message0 = entry?.[index] ?? translateLabel(result.message0, locale);
  if (result.tooltip) result.tooltip = entry?.[index + 2] ?? result.tooltip;
  for (const [key, args] of Object.entries(result)) if (/^args\d+$/.test(key)) {
    for (const field of args) {
      if (field.options) field.options = field.options.map(([label, value]) => [translateLabel(label, locale), value]);
      if (field.optionMapping) field.optionMapping = Object.fromEntries(Object.entries(field.optionMapping).map(([key, options]) => [key, options.map(([label, value]) => [translateLabel(label, locale), value])]));
    }
  }
  return result;
}
export function localizedToolbox(source, locale = language) {
  const result = structuredClone(source);
  for (const category of result.contents) category.name = translateLabel(category.name, locale);
  return result;
}
