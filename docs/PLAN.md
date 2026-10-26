# Plan: eigenständige Live-Quizplattform

Stand: 26.10.2026. Eigene Implementierung und eigene Inhalte. Kein KI-Funktionsumfang.

## Produktziel

Lehrkräfte und Gruppen erstellen später Quizze und spielen gemeinsam im Browser.
Ersteller: Dashboard, Bibliothek, Editor, Vorschau, Freigaben, Berichte.
Host: Raum mit PIN/QR, Lobby, Präsentation, Antwortanzahl, Auflösung, Rangliste, Podium.
Spieler: PIN, Anzeigename, Lobby, Fragen, Antworten mit Serverbestätigung, Reconnect, Endstand.
Responsive, per Tastatur bedienbar, Antwortflächen mit Text statt alleiniger Farbcodierung.
Name und Gestaltung sollen später zentral austauschbar bleiben.

## Architektur

Monorepo: apps/web (Next.js/TypeScript), apps/api (NestJS/Socket.IO),
packages/contracts (geteilte Protokolltypen), packages/game-engine (reine Spielregeln).
PostgreSQL ist die maßgebliche dauerhafte Ablage. Redis unterstützt Ereignisverteilung
und spätere Präsenz/Rate-Limits. Modularer Monolith statt früher Microservices.
Später S3-kompatible Medienablage, mehrere API-Instanzen und verwaltete Infrastruktur.

Server bestimmt Zustand, Fristen, Berechtigungen und Punkte. Pro Spieler/Frage höchstens
eine Antwort durch Datenbankconstraint. ACK erst nach Commit. Keine Lösung im offenen
Fragenpayload. Dauerhafte Sitzung und geheime Wiederaufnahme-Tokens; Snapshot nach Reconnect.
Transaktionen schützen konkurrierende Antworten/Fragenwechsel. Persistente Fristen und
Wiederherstellungsprozess statt ausschließlich flüchtiger Timer. Später dauerhafte Outbox.
Quizversionen bleiben während einer Runde unveränderlich.

## Ursprüngliche langfristige Etappen

1. Anforderungen, Dokumentation, Repository, lokale Dienste und CI.
2. Festes Beispielquiz, Host, PIN, Lobby, Fragen mit Timer, Antworten, serverseitige
   Wertung, Auflösung, Rangliste und Endergebnis; kompletter lokaler Multiplayer-Ablauf.
3. Konten, Quiz-Editor, Bilder, Versionierung und Bibliothek.
4. Ausbau der Präsentation, Spieleransicht, Berichte und Bedienbarkeit im Unterricht.
5. Produktionshärtung: Ausfallsicherung, Outbox, Mehrinstanz-Lasttests, Monitoring,
   kontrollierte Deployments, Backup/Restore und Datenbank-Failover.
6. Gruppen, Rollen, gemeinsame Erstellung und explizite Versionskonflikte.
7. Pilotbetrieb, Lastmessung, Datenschutz-/Löschkonzept und Releaseprozess.

Später: weitere Fragetypen, Teammodus, öffentliche Sammlungen, Schul-SSO und Aufgaben.
Langfristige zu messende Zielkapazität: 100 Räume mit je 100 Spielern; keine aktuelle Zusage.

## Aktualisierter Auftrag: Phasen 1–6 und lokaler Teil von Phase 7

Konten, Editor, Berichte, Gruppen und Ausfallsicherheit gehören zum aktualisierten Umfang.
Keine Cloud, keine Bezahldienste. Originales Seed-Quiz und eigene Nutzerquizze.
Docker Compose für PostgreSQL und Redis, npm-Workspaces für Web/API/Pakete.
Abnahme: sauberer Start laut README; Lint und Typecheck; game-engine Unit-Tests;
30 Socket.IO-Spieler durch gesamte Runde inklusive Duplikaten/späten Antworten;
Playwright mit Host und zwei Spielern bis Ende; GitHub Actions mit denselben Checks.

## Git und Arbeitsweise

Branch phase-1-2, kein Push auf main und kein Force-Push. Nach grüner Etappe Fortschritt
in PROGRESS.md dokumentieren, committen und pushen. Offene Entscheidungen in DECISIONS.md.
Nach drei erfolglosen Ansätzen Blockade dokumentieren und unabhängige Arbeit fortsetzen.
Zeitgrenze: zehn Stunden ab Arbeitsbeginn; dann Zustand mit erledigt/offen/blockiert sichern.

Zusätzliche Abnahme: Editor-E2E, unveränderliche Veröffentlichungen, lokale Bilder,
CSV-Bericht, QR, zwei API-Instanzen mit Redis, transaktionale Outbox, Neustarttest
mit bestätigter Antwort, Gruppenrollen und konkurrierende Speicherungen, Lasttest
mit 100 Spielern und mehreren Räumen. Hosting/Backup/Pilot nur dokumentieren.

## Verbindliche lokale Abnahme der Zielerweiterung

1. Fundament: Start mit Compose und dokumentierten Befehlen; Lint, Typecheck, Tests und CI.
2. Spiel: Seed, PIN, Lobby, Timer, Punkte, Rangliste, Ende; 30-Spieler-Integration und Host+2-E2E.
3. Verwaltung: Konten, Editor mit Single Choice/Wahr-Falsch/Bildern/Zeit/Reihenfolge, Entwürfe,
   unveränderliche Veröffentlichung, Bibliothek mit Bearbeiten/Duplizieren/Archivieren; Editor-E2E.
4. Oberflächen: QR, Beameransicht, Touch, Antwortbestätigung, Podium, Bericht/CSV, zentrale Marke.
5. Lokale Ausfallsicherheit: Reload/Host-Ausfall, API-Neustart, Outbox, zwei APIs mit Redis-Adapter;
   bestätigte Antwort überlebt Neustart ohne Doppelwertung. Produktionsinfrastruktur nur geplant.
6. Zusammenarbeit: Gruppenrollen, Freigaben, Revisionsprüfung und sichtbarer Speicherkonflikt.
7. Lokal: Lasttest 100 Spieler und mehrere Räume, dokumentierte Ergebnisse, Rate Limits,
   Raum sperren und Spieler entfernen. Hosting/Backups/Pilot werden nur dokumentiert.
