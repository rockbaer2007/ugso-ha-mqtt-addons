# Sensorzustand und Funktionspläne / Sensor state and function plans / État du capteur et plans fonctionnels

## Deutsch

In Blocks A und Blocks JS unter **System → Sensorzustand setzen** einen vorhandenen Sensor auswählen und den Werteingang verbinden. Zulässig sind Zahlen und Texte bis 255 Zeichen. Attribute bleiben erhalten. Die WRITE-Freigabe muss den Sensor einschließen. READ allein reicht nicht aus.

Blocks JS: `ha.setSensorState("sensor.beispiel", 42)`. Der Testlauf simuliert den Schreibzugriff. Die Live-Runtime schreibt über die HA-Zustands-API. Blocks A exportiert ein natives HA-Ereignis mit `entity_id` und `state`; die aktive Studio-App empfängt es und prüft dieselbe WRITE-Freigabe. Für diesen internen Eingang ist keine allgemeine EVENT-Freigabe nötig. Fehler erscheinen im App-Protokoll; das Auslösen des Ereignisses allein bestätigt keinen erfolgreichen Schreibzugriff.

Die Aktion entspricht „Entwicklerwerkzeuge → Zustände“: kein Gerätebefehl, kein neuer dauerhafter Sensor. Beim Neustart bzw. nächsten Update der zuständigen Integration kann der Wert ersetzt werden. Die App muss für Blocks A laufen.

**Neues Projekt → Funktionsplan** fragt jedes Mal Name und Ordner ab. Jeder Plan startet leer. Gespeicherte Pläne werden nicht übernommen oder überschrieben. Abbrechen legt kein Projekt an.

## English

In Blocks A and Blocks JS, choose **System → Set sensor state**, select an existing sensor and connect a value block. Numbers and text up to 255 characters are accepted. Attributes are retained. The sensor must have WRITE permission; READ alone is insufficient.

Blocks JS uses `ha.setSensorState("sensor.example", 42)`. Test runs simulate writes; live runs use HA's state API. Blocks A exports a native HA event with `entity_id` and `state`. The running Studio app receives this event and checks the same WRITE permission. This internal input does not require general EVENT permission. Bridge errors appear in the app log; firing the event is not confirmation of a successful write.

This behaves like Developer Tools → States: it sends no device command and creates no persistent sensor. The owning integration or a restart may replace the value. Blocks A requires the Studio app to be running.

**New project → Function plan** now requests a name and folder every time. Plans start empty and save independently. Existing plans are preserved. Cancelling creates no project.

## Français

Dans Blocks A et Blocks JS, choisir **System → Définir l’état du capteur**, sélectionner un capteur existant et connecter une valeur. Les nombres et les textes de 255 caractères maximum sont acceptés. Les attributs sont conservés. Le capteur doit disposer de l’autorisation WRITE ; READ seul ne suffit pas.

Blocks JS utilise `ha.setSensorState("sensor.exemple", 42)`. Le test simule l’écriture ; l’exécution réelle utilise l’API d’état de HA. Blocks A exporte un événement HA natif contenant `entity_id` et `state`. L’application Studio active le reçoit et vérifie la même autorisation WRITE. Cette entrée interne ne nécessite pas d’autorisation EVENT générale. Les erreurs du pont apparaissent dans le journal de l’application ; émettre l’événement ne confirme pas la réussite de l’écriture.

Le comportement correspond aux outils de développement → États : aucune commande à l’appareil, aucun nouveau capteur permanent. L’intégration responsable ou un redémarrage peut remplacer la valeur. Blocks A nécessite l’application Studio active.

**Nouveau projet → Plan fonctionnel** demande désormais un nom et un dossier à chaque création. Chaque plan est vide et enregistré séparément. Les plans existants restent conservés. Annuler ne crée aucun projet.
