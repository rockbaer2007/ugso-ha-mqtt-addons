import { basicText } from './basic-locales.js';
const rows=`
Interaktiv-Sprache|Interactive language|Langue interactive
Tasterverhalten|Button behavior|Comportement du bouton
Nächster Zustand (bisher)|Next state (legacy)|État suivant (ancien)
Fester Tastwert|Fixed button value|Valeur fixe du bouton
Haltewert aktivieren|Enable hold value|Activer la valeur de maintien
Haltewert|Hold value|Valeur de maintien
Haltewert konnte nicht geschrieben werden|Hold value could not be written|Impossible d’écrire la valeur de maintien
Zielseite|Target page|Page cible
Navigations-PIN (nur Bedienung)|Navigation PIN (UI only)|PIN de navigation (interface seulement)
Navigations-PIN|Navigation PIN|PIN de navigation
Änderung pro Klick|Change per click|Variation par clic
Untergrenze|Lower bound|Limite inférieure
Obergrenze|Upper bound|Limite supérieure
HTTP-URL|HTTP URL|URL HTTP
HTTP-Modus|HTTP mode|Mode HTTP
GET im Hintergrund|Background GET|GET en arrière-plan
Neuer Tab|New tab|Nouvel onglet
Aktueller Tab|Current tab|Onglet actuel
HTTP-Aufruf|HTTP request|Requête HTTP
HTTP-Aufruf fehlgeschlagen (CORS prüfen)|HTTP request failed (check CORS)|Échec HTTP (vérifier CORS)
Erhöhen / Verringern|Increase / decrease|Augmenter / diminuer
Ansicht im Dialog|View in dialog|Vue dans une fenêtre
Dialogtitel|Dialog title|Titre de la fenêtre
Dialogbreite (px)|Dialog width (px)|Largeur de la fenêtre (px)
Dialoghöhe (px)|Dialog height (px)|Hauteur de la fenêtre (px)
Dialog-Innenabstand (px)|Dialog padding (px)|Marge intérieure de la fenêtre (px)
Dialog-Eckenradius (px)|Dialog corner radius (px)|Rayon des coins de la fenêtre (px)
Dialogposition|Dialog position|Position de la fenêtre
Dialog im Vollbild|Fullscreen dialog|Fenêtre plein écran
Außenklick schließt Dialog|Outside click closes dialog|Clic extérieur ferme la fenêtre
Dialog automatisch schließen (s)|Auto-close dialog (s)|Fermer automatiquement (s)
Eingebettete Ansicht|Embedded view|Vue intégrée
Inhaltsseite|Content page|Page du contenu
Ansicht einpassen|Fit view|Adapter la vue
Farbwähler|Color picker|Sélecteur de couleur
Farb-Entität|Color entity|Entité de couleur
Farbformat|Color format|Format de couleur
Farbmodell|Color control|Contrôle de couleur
Farbfläche|Color box|Zone de couleur
Farbkreis|Color wheel|Cercle chromatique
Farbregler|Color sliders|Curseurs de couleur
Alpha anzeigen|Show alpha|Afficher alpha
Kelvin anzeigen|Show Kelvin|Afficher Kelvin
Uhrziffern anzeigen|Show clock numbers|Afficher les chiffres
Sekundenzeiger anzeigen|Show seconds hand|Afficher la trotteuse
Uhrblattfarbe|Clock face color|Couleur du cadran
Zeigerfarbe|Clock hand color|Couleur des aiguilles
Farbaktion fehlgeschlagen|Color action failed|Échec de l’action couleur
Analoguhr|Analog clock|Horloge analogique
Farbton|Hue|Teinte
Sättigung|Saturation|Saturation
Rot|Red|Rouge
Grün|Green|Vert
Blau|Blue|Bleu
Schließen|Close|Fermer
Spurfarbe / Verlauf|Track color / gradient|Couleur / dégradé de piste
Aktive Spurfarbe / Verlauf|Active track color / gradient|Couleur / dégradé de piste active
Daumenfarbe / Verlauf|Thumb color / gradient|Couleur / dégradé du curseur
Bedienung|Interaction|Interaction
Schalten|Switch|Commuter
Taster / nächsten Zustand|Button / next state|Bouton / état suivant
Nur anzeigen|Read only|Lecture seule
Einzeltaste|Single button|Bouton unique
Getrennte Tasten|Separate buttons|Boutons séparés
Wert false|False value|Valeur fausse
Wert true|True value|Valeur vraie
Vorschau-/Testzustand|Preview/test state|État d’aperçu/test
Ziel-URL für Navigation|Navigation URL|URL de navigation
Klick-Feedback|Click feedback|Retour visuel du clic
Klick durchlassen|Pass clicks through|Laisser passer les clics
Standardzustand|Default state|État par défaut
Zustände und Inhalte|States and content|États et contenu
Anzahl der Zustände|Number of states|Nombre d’états
Vergleichen nach|Compare by|Comparer par
Widget-Standard|Widget default|Défaut du widget
Andere HA-Entität|Other HA entity|Autre entité HA
Vergleichsoperator|Comparison operator|Opérateur de comparaison
Klick deaktivieren wenn aktiv|Disable click when active|Désactiver le clic si actif
Inhaltstyp|Content type|Type de contenu
HTML-Inhalt|HTML content|Contenu HTML
Inhaltsblinkintervall (ms)|Content blink interval (ms)|Intervalle de clignotement (ms)
Inhaltsgröße (px, 0 = Widget)|Content size (px, 0 = widget)|Taille du contenu (px, 0 = widget)
Inhaltsgröße (px)|Content size (px)|Taille du contenu (px)
Bildanpassung|Image fit|Ajustement de l’image
Inhaltsfarbe|Content color|Couleur du contenu
Äußere Schattenfarbe|Outer shadow color|Couleur de l’ombre extérieure
Innere Schattenfarbe|Inner shadow color|Couleur de l’ombre intérieure
Textdekoration|Text decoration|Décoration du texte
Raum zwischen|Space between|Espace entre
Raum rundherum|Space around|Espace autour
Gleichmäßig|Space evenly|Espacement régulier
Strecken|Stretch|Étirer
Rille|Groove|Rainure
Erhöht|Raised|En relief
Vertieft|Inset|En creux
Hervorgehoben|Outset|En saillie
Rechteck|Rectangle|Rectangle
Dreieck|Triangle|Triangle
Raute|Diamond|Losange
Siebeneck|Heptagon|Heptagone
Achteck|Octagon|Octogone
Benutzerdefiniertes Polygon|Custom polygon|Polygone personnalisé
Inhalt ausrichten|Align content|Aligner le contenu
Reihenfolge umkehren|Reverse order|Inverser l’ordre
Hintergrundopazität|Background opacity|Opacité du fond
Inhaltsopazität|Content opacity|Opacité du contenu
Eckentyp|Corner type|Type de coin
Abgeschrägt|Beveled|Biseauté
Äußerer Schatten|Outer shadow|Ombre extérieure
Innerer Schatten|Inner shadow|Ombre intérieure
Form|Shape|Forme
Drehung der Form|Shape rotation|Rotation de la forme
Eckenradius der Form (px)|Shape corner radius (px)|Rayon des coins de forme (px)
Polygonpunkte (%, z. B. 50% 0%, 100% 100%, 0% 100%)|Polygon points (%, e.g. 50% 0%, 100% 100%, 0% 100%)|Points du polygone (%, ex. 50% 0%, 100% 100%, 0% 100%)
CSS Radialregler – Spur|CSS radial slider – track|CSS curseur radial – piste
CSS Radialregler – Daumen|CSS radial slider – thumb|CSS curseur radial – curseur
CSS Radialregler – Wert|CSS radial slider – value|CSS curseur radial – valeur
Startwinkel (°)|Start angle (°)|Angle initial (°)
Endwinkel (°)|End angle (°)|Angle final (°)
Bezeichnung anzeigen|Show label|Afficher le libellé
Bezeichnung|Label|Libellé
Spurbreite (px)|Track width (px)|Largeur de piste (px)
Daumengröße (px)|Thumb size (px)|Taille du curseur (px)
Wertgröße (px)|Value size (px)|Taille de valeur (px)
Bezeichnungsgröße (px)|Label size (px)|Taille du libellé (px)
Bezeichnungsfarbe|Label color|Couleur du libellé
Unschärfe|Blur|Flou
Vom Widget|From widget|Depuis un widget
aktiv|active|actif
Zustand hinzufügen|Add state|Ajouter un état
Bild|Image|Image
Spiegel|Mirror|Miroir
Beschriftung (optional)|Label (optional)|Libellé (facultatif)
Modus|Mode|Mode
Oben|Top|Haut
Unten|Bottom|Bas
Keiner|None|Aucun
Unterstrichen|Underlined|Souligné
Überstrichen|Overlined|Surligné
Durchgestrichen|Strikethrough|Barré
Richtung|Direction|Direction
Spalte|Column|Colonne
Zeile|Row|Ligne
Start|Start|Début
Zentriert|Centered|Centré
Ende|End|Fin
Transparenz|Transparency|Transparence
Innenabstand|Padding|Marge intérieure
oben|top|haut
rechts|right|droite
unten|bottom|bas
links|left|gauche
Ecken|Corners|Coins
Abgerundet|Rounded|Arrondi
Oben links|Top left|Haut gauche
Oben rechts|Top right|Haut droite
Unten links|Bottom left|Bas gauche
Unten rechts|Bottom right|Bas droite
Rahmen|Frame|Cadre
Größe|Size|Taille
Durchgezogen|Solid|Continu
Gestrichelt|Dashed|Tirets
Gepunktet|Dotted|Pointillé
Doppelt|Double|Double
X-Versatz|X offset|Décalage X
Y-Versatz|Y offset|Décalage Y
Verwischen|Blur|Flou
Mindestwert|Minimum value|Valeur minimale
Maximalwert|Maximum value|Valeur maximale
Schritt|Step|Pas
Schreibgeschützt|Read only|Lecture seule
Schattenfarbe|Shadow color|Couleur d’ombre
Wertfarbe|Value color|Couleur de valeur
contain|Contain|Contenir
cover|Cover|Couvrir
fill|Fill|Remplir
`;
export const interactiveVocabulary=new Map(rows.trim().split('\n').map(row=>{const [de,en,fr]=row.split('|');return [de,{en,fr}];}));
export function interactiveLocale(widget,fallback='de'){return ['de','en','fr'].includes(widget.interactiveLocale)?widget.interactiveLocale:/^fr/.test(fallback)?'fr':/^en/.test(fallback)?'en':'de';}
export function interactiveText(value,locale='de'){
  if(!value || locale==='de')return value;
  const direct=interactiveVocabulary.get(String(value));if(direct)return direct[locale];
  const indexed=String(value).match(/^Zustand \[(\d+)\](?:: (.+))?$/);if(indexed)return `${locale==='fr'?'État':'State'} [${indexed[1]}]${indexed[2]?': '+interactiveText(indexed[2],locale):''}`;
  for(const suffix of [' oben',' rechts',' unten',' links'])if(String(value).endsWith(suffix))return `${interactiveText(value.slice(0,-suffix.length),locale)} ${interactiveText(suffix.trim(),locale)}`;
  for(const suffix of [': Optionen im Projekt speichern',' aktivieren',' vollständig aktivieren oder deaktivieren'])if(String(value).endsWith(suffix))return `${interactiveText(value.slice(0,-suffix.length),locale)}: ${basicText(suffix.trim().replace(/^: /,''),locale)}`;
  return basicText(value,locale);
}
export function interactiveGroups(groups,widget,keyFor,fallback){const locale=interactiveLocale(widget,fallback);return groups.map((group,index)=>({...group,id:keyFor(group,index),interactiveLocale:locale,label:interactiveText(group.label,locale),fields:group.fields.map(field=>({...field,label:interactiveText(field.label,locale),options:field.options?.map(option=>typeof option==='string'?{value:option,label:interactiveText(option,locale)}:{...option,label:interactiveText(option.label,locale)})}))}));}
export function localizeInteractiveDOM(root,locale){const walker=root.ownerDocument.createTreeWalker(root,4);let node;while((node=walker.nextNode()))if(!node.parentElement.closest('input,textarea,option,code,pre'))node.nodeValue=interactiveText(node.nodeValue,locale);for(const el of root.querySelectorAll('[title],[aria-label]'))for(const key of ['title','aria-label'])if(el.hasAttribute(key))el.setAttribute(key,interactiveText(el.getAttribute(key),locale));}
