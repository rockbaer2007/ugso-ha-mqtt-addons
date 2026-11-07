# ioBroker : attribution automatique des rôles {#iobroker-role-mapping}

Le JavaScript optionnel est fourni avec MQTT-Client **0.1.24** et s’exécute dans l’adaptateur JavaScript d’ioBroker. Il exploite les métadonnées transmises `device_class` et `unit_of_measurement`. Seuls les cas non ambigus sont traités ; les valeurs MQTT, types, unités, identifiants de connexion et canaux de commande ne sont pas réécrits.


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

Après vérification de l’aperçu, passez à `mode: 'apply'` et redémarrez. **Le point de sauvegarde, les dossiers et les nouveaux points VIS 2 sont créés automatiquement.** L’aperçu ne crée volontairement rien. Les points étrangers existants, alias et rôles manuels ne sont pas écrasés. Votre ancien alias, par exemple sous `alias.0.HA`, peut être conservé.

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
5. Conservez `mode: 'preview'`, démarrez le script et consultez son journal. L’aperçu n’écrit rien.
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
