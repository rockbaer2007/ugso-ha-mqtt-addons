import { materialText } from "./material-locales.js";
const rows = `
Basic-Sprache|Basic language|Langue Basic
Zusatzaktion fehlgeschlagen|Extra action failed|Échec de l’action supplémentaire
Wert konnte nicht gesetzt werden|Could not set value|Impossible de définir la valeur
Entität ist nicht verfügbar.|Entity unavailable.|Entité indisponible.
Ein endlicher Zahlenwert ist erforderlich.|A finite number is required.|Un nombre fini est requis.
Der Wert liegt außerhalb der Entitätsgrenzen.|Value outside entity limits.|Valeur hors des limites de l’entité.
Die Auswahl ist nicht verfügbar.|Selection unavailable.|Sélection indisponible.
Der Text überschreitet die Entitätsgrenze.|Text exceeds entity limit.|Le texte dépasse la limite de l’entité.
HTML-Modus|HTML mode|Mode HTML
Bereinigtes HTML|Sanitized HTML|HTML nettoyé
Notiz|Note|Note
Notiztext|Note text|Texte de la note
Automatisch|Automatic|Automatique
Deutsch|German|Allemand
Daten|Data|Données
Erweiterte Zahlenformatierung|Extended number formatting|Format numérique avancé
Zahlenmodus|Number mode|Mode numérique
Bisheriges Verhalten|Previous behavior|Comportement précédent
VIS-2-kompatibel|VIS-2 compatible|Compatible VIS-2
Nachkommastellen automatisch|Automatic decimal places|Décimales automatiques
Tausendertrennung|Thousands separator|Séparateur de milliers
Qualitätsentität|Quality entity|Entité de qualité
CSS-Klasse bei true|CSS class when true|Classe CSS si vrai
CSS-Klasse bei false|CSS class when false|Classe CSS si faux
Bool-Modus|Boolean mode|Mode booléen
Minimum|Minimum|Minimum
Maximum|Maximum|Maximum
Extrasteuerung|Additional control|Commande supplémentaire
Steuerungsziel|Control target|Cible de commande
Hauptziel und Zusatzaktion|Main target and extra action|Cible principale et action supplémentaire
Nur separates Ziel|Separate target only|Cible séparée uniquement
Objekt ID bei true|Target entity when true|Entité cible si vrai
Objekt ID bei false|Target entity when false|Entité cible si faux
Wert für ID bei true|Target value when true|Valeur cible si vrai
Wert für ID bei false|Target value when false|Valeur cible si faux
URL bei true|URL when true|URL si vrai
URL bei false|URL when false|URL si faux
URL-Aktion|URL action|Action URL
Fenster öffnen|Open window|Ouvrir une fenêtre
URL aufrufen|Request URL|Appeler l’URL
Zielfenster|Target window|Fenêtre cible
Bereinigtes HTML anzeigen|Display sanitized HTML|Afficher le HTML nettoyé
Bestätigungsquelle|Acknowledgment source|Source de confirmation
Bisheriger Entitätszustand|Previous entity state|État précédent de l’entité
Bestätigungsentität|Acknowledgment entity|Entité de confirmation
Bestätigungsattribut|Acknowledgment attribute|Attribut de confirmation
Steuerelement-Stil|Control style|Style de commande
Nativ|Native|Natif
Modern|Modern|Moderne
Vollbild-Darstellung|Fullscreen appearance|Apparence plein écran
Tabellen-Darstellung|Table appearance|Apparence du tableau
Ziel-Widget der Unteransicht|Subview target widget|Widget cible de la sous-vue
Zeitformat-Modus|Time format mode|Mode du format horaire
Zeitstempel-Einheit|Timestamp unit|Unité d’horodatage
Sekunden|Seconds|Secondes
Millisekunden|Milliseconds|Millisecondes
Projekt- und Seitendetails anzeigen|Show project and page details|Afficher les détails du projet et de la page
Lokalisiert|Localized|Localisé
Home-Assistant-Entität|Home Assistant entity|Entité Home Assistant
Home-Assistant-Entity|Home Assistant entity|Entité Home Assistant
Home-Assistant-Entity (Indexwert)|Home Assistant entity (index)|Entité Home Assistant (index)
HA-Attribut (leer: Zustand)|HA attribute (empty: state)|Attribut HA (vide : état)
HTML voranstellen|Prepend HTML|Préfixe HTML
HTML anhängen|Append HTML|Suffixe HTML
HTML anhängen (Singular)|Append HTML (singular)|Suffixe HTML (singulier)
HTML anhängen (Plural)|Append HTML (plural)|Suffixe HTML (pluriel)
HTML bei 'true'|HTML when true|HTML si vrai
HTML bei 'false'|HTML when false|HTML si faux
HTML bei true|HTML when true|HTML si vrai
HTML bei false|HTML when false|HTML si faux
HTML für Ein|HTML for on|HTML pour marche
HTML für Aus|HTML for off|HTML pour arrêt
Sprachmodus|Speech mode|Mode vocal
Schlüsselwörter|Keywords|Mots-clés
Erkennungssprache|Recognition language|Langue de reconnaissance
Fortlaufende Erkennung|Continuous recognition|Reconnaissance continue
Ergebnis ausblenden|Hide result|Masquer le résultat
Sprachsymbol Inactive|Inactive speech icon|Icône vocale inactive
Sprachsymbol Active|Active speech icon|Icône vocale active
Sprachsymbol Started|Started speech icon|Icône vocale démarrée
Sprachsymbol Detected|Detected speech icon|Icône vocale détectée
Sprachsymbol Sent|Sent speech icon|Icône vocale envoyée
Fenster schließen|Close window|Fermer la fenêtre
Rückkehr-URL|Return URL|URL de retour
Vollbild|Fullscreen|Plein écran
Vollbild beenden|Exit fullscreen|Quitter le plein écran
Vollbild nicht verfügbar|Fullscreen unavailable|Plein écran indisponible
Spracherkennung nicht verfügbar|Speech recognition unavailable|Reconnaissance vocale indisponible
Aufnahme starten|Start recording|Démarrer l’enregistrement
Aufnahme stoppen|Stop recording|Arrêter l’enregistrement
Spracherkennung fehlgeschlagen|Speech recognition failed|Échec de la reconnaissance vocale
Runtime verlassen|Leave runtime|Quitter l’exécution
Keine Tabellendaten|No table data|Aucune donnée de tableau
Ungültige JSON-Testdaten|Invalid JSON test data|Données JSON de test invalides
Quelle auswählen|Select source|Choisir la source
Seite auswählen|Select page|Choisir la page
Kein gültiger Seitenindex|Invalid page index|Index de page invalide
Seite nicht gefunden|Page not found|Page introuvable
Rekursive Einbettung verhindert|Recursive embedding prevented|Intégration récursive empêchée
Bild-URL nicht gesetzt|Image URL missing|URL de l’image manquante
Notiz öffnen|Open note|Ouvrir la note
Notiz konnte nicht gespeichert werden.|Could not save note.|Impossible d’enregistrer la note.
Zum Bearbeiten wird ein verfügbarer input_text-Helfer ohne Attributauswahl benötigt.|Editing requires an available input_text helper without an attribute.|La modification nécessite un assistant input_text disponible sans attribut.
HA hat kein ioBroker-ACK-Flag. Wähle eine eigene Bestätigungsentität oder ein Attribut.|HA has no ioBroker ACK flag. Select an acknowledgment entity or attribute.|HA n’a pas d’indicateur ACK ioBroker. Choisissez une entité ou un attribut de confirmation.
Generell|General|Général
Größe und Position|Size and position|Taille et position
Widget-Darstellung|Widget appearance|Apparence du widget
Sichtbarkeit|Visibility|Visibilité
Nur für Gruppen|Only for groups|Uniquement pour les groupes
Falls Anwender nicht in der Gruppe|When user is outside the group|Si l’utilisateur est hors du groupe
Falls nicht erfüllt|When condition is false|Si la condition n’est pas remplie
Entität für Bedingung|Condition entity|Entité de condition
Wert für die Bedingung|Condition value|Valeur de condition
ausblenden|Hide|Masquer
deaktivieren|Disable|Désactiver
Anzeigen|Show|Afficher
Kommentar|Comment|Commentaire
Filterwort|Filter word|Mot de filtre
CSS Klasse|CSS class|Classe CSS
CSS-Klasse|CSS class|Classe CSS
Inaktiv (gesperrt)|Inactive (locked)|Inactif (verrouillé)
Zahlenformat|Number formatting|Format numérique
Nachkommastellen|Decimal places|Décimales
Multiplikator|Multiplier|Multiplicateur
Dezimalkomma verwenden|Use decimal comma|Utiliser la virgule décimale
Testtext|Test text|Texte de test
Testwert|Test value|Valeur de test
Testwert (HTML)|Test value (HTML)|Valeur de test (HTML)
Testwert (nur Editor)|Test value (editor only)|Valeur de test (éditeur uniquement)
Testwert / Zeitstempel|Test value / timestamp|Valeur de test / horodatage
Testzustand|Test state|État de test
Test-Index / Zustand|Test index / state|Index de test / état
Vorschau-Index|Preview index|Index d’aperçu
Vorschauwert|Preview value|Valeur d’aperçu
Bild-URL / Testwert|Image URL / test value|URL d’image / valeur de test
Relative Zeit anzeigen|Show relative time|Afficher le temps relatif
Datumsformat|Date format|Format de date
Updatezeit (ms)|Refresh interval (ms)|Intervalle d’actualisation (ms)
Update bei Aufwachen|Refresh on wake|Actualiser au réveil
Update bei Viewwechsel|Refresh on view change|Actualiser au changement de vue
Addiere nichts zu URL|Do not append to URL|Ne rien ajouter à l’URL
Kein Sandkasten|No sandbox|Sans bac à sable
Kein Rahmen|No frame|Sans cadre
Strecken|Stretch|Étirer
Ecke ausblenden|Hide corner|Masquer le coin
Nur Anzeige|Display only|Affichage uniquement
Nur lesen|Read only|Lecture seule
nur lesend|Read only|Lecture seule
Auto-setzen|Auto submit|Envoi automatique
Auto-setzen Verzögerung (ms)|Auto submit delay (ms)|Délai d’envoi automatique (ms)
Autofokus|Autofocus|Mise au point automatique
Kein Style|No style|Sans style
Nummer|Numeric|Numérique
Symbolgröße in Pixel|Icon size in pixels|Taille de l’icône en pixels
Icon für Aus (Bild-URL)|Off icon (image URL)|Icône arrêt (URL d’image)
Icon für Ein (Bild-URL)|On icon (image URL)|Icône marche (URL d’image)
Symbol Aus (Bild-URL)|Off icon (image URL)|Icône arrêt (URL d’image)
Symbol Ein (Bild-URL)|On icon (image URL)|Icône marche (URL d’image)
Ereignis ID|Event entity|Entité d’événement
Neues Ereignis am Anfang|New event first|Nouvel événement en premier
Bestätigung ID (HA-Helfer)|Acknowledgment entity (HA helper)|Entité de confirmation (assistant HA)
Ausgewählt ID (input_text)|Selected entity (input_text)|Entité de sélection (input_text)
Kein Header|No header|Sans en-tête
Zeige Scrollbar|Show scrollbar|Afficher la barre de défilement
Kolumnanzahl|Column count|Nombre de colonnes
Detailed widget|Detail widget|Widget de détail
Static JSON (ohne ID)|Static JSON (without entity)|JSON statique (sans entité)
Table Object ID (HA-Entität)|Table entity|Entité du tableau
btn_print|Print button text|Texte du bouton d’impression
view_for_print|Print page|Page d’impression
Werteanzahl bis|Highest value index|Index de valeur maximal
Werteliste (ein Eintrag pro Zeile oder mit Semikolon)|Value list (line or semicolon separated)|Liste de valeurs (lignes ou points-virgules)
Rufe URL bei Klick|Request URL on click|Appeler l’URL au clic
View zum Navigieren|Navigation page|Page de navigation
Keine Option Kein Filter|Hide no-filter option|Masquer l’option sans filtre
Etikett Kein Filter|No-filter label|Libellé sans filtre
Dropdown-Menü|Dropdown menu|Menu déroulant
Horizontale Tasten|Horizontal buttons|Boutons horizontaux
Vertikale Tasten|Vertical buttons|Boutons verticaux
Kein Filter|No filter|Sans filtre
Variante|Variant|Variante
editor|Edit entries|Modifier les entrées
variant|Variant|Variante
type|Type|Type
withEnter|Confirm with Enter|Confirmer avec Entrée
Titelhintergrund|Title background|Fond du titre
Titel-Oben-Abstand (px)|Title top offset (px)|Décalage supérieur du titre (px)
Titel-Links-Abstand (px)|Title left offset (px)|Décalage gauche du titre (px)
Kopfhöhe (px)|Header height (px)|Hauteur de l’en-tête (px)
Kopffarbe|Header color|Couleur de l’en-tête
Grenzradius|Border radius|Rayon de bordure
Punkteanzahl|Point count|Nombre de points
Füllfarbe|Fill color|Couleur de remplissage
Linienfarbe|Stroke color|Couleur du trait
Linienbreite|Stroke width|Épaisseur du trait
Breitenskala|Width scale|Échelle de largeur
Höhenskala|Height scale|Échelle de hauteur
Drehen|Rotate|Rotation
Durchsichtigkeit|Opacity|Opacité
Durchsichtigkeit (Schatten/CSS)|Shadow CSS|CSS de l’ombre
Benutzerdefiniertes Polygon|Custom polygon|Polygone personnalisé
Linie|Line|Ligne
Dreieck|Triangle|Triangle
Quadrat|Square|Carré
Pentagon|Pentagon|Pentagone
Sechseck|Hexagon|Hexagone
Achteck|Octagon|Octogone
Kreis|Circle|Cercle
Stern|Star|Étoile
Pfeil|Arrow|Flèche
Wert umkehren|Reverse value|Inverser la valeur
Signalbilder|Signal images|Images de signal
Anzahl der Signale|Signal count|Nombre de signaux
CSS Trennlinie|Separator CSS|CSS du séparateur
Dicke (px)|Thickness (px)|Épaisseur (px)
Enden|Ends|Extrémités
Eckig|Square|Carrées
Rund|Round|Rondes
Spitz (pfeilartig)|Pointed (arrow-like)|Pointues (en flèche)
Snapfunktion aktivieren|Enable snapping|Activer l’alignement
Slider-Schiene|Slider track|Piste du curseur
Slider-Regler|Slider thumb|Poignée du curseur
Schienenschatten|Track shadow|Ombre de la piste
Reglerschatten|Thumb shadow|Ombre de la poignée
Schienenfarbe|Track color|Couleur de la piste
Aktive Schienenfarbe|Active track color|Couleur de la piste active
Spurtyp|Track type|Type de piste
Normal|Normal|Normal
Umgekehrt|Reversed|Inversé
Ohne aktive Spur|Without active track|Sans piste active
Schienenstärke (px)|Track thickness (px)|Épaisseur de la piste (px)
Schienenradius (%)|Track radius (%)|Rayon de la piste (%)
Reglerfarbe|Thumb color|Couleur de la poignée
Reglergröße (px)|Thumb size (px)|Taille de la poignée (px)
Reglerradius (%)|Thumb radius (%)|Rayon de la poignée (%)
Min-/Max-Werte anzeigen|Show min/max values|Afficher les valeurs min/max
Skalenposition|Scale position|Position de l’échelle
Zwischenmarkierungen (0 = aus)|Intermediate marks (0 = off)|Repères intermédiaires (0 = désactivé)
Werte der Zwischenmarkierungen anzeigen|Show intermediate values|Afficher les valeurs intermédiaires
Anzahl der Tabs|Tab count|Nombre d’onglets
Vertikale Tabs|Vertical tabs|Onglets verticaux
Tab-Variante|Tab variant|Variante des onglets
Gesamtbreite|Full width|Pleine largeur
zentriert|Centered|Centré
Tab-Farbe|Tab color|Couleur des onglets
Textfarbe aktiv|Active text color|Couleur du texte actif
Textfarbe nicht aktiv|Inactive text color|Couleur du texte inactif
Inaktive Reiter abdunkeln (%)|Dim inactive tabs (%)|Assombrir les onglets inactifs (%)
Randfarbe|Border color|Couleur de bordure
Schattenfarbe (CSS / RGBA)|Shadow color (CSS / RGBA)|Couleur de l’ombre (CSS / RGBA)
Ausdehnung (px)|Spread (px)|Étendue (px)
Unschärfe (px)|Blur (px)|Flou (px)
X-Versatz (px)|X offset (px)|Décalage X (px)
Y-Versatz (px)|Y offset (px)|Décalage Y (px)
Einheit|Unit|Unité
Akzentfarbe|Accent color|Couleur d’accent
Einmal|Once|Une fois
Start / Stopp|Start / stop|Démarrer / arrêter
Fortlaufend|Continuous|Continu
Nur Schlüsselwörter senden|Send keywords only|Envoyer uniquement les mots-clés
Symbol ausblenden|Hide icon|Masquer l’icône
Ergebnis nicht anzeigen|Hide recognition result|Masquer le résultat de reconnaissance
Schlüsselwortfarbe|Keyword color|Couleur des mots-clés
Gesendete Textfarbe|Sent text color|Couleur du texte envoyé
Schriftstärke|Font weight|Graisse de police
Rahmenfarbe|Border color|Couleur de bordure
Rahmenbreite (px)|Border width (px)|Épaisseur de bordure (px)
Eckenradius (px)|Corner radius (px)|Rayon des coins (px)
Rahmenstil|Border style|Style de bordure
Schatten aktivieren|Enable shadow|Activer l’ombre
Hintergrund|Background|Fond
Typ|Type|Type
Seite|Page|Page
Quelle|Source|Source
Zustand|State|État
Alternativtext|Alternative text|Texte alternatif
Maximale Zeilenanzahl|Maximum rows|Nombre maximal de lignes
Schaltflächentext|Button text|Texte du bouton
Rand|Border|Bordure
Mehrfachauswahl|Multiple selection|Sélection multiple
Link|Link|Lien
allowUserInteractions|Allow user interactions|Autoriser les interactions
Der Name ist optional. Lass ihn leer, wenn du das Widget zum Beispiel über ein separates Textfeld beschriftest.|The name is optional; leave it empty when using a separate label.|Le nom est facultatif ; laissez-le vide si vous utilisez une étiquette séparée.
Bedingte Sichtbarkeit wird aktiv, sobald die Home-Assistant-Zustandsbindung verfügbar ist.|Conditional visibility uses the Home Assistant state.|La visibilité conditionnelle utilise l’état Home Assistant.
HTML-Link mit frei formatiertem Inhalt.|HTML link with formatted content.|Lien HTML avec contenu formaté.
Schreibt im Runtime-Modus in input_number oder input_text; ohne Entität bleibt die Eingabe lokal.|Writes to input_number or input_text in runtime; without an entity the input stays local.|Écrit dans input_number ou input_text en exécution ; sans entité la saisie reste locale.
Bettet eine gespeicherte Projektseite ein; rekursive Einbettung wird verhindert.|Embeds a saved project page; recursive embedding is prevented.|Intègre une page enregistrée ; l’intégration récursive est empêchée.
Die Zielseite muss Einbettung erlauben.|The target page must allow embedding.|La page cible doit autoriser l’intégration.
Zustandsabhängige Bild-Overlays, zum Beispiel für Warnungen oder Batteriestände. In der Runtime gilt der Live-Zustand einer gebundenen Entität.|State-dependent image overlays, for example warnings or battery levels, use live entity states.|Les images superposées, par exemple alertes ou batteries, utilisent les états des entités.
Der Zustand wird als Text ausgegeben, vorangestellter und angehängter HTML-Code als HTML. In der Runtime wird eine gebundene Entität gelesen.|The state is text; prefix and suffix are HTML. Runtime reads the bound entity.|L’état est du texte ; préfixe et suffixe sont du HTML. L’exécution lit l’entité liée.
Ohne Entität gilt der Vorschauwert; eine gebundene Entität liefert in der Runtime ihren aktuellen Zustand.|Without an entity the preview value applies; runtime reads bound entity states.|Sans entité la valeur d’aperçu s’applique ; l’exécution lit les états des entités liées.
Schreibt bei jedem Klick denselben Wert; kein Umschalten zwischen zwei Zuständen.|Each click writes the same value without toggling.|Chaque clic écrit la même valeur sans commutation.
Der Button schaltet den Vollbildmodus für die Oberfläche ein und aus.|The button enters or leaves fullscreen.|Le bouton active ou quitte le plein écran.
HTML-Code wird mit seinen Elementen, Attributen und Formatierungen dargestellt.|Displays sanitized HTML elements, attributes and formatting.|Affiche les éléments, attributs et formats HTML nettoyés.
HTML-Beschriftung zum Wechseln einer Projektseite; Navigation erfolgt nur in der Runtime.|HTML label for switching pages; navigation works in runtime.|Étiquette HTML pour changer de page ; navigation en exécution.
Ordne Widgets über „Filterwort“ in Generell einer Filteroption zu.|Assign widgets to a filter option using Filter word in General.|Associez les widgets à un filtre avec Mot de filtre dans Général.
Gemeinsame Angaben für Auswahl, Suche, Filterung und Darstellung dieses Widgets.|Common settings for selection, search, filtering and appearance.|Réglages communs pour sélection, recherche, filtrage et apparence.
Steuert die Sichtbarkeit anhand eines Home-Assistant-Zustands und optionaler Benutzergruppen.|Controls visibility using Home Assistant state and optional user groups.|Contrôle la visibilité avec un état Home Assistant et des groupes utilisateur facultatifs.
Titel|Title|Titre
Breite (CSS)|Width (CSS)|Largeur (CSS)
Attribut|Attribute|Attribut
Kopieren|Copy|Copier
Löschen|Delete|Supprimer
Nach oben|Move up|Monter
Nach unten|Move down|Descendre
Übernehmen|Apply|Appliquer
Abbrechen|Cancel|Annuler
Leeren|Clear|Effacer
aktivieren|Enable|Activer
Optionen im Projekt speichern|Save options in project|Enregistrer les options dans le projet
Keine Seite|No page|Aucune page
Kein Widget / freier Punkt|No widget / free point|Aucun widget / point libre
Eigene Einstellungen|Own settings|Réglages propres
vollständig aktivieren oder deaktivieren|Enable or disable completely|Activer ou désactiver entièrement
Optionen dieser Gruppe im gespeicherten Projekt übernehmen|Include this group’s options in the saved project|Inclure les options de ce groupe dans le projet enregistré
CSS Allgemein bleibt aktiv, damit Position und Größe gespeichert werden.|CSS general stays enabled to save position and size.|CSS général reste actif pour enregistrer position et taille.
`;
const dictionary = new Map(rows.trim().split("\n").map(row => row.split("|")).flatMap(([de, en, fr]) => [de, en, fr].filter(Boolean).map(key => [key, { de, en, fr: fr || en }])));
export function basicLocale(widget, fallback = "de") { return ["de", "en", "fr"].includes(widget.basicLocale) ? widget.basicLocale : /^fr/i.test(fallback) ? "fr" : /^en/i.test(fallback) ? "en" : "de"; }
export function basicText(text, locale = "de") {
  if (locale === "de" || !text) return text;
  const value = String(text), entry = dictionary.get(value);
  if (entry) return entry[locale];
  const message = value.match(/^([^:]+): (.+)$/);
  if (message && dictionary.has(message[1])) return `${basicText(message[1], locale)}: ${basicText(message[2], locale)}`;
  for (const suffix of [": Optionen im Projekt speichern", " aktivieren", " vollständig aktivieren oder deaktivieren"]) if (value.endsWith(suffix)) return `${basicText(value.slice(0, -suffix.length), locale)}: ${basicText(suffix.trim().replace(/^: /, ""), locale)}`;
  const indexed = value.match(/^(Spalte|Wert|Seite|Signal|Bild|Quelle) \[(\d+)\]$/);
  if (indexed) return `${{ en: { Spalte: "Column", Wert: "Value", Seite: "Page", Signal: "Signal", Bild: "Image", Quelle: "Source" }, fr: { Spalte: "Colonne", Wert: "Valeur", Seite: "Page", Signal: "Signal", Bild: "Image", Quelle: "Source" } }[locale][indexed[1]]} [${indexed[2]}]`;
  return materialText(value, locale);
}
export function localizeBasicDOM(root, locale) {
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  let node;
  while ((node = walker.nextNode())) if (!node.parentElement.closest("input, textarea, option, code, pre, [data-basic-user-content]")) node.nodeValue = basicText(node.nodeValue, locale);
  for (const element of root.querySelectorAll("[title], [aria-label], [placeholder]")) for (const attribute of ["title", "aria-label", "placeholder"]) if (element.hasAttribute(attribute)) element.setAttribute(attribute, basicText(element.getAttribute(attribute), locale));
}
export function basicGroups(groups, widget, keyFor, fallback) {
  const locale = basicLocale(widget, fallback);
  return groups.map((group, index) => ({ ...group, id: keyFor(group, index), basicLocale: locale,
    label: basicText(group.label, locale), hint: basicText(group.hint, locale),
    fields: group.fields.map(field => ({ ...field, label: basicText(field.label, locale), options: field.key === "testIndex" ? field.options : field.options?.map(option => typeof option === "string" ? { value: option, label: basicText(option, locale) } : { ...option, label: basicText(option.label, locale) }) })),
  }));
}
