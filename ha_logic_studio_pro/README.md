# HA Logic Studio Pro

HA Logic Studio Pro ist eine Home-Assistant-App zum Erstellen, Prüfen und Ausführen von Automationen und Logik. Projekte und Ordner werden pro Home-Assistant-Benutzer gespeichert. Die Oberfläche gibt es auf Deutsch, Englisch und Französisch.

**Stand 0.1.120** · [GitHub-Release und ZIP](https://github.com/rockbaer2007/ugso-ha-mqtt-addons/releases/tag/ha-logic-studio-pro-v0.1.120)

## Installation und Update

1. In Home Assistant **Einstellungen → Apps → App-Store → ⋮ → Repositorys** öffnen und `https://github.com/rockbaer2007/ugso-ha-mqtt-addons` hinzufügen.
2. **HA Logic Studio Pro** auswählen, **Installieren** und anschließend **Starten** wählen. Die App unterstützt `amd64` und `aarch64`.
3. **Benutzeroberfläche öffnen** wählen. Über **+** ein Projekt und den gewünschten Editor auswählen.

Für eine bestehende Installation aus dem Sammelrepo in der App-Übersicht **Nach Updates suchen** und bei HA Logic Studio Pro **Aktualisieren** wählen.

## Welcher Editor passt?

| Editor | Wofür er gedacht ist |
| --- | --- |
| **Funktionsplan** | Logik mit verbundenen Bausteinen wie Timern, Zählern und Merkern aufbauen, simulieren und im Betrieb Ein- und Ausgänge beobachten. |
| **Rules** | Automationen aus Auslösern, Bedingungen und Aktionen mit DANN- und SONST-Zweigen erstellen und als HA-YAML exportieren. |
| **Blocks A** | Native Home-Assistant-Automationen mit visuellen Blöcken aufbauen und als YAML ausgeben. |
| **Blocks JS** | JavaScript-Logik mit Blöcken erstellen, testen und auf dem HA-Server ausführen. Beim ioBroker-Blockly-Import lassen sich Entitäten zuordnen und nötige Anpassungen am Block nachlesen. |
| **JavaScript** | Skripte mit Autovervollständigung und Funktionssignaturen für die HA-Skript-API schreiben und testen. |
| **TypeScript** | Skripte mit Typprüfung schreiben. Fehler werden an der betroffenen Codezeile angezeigt. |
| **HA-YAML** | Automationen und Skripte als YAML bearbeiten, prüfen und exportieren. Die grafische Vorschau zeigt den Ablauf der Automation. |

## Testlauf und Live-Ausführung

**Testlauf** verwendet simulierte Werte und Ereignisse. **Play** startet gespeicherte Projekte aus Funktionsplan, Blocks JS, JavaScript und TypeScript in der App auf dem HA-Server. Für die Live-Ausführung werden die benötigten Entitäten, Ereignisse und MQTT-Themen in der App-Konfiguration freigegeben. YAML-Exporte aus Rules, Blocks A und HA-YAML lassen sich in Home Assistant übernehmen.

## Bedienungsanleitung und Entwicklung

- **Bedienungsanleitung mit Beispielen und Screenshots** · [Deutsch](https://opensource.ugso-software.de/projects/logic-studio/user-guide) · [English](https://opensource.ugso-software.de/en/projects/logic-studio/user-guide) · [Français](https://opensource.ugso-software.de/fr/projects/logic-studio/user-guide)
- [Changelog](CHANGELOG.md)
- [Roadmap](ROADMAP.md)
