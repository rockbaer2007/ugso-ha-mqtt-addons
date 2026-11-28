# Zustandstrigger / State branches / Branches d’état

## Deutsch

Unter **Trigger → Wenn Entität ihren Wert ändert** einmal die Entität wählen. **Zustand** wertet den HA-Zustand aus; **Attribut** erlaubt die Auswahl eines Attributs, etwa `current_position` eines Rollos. Die Standardzweige sind on/off. Pro Zweig **Text** oder **Zahl** einstellen und den Vergleichswert eingeben. `halb` funktioniert, wenn die ausgewählte Entität bzw. das Attribut diesen Text tatsächlich liefert. Für eine mittlere Rolloposition einen Zahlenzweig 50 verwenden.

Im Zahnrad-Dialog **weiterer Zustand** in die Zweigliste ziehen, bei Bedarf **sonst** ergänzen und Dialog schließen. Vorhandene Zweige lassen sich umordnen und entfernen; angeschlossene Aktionen bleiben beim Umordnen zugeordnet. Doppelte Vergleichswerte verhindern den Start. Der Sonst-Zweig verarbeitet alle übrigen Werte. Ein Zweig läuft bei einer Änderung auf seinen Wert, nicht schon beim Start des Projekts.

Sensor-Schreibbausteine in Blocks JS warten auf die HA-Bestätigung. Danach folgende Debug-Ausgaben lesen den bestätigten Sensorwert. Andere normale HA-Ausgaben warten auf die Annahme des Auftrags; die physische Geräteantwort kann später eintreffen. Eigene Timer und Callback-Blöcke sind eigenständige Fortsetzungen. Blocks-A-YAML behält seine native Ereignisbrücke.

Zahlenfelder übernehmen Änderungen beim Feldwechsel ohne Enter. Nach Änderungen speichern und Runtime neu starten; ein Hinweis zeigt den vorherigen laufenden Stand an. Der Button **Protokoll leeren** entfernt die Meldungen des aktuellen Projekts einschließlich gespeicherter Runtime-Einträge, ohne das Projekt zu stoppen. Neue Meldungen erscheinen weiterhin. Bestehende Freigaben ändern sich dadurch nicht.

## English

Under **Trigger → When entity value changes**, select the entity once. **State** evaluates the HA state; **Attribute** selects an attribute such as a cover's `current_position`. The default branches are on/off. Choose **Text** or **Number** per branch and enter its comparison value. `half` works if the selected entity or attribute actually returns that string. Use numeric 50 for a halfway cover position.

In the gear editor, drag **another state** into the branch list and optionally add **else**, then close the editor. Reorder or remove branches as needed; connected actions follow their branch when reordered. Duplicate comparison values prevent startup. Else handles unmatched values. A branch runs when the value changes to its target, not merely when the project starts.

Sensor output blocks in Blocks JS await HA confirmation. Following debug blocks read the confirmed sensor value. Other normal HA output blocks await request acceptance; the physical device response may arrive later. Timers and callback blocks are separate continuations. Blocks A YAML retains its native event bridge.

Number fields commit when focus leaves without Enter. Save and restart the runtime after changes; a warning marks the old running version. **Clear log** removes the current project's messages, including persisted runtime entries, without stopping it. New messages still appear. Existing runtime permissions remain unchanged.

## Français

Dans **Déclencheurs → Si la valeur de l’entité change**, sélectionner une seule fois l’entité. **État** évalue l’état HA ; **Attribut** permet de choisir un attribut, par exemple `current_position` d’un volet. Les branches initiales sont on/off. Choisir **Texte** ou **Nombre** et saisir la valeur de comparaison pour chaque branche. `mi-ouvert` fonctionne si l’entité ou l’attribut fournit réellement ce texte. Utiliser le nombre 50 pour une position intermédiaire du volet.

Dans l’éditeur à engrenage, glisser **autre état** dans la liste et ajouter éventuellement **sinon**, puis fermer le dialogue. Les branches peuvent être réordonnées ou retirées ; les actions connectées suivent leur branche lors du réordonnement. Les valeurs en double empêchent le démarrage. Sinon traite les autres valeurs. Une branche s’exécute lors d’un changement vers sa valeur, pas au simple démarrage du projet.

Les blocs de sortie de capteur dans Blocks JS attendent la confirmation HA. Les sorties de débogage suivantes lisent la valeur confirmée. Les autres sorties HA normales attendent l’acceptation de la demande ; la réponse physique de l’appareil peut arriver plus tard. Les temporisateurs et les callbacks restent des continuations indépendantes. Le YAML de Blocks A conserve son pont d’événements natif.

Les champs numériques valident la saisie à la perte de focus sans Entrée. Enregistrer puis redémarrer le runtime après modification ; un avertissement indique l’ancienne version active. **Vider le journal** retire les messages du projet courant, y compris les entrées persistées, sans l’arrêter. Les nouveaux messages restent affichés. Les autorisations existantes ne changent pas.
