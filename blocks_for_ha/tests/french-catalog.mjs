// Emit a reviewable apply_patch addition from the same definitions as the editor.
import { definitions, toolbox } from '../src/blocks.js';
import { localizedDefinition, translateLabel } from '../src/locales.js';
import { version } from '../package.json' with { type: 'json' };
const help = {
  ugso_time_compare: 'Comparer l’heure locale HA ; intervalle avec début inclus et fin exclue, même à travers minuit. Condition, pas déclencheur.',
  ugso_time_compare_input: 'Comparer une heure raccordée. Décocher l’heure actuelle affiche une entrée de date à comparer.',
  ugso_time_boundary: 'Début du jour, du jour suivant, de la semaine (lundi), du mois ou de l’année dans le fuseau HA.',
  ugso_time_shift: 'Ajouter ou soustraire une durée à une date ; millisecondes, secondes, minutes, heures ou jours. Nombre fini requis.',
  ugso_convert_date_format: 'Le format détermine le raccord : date, nombre à l’exécution ou texte. Format personnalisé Python strftime.',
  ugso_object_has: 'Vérifier la présence d’une clé dans un dictionnaire, y compris une clé dont la valeur est null.',
  ugso_logic_range: 'Tester un nombre entre deux bornes, avec comparaisons strictes ou inclusives indépendantes.',
  ugso_list_new: 'Créer une liste de 0–100 valeurs ; l’engrenage ou +/− modifie le nombre d’entrées.',
  ugso_boolean: 'Constante vrai/faux, pour conditions et variables. L’export conserve le type booléen YAML.',
  ugso_not: 'Nier une condition : groupe not natif HA ou expression not Jinja lorsqu’utilisé comme valeur.',
  ugso_binary_logic: 'Combiner deux booléens avec ET/OU ; groupe natif HA ou expression Jinja selon l’usage.',
  ugso_text: 'Texte multiligne éditable ; contenu conservé exactement sans traduction automatique.',
  ugso_percent: 'Curseur de 0 à 100, valeur numérique en pourcentage.',
  ugso_colour: 'Sélectionner une couleur ; conversion en liste de canaux RGB pour HA.',
  ugso_colour_action: 'Action light.turn_on avec couleur RGB et brightness_pct. Lampe compatible et luminosité 0–100 requises.',
  ugso_number: 'Nombre fixe éditable. Utilisable pour valeurs et seuils de déclencheurs numériques.',
  ugso_time_trigger: 'Déclencher l’automatisation à une heure fixe au format HH:mm:ss.',
  ugso_sun_trigger: 'Déclencher au lever ou au coucher du soleil, selon Home Assistant.',
  ugso_start_trigger: 'Déclencher au démarrage de Home Assistant.',
  ugso_state_condition: 'Vérifier si l’entité possède l’état indiqué. Les valeurs on/off restent les IDs HA.',
  ugso_numeric_condition: 'Comparer l’état numérique d’une entité avec une borne fixe, au-dessus ou en dessous.',
  ugso_logic_condition: 'Groupe ET, OU ou NON extensible jusqu’à 100 conditions. Engrenage ou +/− pour modifier les entrées.',
  ugso_delay_action: 'Attendre un nombre de secondes via une action delay native HA.',
  ugso_if_action: 'Branche if native HA avec actions, sinon si et sinon. Engrenage et +/− pour étendre les branches.'
};
const title = {
  ugso_math_arithmetic: 'Calcul arithmétique', ugso_math_single: 'Fonction numérique', ugso_math_trig: 'Trigonométrie', ugso_math_constant: 'Constante',
  ugso_compare: 'Comparaison', ugso_binary_logic: 'ET / OU compact', ugso_logic_range: 'Intervalle numérique', ugso_boolean: 'Vrai / faux',
  ugso_percent: 'Pourcentage', ugso_number: 'Nombre', ugso_logic_condition: 'Groupe de conditions', ugso_switch_action: 'Allumer / éteindre / basculer'
};
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');
const row = definition => {
  const d = localizedDefinition(definition, 'fr');
  const name = title[d.type] || d.message0.replace(/%\d+/g, '…').replaceAll('%%', '%');
  const description = d.tooltip || help[d.type];
  if (!description) throw new Error('Missing catalog description: ' + d.type);
  return `| **${escape(name)}**<br><code>${d.type}</code> | <img src="/assets/blocks-for-ha/blocks/fr/${d.type}.png" alt="${escape(name)}" style="max-width:280px;max-height:180px"> | ${escape(description)} |`;
};
let content = `---\ntitle: Catalogue des blocs\ndescription: Tous les blocs UGSo avec images françaises et fonctions.\n---\n\n# Catalogue des blocs\n\n**${version} · 115 types**. Les images montrent les vrais blocs Blockly en français. Les variantes des menus déroulants ne sont pas des types supplémentaires. Les IDs techniques restent identiques en DE/EN/FR. Les textes et entités d’exemple gardent leurs valeurs d’origine.\n\nDéclencheurs orange, conditions violettes, valeurs vertes, actions bleues avec le thème UGSo Standard. Les autres palettes adaptent les couleurs. [Usage et import](./) · [Paquets personnalisés](./custom-blocks).\n\n`;
const used = new Set();
for (const category of toolbox.contents) {
  const entries = (category.contents || []).map(item => definitions.find(d => d.type === item.type)).filter(d => d && !used.has(d.type));
  if (category.custom === 'UGSO_VARIABLES') entries.push(...definitions.filter(d => d.type.startsWith('ugso_variable_')));
  if (!entries.length) continue;
  content += `## ${translateLabel(category.name, 'fr')}\n\n| Bloc | Image | Fonction |\n| --- | --- | --- |\n`;
  for (const d of entries) { if (!used.has(d.type)) { content += row(d) + '\n'; used.add(d.type); } }
  content += '\n';
}
const remaining = definitions.filter(d => !used.has(d.type));
if (remaining.length) content += '## Autres blocs\n\n| Bloc | Image | Fonction |\n| --- | --- | --- |\n' + remaining.map(row).join('\n') + '\n\n';
content += `## Fonctions Blockly originales\n\n| Bloc | Image | Fonction |\n| --- | --- | --- |\n`;
for (const [type, name, description] of [
  ['procedures_defreturn', 'Définir une fonction de valeur', 'Éditeur Blockly original ; jusqu’à 8 paramètres ASCII via l’engrenage. Retour requis, sans actions ni récursion. Développement en Jinja à l’export.'],
  ['procedures_callreturn', 'Appeler une fonction de valeur', 'Appel disponible dynamiquement dans Fonctions. Les entrées suivent les paramètres ; définition unique et tous les arguments requis.'],
  ['variables_get', 'Lire une variable ou un paramètre', 'Accès original Blockly, notamment dans les fonctions. Lit le paramètre local si présent, sinon une variable HA.']
]) content += `| **${name}**<br><code>${type}</code> | <img src="/assets/blocks-for-ha/blocks/fr/${type}.png" alt="${name}" style="max-width:280px;max-height:180px"> | ${description} |\n`;
content += '\n## Plugins originaux\n\nCes plugins fournissent des champs ou commandes, sans être des types de blocs supplémentaires. Licence Apache-2.0, paquets intégrés localement.\n\n| Plugin | Usage | Source originale |\n| --- | --- | --- |\n';
for (const [plugin, description] of [
  ['toolbox-search', 'Rechercher les blocs disponibles ; catégorie en fin de menu.'], ['field-slider', 'Champ curseur numérique.'],
  ['field-date', 'Sélecteur de date.'], ['field-colour', 'Sélecteur de couleur.'], ['field-multilineinput', 'Texte et modèles multilignes.'],
  ['field-dependent-dropdown', 'Choix d’action adapté au domaine de l’assistant.'], ['theme-dark', 'Palette sombre.'], ['theme-modern', 'Palette Modern.'],
  ['theme-tritanopia', 'Palette adaptée à la tritanopie.'], ['zoom-to-fit', 'Ajuster les blocs à la vue.'], ['workspace-search', 'Chercher les blocs déjà placés, Ctrl/Cmd+F.']
]) content += `| ${plugin} | ${description} | [Dépôt original](https://github.com/raspberrypifoundation/blockly-samples/tree/main/plugins/${plugin}) |\n`;
console.log('*** Begin Patch\n*** Add File: C:/Users/rockb/source/repos/ugso-opensource-docs/docs/fr/projects/blocks-for-ha/blocks.md\n' + content.split('\n').map(line => '+' + line).join('\n') + '\n*** End Patch');
