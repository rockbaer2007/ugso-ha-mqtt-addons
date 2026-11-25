# Festtags-Card-Editor 0.1.12

[Deutsch](../README.md) · [English](README.en.md)

Application Home Assistant, programmation locale de Noël et carte de tableau de bord.
Éditeur en allemand/anglais ; documentation DE/EN/FR. Aucune image n'est fournie.

## Installation et commandes

1. Créer une sauvegarde complète HA.
2. Installer/actualiser et démarrer l'application depuis le [dépôt UGSo](https://github.com/rockbaer2007/ugso-ha-mqtt-addons).
3. Redémarrer Home Assistant entièrement, pas seulement l'application.
4. Ouvrir l'éditeur ; à la première installation choisir **Set up integration**.
5. Régler région/pays, période et jusqu'à cinq entités (`light`, `switch`, `input_boolean`), puis enregistrer.
6. Cliquer sur **Register card resource** et recharger complètement le tableau de bord.

```yaml
type: custom:weihnachtssteuerung-card
title: Commande de Noël
```

Chaque cible possède ses horaires : tous les jours dans une période ou seulement aux fêtes sélectionnées. Période par défaut : premier dimanche de l'Avent jusqu'au 10 janvier inclus. Les dates de l'Avent et le passage à l'année suivante sont recalculés automatiquement. Les traditions occidentales, juliennes ou les deux sont disponibles pour 47 pays et des dates personnalisées. Les listes sont des propositions de fêtes/coutumes, pas un calendrier légal complet.

Les pauses sont conservées après redémarrage. La programmation continue dans HA Core lorsque l'éditeur est arrêté. Les icônes d'état facultatives suivent l'état réel : `mdi:lightbulb` allumé, `mdi:lightbulb-outline` éteint. La recherche d'entités utilise nom, identifiant, zone et appareil.

## Images, GIF et neige

- Images par pays/fête : `/config/www/weihnachtssteuerung/bilder`.
- Arrière-plans et décorations : `/config/www/weihnachtssteuerung/background`.
- PNG, JPG, WebP, GIF : maximum 5 Mio/16 mégapixels. Les animations sont conservées. SVG déjà présents associables, mais pas téléversables.
- Arrière-plan/décoration indépendants : transparence, taille, position X/Y et assombrissement. 0 % transparence = visible ; 100 % = invisible. X/Y 0/0 = haut gauche, 100/100 = bas droite.
- Images de fêtes : hauteur 110 px dans la carte ; aperçu 90 × 90 px. Textes et boutons restent utilisables au-dessus des effets.
- Neige : 6 à 40 flocons, diamètre réel 1 à 20 pixels CSS, par défaut 4 px.
- **Animate snowfall anyway** permet une exception explicite à la réduction des mouvements, uniquement pour cette carte. Désactivée par défaut. La pause hors écran/page masquée reste active.

Les fichiers homonymes ne sont pas écrasés. Supprimer une association ne supprime pas le fichier. Les réglages et images existants sont conservés. N'utiliser que des images avec les droits nécessaires.

## Test Chrome confirmé le 25 novembre 2026

Avec la carte 0.1.12, un GIF chargé et **30 flocons animés simultanément** ont été confirmés. L'animation `snow-fall` était en état `running` et les positions ont changé entre deux observations. Aucun réglage n'a été modifié pendant ce test combiné.

Chrome utilisait encore l'ancienne ressource **0.1.8**. **Register card resource**, puis un rechargement complet ont corrigé la référence périmée. Avec la réduction des mouvements active, enregistrer aussi l'exception explicite. Ce test ne garantit pas les performances de toutes les tablettes.

[Compte rendu DE/EN/FR](TEST-197.md) · [Guide complet en français](https://opensource.ugso-software.de/fr/projects/festtags-card-editor/) · [ZIP et version](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/releases/tag/festtags-card-editor-v0.1.12).
