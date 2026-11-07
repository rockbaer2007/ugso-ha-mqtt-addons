# ioBroker : attribution automatique des rôles {#iobroker-role-mapping}

Le JavaScript optionnel est fourni avec MQTT-Client **0.1.31** et s’exécute dans l’adaptateur JavaScript d’ioBroker. Il exploite les métadonnées transmises `device_class` et `unit_of_measurement`. Seuls les cas non ambigus sont traités ; les valeurs MQTT, types, unités, identifiants de connexion et canaux de commande ne sont pas réécrits.



## Nouveauté 0.1.31 : TLS et certificats repliables séparément {#tls-0131}

**TLS et certificats** dispose désormais d’une section repliable indépendante, utilisable à la souris et au clavier. Son bouton indique si TLS est sélectionné, même une fois replié. L’ouverture ou la fermeture ne modifie ni TLS, ni les certificats enregistrés, ni les identifiants. La section reste repliée après chargement et enregistrement ; les réglages de transmission et les deux boutons d’action restent visibles. Le [nouvel article sur le script JavaScript](https://opensource.ugso-software.de/fr/blog/snippets/iobroker-blockly#mqtt-vis2-helper) explique l’objectif, l’installation, les états/commandes et les sauvegardes, avec le script 0.1.27 complet et inchangé, un bouton de copie et un téléchargement.

## Nouveauté 0.1.30 : identifiants repliables {#credentials-0130}

La section **Identifiants** dispose désormais d’un bouton pour la déplier ou la replier, également utilisable au clavier. Si le broker est configuré, l’adresse IP, le port, le nom d’utilisateur et le mot de passe restent repliés après chargement et enregistrement. Si des champs obligatoires manquent, la section s’ouvre pour les corriger. **Transmission et TLS**, **Enregistrer et connecter** et **Valeurs actuellement transmises** restent visibles. Les réglages et identifiants ne sont pas modifiés. La priorité de la version 0.1.29 et le script 0.1.27 sont conservés. L’utilisateur a confirmé le bon fonctionnement du retour de commande avec un délai d’environ une demi-seconde. La lampe Zigbee a également été testée avec succès : le retour d’état fonctionne et la luminosité suit HA à 100 %.

## Nouveauté 0.1.29 : états de commande avant mesures {#priority-0129}

**Mettez l’application HA MQTT-Client à jour vers 0.1.29 ; le script ioBroker 0.1.27 reste inchangé.** Les états de commande/contact et les retours des commandes sont prioritaires sur les mesures et ne subissent pas la pause de publication configurée. Une transmission déjà engagée se termine normalement ; entre les messages, les lots de mesures/attributs cèdent la priorité aux états urgents ou commandes. À partir de 32 événements en attente, des lots limités de capteurs regroupent les valeurs intermédiaires pour conserver le dernier état de chaque source. Les changements de commande ordinaires restent conservés. Un contrôle périodique lit les états HA réels même avec la connexion en direct active, selon le `poll_interval` existant (5 secondes par défaut). Les valeurs inchangées ne sont pas republiées. **Übertragung und TLS** et la pause de publication des mesures/attributs sont directement visibles ; les identifiants de connexion restent repliables séparément. La ligne d’état distingue la file (**Wartend**), les événements regroupés (**Zusammengefasst**), la dernière réception HA (**HA-Eingang**) et le compteur cumulatif (**Gesendet**). Les réglages et valeurs existants sont conservés. Pour vérifier, laissez le contrôle à 5 secondes et actionnez un relais non critique dans HA. Seul un retour HA réel entraîne `ack: true` ; la transmission au broker ne suffit pas. Vérifié localement ; la latence réelle chez l’utilisateur reste à confirmer.

Les interrupteurs sont reconnus par le domaine `switch.*`, sans classe d’appareil ni unité obligatoire. Les lampes utilisent `light.*`. La sélection automatique des mesures, lorsqu’elle est activée, reste limitée au même appareil HA. Les capteurs utilisent d’abord `device_class` ; si elle manque, les unités non ambiguës de `unit_of_measurement`, telles que W/kW/MW, V/mV/kV, A/mA et Wh/kWh/MWh, sont utilisées. Les classes existantes ne sont jamais remplacées ; des noms similaires ou un pourcentage ambigu ne suffisent pas. **Vérifier les mesures associées** (interface allemande : **Zugehörige Messwerte prüfen**) affiche un rapport en lecture seule des capteurs détectés et des motifs d’exclusion : association d’appareil absente, entité désactivée ou classe/unité inadaptée. Les mesures peuvent attendre derrière les états de commande. Les réglages, identifiants et valeurs existantes sont conservés.

## Nouveauté 0.1.28 : retours HA sans surcharge d’événements étrangers {#live-0128}

Cette correction concerne **l’application MQTT-Client dans Home Assistant** : mettez-la à jour vers 0.1.28 et redémarrez l’application. Le script ioBroker 0.1.27 peut rester inchangé ; son seul remplacement ne corrige pas la réception des événements HA. Avec la sélection par étiquette, seuls les événements des entités sélectionnées et de leurs mesures du même appareil activées sont mis en file. Les événements du reste de HA ne peuvent plus remplir cette file. Après modification des étiquettes ou des affectations d’appareils, le client récupère des états HA récents. Les états en attente avec un ancien `last_updated` sont ignorés après resynchronisation ; les changements normalement ordonnés restent conservés. Le compteur de surcharge est cumulatif depuis le démarrage et signale toujours les débordements réels des événements sélectionnés. Le délai de publication configuré, les identifiants de connexion et les sélections sont conservés ; une première synchronisation importante peut encore durer. Après celle-ci, actionnez un relais non critique dans HA et vérifiez que MQTT et le point virtuel ioBroker suivent rapidement. La confirmation sur le système réel de l’utilisateur reste à faire.

## Nouveauté 0.1.27 : commandes sans retain {#commands-0127}

Les commandes utilisent désormais l’API `sendMessage2Client` de l’adaptateur MQTT ioBroker avec **`retain: false`**. En mode serveur, une écriture normale dans un point MQTT `set` peut parvenir au client avec le drapeau RETAIN. Le client HA continue de refuser ces commandes afin de ne pas exécuter d’anciennes demandes à la reconnexion. Les réglages globaux du broker et les valeurs des points MQTT sont conservés. Le script vérifie le topic de commande par rapport au topic d’état via `native.topic`, sans déduire les chemins des identifiants d’objets. Dans VIS 2, commandez toujours le point virtuel sous `0_userdata.0.ugso_mqtt` avec `ack: false` et `mode: 'apply'`. La ligne `Command handed to MQTT adapter (retain=false)` confirme uniquement la transmission à l’adaptateur ; un nouvel état HA doit confirmer l’exécution. La valeur brute du point MQTT `set` ne change pas nécessairement. Aucun nouvel essai automatique ; les erreurs ou l’absence de retour HA restent non confirmées. Remplacez le fichier complet du script en conservant vos réglages.

## Nouveauté 0.1.26 : création automatique de la base {#setup-0126}

Les dossiers de base du script (`virtualRoot`, `aliasRoot`) et les deux points de sauvegarde (`virtualBackupId`, `backupId`) absents sont désormais créés automatiquement au démarrage dans **tous les modes**, y compris `preview` et `restore`. Les dossiers, sauvegardes, valeurs et rôles manuels existants ne sont pas écrasés. Les nouveaux journaux contiennent des structures vides valides. Autorisez `setObject` dans l’instance JavaScript même pour l’aperçu. Les autorisations manquantes et les chemins incompatibles sont signalés comme erreurs. L’aperçu ne crée aucun point VIS 2 commandable et ne modifie ni les rôles MQTT ni les valeurs des appareils ; utilisez `mode: 'apply'` après vérification pour ces opérations. Le traitement événementiel de la version 0.1.25 est conservé.

## Correction 0.1.25 : objets absents sans avertissements {#fix-0125}

L’adaptateur JavaScript **10.4.10** émet aussi un avertissement lorsque `getObject` lit un identifiant absent. Le script vérifie désormais `existsObject` et `existsState` avant toute lecture d’objet ou d’état : journal, métadonnées optionnelles, dossiers et points virtuels non encore créés. La protection précédente utilisant seulement `getObject` était insuffisante.

L’aperçu affiche des lignes `Preview VIS 2` mais crée uniquement les dossiers de base et sauvegardes absents. Après vérification, choisissez `mode: 'apply'` pour la création automatique. Autorisez `setObject` dans l’instance JavaScript et désactivez **Do not subscribe to all states on start**, car le script lit les caches d’états de manière synchrone. Une création propre au script interrompue peut être retentée après correction des autorisations ; les points étrangers ou modifiés restent protégés.

MQTT-Client **0.1.24 ou ultérieur** fournit le catalogue requis ; remplacer le fichier complet du script suffit pour cette correction. Les anciens topics persistants désélectionnés sans identité d’entité actuelle sont ignorés. Les métadonnées HA absentes ne sont jamais inventées. Le message de démarrage indique maintenant version et mode.

Le script regroupe les changements MQTT réels pendant une seconde. Le mode virtuel traite uniquement les sources concernées ; les répétitions identiques et les attributs sans rapport ne déclenchent aucun passage. Une analyse complète a lieu au démarrage et lorsque le catalogue de sélection ou la disponibilité change. La vérification du délai concerne uniquement les commandes en attente et cesse après confirmation ou expiration. Chaque entité utilise uniquement le canal de commande correspondant à son état ; les objets ioBroker existants ne sont pas supprimés.

## Nouveauté 0.1.24 : un point VIS 2 pour l’état et la commande {#vis2}

Le script crée désormais automatiquement des points virtuels et dossiers sous `0_userdata.0.ugso_mqtt`. Il cible les API de l’adaptateur JavaScript ioBroker **10.4.10**. Commencez par **mettre MQTT-Client à jour vers 0.1.24** et reconnectez-le : le nouveau catalogue associe chaque entité à son topic actuel et à son autorisation de commande. Les anciens topics persistants ne doivent pas créer de commandes en double.

Conservez d’abord ces paramètres en haut du script complet :

```js
outputMode: 'virtual',
mode: 'preview',
mqttRoot: 'mqtt.0.ha_external',
virtualRoot: '0_userdata.0.ugso_mqtt',
virtualBackupId: '0_userdata.0.ugso_mqtt_helper.backup',
```

Après vérification de l’aperçu, passez à `mode: 'apply'` et redémarrez. **Le point de sauvegarde, les dossiers et les nouveaux points VIS 2 sont créés automatiquement.** L’aperçu crée uniquement les dossiers de base et sauvegardes absents ; les nouveaux points VIS 2 nécessitent `apply`. Les points étrangers existants, alias et rôles manuels ne sont pas écrasés. Votre ancien alias, par exemple sous `alias.0.HA`, peut être conservé.

Exemple : `mqtt.0.ha_external.claudia_pc.switch.state` et son canal `mqtt.0.ha_external.claudia_pc.switch.set` deviennent `0_userdata.0.ugso_mqtt.claudia_pc.switch.state`. **Utilisez uniquement ce point virtuel dans VIS 2.**

| Direction/fonction | Comportement |
|---|---|
| Retour MQTT → VIS 2 | État confirmé avec `ack: true` |
| Action VIS 2 → commande MQTT | Seules les actions actuelles avec `ack: false` sont envoyées à `/set` |
| Interrupteur | Normaliser virtuellement `on`/`off` en booléens ; renvoyer `ON`/`OFF` |
| Luminosité | Pourcentage 0–100, limites vérifiées |
| RGB | Tableau JSON MQTT ↔ couleur hexadécimale virtuelle `#RRGGBB` |
| Effet | Uniquement les choix de la liste d’effets actuelle |
| Température de couleur | Kelvin entiers dans les limites actuelles |
| Nombres, listes et texte | Vérifier les limites ou choix disponibles |
| Dates, mesures et batterie | Lecture seule ; valeurs MQTT d’origine conservées |

La création, le démarrage et le redémarrage n’envoient aucune commande et ne rejouent jamais d’anciennes actions. Un nouveau retour HA confirme la valeur ; l’acceptation par le broker ne confirme pas l’exécution. Sans nouveau retour pendant environ 30 secondes, la demande reste non confirmée avec la qualité d’erreur `q: 128`. Si la source est désélectionnée, inconnue ou hors ligne, la dernière valeur est conservée avec `q: 130` et les commandes sont bloquées. Aucune valeur zéro ou arrêt n’est inventée.

Le journal `virtualBackupId` est enregistré et vérifié avant chaque création. Il contient les associations et définitions d’objets, sans identifiants MQTT ni mesures actuelles. Le mode virtuel ne modifie pas les objets MQTT d’origine. Avec `mode: 'restore'`, les valeurs virtuelles et références du tableau de bord sont conservées ; les commandes virtuelles propres au script passent en lecture seule et la synchronisation s’arrête. Arrêtez ensuite le script.

La fonction précédente reste accessible avec `outputMode: 'roles'`. Les règles de rôles directs/alias et leur restauration ci-dessous concernent ce mode ; les tableaux décrivent aussi la signification des points virtuels. **N’exécutez qu’une seule copie du script à la fois.** Les attributs optionnels absents et le journal non encore créé ne produisent plus les anciens avertissements `getState`.

## Installation et sauvegarde {#installation}

1. Exportez d’abord dans ioBroker Admin les objets MQTT concernés avec leurs états et les scripts existants, ou effectuez une sauvegarde complète.
2. Dans MQTT-Client, choisissez **ioBroker-/VIS-2-Helfer herunterladen**, ou [téléchargez le script](../app/iobroker/ugso-mqtt-role-mapper.js).
3. Dans **Scripts** d’ioBroker, créez un **JavaScript** et collez le fichier entier. Une seule copie doit fonctionner dans une seule instance JavaScript.
4. Réglez `mqttRoot` sur votre chemin MQTT, par exemple `mqtt.0.ha_external`. Les caractères génériques sont interdits.
5. Conservez `mode: 'preview'`, démarrez le script et consultez son journal. L’aperçu crée uniquement les dossiers de base et sauvegardes absents.
6. Ajoutez dans `excludeIds` les points auxquels vous avez attribué manuellement le rôle générique `state`. Ce rôle manuel est indiscernable du rôle par défaut.
7. Après vérification, passez à `mode: 'apply'` et redémarrez le script. Autorisez `setObject` dans les paramètres de l’instance JavaScript. Celle-ci doit pouvoir lire les états MQTT.

Avant chaque modification, le rôle initial est enregistré dans l’état JSON `0_userdata.0.ugso_mqtt_roles.backup`, puis la sauvegarde est vérifiée. Le journal ne contient ni relevés de compteur ni identifiants de connexion. Un échec de sauvegarde bloque la modification suivante. Exportez également cet état de sauvegarde et conservez-le.

Les rôles spécifiques tels que `date`, `text` ou `value.temperature` ne sont pas remplacés. Une modification manuelle ultérieure empêche une nouvelle attribution automatique au même point. Aucun alias existant n’est écrasé.

## Rôles directs et alias en lecture seule {#aliases}

Les dates et horodatages reçoivent directement le rôle `date`. Le texte enregistré et les droits d’écriture sont conservés ; dans HA, `uptime` désigne la date de démarrage, pas une durée écoulée.

Dans ioBroker, les rôles de mesure et de capteur binaire sont en lecture seule. Si la source MQTT l’est déjà, seul son rôle générique est remplacé. Si elle est accessible en écriture, un alias en lecture seule est créé sous `alias.0.ugso_mqtt_roles` ; le rôle et les droits de l’original MQTT restent inchangés. Utilisez l’alias pour les visualisations et analyses. Ses valeurs proviennent toujours de l’état MQTT d’origine.

Le script vérifie les métadonnées et le type réel de la valeur. Il ne déduit pas les types des noms d’appareils ou des textes `on`/`off`. Les métadonnées absentes, unités incompatibles, dates invalides et classes inconnues sont ignorées. Il n’effectue aucune conversion et n’envoie aucune commande. Transmettez `device_class` et, pour les mesures, l’unité ; sélectionnez aussi ces attributs disponibles en mode manuel. La sélection par étiquette transmet automatiquement les métadonnées standard disponibles.

| Classe HA | Rôle ioBroker | Vérification |
|---|---|---|
| `date` | `date` | Date `YYYY-MM-DD` valide |
| `timestamp`, `uptime` | `date` | Horodatage ISO avec fuseau horaire |

## Correspondances numériques appliquées {#numeric}

Le tableau indique les unités réellement acceptées. Les autres unités restent inchangées et sont ignorées ; les mA ou mV, par exemple, ne sont pas convertis implicitement.

| Classe HA | Rôle ioBroker | Unités acceptées |
|---|---|---|
| `temperature` | `value.temperature` | `°C`, `°F`, `K` |
| `humidity` | `value.humidity` | `%` |
| `absolute_humidity` | `value.humidity.absolute` | `g/m³`, `mg/m³` |
| `battery` | `value.battery` | `%` |
| `voltage` | `value.voltage` | `V` |
| `current` | `value.current` | `A` |
| `power` | `value.power` | `W`, `kW` |
| `energy` | `value.energy` | `Wh`, `kWh` |
| `energy_storage` | `value.energy` | `Wh`, `kWh` |
| `reactive_power` | `value.power.reactive` | `var`, `kvar`, `kVar` |
| `reactive_energy` | `value.energy.reactive` | `varh`, `kvarh`, `kVarh` |
| `frequency` | `value.frequency` | `Hz` |
| `pressure` | `value.pressure` | `hPa`, `mbar` |
| `atmospheric_pressure` | `value.pressure` | `hPa`, `mbar` |
| `illuminance` | `value.brightness` | `lx`, `lux` |
| `distance` | `value.distance` | `m`, `km`, `cm`, `mm`, `mi`, `nmi`, `yd`, `ft`, `in` |
| `duration` | `value.interval` | `s`, `ms`, `h`, `d` |
| `wind_speed` | `value.speed` | `m/s`, `km/h`, `mph`, `kn` |
| `volume_flow_rate` | `value.flow` | `m³/h` |
| `signal_strength` | `value.rssi` | `dBm` |
| `aqi` | `value.airquality` | — |
| `carbon_dioxide` | `value.co2` | `ppm` |
| `carbon_monoxide` | `value.co` | `ppm` |
| `nitrogen_monoxide` | `value.no` | `ppm`, `µg/m³`, `μg/m³` |
| `nitrogen_dioxide` | `value.no2` | `ppm`, `µg/m³`, `μg/m³` |
| `ozone` | `value.o3` | `ppm`, `µg/m³`, `μg/m³` |
| `sulphur_dioxide` | `value.so2` | `ppm`, `µg/m³`, `μg/m³` |
| `pm1` | `value.pm1` | `µg/m³`, `μg/m³` |
| `pm25` | `value.pm25` | `µg/m³`, `μg/m³` |
| `pm10` | `value.pm10` | `µg/m³`, `μg/m³` |
| `radon` | `value.rn` | `Bq/m³` |
| `volatile_organic_compounds` | `value.tvoc` | `µg/m³`, `μg/m³` |
| `volatile_organic_compounds_parts` | `value.tvoc` | `ppb` |

## Capteurs binaires {#binary}

Seules les véritables valeurs booléennes avec un type d’objet compatible sont acceptées. Les textes HA habituels `on` et `off` restent inchangés et ne reçoivent pas de rôle booléen. Pour `battery`, vrai signifie batterie faible ; pour `lock`, vrai signifie déverrouillé.

| Classe HA | Rôle ioBroker |
|---|---|
| `battery` | `indicator.lowbat` |
| `connectivity` | `indicator.reachable` |
| `door` | `sensor.door` |
| `garage_door` | `sensor.door` |
| `window` | `sensor.window` |
| `opening` | `sensor.contact` |
| `lock` | `sensor.lock` |
| `motion` | `sensor.motion` |
| `moisture` | `sensor.alarm.flood` |
| `smoke` | `sensor.alarm.fire` |
| `carbon_monoxide` | `sensor.alarm.co` |
| `light` | `sensor.light` |
| `sound` | `sensor.noise` |
| `problem` | `indicator.error` |
| `running` | `indicator.working` |

## Autres correspondances examinées {#conditional}

Le mode rôles seul n’applique pas ces cas automatiquement. Le mode virtuel réalise désormais les fonctions Light et interrupteur ci-dessous avec les vérifications indiquées ; les niveaux, consommation/production et classes ambiguës ne sont toujours pas devinés.

| Classe/fonction HA | Rôle possible | Condition supplémentaire |
|---|---|---|
| `volume_storage` | `value.fill` | Confirmer un niveau réel de réservoir |
| `water`, `gas` | Mesure générique | Une consommation n’est pas un niveau |
| `energy` | `value.energy.consumed` / `value.energy.produced` | Identifier explicitement consommation ou production |
| `speed` | `value.speed` | Ne pas supposer qu’il s’agit du vent |
| `moisture` numérique | Mesure générique | Distinguer d’une alarme d’eau binaire |
| Retour de luminosité | `value.dimmer` | Confirmer le pourcentage et la fonction Light |
| Commande de luminosité | `level.dimmer` | Raccorder correctement un canal de commande séparé |
| Retour d’interrupteur | `sensor.switch` | Normaliser une valeur booléenne |
| Commande d’interrupteur | `switch` / `switch.light` | Raccorder `/set` ; aucune commande à l’installation |
| Commande de température de couleur | `level.color.temperature` | Kelvin, limites et canal de commande |
| Sélection d’effet | `level.effect` | Liste d’effets et canal de commande |
| Commande RGB | `level.color.rgb` | Convertir le tableau JSON en couleur hexadécimale |

Aucun rôle spécifique n’est deviné pour `occupancy`, `presence`, `moving`, `plug`, `power` binaire, `battery_charging`, `cold`, `heat`, `gas` binaire, `glass_break`, `safety`, `tamper`, `update` ou `vibration`. Des rôles génériques `sensor`/`indicator` ou règles personnalisées sont possibles mais exclus de cette attribution automatique prudente. Toutes les autres classes non indiquées restent également inchangées.

## Restauration {#restore}

Arrêtez le script, choisissez `mode: 'restore'`, puis relancez-le. Seules ses propres modifications de rôle sont restaurées, si le rôle et le type actuels correspondent encore à l’entrée sauvegardée. Les modifications manuelles ultérieures sont conservées. Ses alias non modifiés sont supprimés ; les alias modifiés ou étrangers sont conservés. Les valeurs MQTT d’origine ne sont jamais supprimées.

Arrêtez ensuite le script. Conservez le journal et les exclusions. Les points déjà enregistrés ne sont pas traités de nouveau avec le même journal ; une nouvelle opération exige un nouveau `backupId` choisi délibérément et, pour les alias, un `aliasRoot` libre.

Vérification locale avec des API ioBroker simulées : aperçu, échecs de sauvegarde, types, unités, modifications manuelles, alias et restauration. Pas encore testé dans une installation ioBroker réelle.

[Home Assistant: Sensor](https://www.home-assistant.io/integrations/sensor/#device-class) · [Home Assistant: Binary sensor](https://www.home-assistant.io/integrations/binary_sensor/#device-class) · [ioBroker: State roles](https://www.iobroker.com/docs/dev/stateroles.md) · [ioBroker: JavaScript API](https://github.com/ioBroker/ioBroker.javascript/blob/v10.4.10/docs/en/javascript.md)
