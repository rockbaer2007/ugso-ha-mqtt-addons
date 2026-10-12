# CallMeBot Whatsapp — DE / EN / FR

## Profile selection / Profilauswahl / Sélection de profil — 0.1.2

**DE:** Mit Blocks for HA 0.1.49 das Profilfeld anklicken, Namen suchen und übernehmen. Standardempfänger oder manuelle ID bleiben möglich. Beide Apps aktualisieren/neustarten. HA-Verbindung und MQTT-Discovery mit Präfix `homeassistant` sind erforderlich. Die App veröffentlicht nur Profil-ID, Name, Standardprofil und Anzahl auf `ugso/callmebot/profiles` und erstellt einen HA-Diagnose-Sensor. Änderungen und MQTT-Neuverbindungen aktualisieren den retained Katalog. Keine Telefonnummern, Nachrichten oder Schlüssel. Profilnamen sind in HA/MQTT sichtbar.

**EN:** In Blocks for HA 0.1.49 click the profile field, search by name and apply. Default recipient and manual IDs remain available. Update/restart both apps. HA connectivity and MQTT discovery with prefix `homeassistant` are required. The app publishes profile ID, name, default and count only on `ugso/callmebot/profiles` and discovers a diagnostic sensor. Changes and MQTT reconnections refresh the retained catalog. No phone numbers, messages or keys. Names are visible in HA/MQTT.

**FR :** Dans Blocks for HA 0.1.49, cliquer sur le champ de profil, rechercher un nom et appliquer. Destinataire par défaut et saisie manuelle restent disponibles. Mettre à jour/redémarrer les deux applications. Connexion HA et découverte MQTT avec préfixe `homeassistant` requises. L’application publie uniquement ID, nom, profil par défaut et nombre sur `ugso/callmebot/profiles`, avec un capteur de diagnostic. Modifications et reconnexions actualisent le catalogue retenu. Sans numéros, messages ni clés. Noms visibles dans HA/MQTT.

## Einrichtung / Setup / Configuration

**DE:** Aktuelle Bot-Nummer aus der [offiziellen Aktivierungsanleitung](https://www.callmebot.com/blog/free-api-whatsapp-messages/) verwenden. Dem Bot genau `I allow callmebot to send me messages` senden und auf den API-Schlüssel warten. Eigene aktivierte Empfängernummer mit Ländervorwahl und passenden Schlüssel als Profil speichern. Standardprofil auswählen. Die Testschaltfläche sendet wirklich. Die Schlüssel werden nie wieder an die Oberfläche zurückgegeben; ein leeres Schlüsselfeld beim Speichern behält den vorhandenen Schlüssel.

**EN:** Use the current bot number from the [official activation guide](https://www.callmebot.com/blog/free-api-whatsapp-messages/). Send exactly `I allow callmebot to send me messages` and wait for the API key. Save your activated recipient number with country code and its matching key as a profile. Select a default. The test button really sends. Keys are never returned to the UI; leaving the key blank when saving keeps the stored key.

**FR :** Utiliser le numéro actuel du bot dans le [guide officiel](https://www.callmebot.com/blog/free-api-whatsapp-messages/). Envoyer exactement `I allow callmebot to send me messages` et attendre la clé API. Enregistrer le numéro activé avec indicatif international et sa clé correspondante dans un profil. Choisir un profil par défaut. Le bouton de test envoie réellement. Les clés ne sont jamais renvoyées à l’interface ; un champ de clé vide conserve la clé enregistrée.

## MQTT

Command topic: `ugso/callmebot/send`, **QoS 0, retain false**.

```json
{"profile":"default","message":"Hello from Home Assistant","loglevel":"errors","request_id":"optional_unique_id"}
```

- `profile`: saved ID; empty/omitted uses the default. ASCII lowercase letter followed by lowercase letters, digits or underscores; max 40 characters.
- `message`: nonempty text, max 4000 characters.
- `loglevel`: `none`, `errors` (default), `info`. Logs contain only status codes.
- `request_id`: optional ASCII letters/digits/underscores/hyphens, max 100 characters. Duplicates per profile are rejected for one hour, keeping at most 1000 IDs. Without it, identical texts remain separate requests.
- `ugso/callmebot/result`: non-retained status (`accepted`, `provider_rejected`, `provider_unavailable`, etc.), profile, optional request ID and timestamp. No message, number or key.
- `ugso/callmebot/availability`: retained `online`/`offline` broker connection status.

Up to 16 profiles, queue of 20 commands, minimum 10 seconds between provider attempts per profile. Commands within that interval are rejected, not delayed. No automatic provider retries; failed commands are not replayed after restart. Retained commands are rejected. MQTT permissions determine who can request sends; restrict broker write permissions. The app uses one fixed MQTT namespace/client ID, so run one instance per broker.

## Blocks for HA 0.1.48

**DE:** Kategorie **Nachrichten**, Block **WhatsApp · CallMeBot**. Profil leer lassen für den Standardempfänger; Nachricht als Text, Variable oder Jinja anschließen. Der Export erzeugt `mqtt.publish`; JSON wird erst nach der Template-Auswertung sicher serialisiert. HA muss MQTT eingerichtet haben. JSON-Projekte bewahren den Komfortblock. YAML wird als allgemeine HA-Aktion zurückimportiert.

**EN:** Category **Messages**, block **WhatsApp · CallMeBot**. Leave the profile empty for the default; connect text, a variable or Jinja. Exports `mqtt.publish`, safely serializing JSON after template evaluation. HA requires MQTT. JSON projects preserve the dedicated block. YAML imports back as a general HA action.

**FR :** Catégorie **Messages**, bloc **WhatsApp · CallMeBot**. Laisser le profil vide pour le destinataire par défaut ; connecter texte, variable ou Jinja. Exporte `mqtt.publish` et sérialise le JSON après évaluation du modèle. MQTT doit être configuré dans HA. Les projets JSON conservent le bloc dédié. Le YAML est réimporté comme action HA générale.

## Limits / Grenzen / Limites

**DE:** CallMeBot Free ist für persönliche Texte an eigene aktivierte Nummern bestimmt. Keine Gruppen, Medien, Antworten oder Zustellbestätigung. `accepted` bestätigt nur die Annahme der API-Anfrage. Telefonnummer, Schlüssel und Nachricht werden per HTTPS an CallMeBot übertragen. `/data/profiles.json` ist eine private Backend-Datei, kein verschlüsselter Tresor. HA-Sicherungen enthalten diese Datei.

**EN:** CallMeBot Free is for personal texts to your own activated numbers. No groups, media, replies or delivery confirmation. `accepted` confirms API acceptance only. Phone, key and message are transmitted over HTTPS to CallMeBot. `/data/profiles.json` is a private backend file, not an encrypted vault. HA backups contain this file.

**FR :** CallMeBot Free est destiné aux textes personnels vers ses propres numéros activés. Sans groupes, médias, réponses ni confirmation de livraison. `accepted` confirme seulement l’acceptation de la requête API. Numéro, clé et message sont transmis par HTTPS à CallMeBot. `/data/profiles.json` est un fichier privé du backend, sans chiffrement. Les sauvegardes HA contiennent ce fichier.

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
