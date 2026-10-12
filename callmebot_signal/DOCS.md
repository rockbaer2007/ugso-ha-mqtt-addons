<!-- DE -->
# CallMeBot Signal

Beta **HA-App 0.1.2** im [gemeinsamen Repository mit Blocks for HA](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/callmebot_signal). Vollständig **DE/EN/FR**, Systemsprache und Hell/Dunkel/System. Eigenständige UGSo-Implementierung, inspiriert von [ioBroker.signal-cmb](https://github.com/derAlff/ioBroker.signal-cmb).

![Signal-Oberfläche auf Deutsch](https://opensource.ugso-software.de/assets/callmebot-signal/de.png)

## Einrichtung

1. Repository `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` im HA-App-Store hinzufügen und **CallMeBot Signal** installieren.
2. MQTT in HA einrichten, App starten und Oberfläche über Ingress öffnen. Der interne MQTT-Dienst liefert bevorzugt die Zugangsdaten; App-Optionen dienen als Fallback.
3. Den aktuellen Bot-Kontakt aus der [offiziellen Signal-Aktivierungsanleitung](https://www.callmebot.com/blog/free-api-signal-send-messages/) verwenden. In **Signal** die dort angegebene Freischaltnachricht senden und den **Signal-API-Schlüssel** abwarten.
4. Profil-ID, Anzeigename, eigene internationale Telefonnummer **mit +** oder **Signal-UUID** sowie den passenden Schlüssel speichern. Bei verborgener Telefonnummer kann der Bot eine UUID liefern. Den Wert aus dem Aktivierungslink unverändert übernehmen.
5. Standardprofil wählen. „Nachricht senden“ sendet wirklich an das ausgewählte gespeicherte Profil.

WhatsApp-Schlüssel gelten nicht für Signal. Beide Apps können gleichzeitig laufen: getrennte Profile, MQTT-Themen, Client-IDs und Diagnose-Entitäten. Die [WhatsApp-App](https://opensource.ugso-software.de/projects/callmebot/) behält ihre bisherigen technischen IDs.

## Blockly und Profilauswahl

Seit **Blocks for HA 0.1.50**: **Nachrichten → Signal · CallMeBot**.

![Signal-Block](https://opensource.ugso-software.de/assets/blocks-for-ha/blocks/de/ugso_callmebot_signal_action.png)

Profilfeld anklicken, nach Name/ID suchen und auswählen. Leer bedeutet Standardempfänger. Sichtbar ist der Name; gespeichert wird die Profil-ID. Text, Variable oder Jinja als Nachricht anschließen. Protokoll: nur Fehler, keins oder Info. Der Block erzeugt natives `mqtt.publish`; JSON wird nach der Template-Auswertung serialisiert.

Die App veröffentlicht einen Katalog auf `ugso/callmebot_signal/profiles` und per MQTT-Discovery die Diagnose-Entität **`sensor.ugso_callmebot_signal_profiles`**. Zustand: Profilanzahl. Attribute: IDs, Namen, Standardprofil und Quellenmarker, **keine Telefonnummer, Nachricht oder Schlüssel**. Blocks erkennt den Quellenmarker auch nach Umbenennung der Entität. Standard-Discovery-Präfix: `homeassistant`.

Bei fehlender Verbindung Profil-ID manuell eingeben oder leer lassen. Ungültige/gelöschte IDs werden nicht automatisch ersetzt. JSON-Projekte erhalten den Komfortblock; YAML-Import stellt den Versand als allgemeine HA-/MQTT-Aktion dar.

## Protokoll und Grenzen

- Versand: `ugso/callmebot_signal/send`, QoS 0, **retain false**.
- Beispiel: `{"profile":"default","message":"Hallo aus HA","loglevel":"errors"}`. Leeres Profil verwendet den Standardempfänger.
- Ergebnis: `ugso/callmebot_signal/result`, nicht retained, nur Profil, Anfrage-ID, Status und Zeit.
- Katalog und Verfügbarkeit: `ugso/callmebot_signal/profiles` und `ugso/callmebot_signal/availability`, retained. Verfügbarkeit zeigt die Broker-Verbindung.
- Maximal 16 Profile, 4000 Zeichen, Warteschlange 20, mindestens 10 Sekunden zwischen Versandversuchen je Profil. Schnellere Befehle werden abgelehnt.
- Optionale `request_id`: eine Stunde Dublettenprüfung, maximal 1000 IDs. Keine automatischen Wiederholungen oder Wiedergabe nach Neustart; retained Befehle werden abgelehnt.
- Eine Signal-App-Instanz pro Broker. Schreibrechte auf Versandthemen beschränken. Externe MQTT-TLS-Konfiguration ist nicht enthalten.

Diese App sendet **Textnachrichten an eigene aktivierte Empfänger**. Bilder, Gruppen und Antworten sind nicht implementiert. `accepted` bestätigt nur die API-Annahme. Empfänger, Schlüssel und Nachricht gehen per HTTPS an `https://signal.callmebot.com/signal/send.php`.

Schlüssel bleiben in der privaten Backend-Datei `/data/profiles.json`, werden nicht an Browser/MQTT/Blockly ausgegeben und nicht protokolliert. Die Datei ist nicht verschlüsselt und in HA-Backups enthalten; Backups entsprechend schützen.

## Prüfstand

Backend, UUID-/Nummernvalidierung, MQTT-Protokoll, Blockly/Jinja-Export, DE/EN/FR und mobile Ansicht sind mit Testdaten geprüft. Echte Signal-Zustellung und Installation unter HA-Supervisor sind mit der eigenen Einrichtung zu prüfen. Automatisierte Tests senden keine echten Nachrichten.

[Quellcode](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/callmebot_signal) · Apache-2.0 · Unabhängiges Community-Projekt.


---

<!-- EN -->
# CallMeBot Signal

Beta **HA app 0.1.2** in the [shared Blocks for HA repository](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/callmebot_signal). Complete **DE/EN/FR**, system language and light/dark/system appearance. Original UGSo implementation inspired by [ioBroker.signal-cmb](https://github.com/derAlff/ioBroker.signal-cmb).

![Signal interface in English](https://opensource.ugso-software.de/assets/callmebot-signal/en.png)

## Setup

1. Add `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` to the HA app store and install **CallMeBot Signal**.
2. Configure HA MQTT, start the app and open its Ingress UI. Supervisor MQTT credentials take priority; app options are the fallback.
3. Use the current bot contact from the [official Signal activation guide](https://www.callmebot.com/blog/free-api-signal-send-messages/). Send its activation phrase in **Signal** and wait for your **Signal API key**.
4. Save a profile ID, display name, your international phone number **with +** or **Signal UUID**, and matching key. When your number is hidden, the bot may provide a UUID. Copy the recipient value from the activation link unchanged.
5. Choose a default profile. “Send message” really sends to the selected saved profile.

WhatsApp keys do not work for Signal. Both apps can run together with isolated profiles, MQTT topics, client IDs and diagnostic entities. The [WhatsApp app](https://opensource.ugso-software.de/en/projects/callmebot/) retains its existing technical IDs.

## Blockly and profile selection

Since **Blocks for HA 0.1.50**: **Messages → Signal · CallMeBot**.

![Signal block](https://opensource.ugso-software.de/assets/blocks-for-ha/blocks/en/ugso_callmebot_signal_action.png)

Click the profile field, search by name/ID and select. Empty uses the default recipient. The display name is shown; the profile ID is stored. Connect text, a variable or Jinja as the message. Logging: errors only, none or info. The block generates native `mqtt.publish`; JSON is serialized after template evaluation.

The app publishes a catalog on `ugso/callmebot_signal/profiles` and the MQTT discovery diagnostic entity **`sensor.ugso_callmebot_signal_profiles`**. State: profile count. Attributes: IDs, names, default and source marker, **no recipient, message or key**. Blocks uses the source marker even if the entity is renamed. Standard discovery prefix: `homeassistant`.

Without a connection, enter the profile ID manually or leave it empty. Invalid/deleted IDs are never replaced automatically. JSON projects retain the dedicated block; YAML import displays the send as a general HA/MQTT action.

## Protocol and limits

- Send: `ugso/callmebot_signal/send`, QoS 0, **retain false**.
- Example: `{"profile":"default","message":"Hello from HA","loglevel":"errors"}`. Empty profile uses the default recipient.
- Result: `ugso/callmebot_signal/result`, not retained, profile, request ID, status and time only.
- Catalog and availability: `ugso/callmebot_signal/profiles` and `ugso/callmebot_signal/availability`, retained. Availability reflects the broker connection.
- Up to 16 profiles, 4000 characters, queue of 20, at least 10 seconds between attempts per profile. Faster commands are rejected.
- Optional `request_id`: one-hour deduplication, up to 1000 IDs. No automatic retries/replay after restart; retained commands are rejected.
- One Signal app instance per broker. Restrict write access to command topics. External MQTT TLS configuration is not included.

This app sends **text messages to your own activated recipients**. Images, groups and replies are not implemented. `accepted` confirms API acceptance only. Recipient, key and message are sent over HTTPS to `https://signal.callmebot.com/signal/send.php`.

Keys stay in the private backend file `/data/profiles.json`, are never returned to browsers/MQTT/Blockly and are not logged. The file is not encrypted and is included in HA backups; protect backups accordingly.

## Verification

Backend, UUID/number validation, MQTT protocol, Blockly/Jinja export, DE/EN/FR and mobile layout are verified with test data. Real Signal delivery and HA Supervisor installation require your own setup. Automated tests never send real messages.

[Source](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/callmebot_signal) · Apache-2.0 · Independent community project.


---

<!-- FR -->
# CallMeBot Signal

**Application HA 0.1.2 bêta** dans le [dépôt commun de Blocks for HA](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/callmebot_signal). Entièrement **DE/EN/FR**, langue système et apparence claire/sombre/système. Implémentation UGSo originale inspirée de [ioBroker.signal-cmb](https://github.com/derAlff/ioBroker.signal-cmb).

![Interface Signal en français](https://opensource.ugso-software.de/assets/callmebot-signal/fr.png)

## Configuration

1. Ajouter `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` au magasin HA et installer **CallMeBot Signal**.
2. Configurer MQTT dans HA, démarrer l’application et ouvrir son interface Ingress. Les identifiants MQTT du Supervisor sont prioritaires ; les options servent de secours.
3. Utiliser le contact actuel du bot indiqué dans le [guide officiel Signal](https://www.callmebot.com/blog/free-api-signal-send-messages/). Envoyer la phrase d’activation dans **Signal** et attendre la **clé API Signal**.
4. Enregistrer l’ID du profil, son nom, votre numéro international **avec +** ou **UUID Signal**, et la clé correspondante. Si le numéro est masqué, le bot peut fournir un UUID. Copier le destinataire du lien d’activation sans le modifier.
5. Choisir le profil par défaut. « Envoyer le message » envoie réellement au profil enregistré sélectionné.

Les clés WhatsApp ne fonctionnent pas pour Signal. Les deux applications peuvent fonctionner ensemble : profils, sujets MQTT, identifiants clients et entités de diagnostic séparés. L’[application WhatsApp](https://opensource.ugso-software.de/fr/projects/callmebot/) conserve ses identifiants techniques.

## Blockly et sélection du profil

Depuis **Blocks for HA 0.1.50** : **Messages → Signal · CallMeBot**.

![Bloc Signal](https://opensource.ugso-software.de/assets/blocks-for-ha/blocks/fr/ugso_callmebot_signal_action.png)

Cliquer sur le champ du profil, rechercher par nom/ID et sélectionner. Vide utilise le destinataire par défaut. Le nom est affiché, l’ID est enregistré. Connecter du texte, une variable ou Jinja. Journal : erreurs seules, aucun ou info. Le bloc produit une action native `mqtt.publish` ; le JSON est sérialisé après l’évaluation du modèle.

L’application publie le catalogue sur `ugso/callmebot_signal/profiles` et l’entité de diagnostic MQTT **`sensor.ugso_callmebot_signal_profiles`**. État : nombre de profils. Attributs : IDs, noms, profil par défaut et marqueur source, **sans destinataire, message ni clé**. Blocks utilise le marqueur même si l’entité est renommée. Préfixe de découverte standard : `homeassistant`.

Sans connexion, saisir l’ID manuellement ou le laisser vide. Les IDs invalides/supprimés ne sont jamais remplacés automatiquement. Les projets JSON conservent le bloc dédié ; l’import YAML représente l’envoi par une action HA/MQTT générale.

## Protocole et limites

- Envoi : `ugso/callmebot_signal/send`, QoS 0, **retain false**.
- Exemple : `{"profile":"default","message":"Bonjour depuis HA","loglevel":"errors"}`. Un profil vide utilise le destinataire par défaut.
- Résultat : `ugso/callmebot_signal/result`, non retenu, uniquement profil, ID de requête, état et heure.
- Catalogue et disponibilité : `ugso/callmebot_signal/profiles` et `ugso/callmebot_signal/availability`, retenus. La disponibilité reflète la connexion au courtier.
- Maximum 16 profils, 4000 caractères, file de 20 et 10 secondes entre tentatives par profil. Les commandes plus rapides sont refusées.
- `request_id` facultatif : déduplication pendant une heure, maximum 1000 IDs. Sans réessai automatique ni répétition après redémarrage ; commandes retenues refusées.
- Une instance Signal par courtier. Limiter les droits d’écriture sur les commandes. La configuration MQTT TLS externe n’est pas incluse.

Cette application envoie des **textes à vos propres destinataires activés**. Images, groupes et réponses ne sont pas implémentés. `accepted` confirme uniquement l’acceptation API. Destinataire, clé et message sont transmis par HTTPS à `https://signal.callmebot.com/signal/send.php`.

Les clés restent dans le fichier privé `/data/profiles.json`, ne sont jamais renvoyées au navigateur/MQTT/Blockly et ne sont pas journalisées. Ce fichier n’est pas chiffré et figure dans les sauvegardes HA ; protéger les sauvegardes.

## Vérification

Backend, validation UUID/numéro, protocole MQTT, export Blockly/Jinja, DE/EN/FR et affichage mobile sont vérifiés avec des données de test. Livraison Signal réelle et installation HA Supervisor nécessitent votre propre configuration. Les tests automatisés n’envoient aucun message réel.

[Code source](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/tree/master/callmebot_signal) · Apache-2.0 · Projet communautaire indépendant.

## Beta: Historie, Profilsicherung und MQTT-TLS

Die Historie enthält bis zu 200 dauerhaft gespeicherte Einträge mit Zeitpunkt, Profil-ID, Quelle und Ergebnis. Filter nach Profil oder Fehlerstatus und bestätigtes Löschen sind verfügbar. Nachrichten, Telefonnummern, API-Schlüssel und Anfrage-IDs werden nicht in der Historie gespeichert. „Angenommen“ bestätigt weiterhin nur die Annahme durch CallMeBot, keine Zustellung. Bei Speicherfehlern wird der Versand nicht wiederholt.

Die Profilsicherung verschlüsselt Profile einschließlich Telefonnummern, API-Schlüsseln und Standardempfänger mit AES-GCM und einem aus dem Sicherungspasswort abgeleiteten Schlüssel (scrypt). Mindestens 12 Zeichen; Passwort separat aufbewahren. Es wird nicht gespeichert. Ohne Passwort ist keine Wiederherstellung möglich. Wiederherstellen ersetzt die Profile erst nach Bestätigung und erfolgreicher Prüfung; falsches Passwort, beschädigte Dateien oder Sicherungen der anderen CallMeBot-App ändern nichts. Bei wartenden Versandversuchen wird die Wiederherstellung abgewiesen. MQTT-Zugangsdaten und Historie sind nicht enthalten; für diese weiterhin die vollständige HA-App-Sicherung verwenden.

Unter MQTT-Verbindung bleibt „HA-Broker automatisch verwenden“ der bisherige Standard. Für einen externen Broker die Automatik deaktivieren und Host, Port, Benutzer und Passwort angeben. TLS prüft Zertifikat und Hostname; eigene CA und Client-Zertifikat/Schlüssel sind als PEM-Datei oder Text möglich. TLS-Port passend wählen, häufig 8883. Leere Geheimnisfelder behalten gespeicherte Werte. HA/Blocks müssen diesen Broker verwenden oder die Send-/Result-/Profil-/Discovery-Topics zwischen den Brokern weiterleiten; eine externe Verbindung allein ersetzt keine Broker-Bridge.

Bestehende profiles.json, Profile, Schlüssel, MQTT-Themen und Entitäts-IDs bleiben erhalten. Neue Historie: /data/history.json; ausdrücklich gespeicherte MQTT-Einstellungen: /data/mqtt.json. Die Konfiguration wird beim Update nicht automatisch umgeschrieben. Alle neuen Oberflächentexte sind DE/EN/FR.

Die Oberfläche und Beschreibung heißen Beta. Home Assistant unterstützt keinen nativen stage-Wert beta; der gültige technische Status experimental bleibt deshalb bestehen. [HA-Konfiguration](https://developers.home-assistant.io/docs/apps/configuration/).

## Beta: history, profile backup and MQTT TLS

History persists up to 200 entries with timestamp, profile ID, source and result. Filter by profile/error status and explicitly confirm clearing. It contains no messages, numbers, API keys or request IDs. Accepted still means provider acceptance, not confirmed delivery. A storage error never causes automatic resending.

Profile backups encrypt numbers, API keys and the default profile using AES-GCM and a password-derived key (scrypt). Choose at least 12 characters and keep the password separately; it is not stored. Restoration requires it, explicit confirmation and valid authenticated content. Wrong passwords, damaged files or backups from the other CallMeBot app leave profiles untouched. Pending sends block restoration. MQTT credentials and history are excluded; use a full HA app backup for those.

Automatic HA broker selection remains the existing default. Disable it to configure an external host, port, username and password. TLS always checks certificates and hostname; custom PEM CA and client certificate/key uploads are supported. Choose the broker TLS port, often 8883. Empty secret fields preserve saved values. HA/Blocks must use this broker or forward send/result/profile/discovery topics between brokers; this is not an automatic broker bridge.

Existing profiles.json, recipient keys, MQTT topics and entity IDs remain unchanged. History uses /data/history.json; explicitly saved MQTT settings use /data/mqtt.json. No automatic configuration rewrite. All new UI labels support DE/EN/FR.

Beta is displayed in the UI and description. HA has no native beta stage, so the valid experimental configuration stage remains. [HA configuration](https://developers.home-assistant.io/docs/apps/configuration/).

## Bêta : historique, sauvegarde des profils et MQTT TLS

L’historique conserve jusqu’à 200 entrées : date, ID du profil, source et résultat. Filtrer par profil/erreur et confirmer l’effacement. Sans messages, numéros, clés API ni ID de requête. Acceptée signifie acceptation par le fournisseur, pas confirmation de livraison. Une erreur de stockage ne provoque aucun renvoi automatique.

La sauvegarde chiffre les profils, numéros, clés API et destinataire par défaut avec AES-GCM et une clé dérivée du mot de passe (scrypt). Au moins 12 caractères ; conserver le mot de passe séparément. Il n’est pas enregistré. Restaurer nécessite le mot de passe, une confirmation et un contenu valide. Mot de passe incorrect, fichier altéré ou sauvegarde de l’autre application : profils inchangés. Les envois en attente bloquent la restauration. Identifiants MQTT et historique exclus ; utiliser une sauvegarde complète HA pour ceux-ci.

Le broker HA automatique reste le réglage existant. Désactiver l’automatisme pour définir un broker externe, son port et ses identifiants. TLS vérifie certificat et nom d’hôte ; import PEM de CA et certificat/clé client possible. Choisir le port TLS, souvent 8883. Champs secrets vides : valeurs enregistrées conservées. HA/Blocks doit utiliser ce broker ou transférer les topics d’envoi/résultat/profils/discovery entre brokers ; aucune passerelle automatique.

profiles.json, profils, clés, topics MQTT et ID d’entités conservés. Historique : /data/history.json ; réglages MQTT explicitement enregistrés : /data/mqtt.json. Aucune réécriture automatique lors de la mise à jour. Interface DE/EN/FR.

L’interface et la description portent Bêta. HA n’accepte pas beta comme stage natif ; experimental reste donc la valeur technique valide. [Configuration HA](https://developers.home-assistant.io/docs/apps/configuration/).
