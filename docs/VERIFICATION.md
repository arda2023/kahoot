# Lokale Abnahme

Stand: 26.10.2026. Die verbindlichen lokalen Kriterien stehen am Ende von PLAN.md.

| Anforderung                    | Nachweis                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo und lokale Dienste    | apps/web, apps/api, packages/contracts, packages/game-engine, packages/ui; Compose meldet PostgreSQL und Redis gesund                               |
| Start und Build                | npm run dev startet Web/API; npm run build erfolgreich                                                                                              |
| Statische Qualität             | npm run check: ESLint, Prettier, TypeScript einschließlich Tests, vier Engine-Tests erfolgreich                                                     |
| Vollständiges Seed-Spiel       | tests/integration/game.test.ts: 30 Spieler bis Endergebnis, 89 erwartete Antworten, Frist-/Duplikat-/Scoreprüfungen                                 |
| DB garantiert Einmalwertung    | Live-DB: answers_pkey PRIMARY KEY (player_id, question_index); Migration in apps/api/src/db.ts                                                      |
| Keine vorzeitige Lösung        | Integration prüft offene Payloads ohne correctIndex/myPoints und ohne aktuelle Fragepunkte; explizite Feldliste im Snapshot                         |
| Host + zwei Spieler im Browser | tests/e2e/game.spec.ts: kompletter Ablauf, Host- und Spieler-Reload, PIN/QR, mobile Breite, Podium und CSV                                          |
| Konten und Quizverwaltung      | tests/e2e/editor.spec.ts: Registrierung/Login, Bild, Fragetypen, Reihenfolge, Veröffentlichung, Entwurfsänderung, Duplizieren, Archivieren, Spielen |
| Unveränderliche Version        | Editor-E2E spielt veröffentlichten Fragetext trotz später verändertem Entwurf; Raum speichert eigene Quizkopie                                      |
| Geschützte Berichte            | Integration lehnt Spieler-/anonymen Abruf ab; CSV vollständig, Formelinhalte neutralisiert; entfernte Teilnehmer ausgeschlossen                     |
| Ausfall/Wiederherstellung      | tests/integration/recovery.test.ts: zwei APIs, SIGKILL, ACK bleibt erhalten, keine Doppelwertung, Outbox-Wiederholung, abgelaufene Frist            |
| Zusammenarbeit                 | tests/integration/groups.test.ts: Rollen, Widerruf, parallele Saves liefern 200 + 409; E2E zeigt Konflikt und behält lokale Eingaben                |
| Moderation und Rate Limits     | Integration + E2E: Sperren, Entfernen, Tokenentzug; 605 Befehle lösen Begrenzung aus, andere Verbindung bleibt nutzbar                              |
| Lastmessung                    | scripts/load.ts; 100 Spieler und 5 × 100 Spieler, 1800 gewertete Antworten, keine Fehler; docs/LOADTEST.md und Rohdaten                             |
| CI                             | .github/workflows/ci.yml führt Check, Build, Integration, Lasttest und Playwright aus; Laufstatus am Branch phase-1-2                               |
| Dokumentation                  | README, PLAN, FEATURES mit Quellen, DECISIONS, PROGRESS, LOADTEST und OPERATIONS                                                                    |

Lokaler Prüfumfang: vier Unit-Tests, sieben Integrationstests, vier Playwright-E2E-Tests.
`npm audit` meldet keine bekannten Schwachstellen zum Prüfzeitpunkt.

Nicht eingerichtet und ausdrücklich außerhalb der lokalen Abnahme: Cloud-Hosting,
Produktions-Backups, DB-Failover, öffentlicher Pilot, 10.000-Spieler-Nachweis und Produktions-SLA.
Details und weitere Betriebsaufgaben stehen in OPERATIONS.md.
