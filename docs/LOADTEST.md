# Lokale Lastmessung

Messzeit (UTC): 2026-10-26T21:51:28.847Z

## Aufbau

- Apple M5, 10 logische CPUs, darwin arm64, Node v24.21.0.
- PostgreSQL 17 und Redis 7 über Colima/Docker; zwei NestJS-API-Prozesse, Ports 3301/3302.
- Befehl: `docker compose up -d --wait` und `npm run test:load`.
- Native Socket.IO-Clients, verteilt auf beide Instanzen, mit Snapshot-Nachladen bei Ereignissen.
- Drei Seed-Fragen je Raum, 20 Sekunden maximale Frist. Alle Spieler antworten korrekt; jeder zehnte sendet zusätzlich eine identische Abgabe.
- Keine künstliche Netzlatenz, kein Langzeit-/Soak-Test. Client und Server laufen auf demselben Rechner.

## Ergebnis nach Bündelung der Ereignisse

| Szenario        | Gewertete Antworten | Fehler |  Dauer | Antwort p50 | Antwort p95 | Antwort max | Snapshot p95 |
| --------------- | ------------------: | -----: | -----: | ----------: | ----------: | ----------: | -----------: |
| 1 × 100 Spieler |                 300 |      0 |  2.2 s |      125 ms |      374 ms |      500 ms |        91 ms |
| 5 × 100 Spieler |                1500 |      0 | 6.84 s |      309 ms |      650 ms |      966 ms |       439 ms |

Alle Räume erreichen das Endergebnis. Das Skript gleicht die Anzahl gewerteter Antworten und jeden Endstand mit PostgreSQL ab. Bestätigte Duplikate erhöhen weder Anzahl noch Punkte. Die Antwortlatenz enthält die DB-Transaktion bis zum ACK; Duplikat-ACKs sind ebenfalls in den Latenzstichproben enthalten.

## Vergleich mit erster Messung

- 100 Spieler: Antwort-p95 von 492 auf 374 ms; Dauer von 6.5 auf 2.2 s.
- 500 Spieler: Antwort-p95 von 1222 auf 650 ms; Dauer von 14.26 auf 6.84 s.

Ursache der Verbesserung: keine sofortige Rundnachricht je Einzelantwort; Outbox bündelt Invalidierungen. Snapshot-Abfragen verwenden konsistente lesende Transaktionen ohne Raum-Schreibsperre. Client-Abfragen werden zusammengefasst, solange bereits eine Anfrage läuft.

## Grenzen

Diese Messung belegt die beschriebenen lokalen Szenarien, nicht 10.000 Spieler oder eine Produktions-SLA. Das frühere langfristige Ziel von 300 ms p95 ist bei 500 Spielern auf dieser Maschine noch nicht erreicht. Weitere Optimierung und Tests auf Zielinfrastruktur wären vor entsprechender Zusage nötig. Datenbank-Failover, Internetlatenz, Last über Stunden, Bildtraffic und Anmeldung unter hoher Last wurden hier nicht gemessen.

Rohdaten dieses Laufs: [load-results.json](load-results.json). Neue Läufe schreiben `.local/load-results.json`; diese historische Messung wird nicht automatisch überschrieben.
