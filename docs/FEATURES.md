# Funktionsrecherche

Recherche: 26.10.2026, ausschließlich öffentliche Websuche und öffentliche Hilfetexte.
Keine Anmeldung, keine Kontoerstellung, kein übernommener Code oder Quizinhalt.
Die Beschreibungen sind eigenständige Zusammenfassungen; Produktvarianten können abweichen.

| Funktion | Öffentlich beschriebenes Verhalten | Eigene Phase-2-Umsetzung |
| --- | --- | --- |
| Lobby | Host öffnet Sitzung, zeigt PIN/QR/Link und startet das Spiel. Teilnehmer erscheinen vor dem Start. [1][2] | Host erstellt Raum; sechsstellige PIN, Namenliste, Start nach mindestens einem Beitritt. |
| PIN | Temporärer sitzungsbezogener Code; Host teilt ihn mit Teilnehmern. [2] | Zufällige eindeutige PIN; Beitritt nur in Lobby, Wiederaufnahme jederzeit bis Ablauf. |
| Fragen | Nach allen Antworten oder Ablauf erscheint die Auswertung; danach Rangliste. [3] | Frage, automatische Schließung bei Frist oder vollständiger Abgabe, Auflösung, vom Host ausgelöste Rangliste und nächste Frage. |
| Timer | Zeitlimit beeinflusst die Antwortphase und in Standardspielen die Punkte. [3][4] | Persistente Serverfrist; Client zählt nur zur Anzeige herunter. |
| Punkte | Korrektheit und Geschwindigkeit bestimmen Punkte; Standardmaximum 1000. Die veröffentlichte Formel reduziert den Wert um die halbe relative Antwortzeit; unter 0,5 Sekunden volle Punkte. Falschserien/Antwortserien geben keinen Extra-Bonus. [4] | Eigene explizite Regel: korrekt 1000 bis 500 gemäß linearer Zeitreduktion; falsch 0; keine 0,5-Sekunden-Sonderregel. |
| Rangliste | Zwischen Fragen Top fünf, am Ende Podium und persönlicher Punktestand. [3] | Vollständige Rangliste mit Gleichständen; Abschluss hebt Top drei hervor. |
| Wiederbeitritt | Wiederaufnahme unter bisherigem Namen erhält den Punktestand. [1] | Geheimes Teilnehmer-Token stellt dieselbe Identität nach Reload/Netzabbruch wieder her. |

## Quellen
1. [How to host a live kahoot](https://support.kahoot.com/hc/en-us/articles/360039422694-How-to-host-a-live-kahoot)
2. [How to find Kahoot! PIN](https://support.kahoot.com/hc/en-us/articles/360000109048-How-to-find-Kahoot-PIN)
3. [Tips for hosting a live game](https://support.kahoot.com/hc/en-us/articles/360039900153-Tips-for-hosting-a-live-game)
4. [How points work](https://support.kahoot.com/hc/en-us/articles/115002303908-How-points-work)

## Nicht im aktuellen Umfang
Teams, Musik, Themes, Bezahlfunktionen, KI, öffentliche Quizbibliothek, Konten, Editor,
Kontoinformationen oder private Schnittstellen des Referenzprodukts.
