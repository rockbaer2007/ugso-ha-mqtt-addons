# To-do: HA Grafik Visual Studio

## Sprachen

- [x] Home-Assistant-Sprache automatisch übernehmen und in den App-Einstellungen eine Auswahl **Automatisch / Deutsch / English** anbieten.
- [ ] Später Französisch als vollständige App-Sprache ergänzen und in der Sprachauswahl anbieten.

## Home-Assistant-Anbindung

- [ ] Zustände gebundener Entitäten in Editor und Runtime live lesen und bei Änderungen aktualisieren. Der Entitätenbrowser liest derzeit nur beim Öffnen oder manuellen Aktualisieren; eine ausgewählte Entity-ID allein bindet noch kein Widget.
- [ ] Bedienbare Widgets über passende Home-Assistant-Dienste tatsächlich steuern. Schalter, Buttons, Slider und andere Eingaben dürfen nicht nur lokale Testwerte ändern; Erfolg, Fehler und der bestätigte neue HA-Zustand müssen sichtbar sein.
- [ ] Die zusätzlichen Steuerfunktionen aller Widget-Typen einzeln prüfen und für unterstützte HA-Domänen zuordnen. Anzeige-Widgets bleiben lesend; Funktionen ohne sichere HA-Entsprechung werden klar als nicht unterstützt gekennzeichnet.
- [ ] Pro Widget-Typ Lese-, Schreib- und Fehlerfälle sowie die Runtime nach einem Neuladen prüfen und den tatsächlichen Funktionsumfang in der DE/EN-Dokumentation nachziehen.
