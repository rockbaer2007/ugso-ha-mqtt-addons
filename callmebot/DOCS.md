# UGSo CallMeBot — DE / EN / FR

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
