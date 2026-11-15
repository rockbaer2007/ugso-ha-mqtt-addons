# Rules

## Umgesetzt

- 0.1.100 ergänzt die HA-Template-Bedingung im Expertenmodus. Die native YAML-Automation schaltete einen Testhelfer auf dem Testsystem PC (64) über DANN ein und über SONST aus.

- Für 0.1.96 wurden Bereich und Label auf dem Testsystem PC (64) mit einem eigenen Loopback-Gerät geprüft. Beide Auslöser übernahmen die zugeordnete Testentität. Bei geänderter Zuordnung muss die Auswahl erneuert und die Automation erneut übernommen werden.

- 0.1.80–0.1.85 ergänzten Zahlenschwellen, Sonnenaufgang und Sonnenuntergang mit Versatz, Helferuhrzeit, MQTT, HA-Start sowie Zeitfenster und Wochentage.
- 0.1.95 ergänzte die Bedingung „Ausgelöst durch“.
- 0.1.96 (lokal) ergänzt verschachtelte UND-/ODER-/NICHT-Gruppen und Ereignisse mit Daten. Die erzeugte Automation lieferte auf dem Testsystem PC (64) für `first` den DANN-Zweig und für `second` den SONST-Zweig. Die Palette lässt sich durchsuchen und einklappen. Rules-JSON ist als Text und Datei verfügbar.
- Auf dem Testsystem PC (64) bestätigte der HA-Trace außerdem das Warten auf einen Zustand, den Skriptaufruf mit Parameterwert 42 und das Anlegen und Entfernen der Testbenachrichtigung. Textimport, Dateirundlauf, Palettensuche, Einklappen und Ziehen eines Auslösers nach FALLS wurden geprüft.
