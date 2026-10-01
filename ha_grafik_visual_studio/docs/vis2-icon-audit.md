# Prüfung der VIS-2-Icons

Stand: 1. Oktober 2026

## Ergebnis

VIS-2-Icons und VIS-2-Vorschaubilder werden nicht direkt in Grafik Visual Studio übernommen. Für die Widget-Palette werden eigene SVG-Symbole, einfache Schriftzeichen oder Icons aus dem bereits eingebundenen offiziellen Material-Design-Icons-Katalog verwendet.

## Geprüfte Quellen

| Quelle | Herkunft und Lizenz | Übernahme | Begründung und Auflage |
| --- | --- | --- | --- |
| `ioBroker.vis-2/packages/iobroker.vis-2/icons` | Flaticon-Premium-Icons; die Datei `ICONS_LICENSE.md` untersagt ausdrücklich die Nutzung in anderen Projekten | Nein | Eine Attribution hebt das Verbot nicht auf. Diese Dateien dürfen ohne eine eigene passende Flaticon-Lizenz nicht kopiert werden. |
| VIS-2-Widgetvorschaubilder wie `Prev_*.png` und `Prev_*.svg` | Bestandteil des VIS-2-Repositories; keine abweichende Asset-Lizenz gefunden, daher gilt die Repository-Lizenz CC BY-NC 4.0 | Nein | Nur nichtkommerzielle Nutzung mit Namensnennung, Lizenzhinweis, Quelllink und Änderungsvermerk. Die Einschränkung passt nicht zur gewünschten freien Weiterverteilung von Grafik Visual Studio. |
| VIS-2-Bilder wie `bulb_on.png` und `bulb_off.png` | Bestandteil des VIS-2-Quellbestands; keine belastbare separate Herkunfts- oder Lizenzangabe gefunden | Nein | Ohne eindeutige Einzelprovenienz nicht übernehmen. Eigene oder MDI-basierte Lampe verwenden. |
| Material Design Icons (`@mdi/svg`) | Pictogrammers; `@mdi/svg` steht unter Apache License 2.0. Marken- und Logo-Icons sind davon ausgenommen | Ja, über die Originalquelle | Der vorhandene Katalog `web/mdi-icons.json` und `NOTICE-MDI.md` bleiben die maßgebliche Quelle. Keine Dateien aus VIS-2 kopieren. Für Markenlogos ist eine gesonderte Prüfung nötig. |
| VIS-2 Technic Widgets | Repository `Sefina-DS/ioBroker.vis-2-widgets-technic`, MIT-Lizenz; für die Vorschaubilder wurde kein separater Asset-Hinweis gefunden | Bedingt | Eine Übernahme einzelner nachweislich repositoryeigener Assets ist mit MIT-Hinweis möglich. Vor einer tatsächlichen Übernahme Herkunft pro Datei bestätigen und Copyright- sowie MIT-Lizenztext beilegen. Bevorzugt eigene Symbole oder MDI verwenden. |
| Eigene SVG-Symbole und Unicode-Zeichen | Eigene Umsetzung, keine VIS-2-Datei | Ja | Bevorzugte Lösung für widgettypische Vorschaubilder. SVGs einheitlich mit `viewBox="0 0 24 24"` und `currentColor` anlegen. |

## Technische Vorgabe

- Neue Widget-Symbole werden nicht aus Screenshots nachgezeichnet und nicht aus VIS-2-Dateien extrahiert.
- Zuerst wird ein passendes Icon aus dem vorhandenen MDI-Katalog gewählt.
- Fehlt ein passendes MDI-Icon, wird ein eigenes, einfaches SVG erstellt.
- Palette und Editor verwenden nach Möglichkeit dasselbe Symbol.
- Symbole sind 24 x 24, skalierbar, mit `currentColor` einfärbbar und erhalten einen zugänglichen Namen.
- Fremde Marken- und Produktlogos werden nicht ohne separate Rechteprüfung eingebaut.

## Erforderliche Hinweise bei erlaubter Nutzung

### Material Design Icons

Der bestehende Hinweis in `NOTICE-MDI.md` bleibt Bestandteil des Pakets. Er nennt Quelle, Katalogversion und Lizenz. Bei einem Katalogupdate müssen Version und Hinweis gemeinsam aktualisiert werden.

### Technic Widgets

Falls später tatsächlich Code oder ein Asset aus dem Technic-Repository übernommen wird, müssen mindestens der Copyright-Hinweis des betreffenden Repository-Stands und der vollständige MIT-Lizenztext mit ausgeliefert werden. Zusätzlich werden Quelldatei, Quell-Commit und vorgenommene Änderungen in der Übernahme dokumentiert.

### VIS-2 unter CC BY-NC 4.0

Eine spätere Ausnahmeentscheidung für ein VIS-2-Asset müsste Urheber, Copyright, CC-BY-NC-4.0-Hinweis, Quell-URL, Quell-Commit und Änderungen dokumentieren. Wegen der Beschränkung auf nichtkommerzielle Nutzung ist diese Ausnahme für Grafik Visual Studio derzeit ausgeschlossen.

## Referenzstände

- VIS-2: `ioBroker/ioBroker.vis-2`, geprüfter Commit `659e584f90a69b395df40e343d419a493995ffaf`
- Technic Widgets: `Sefina-DS/ioBroker.vis-2-widgets-technic`, geprüfter Commit `8c9a329994a998178fa3cec680a5854163721a34`
- Material Design Icons: eingebetteter Katalog `@mdi/svg` 7.4.47

